export interface IUser {
  username: string;
  role: 'admin' | 'user';
}

export interface ILoginPayload {
  username: string;
  password: string;
}

