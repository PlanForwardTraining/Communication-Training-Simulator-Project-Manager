import { api } from './client';

export interface User {
  id: number;
  name: string;
  email: string;
  disc_profile: string;
  role: 'pm' | 'admin';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  me: () => api.get<User>('/auth/me'),
};
