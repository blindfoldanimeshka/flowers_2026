import slugify from 'slugify';
import { createSupabaseModel } from '@/lib/supabaseModel';

export interface ISubcategory {
  _id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryNumId: number;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const Subcategory = createSupabaseModel({
  collection: 'subcategories',
  defaults: { isActive: true },
  references: {
    categoryId: 'categories',
  },
  preCreate: (doc) => {
    if (!doc.slug && doc.name) {
      doc.slug = slugify(doc.name, { lower: true, strict: true });
    }
  },
});

export default Subcategory;
