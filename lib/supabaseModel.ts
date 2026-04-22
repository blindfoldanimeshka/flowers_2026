import bcrypt from 'bcryptjs';
import { SUPABASE_COLLECTION_TABLE, supabase } from '@/lib/supabase';

type AnyObject = Record<string, any>;

type PopulateSpec = {
  path: string;
  select?: string;
};

type ModelOptions = {
  collection: string;
  defaults?: AnyObject;
  preCreate?: (doc: AnyObject) => Promise<void> | void;
  postRead?: (doc: AnyObject) => AnyObject;
  references?: Record<string, string>;
};

const modelRegistry = new Map<string, ReturnType<typeof createSupabaseModel>>();

const collectionCache = new Map<string, { data: AnyObject[]; timestamp: number }>();
const COLLECTION_CACHE_TTL = 30000; // 30 секунд

const COLLECTION_CODE_MAP: Record<string, number> = {
  users: 1,
  categories: 2,
  subcategories: 3,
  products: 4,
  orders: 5,
  order_counters: 6,
  settings: 7,
  payment_settings: 8,
  healthcheck: 9,
};

function resolveCollectionValue(collection: string): string | number {
  const mapped = COLLECTION_CODE_MAP[collection];
  if (mapped !== undefined) return mapped;
  return collection;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeRowDoc(rawDoc: any): AnyObject {
  if (rawDoc == null) return {};
  if (typeof rawDoc === 'string') {
    try {
      const parsed = JSON.parse(rawDoc);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof rawDoc === 'object') return rawDoc;
  return {};
}

function getByPath(obj: AnyObject, path: string) {
  return path.split('.').reduce((acc: any, part) => (acc == null ? acc : acc[part]), obj);
}

function setByPath(obj: AnyObject, path: string, value: any) {
  const parts = path.split('.');
  let cursor: AnyObject = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (cursor[part] == null || typeof cursor[part] !== 'object') {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function pickSelectedFields(current: AnyObject, select: string): AnyObject {
  const fields = select.split(/\s+/).filter(Boolean);
  const picked: AnyObject = {};
  fields.forEach((f) => {
    picked[f] = current[f];
  });
  picked._id = current._id;
  return picked;
}

function matchCondition(value: any, condition: any): boolean {
  const asArray = (input: any): any[] => (Array.isArray(input) ? input : [input]);
  const includesByString = (source: any, target: any): boolean => {
    const sourceItems = asArray(source);
    const targetItems = asArray(target);
    return sourceItems.some((sourceItem) =>
      targetItems.some((targetItem) => String(sourceItem) === String(targetItem))
    );
  };

  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    if ('$regex' in condition) {
      const pattern = condition.$regex;
      const flags = condition.$options || '';
      const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), flags);
      return regex.test(String(value ?? ''));
    }
    if ('$in' in condition) {
      return includesByString(value, condition.$in as any[]);
    }
    if ('$ne' in condition) {
      return !includesByString(value, condition.$ne);
    }
    if ('$gte' in condition && !(value >= condition.$gte)) return false;
    if ('$gt' in condition && !(value > condition.$gt)) return false;
    if ('$lte' in condition && !(value <= condition.$lte)) return false;
    if ('$lt' in condition && !(value < condition.$lt)) return false;
    if ('$eq' in condition) return includesByString(value, condition.$eq);
    return Object.entries(condition).every(([key, val]) => matchCondition((value || {})[key], val));
  }
  return includesByString(value, condition);
}

function matchesQuery(doc: AnyObject, query: AnyObject = {}): boolean {
  if (!query || Object.keys(query).length === 0) return true;
  if (Array.isArray(query.$or)) {
    const orMatch = query.$or.some((q: AnyObject) => matchesQuery(doc, q));
    if (!orMatch) return false;
  }

  return Object.entries(query).every(([key, condition]) => {
    if (key === '$or') return true;
    const value = getByPath(doc, key);
    return matchCondition(value, condition);
  });
}

function applyUpdateOperators(doc: AnyObject, update: AnyObject): AnyObject {
  const next = deepClone(doc);
  const hasOps = Object.keys(update).some((k) => k.startsWith('$'));
  if (!hasOps) {
    return { ...next, ...update };
  }

  if (update.$set) {
    for (const [key, value] of Object.entries(update.$set)) {
      setByPath(next, key, value);
    }
  }
  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) {
      const current = Number(getByPath(next, key) || 0);
      setByPath(next, key, current + Number(value));
    }
  }
  if (update.$addToSet) {
    for (const [key, value] of Object.entries(update.$addToSet)) {
      const arr = Array.isArray(getByPath(next, key)) ? [...getByPath(next, key)] : [];
      const exists = arr.some((item: any) => String(item) === String(value));
      if (!exists) arr.push(value);
      setByPath(next, key, arr);
    }
  }
  if (update.$pull) {
    for (const [key, value] of Object.entries(update.$pull)) {
      const arr = Array.isArray(getByPath(next, key)) ? [...getByPath(next, key)] : [];
      const filtered = arr.filter((item: any) => {
        if (value && typeof value === 'object' && '$in' in (value as AnyObject)) {
          return !(value as AnyObject).$in.some((v: any) => String(v) === String(item));
        }
        return String(item) !== String(value);
      });
      setByPath(next, key, filtered);
    }
  }
  return next;
}

async function readCollection(collection: string): Promise<AnyObject[]> {
  const now = Date.now();
  const cached = collectionCache.get(collection);

  if (cached && now - cached.timestamp < COLLECTION_CACHE_TTL) {
    return cached.data;
  }

  const collectionValue = resolveCollectionValue(collection);
  const { data, error } = await supabase
    .from(SUPABASE_COLLECTION_TABLE)
    .select('id, doc, created_at, updated_at')
    .eq('collection', collectionValue);

  if (error) throw error;

  const result = (data || []).map((row: AnyObject) => ({
    ...normalizeRowDoc(row.doc),
    _id: row.id,
    createdAt: normalizeRowDoc(row.doc)?.createdAt || row.created_at,
    updatedAt: normalizeRowDoc(row.doc)?.updatedAt || row.updated_at,
  }));

  collectionCache.set(collection, { data: result, timestamp: now });
  return result;
}

function invalidateCollectionCache(collection: string) {
  collectionCache.delete(collection);
}

async function insertDoc(collection: string, doc: AnyObject): Promise<AnyObject> {
  const collectionValue = resolveCollectionValue(collection);
  const now = new Date().toISOString();
  const payload = {
    ...doc,
    createdAt: doc.createdAt || now,
    updatedAt: now,
  };
  const { data, error } = await supabase
    .from(SUPABASE_COLLECTION_TABLE)
    .insert({ collection: collectionValue, doc: payload })
    .select('id, doc, created_at, updated_at')
    .single();
  if (error) throw error;
  invalidateCollectionCache(collection);
  return {
    ...normalizeRowDoc(data?.doc),
    _id: data?.id,
    createdAt: normalizeRowDoc(data?.doc)?.createdAt || data?.created_at,
    updatedAt: normalizeRowDoc(data?.doc)?.updatedAt || data?.updated_at,
  };
}

async function updateDoc(collection: string, id: string, doc: AnyObject): Promise<AnyObject | null> {
  const collectionValue = resolveCollectionValue(collection);
  const now = new Date().toISOString();
  const payload = {
    ...doc,
    updatedAt: now,
  };
  const { data, error } = await supabase
    .from(SUPABASE_COLLECTION_TABLE)
    .update({ doc: payload, updated_at: now })
    .eq('collection', collectionValue)
    .eq('id', id)
    .select('id, doc, created_at, updated_at')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  invalidateCollectionCache(collection);
  return {
    ...normalizeRowDoc(data.doc),
    _id: data.id,
    createdAt: normalizeRowDoc(data.doc)?.createdAt || data.created_at,
    updatedAt: normalizeRowDoc(data.doc)?.updatedAt || data.updated_at,
  };
}

async function deleteDoc(collection: string, id: string): Promise<AnyObject | null> {
  const collectionValue = resolveCollectionValue(collection);
  const { data, error } = await supabase
    .from(SUPABASE_COLLECTION_TABLE)
    .delete()
    .eq('collection', collectionValue)
    .eq('id', id)
    .select('id, doc, created_at, updated_at')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  invalidateCollectionCache(collection);
  return {
    ...normalizeRowDoc(data.doc),
    _id: data.id,
    createdAt: normalizeRowDoc(data.doc)?.createdAt || data.created_at,
    updatedAt: normalizeRowDoc(data.doc)?.updatedAt || data.updated_at,
  };
}

class QueryBuilder {
  private readonly model: ReturnType<typeof createSupabaseModel>;
  private readonly query: AnyObject;
  private readonly single: boolean;
  private sortSpec: AnyObject | null = null;
  private limitValue: number | null = null;
  private skipValue = 0;
  private selectValue: string | null = null;
  private leanValue = false;
  private populates: PopulateSpec[] = [];
  private fixedResult: AnyObject | AnyObject[] | Promise<any> | null = null;

  constructor(model: ReturnType<typeof createSupabaseModel>, query: AnyObject = {}, single = false, fixedResult: any = null) {
    this.model = model;
    this.query = query;
    this.single = single;
    this.fixedResult = fixedResult;
  }

  sort(spec: AnyObject) {
    this.sortSpec = spec;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  skip(value: number) {
    this.skipValue = value;
    return this;
  }

  select(value: string) {
    this.selectValue = value;
    return this;
  }

  lean() {
    this.leanValue = true;
    return this;
  }

  populate(path: string, select?: string) {
    this.populates.push({ path, select });
    return this;
  }

  session(_session: any) {
    return this;
  }

  async exec() {
    let docs: AnyObject[];
    if (this.fixedResult != null) {
      const resolved = await this.fixedResult;
      if (resolved == null) {
        docs = [];
      } else {
        docs = Array.isArray(resolved) ? resolved : [resolved];
      }
    } else {
      docs = await readCollection(this.model.collectionName);
      docs = docs.filter((doc) => matchesQuery(doc, this.query));
    }

    if (this.sortSpec) {
      const [[field, direction]] = Object.entries(this.sortSpec);
      docs.sort((a, b) => {
        const av = getByPath(a, field);
        const bv = getByPath(b, field);
        if (av === bv) return 0;
        return av > bv ? (direction as number) : -(direction as number);
      });
    }

    if (this.skipValue) {
      docs = docs.slice(this.skipValue);
    }
    if (this.limitValue != null) {
      docs = docs.slice(0, this.limitValue);
    }

    if (this.populates.length > 0) {
      docs = await this.model.applyPopulate(docs, this.populates);
    }

    if (this.selectValue) {
      const fields = this.selectValue.split(/\s+/).filter(Boolean);
      docs = docs.map((doc) => {
        const out: AnyObject = {};
        for (const f of fields) {
          out[f] = getByPath(doc, f);
        }
        return out;
      });
    }

    const prepared = docs.map((doc) => this.model.wrapRead(doc, this.leanValue));
    if (this.single) {
      return prepared[0] || null;
    }
    return prepared;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<any | TResult> {
    return this.exec().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<any> {
    return this.exec().finally(onfinally);
  }
}

export class SupabaseDocument {
  static model: ReturnType<typeof createSupabaseModel>;
  _id?: string;

  constructor(data: AnyObject = {}) {
    Object.assign(this, data);
  }

  toObject() {
    return deepClone(this);
  }

  async save(_opts?: AnyObject) {
    const model = (this.constructor as typeof SupabaseDocument).model;
    const payload = this.toObject() as AnyObject;

    if (this._id) {
      const updated = await updateDoc(model.collectionName, this._id, payload);
      if (!updated) return null;
      Object.assign(this, updated);
      return this;
    }
    const created = await model.create(payload);
    Object.assign(this, created);
    return this;
  }

  validateSync() {
    return null;
  }
}

export function createSupabaseModel(options: ModelOptions) {
  class Model extends SupabaseDocument {
    static model = Model as any;
    static collectionName = options.collection;
    static references = options.references || {};

    static async applyPopulate(docs: AnyObject[], populates: PopulateSpec[]) {
      let out = docs.map((doc) => deepClone(doc));
      for (const pop of populates) {
        const refCollection = (this.references as AnyObject)[pop.path];
        if (!refCollection) continue;

        const refModel = modelRegistry.get(refCollection);
        if (!refModel) continue;

        if (pop.path === 'items.productId') {
          const ids = new Set<string>();
          out.forEach((doc) => {
            (doc.items || []).forEach((item: AnyObject) => {
              if (item.productId) ids.add(String(item.productId));
            });
          });

          if (ids.size === 0) continue;

          const refs = await refModel.find({ _id: { $in: Array.from(ids) } }).lean();
          const refMap = new Map(refs.map((r: AnyObject) => [String(r._id), r]));
          out = out.map((doc) => ({
            ...doc,
            items: (doc.items || []).map((item: AnyObject) => ({
              ...item,
              productId: (() => {
                const populated = refMap.get(String(item.productId));
                if (!populated) return item.productId;
                if (!pop.select) return populated;
                return pickSelectedFields(populated, pop.select);
              })(),
            })),
          }));
        } else {
          const ids = Array.from(new Set(out.map((d) => getByPath(d, pop.path)).filter(Boolean).map((v) => String(v))));
          if (ids.length === 0) continue;

          const refs = await refModel.find({ _id: { $in: ids } }).lean();
          const refMap = new Map(refs.map((r: AnyObject) => [String(r._id), r]));
          out = out.map((doc) => {
            const id = getByPath(doc, pop.path);
            const value = refMap.get(String(id)) || id;
            const copy = deepClone(doc);
            setByPath(copy, pop.path, value);
            return copy;
          });
        }

        if (pop.select && pop.path !== 'items.productId') {
          out = out.map((doc) => {
            const current = getByPath(doc, pop.path);
            if (!current || typeof current !== 'object') return doc;
            const copy = deepClone(doc);
            setByPath(copy, pop.path, pickSelectedFields(current as AnyObject, pop.select!));
            return copy;
          });
        }
      }
      return out;
    }

    static wrapRead(doc: AnyObject, lean: boolean) {
      let prepared = deepClone(doc);
      if (options.postRead) {
        prepared = options.postRead(prepared);
      }
      if (lean) return prepared;
      return new Model(prepared);
    }

    static find(query: AnyObject = {}) {
      return new QueryBuilder(Model as any, query, false);
    }

    static findOne(query: AnyObject = {}) {
      return new QueryBuilder(Model as any, query, true);
    }

    static findById(id: string) {
      return new QueryBuilder(Model as any, { _id: id }, true);
    }

    static async create(data: AnyObject) {
      const next = {
        ...(options.defaults || {}),
        ...deepClone(data),
      };
      if (options.preCreate) {
        await options.preCreate(next);
      }
      const created = await insertDoc(options.collection, next);
      return this.wrapRead(created, false);
    }

    static async countDocuments(query: AnyObject = {}) {
      const docs = await readCollection(options.collection);
      return docs.filter((doc) => matchesQuery(doc, query)).length;
    }

    static async exists(query: AnyObject = {}) {
      const found = await this.findOne(query).lean();
      return found ? { _id: found._id } : null;
    }

    static findByIdAndUpdate(id: string, update: AnyObject, opts: AnyObject = {}) {
      const run = async () => {
        const current = await this.findById(id).lean();
        if (!current) return null;
        const updatedDoc = applyUpdateOperators(current, update);
        const saved = await updateDoc(options.collection, id, updatedDoc);
        if (!saved) return null;
        return this.wrapRead(saved, false);
      };
      return new QueryBuilder(Model as any, {}, true, run());
    }

    static async findByIdAndDelete(id: string) {
      const deleted = await deleteDoc(options.collection, id);
      if (!deleted) return null;
      return this.wrapRead(deleted, false);
    }

    static async findOneAndUpdate(filter: AnyObject, update: AnyObject, opts: AnyObject = {}) {
      const current = await this.findOne(filter).lean();
      if (!current && opts.upsert) {
        const base = {
          ...filter,
          ...((update.$setOnInsert || {}) as AnyObject),
        };
        const upserted = applyUpdateOperators(base, update);
        const created = await this.create(upserted);
        return created;
      }
      if (!current) return null;
      const updatedDoc = applyUpdateOperators(current, update);
      const saved = await updateDoc(options.collection, current._id, updatedDoc);
      if (!saved) return null;
      return this.wrapRead(saved, false);
    }

    static async updateOne(filter: AnyObject, update: AnyObject) {
      const current = await this.findOne(filter).lean();
      if (!current) return { matchedCount: 0, modifiedCount: 0 };
      const updatedDoc = applyUpdateOperators(current, update);
      await updateDoc(options.collection, current._id, updatedDoc);
      return { matchedCount: 1, modifiedCount: 1 };
    }

    static async updateMany(filter: AnyObject, update: AnyObject) {
      const docs = await this.find(filter).lean();
      let modifiedCount = 0;
      for (const doc of docs) {
        const updatedDoc = applyUpdateOperators(doc, update);
        await updateDoc(options.collection, doc._id, updatedDoc);
        modifiedCount += 1;
      }
      return { matchedCount: docs.length, modifiedCount };
    }

    static async deleteMany(filter: AnyObject) {
      const docs = await this.find(filter).lean();
      for (const doc of docs) {
        await deleteDoc(options.collection, doc._id);
      }
      return { deletedCount: docs.length };
    }

    static async deleteOne(filter: AnyObject) {
      const doc = await this.findOne(filter).lean();
      if (!doc) return { deletedCount: 0 };
      await deleteDoc(options.collection, doc._id);
      return { deletedCount: 1 };
    }

    static async aggregate(pipeline: AnyObject[]) {
      let docs = await this.find({}).lean();
      for (const stage of pipeline) {
        if (stage.$match) {
          docs = docs.filter((doc: AnyObject) => matchesQuery(doc, stage.$match));
        }
        if (stage.$group) {
          const idExpr = stage.$group._id;
          const groups = new Map<string, AnyObject>();
          docs.forEach((doc: AnyObject) => {
            const groupId = typeof idExpr === 'string' && idExpr.startsWith('$')
              ? getByPath(doc, idExpr.slice(1))
              : idExpr;
            const key = String(groupId);
            if (!groups.has(key)) groups.set(key, { _id: groupId });
            const current = groups.get(key)!;
            for (const [field, expr] of Object.entries(stage.$group)) {
              if (field === '_id') continue;
              if ((expr as AnyObject).$sum !== undefined) {
                const sumExpr = (expr as AnyObject).$sum;
                const value = typeof sumExpr === 'string' && sumExpr.startsWith('$')
                  ? Number(getByPath(doc, sumExpr.slice(1)) || 0)
                  : Number(sumExpr || 0);
                current[field] = Number(current[field] || 0) + value;
              }
            }
          });
          docs = Array.from(groups.values());
        }
      }
      return docs;
    }
  }

  modelRegistry.set(options.collection, Model as any);
  return Model as any;
}

export const SessionStub = {
  async withTransaction<T>(fn: () => Promise<T>) {
    return fn();
  },
  async endSession() {
    return;
  },
};

export async function startSession() {
  return SessionStub;
}

export function createUserPostRead(doc: AnyObject) {
  return {
    ...doc,
    async comparePassword(candidatePassword: string) {
      return bcrypt.compare(candidatePassword, doc.password);
    },
  };
}

export async function hashUserPassword(doc: AnyObject) {
  if (!doc.password) return;
  const alreadyHashed = typeof doc.password === 'string' && doc.password.startsWith('$2');
  if (!alreadyHashed) {
    const salt = await bcrypt.genSalt(10);
    doc.password = await bcrypt.hash(doc.password, salt);
  }
}
