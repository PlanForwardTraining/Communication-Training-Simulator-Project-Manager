export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  disc_profile: string;
  role: 'pm' | 'admin';
  created_at: string;
}

export interface JwtPayload {
  userId: number;
  role: 'pm' | 'admin';
}

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
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
  /** Which provider+model generated this coaching (set by service.ts after calling the LLM). */
  gradedProvider?: string;
  gradedModel?: string;
}

export interface TurnRecord {
  id: number;
  session_id: number;
  speaker: 'pm' | 'client';
  content: string;
  started_at_ms: number | null;
  ended_at_ms: number | null;
  created_at: string;
}

export interface EventRecord {
  id: number;
  session_id: number;
  type: 'user_interrupted_agent' | 'agent_interrupted_user' | 'long_pause' | 'overlap';
  speaker: string | null;
  details_json: string | null;
  occurred_at: string;
}
