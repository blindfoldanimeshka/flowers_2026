import slugify from 'slugify';
import { createSupabaseModel } from '@/lib/supabaseModel';

export interface ICategory {
  _id: string;
  id: number;
  name: string;
  slug: string;
  isActive?: boolean;
  subcategories: string[];
  order?: number;
}

const Category = createSupabaseModel({
  collection: 'categories',
  defaults: { isActive: true, subcategories: [], order: 0 },
  preCreate: (doc) => {
    if (!doc.slug && doc.name) {
      doc.slug = slugify(doc.name, { lower: true, strict: true });
    }
  },
});

export default Category;
export { Category };
