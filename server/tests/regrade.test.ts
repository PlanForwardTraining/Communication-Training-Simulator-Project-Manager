/**
 * Tests for POST /api/admin/sessions/:id/regrade
 *
 * generateCoaching is mocked so no real LLM calls are made.
 * We insert a real session + turns via better-sqlite3 and call the route via supertest.
 */

import { setupTestDb } from './helpers';
setupTestDb();

import request from 'supertest';
import Database from 'better-sqlite3';
import { runMigrations, seedTestData } from './helpers';
import db from '../src/db/connection';
import app from '../src/index';

// ---- mock coaching service ----
// NOTE: jest.mock is hoisted above any top-level const, so the canned value
// must live inside the factory function.
jest.mock('../src/services/coaching/service', () => ({
  generateCoaching: jest.fn().mockResolvedValue({
    strengths: '- Great rapport',
    misses: '- Missed Up-Front Contract',
    alternatives: '- Try reversing',
    discAdaptation: '- Slower pace for S client',
    scoreBreakdown: {
      empathy: 4, clarity: 3, discAdaptation: 4,
      solutionOrientation: 4, ownership: 3, composure: 4, activeListening: 4,
    },
    totalScore: 77,
    gradedProvider: 'openai',
    gradedModel: 'gpt-4o',
  }),
  generateCoachingStream: jest.fn(),
}));

// ---- mock Excel regeneration ----
jest.mock('../src/services/excel', () => ({
  regenerateExcel: jest.fn().mockResolvedValue(undefined),
  EXCEL_PATH: '/tmp/test.xlsx',
}));

let adminToken: string;
let pmToken: string;

beforeAll(() => {
  runMigrations(db as unknown as Database.Database);
  seedTestData(db as unknown as Database.Database);
});

beforeEach(async () => {
  const adminRes = await request(app).post('/auth/login').send({ email: 'admin@test.com', password: 'admin123' });
  adminToken = adminRes.body.token;
  const pmRes = await request(app).post('/auth/login').send({ email: 'pm@test.com', password: 'pm123' });
  pmToken = pmRes.body.token;
});

// Helper: insert a session with optional turns and return its id
function insertSession(opts: { withTurns?: boolean; ended?: boolean } = {}): number {
  const scenario = db.prepare('SELECT id FROM scenarios WHERE slug = ?').get('test-scenario') as { id: number };
  const pm = db.prepare('SELECT id FROM users WHERE email = ?').get('pm@test.com') as { id: number };
  const disc = db.prepare('SELECT id FROM disc_profiles WHERE code = ?').get('D') as { id: number };

  const result = db.prepare(
    `INSERT INTO sessions (user_id, scenario_id, client_disc_id, voice_id, voice_name${opts.ended ? ', ended_at' : ''})
     VALUES (?, ?, ?, ?, ?${opts.ended ? ", CURRENT_TIMESTAMP" : ''})`,
  ).run(pm.id, scenario.id, disc.id, 'v1', 'Test Voice');

  const sessionId = result.lastInsertRowid as number;

  if (opts.withTurns) {
    db.prepare("INSERT INTO turns (session_id, speaker, content) VALUES (?, 'pm', ?)").run(sessionId, 'Hello there');
    db.prepare("INSERT INTO turns (session_id, speaker, content) VALUES (?, 'client', ?)").run(sessionId, 'Hi, how can I help?');
  }

  return sessionId;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('POST /api/admin/sessions/:id/regrade — auth', () => {
  it('returns 401 without a token', async () => {
    const id = insertSession({ withTurns: true });
    const res = await request(app).post(`/api/admin/sessions/${id}/regrade`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-admin (pm) token', async () => {
    const id = insertSession({ withTurns: true });
    const res = await request(app)
      .post(`/api/admin/sessions/${id}/regrade`)
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 404 / 400 guards
// ---------------------------------------------------------------------------

describe('POST /api/admin/sessions/:id/regrade — guards', () => {
  it('returns 404 for a non-existent session', async () => {
    const res = await request(app)
      .post('/api/admin/sessions/999999/regrade')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 when the session has no turns', async () => {
    const id = insertSession({ withTurns: false });
    const res = await request(app)
      .post(`/api/admin/sessions/${id}/regrade`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no transcript/i);
  });
});

// ---------------------------------------------------------------------------
// Happy path — session with turns
// ---------------------------------------------------------------------------

describe('POST /api/admin/sessions/:id/regrade — success', () => {
  it('returns 200 with regraded=true and coaching metadata', async () => {
    const id = insertSession({ withTurns: true });
    const res = await request(app)
      .post(`/api/admin/sessions/${id}/regrade`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      regraded: true,
      gradedProvider: 'openai',
      gradedModel: 'gpt-4o',
      totalScore: 77,
    });
  });

  it('saves a coaching row to the DB', async () => {
    const id = insertSession({ withTurns: true });
    await request(app)
      .post(`/api/admin/sessions/${id}/regrade`)
      .set('Authorization', `Bearer ${adminToken}`);
    const row = db.prepare('SELECT * FROM coaching WHERE session_id = ?').get(id) as any;
    expect(row).toBeTruthy();
    expect(row.total_score).toBe(77);
    expect(row.coaching_provider).toBe('openai');
    expect(row.coaching_model).toBe('gpt-4o');
  });

  it('sets ended_at on a session that had no ended_at', async () => {
    const id = insertSession({ withTurns: true, ended: false });
    // Confirm no ended_at before
    const before = db.prepare('SELECT ended_at FROM sessions WHERE id = ?').get(id) as any;
    expect(before.ended_at).toBeNull();

    await request(app)
      .post(`/api/admin/sessions/${id}/regrade`)
      .set('Authorization', `Bearer ${adminToken}`);

    const after = db.prepare('SELECT ended_at FROM sessions WHERE id = ?').get(id) as any;
    expect(after.ended_at).not.toBeNull();
  });

  it('preserves the existing ended_at when the session was already ended', async () => {
    const id = insertSession({ withTurns: true, ended: true });
    const before = db.prepare('SELECT ended_at FROM sessions WHERE id = ?').get(id) as any;

    await request(app)
      .post(`/api/admin/sessions/${id}/regrade`)
      .set('Authorization', `Bearer ${adminToken}`);

    const after = db.prepare('SELECT ended_at FROM sessions WHERE id = ?').get(id) as any;
    // ended_at should remain the same value (not overwritten)
    expect(after.ended_at).toBe(before.ended_at);
  });

  it('updates total_score on the sessions row', async () => {
    const id = insertSession({ withTurns: true });
    await request(app)
      .post(`/api/admin/sessions/${id}/regrade`)
      .set('Authorization', `Bearer ${adminToken}`);
    const row = db.prepare('SELECT total_score FROM sessions WHERE id = ?').get(id) as any;
    expect(row.total_score).toBe(77);
  });

  it('replaces an existing coaching row (INSERT OR REPLACE)', async () => {
    const id = insertSession({ withTurns: true });
    // Insert an old coaching row first
    db.prepare(`
      INSERT INTO coaching
        (session_id, strengths, misses, alternatives, disc_adaptation,
         score_breakdown_json, total_score, coaching_provider, coaching_model)
      VALUES (?, 'old', 'old', 'old', 'old', '{}', 50, 'gemini', 'gemini-2.5-pro')
    `).run(id);

    await request(app)
      .post(`/api/admin/sessions/${id}/regrade`)
      .set('Authorization', `Bearer ${adminToken}`);

    const row = db.prepare('SELECT total_score, coaching_provider FROM coaching WHERE session_id = ?').get(id) as any;
    expect(row.total_score).toBe(77);
    expect(row.coaching_provider).toBe('openai');
  });
});

// ---------------------------------------------------------------------------
// Soft-deleted session returns 404
// ---------------------------------------------------------------------------

describe('POST /api/admin/sessions/:id/regrade — soft-deleted', () => {
  it('returns 404 for a soft-deleted session', async () => {
    const id = insertSession({ withTurns: true });
    db.prepare("UPDATE sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    const res = await request(app)
      .post(`/api/admin/sessions/${id}/regrade`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
