import { api } from './client';

export interface DiscProfile {
  id: number;
  code: string;
  name: string;
}

export const discApi = {
  list: () => api.get<DiscProfile[]>('/api/disc-profiles'),
};
