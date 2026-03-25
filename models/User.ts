import { createSupabaseModel, createUserPostRead, hashUserPassword } from '@/lib/supabaseModel';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
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
