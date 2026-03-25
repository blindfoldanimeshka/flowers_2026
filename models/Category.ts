import slugify from 'slugify';
import { createSupabaseModel } from '@/lib/supabaseModel';

export interface ICategory {
  _id: string;
  id: number;
  name: string;
  slug: string;
  isActive?: boolean;
  subcategories: string[];
}

const Category = createSupabaseModel({
  collection: 'categories',
  defaults: { isActive: true, subcategories: [] },
  preCreate: (doc) => {
    if (!doc.slug && doc.name) {
      doc.slug = slugify(doc.name, { lower: true, strict: true });
    }
  },
});

export default Category;
export { Category };
