import { createSupabaseModel, createUserPostRead, hashUserPassword } from '@/lib/supabaseModel';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  telegram_id?: string;
  telegram_id2?: string;
  telegram_id3?: string;
  createdAt: string;
  updatedAt: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const User = createSupabaseModel({
  collection: 'users',
  defaults: { role: 'user' },
  preCreate: hashUserPassword,
  postRead: createUserPostRead,
});

export default User;
