import { setupTestDb } from './helpers';
setupTestDb();

import request from 'supertest';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { runMigrations, seedTestData } from './helpers';
import db from '../src/db/connection';
import app from '../src/index';

// Mock the coaching service to avoid real API calls in tests
jest.mock('../src/services/coaching/service', () => {
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

function parseSseComplete(text: string): Record<string, unknown> | null {
  for (const evt of text.split('\n\n')) {
    const dataLine = evt.split('\n').find(l => l.startsWith('data: '));
    if (!dataLine) continue;
    try {
      const payload = JSON.parse(dataLine.slice(6));
      if (payload.type === 'complete') return payload;
    } catch { /* skip */ }
  }
  return null;
}

// Mock the ElevenLabs CAI service to avoid real API calls
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

beforeAll(() => {
  runMigrations(db as unknown as Database.Database);
  seedTestData(db as unknown as Database.Database);
  // Seed required DISC profile
  (db as unknown as Database.Database)
    .prepare("INSERT OR IGNORE INTO disc_profiles (code, name, body_markdown) VALUES ('S', 'Steadiness', '# S')")
    .run();
});

function makeSignature(body: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const hmac = crypto.createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

describe('POST /api/sessions (with ElevenLabs)', () => {
  it('returns signedUrl and personaPrompt', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'pm@test.com', password: 'pm123' });
    const token = loginRes.body.token;

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ scenarioSlug: 'test-scenario', clientDiscCode: 'S' });

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeDefined();
    expect(res.body.signedUrl).toContain('wss://');
    expect(res.body.personaPrompt).toBeDefined();
    expect(res.body.voiceName).toBe('Test Voice');
  });
});

describe('POST /api/elevenlabs/webhook', () => {
  let sessionId: number;

  beforeAll(async () => {
    // Mark any existing sessions as linked so only our new session has NULL conversation_id
    (db as unknown as Database.Database)
      .prepare("UPDATE sessions SET elevenlabs_conversation_id = 'pre-existing' WHERE elevenlabs_conversation_id IS NULL")
      .run();

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'pm@test.com', password: 'pm123' });
    const token = loginRes.body.token;

    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ scenarioSlug: 'test-scenario', clientDiscCode: 'S' });
    sessionId = sessionRes.body.sessionId;
  });

  it('returns 401 for invalid signature when secret is set', async () => {
    process.env.ELEVENLABS_WEBHOOK_SECRET = 'test-secret';
    const body = JSON.stringify({ type: 'conversation_started', conversation_id: 'conv-123' });

    const res = await request(app)
      .post('/api/elevenlabs/webhook')
      .set('Content-Type', 'application/json')
      .set('ElevenLabs-Signature', 'invalid-signature')
      .send(body);

    expect(res.status).toBe(401);
    delete process.env.ELEVENLABS_WEBHOOK_SECRET;
  });

  it('processes conversation_started event and links session', async () => {
    const conversationId = `conv-${sessionId}`;
    const body = JSON.stringify({ type: 'conversation_started', conversation_id: conversationId });

    const res = await request(app)
      .post('/api/elevenlabs/webhook')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(200);

    // Verify session was linked
    const session = (db as unknown as Database.Database)
      .prepare('SELECT elevenlabs_conversation_id FROM sessions WHERE id = ?')
      .get(sessionId) as { elevenlabs_conversation_id: string | null };
    expect(session.elevenlabs_conversation_id).toBe(conversationId);
  });

  it('processes turn event and persists to turns table', async () => {
    const conversationId = `conv-${sessionId}`;
    const body = JSON.stringify({
      type: 'turn',
      conversation_id: conversationId,
      role: 'user',
      message: 'Hi, this is a test turn from the PM.',
    });

    const res = await request(app)
      .post('/api/elevenlabs/webhook')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(200);

    const turns = (db as unknown as Database.Database)
      .prepare("SELECT * FROM turns WHERE session_id = ? AND speaker = 'pm'")
      .all(sessionId) as { content: string }[];
    expect(turns.some(t => t.content === 'Hi, this is a test turn from the PM.')).toBe(true);
  });

  it('processes interruption event and persists to events table', async () => {
    const conversationId = `conv-${sessionId}`;
    const body = JSON.stringify({
      type: 'interruption',
      conversation_id: conversationId,
      role: 'user', // PM interrupted the client
    });

    const res = await request(app)
      .post('/api/elevenlabs/webhook')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(200);

    const events = (db as unknown as Database.Database)
      .prepare("SELECT * FROM events WHERE session_id = ? AND type = 'user_interrupted_agent'")
      .all(sessionId);
    expect(events.length).toBeGreaterThan(0);
  });

  it('verifyWebhookSignature returns true for valid signature', async () => {
    const { verifyWebhookSignature } = await import('../src/services/elevenlabs-cai');
    const secret = 'my-test-secret';
    const rawBody = '{"type":"turn"}';
    const sig = makeSignature(rawBody, secret);
    expect(verifyWebhookSignature(rawBody, sig, secret)).toBe(true);
  });

  it('verifyWebhookSignature returns false for tampered body', async () => {
    const { verifyWebhookSignature } = await import('../src/services/elevenlabs-cai');
    const secret = 'my-test-secret';
    const rawBody = '{"type":"turn"}';
    const sig = makeSignature(rawBody, secret);
    expect(verifyWebhookSignature('{"type":"tampered"}', sig, secret)).toBe(false);
  });
});

describe('POST /api/sessions/:id/end', () => {
  let sessionId: number;
  let pmToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'pm@test.com', password: 'pm123' });
    pmToken = loginRes.body.token;

    // Seed D profile if not already present
    (db as unknown as Database.Database)
      .prepare("INSERT OR IGNORE INTO disc_profiles (code, name, body_markdown) VALUES ('D', 'Dominance', '# D')")
      .run();

    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ scenarioSlug: 'test-scenario', clientDiscCode: 'D' });
    sessionId = sessionRes.body.sessionId;
  });

  it('returns coaching with totalScore', async () => {
    const res = await request(app)
      .post(`/api/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        turns: [
          { speaker: 'pm', content: 'Hi, I have bad news about the schedule.' },
          { speaker: 'client', content: 'What kind of bad news?' },
        ],
      });
    expect(res.status).toBe(200);
    const complete = parseSseComplete(res.text);
    expect(complete?.totalScore).toBe(74);
    expect(complete?.strengths).toBeDefined();
    expect(complete?.scoreBreakdown).toBeDefined();
  });
});
