// Заглушка для обратной совместимости
// Проект использует Supabase напрямую через @/lib/supabase
// Этот файл создан для предотвращения ошибок импорта

export interface ISubcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  description?: string;
  image?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default {
  find: () => ({ lean: () => [] }),
  findOne: () => ({ lean: () => ({}) }),
  findById: () => ({}),
  findByIdAndUpdate: () => ({}),
  findByIdAndDelete: () => ({}),
  deleteOne: () => ({}),
  save: () => ({}),
};
