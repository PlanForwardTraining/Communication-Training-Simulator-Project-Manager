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

/**
 * Stream the end-of-session coaching generation. The backend uses SSE to
 * report cumulative chars received from Claude's streaming response, then
 * fires a 'complete' event with the parsed coaching JSON.
 */
async function endSessionStream(
  sessionId: number,
  turns: Turn[],
  events: SessionEvent[],
  onProgress: (charsReceived: number) => void,
): Promise<CoachingResult & { sessionId: number }> {
  const token = localStorage.getItem('token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string;

  const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ turns, events }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    const errBody = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }

  if (!res.body) throw new Error('Response had no body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final: (CoachingResult & { sessionId: number }) | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by blank lines
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const evt of events) {
      const dataLine = evt.split('\n').find(l => l.startsWith('data: '));
      if (!dataLine) continue;
      let payload: { type: string; [k: string]: unknown };
      try {
        payload = JSON.parse(dataLine.slice(6));
      } catch {
        continue;
      }
      if (payload.type === 'progress') {
        onProgress(payload.charsReceived as number);
      } else if (payload.type === 'complete') {
        final = payload as unknown as CoachingResult & { sessionId: number };
      } else if (payload.type === 'error') {
        throw new Error((payload.error as string) || 'Coaching generation failed');
      }
    }
  }

  if (!final) throw new Error('Coaching stream ended without a result');
  return final;
}

export const sessionsApi = {
  create: (scenarioSlug: string, clientDiscCode: string) =>
    api.post<SessionStart>('/api/sessions', { scenarioSlug, clientDiscCode }),

  end: endSessionStream,

  list: () => api.get<SessionSummary[]>('/api/sessions'),

  get: (sessionId: number) =>
    api.get<SessionDetail>(`/api/sessions/${sessionId}`),
};
