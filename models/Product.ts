// Заглушка для обратной совместимости
// Проект использует Supabase напрямую через @/lib/supabase
// Этот файл создан для предотвращения ошибок импорта

export interface IProduct {
  id: string;
  legacy_id?: number;
  name: string;
  slug: string;
  price: number;
  description?: string;
  images?: string[];
  subcategory_id: string;
  is_active: boolean;
  is_featured: boolean;
  created_at?: string;
  updated_at?: string;
}

export default {
  find: () => ({ lean: () => [] }),
  findById: () => ({}),
  findOne: () => ({ lean: () => ({}) }),
  findByIdAndUpdate: () => ({}),
  findByIdAndDelete: () => ({}),
};
