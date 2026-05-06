import { api } from './client';

export interface Scenario {
  id: number;
  slug: string;
  title: string;
  description: string;
  active: number;
}

export interface ScenarioBriefing {
  id: number;
  slug: string;
  title: string;
  body_briefing: string;
}

export const scenariosApi = {
  list: () => api.get<Scenario[]>('/api/scenarios'),
  getBriefing: (slug: string) =>
    api.get<ScenarioBriefing>(`/api/scenarios/by-slug/${encodeURIComponent(slug)}`),
};
