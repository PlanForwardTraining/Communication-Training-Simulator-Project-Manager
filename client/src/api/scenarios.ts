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

export interface AdminScenarioRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  active: number;
  updated_at: string;
  session_count: number;
}

export interface ScenarioFull {
  id: number;
  slug: string;
  title: string;
  description: string;
  body_markdown: string;
  active: number;
  updated_at: string;
}

export interface ScenarioCreatePayload {
  slug: string;
  title: string;
  description: string;
  body_markdown: string;
}

export interface ScenarioUpdatePayload {
  title?: string;
  description?: string;
  body_markdown?: string;
  active?: boolean;
}

export const scenariosApi = {
  list: () => api.get<Scenario[]>('/api/scenarios'),
  getBriefing: (slug: string) =>
    api.get<ScenarioBriefing>(`/api/scenarios/by-slug/${encodeURIComponent(slug)}`),
  adminList: () => api.get<AdminScenarioRow[]>('/api/scenarios/admin'),
  get: (id: number) => api.get<ScenarioFull>(`/api/scenarios/${id}`),
  create: (body: ScenarioCreatePayload) =>
    api.post<{ id: number }>('/api/scenarios', body),
  update: (id: number, body: ScenarioUpdatePayload) =>
    api.patch<{ updated: boolean }>(`/api/scenarios/${id}`, body),
  hardDelete: (id: number) =>
    api.delete<{ deleted: boolean }>(`/api/scenarios/${id}`),
};
