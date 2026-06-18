import { api } from './client';

export interface FocusArea {
  key: string;
  label: string;
  average: number;
  sessionsScored: number;
}

export interface CategoryAverage {
  key: string;
  label: string;
  average: number | null;
  sessionsScored: number;
}

export interface AdminUserStats {
  id: number;
  name: string;
  email: string;
  disc_profile: string;
  role: string;       // internal access flag: 'admin' | 'pm'
  user_type?: string | null; // the displayed role name (e.g. 'Admin', 'PM', 'Sales')
  active: number;
  created_at: string;
  totalSessions: number;
  lastSessionAt: string | null;
  daysSinceLastSession: number | null;
  averageScore: number | null;
  trend: 'up' | 'down' | 'flat';
  focusAreas: FocusArea[];
}

export interface FlaggedPM extends AdminUserStats {
  reasons: string[];
}

export interface AdminSummary {
  cohort: {
    totalPMs: number;
    totalSessionsAllTime: number;
    sessionsThisWeek: number;
    teamAverageScore: number | null;
  };
  teamCategoryAverages: CategoryAverage[];
  teamFocusAreas: FocusArea[];
  flaggedPMs: FlaggedPM[];
  pms: AdminUserStats[];
}

export interface AdminUserSession {
  id: number;
  started_at: string;
  ended_at: string | null;
  total_score: number | null;
  voice_name: string | null;
  scenario_title: string;
  scenario_slug: string;
  client_disc_code: string;
}

export interface AdminUserDetail extends AdminUserStats {
  sessions: AdminUserSession[];
  trendPoints: { sessionId: number; date: string; score: number }[];
  categoryAverages: CategoryAverage[];
}

export interface AdminSessionDetail {
  session: {
    id: number;
    user_id: number;
    user_name: string;
    user_disc: string;
    scenario_title: string;
    scenario_slug: string;
    client_disc_code: string;
    client_disc_name: string;
    voice_id: string | null;
    voice_name: string | null;
    started_at: string;
    ended_at: string | null;
    total_score: number | null;
  };
  turns: Array<{ id: number; speaker: string; content: string; created_at: string }>;
  events: Array<{ id: number; type: string; occurred_at: string }>;
  coaching: {
    strengths: string;
    misses: string;
    alternatives: string;
    discAdaptation: string;
    scoreBreakdown: {
      empathy: number;
      clarity: number;
      discAdaptation: number;
      solutionOrientation: number;
      ownership: number;
      composure: number;
      activeListening: number;
    } | null;
    totalScore: number;
    gradedProvider: string | null;
    gradedModel: string | null;
  } | null;
}

export interface UserType {
  id: number;
  name: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  disc_profile: string;
  role: string; // role name (e.g. 'Admin', 'PM', 'Sales') — server derives access flag
}

export interface UpdateUserPayload {
  name?: string;
  disc_profile?: string;
  role?: string; // role name — server derives access flag
  password?: string;
  active?: boolean;
}

export interface CoachingProviderRow {
  id: string;
  label: string;
  models: string[];
  connected: boolean;
  last4: string | null;
  source: 'db' | 'env' | null;
}

export interface CoachingSettings {
  activeProvider: string;
  activeModel: string;
  providers: CoachingProviderRow[];
}

export interface Branding {
  primary: string;
  secondary: string;
  text: string;
  logoUrl: string;
}

export interface AdminSessionRow {
  id: number;
  started_at: string;
  ended_at: string | null;
  total_score: number | null;
  voice_name: string | null;
  user_name: string;
  user_email: string;
  scenario_title: string | null;
  client_disc_code: string | null;
  status: 'completed' | 'in_progress' | 'empty';
}

export const adminApi = {
  summary: () => api.get<AdminSummary>('/api/admin/summary'),
  users: () => api.get<AdminUserStats[]>('/api/admin/users'),
  user: (id: number) => api.get<AdminUserDetail>(`/api/admin/users/${id}`),
  session: (id: number) => api.get<AdminSessionDetail>(`/api/admin/sessions/${id}`),
  createUser: (body: CreateUserPayload) => api.post<{ id: number }>('/api/admin/users', body),
  updateUser: (id: number, body: UpdateUserPayload) =>
    api.patch<{ updated: boolean }>(`/api/admin/users/${id}`, body),
  deleteUser: (id: number) => api.delete<{ deleted: boolean }>(`/api/admin/users/${id}`),
  exportUrl: () => `/api/admin/export.xlsx`,
  coachingSettings: () => api.get<CoachingSettings>('/api/admin/coaching-settings'),
  setCoachingSelection: (provider: string, model: string) =>
    api.patch<{ updated: boolean }>('/api/admin/coaching-settings', { provider, model }),
  setCoachingKey: (provider: string, apiKey: string) =>
    api.post<{ connected: boolean; last4: string }>('/api/admin/coaching-settings/keys', { provider, apiKey }),
  removeCoachingKey: (provider: string) =>
    api.delete<{ removed: boolean }>(`/api/admin/coaching-settings/keys/${provider}`),
  branding: () => api.get<Branding>('/api/branding'),
  setBranding: (b: Branding) => api.patch<Branding>('/api/branding', b),
  resetBranding: () => api.delete<Branding>('/api/branding'),
  sessions: (q: Record<string, string> = {}) =>
    api.get<AdminSessionRow[]>(`/api/admin/sessions?${new URLSearchParams(q)}`),
  deleteSession: (id: number) => api.delete<{ deleted: boolean }>(`/api/admin/sessions/${id}`),
  purgeEmpty: () => api.post<{ purged: number }>(`/api/admin/sessions/purge-empty`, {}),
  userTypes: () => api.get<UserType[]>('/api/admin/user-types'),
  addUserType: (name: string) => api.post<UserType[]>('/api/admin/user-types', { name }),
  removeUserType: (name: string) => api.delete<UserType[]>(`/api/admin/user-types/${encodeURIComponent(name)}`),
  regradeSession: (id: number) =>
    api.post<{ regraded: boolean; gradedProvider: string; gradedModel: string; totalScore: number }>(
      `/api/admin/sessions/${id}/regrade`,
      {},
    ),
};
