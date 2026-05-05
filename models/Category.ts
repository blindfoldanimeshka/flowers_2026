// Заглушка для обратной совместимости
// Проект использует Supabase напрямую через @/lib/supabase
// Этот файл создан для предотвращения ошибок импорта

export interface ICategory {
  id: string;
  legacy_id?: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default {
  findById: () => { lean: () => ({}) },
  findOne: () => ({ lean: () => ({}) }),
  find: () => ({ lean: () => [] }),
  findByIdAndUpdate: () => ({}),
  updateOne: () => ({}),
};
