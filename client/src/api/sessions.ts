import { api } from './client';

export interface SessionStart {
  sessionId: number;
  signedUrl: string;
  agentId: string;
  voiceId: string;
  voiceName: string;
  clientFirstName: string;
  personaPrompt: string;
  firstMessage: string;
}

export interface Turn {
  speaker: 'pm' | 'client';
  content: string;
}

export interface SessionEvent {
  type: 'user_interrupted_agent' | 'agent_interrupted_user';
  speaker?: string;
}

export interface CoachingResult {
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
  };
  totalScore: number;
}

export interface SessionSummary {
  id: number;
  user_id: number;
  scenario_id: number;
  client_disc_id: number;
  voice_name: string;
  started_at: string;
  ended_at: string | null;
  total_score: number | null;
}

export interface SessionDetail extends SessionSummary {
  turns: Array<{ id: number; speaker: string; content: string; created_at: string }>;
  events: Array<{ id: number; type: string; occurred_at: string }>;
  coaching: CoachingResult | null;
}

export const sessionsApi = {
  create: (scenarioSlug: string, clientDiscCode: string) =>
    api.post<SessionStart>('/api/sessions', { scenarioSlug, clientDiscCode }),

  end: (sessionId: number, turns: Turn[], events: SessionEvent[]) =>
    api.post<CoachingResult & { sessionId: number }>(`/api/sessions/${sessionId}/end`, {
      turns,
      events,
    }),

  list: () => api.get<SessionSummary[]>('/api/sessions'),

  get: (sessionId: number) =>
    api.get<SessionDetail>(`/api/sessions/${sessionId}`),
};
