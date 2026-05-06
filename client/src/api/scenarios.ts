import { api } from './client';

export interface Scenario {
  id: number;
  slug: string;
  title: string;
  description: string;
  active: number;
}

export const scenariosApi = {
  list: () => api.get<Scenario[]>('/api/scenarios'),
};
