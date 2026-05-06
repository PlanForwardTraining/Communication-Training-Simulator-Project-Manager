import { setupTestDb } from './helpers';
setupTestDb();

import request from 'supertest';
import Database from 'better-sqlite3';
import { runMigrations, seedTestData } from './helpers';
import db from '../src/db/connection';
import app from '../src/index';

// Mock the Claude service to avoid real API calls in tests
jest.mock('../src/services/claude', () => ({
  generateCoaching: jest.fn().mockResolvedValue({
    strengths: 'Good empathy shown.',
    misses: 'Could have been clearer.',
    alternatives: 'Try saying: I understand this is difficult.',
    discAdaptation: 'As a D talking to an S, slow down.',
    scoreBreakdown: {
      empathy: 4, clarity: 3, discAdaptation: 3,
      solutionOrientation: 4, ownership: 4, composure: 4, activeListening: 4,
    },
    totalScore: 74,
  }),
}));

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
    expect(res.body.totalScore).toBe(74);
    expect(res.body.strengths).toBeDefined();
    expect(res.body.scoreBreakdown).toBeDefined();
  });

  it('returns existing coaching if session already ended', async () => {
    const res = await request(app)
      .post(`/api/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(200);
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
