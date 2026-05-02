import { supabase } from '@/lib/supabase';

export interface IOrderCounter {
  _id: string;
  dateKey: string;
  seq: number;
}

export async function getNextOrderNumber(): Promise<string> {
  const date = new Date();
  const dateKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase.rpc('increment_order_counter', { p_date_key: dateKey });

  if (error) {
    const fallbackSeq = Date.now() % 10000;
    return `${dateKey}-${String(fallbackSeq).padStart(4, '0')}`;
  }

  return `${dateKey}-${String(data).padStart(4, '0')}`;
}

export default { getNextOrderNumber };