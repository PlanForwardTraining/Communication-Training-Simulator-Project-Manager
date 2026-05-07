import { setupTestDb } from './helpers';
setupTestDb();

import request from 'supertest';
import Database from 'better-sqlite3';
import { runMigrations, seedTestData } from './helpers';
import db from '../src/db/connection';
import app from '../src/index';

// Mock the ElevenLabs CAI service to avoid real API calls in tests
jest.mock('../src/services/elevenlabs-cai', () => ({
  getSignedUrlForSession: jest.fn().mockResolvedValue({
    signedUrl: 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_test&conversation_signature=test',
    agentId: 'agent_test',
    voiceId: 'test-voice-id',
    voiceName: 'Test Voice',
    personaPrompt: 'You are a test client.',
  }),
  verifyWebhookSignature: jest.requireActual('../src/services/elevenlabs-cai').verifyWebhookSignature,
}));

// Mock the Claude service to avoid real API calls in tests
jest.mock('../src/services/claude', () => {
  // Defined inside the factory because jest.mock is hoisted above any
  // top-level let/const, and this object can't be a closure over an outer var.
  const mock = {
    strengths: 'Good empathy shown.',
    misses: 'Could have been clearer.',
    alternatives: 'Try saying: I understand this is difficult.',
    discAdaptation: 'As a D talking to an S, slow down.',
    scoreBreakdown: {
      empathy: 4, clarity: 3, discAdaptation: 3,
      solutionOrientation: 4, ownership: 4, composure: 4, activeListening: 4,
    },
    totalScore: 74,
  };
  return {
    generateCoaching: jest.fn().mockResolvedValue(mock),
    generateCoachingStream: jest.fn().mockImplementation(
      (_t: unknown, _e: unknown, _p: unknown, _c: unknown, _r: unknown, _onProgress: unknown) =>
        Promise.resolve(mock),
    ),
  };
});

// The end-session route streams responses as Server-Sent Events. supertest
// accumulates the whole response into res.text — pull the 'complete' payload
// out of it for assertions.
function parseSseComplete(text: string): Record<string, unknown> | null {
  for (const evt of text.split('\n\n')) {
    const dataLine = evt.split('\n').find(l => l.startsWith('data: '));
    if (!dataLine) continue;
    try {
      const payload = JSON.parse(dataLine.slice(6));
      if (payload.type === 'complete') return payload;
    } catch { /* not a JSON event, skip */ }
  }
  return null;
}

beforeAll(() => {
  runMigrations(db as unknown as Database.Database);
  seedTestData(db as unknown as Database.Database);
});

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token;
}

describe('POST /api/sessions', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/sessions').send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 if fields missing', async () => {
    const token = await getToken('pm@test.com', 'pm123');
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ scenarioSlug: 'test-scenario' });
    expect(res.status).toBe(400);
  });

  it('creates a session and returns sessionId', async () => {
    // Seed a disc profile for the test
    (db as unknown as Database.Database)
      .prepare("INSERT OR IGNORE INTO disc_profiles (code, name, body_markdown) VALUES ('S', 'Steadiness', '# S')")
      .run();

    const token = await getToken('pm@test.com', 'pm123');
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ scenarioSlug: 'test-scenario', clientDiscCode: 'S' });
    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeDefined();
  });
});

describe('POST /api/sessions/:id/end', () => {
  let sessionId: number;
  let pmToken: string;

  beforeAll(async () => {
    pmToken = await getToken('pm@test.com', 'pm123');

    // Seed D profile for PM user (PM has disc_profile = 'S' from seed, D for client)
    (db as unknown as Database.Database)
      .prepare("INSERT OR IGNORE INTO disc_profiles (code, name, body_markdown) VALUES ('D', 'Dominance', '# D')")
      .run();

    // Create a session
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ scenarioSlug: 'test-scenario', clientDiscCode: 'D' });
    sessionId = res.body.sessionId;

    // Insert a test turn directly into DB (simulating ElevenLabs webhook)
    (db as unknown as Database.Database)
      .prepare("INSERT INTO turns (session_id, speaker, content) VALUES (?, 'pm', 'Hi, I have bad news about the schedule.')")
      .run(sessionId);
    (db as unknown as Database.Database)
      .prepare("INSERT INTO turns (session_id, speaker, content) VALUES (?, 'client', 'What kind of bad news?')")
      .run(sessionId);
  });

  it('returns 404 for non-existent session', async () => {
    const res = await request(app)
      .post('/api/sessions/99999/end')
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(404);
  });

  it('returns coaching with totalScore', async () => {
    const res = await request(app)
      .post(`/api/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(200);
    const complete = parseSseComplete(res.text);
    expect(complete?.totalScore).toBe(74);
    expect(complete?.strengths).toBeDefined();
    expect(complete?.scoreBreakdown).toBeDefined();
  });

  it('returns existing coaching if session already ended', async () => {
    const res = await request(app)
      .post(`/api/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(200);
  });

  it('accepts turns in request body and generates coaching', async () => {
    // Create a fresh session for this test
    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ scenarioSlug: 'test-scenario', clientDiscCode: 'D' });
    const newSessionId = sessionRes.body.sessionId;

    const res = await request(app)
      .post(`/api/sessions/${newSessionId}/end`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        turns: [
          { speaker: 'pm', content: 'Hi, I have difficult news about the schedule.' },
          { speaker: 'client', content: 'What kind of news?' },
          { speaker: 'pm', content: 'We are delayed by 6 weeks due to a cabinet manufacturer fire.' },
        ],
        events: [
          { type: 'user_interrupted_agent', speaker: 'pm' },
        ],
      });

    expect(res.status).toBe(200);
    const complete = parseSseComplete(res.text);
    expect(complete?.totalScore).toBe(74); // from mock
    expect(complete?.scoreBreakdown).toBeDefined();
  });
});

describe('GET /api/sessions', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(401);
  });

  it('returns sessions for authenticated user', async () => {
    const token = await getToken('pm@test.com', 'pm123');
    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
