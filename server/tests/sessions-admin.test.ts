// Must be first: set test DB before any db/connection import
import { setupTestDb } from './helpers';
setupTestDb();

import request from 'supertest';
import Database from 'better-sqlite3';
import db from '../src/db/connection';
import { runMigrations, seedTestData } from './helpers';
import app from '../src/index';
import {
  listSessions,
  softDeleteSession,
  purgeEmptySessions,
  purgeExpiredSoftDeletes,
} from '../src/services/sessions-admin';

// ---------------------------------------------------------------------------
// Helpers — insert rows into the shared in-memory db
// ---------------------------------------------------------------------------

function insertSession(overrides: {
  userId?: number;
  scenarioId?: number;
  discId?: number;
  endedAt?: string | null;
  deletedAt?: string | null;
}): number {
  const { userId = 2, scenarioId = 1, discId = 1, endedAt = null, deletedAt = null } = overrides;
  const r = (db as unknown as Database.Database).prepare(
    `INSERT INTO sessions (user_id, scenario_id, client_disc_id, ended_at, deleted_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(userId, scenarioId, discId, endedAt, deletedAt);
  return r.lastInsertRowid as number;
}

function insertTurn(sessionId: number): void {
  (db as unknown as Database.Database).prepare(
    `INSERT INTO turns (session_id, speaker, content) VALUES (?, 'pm', 'hello')`,
  ).run(sessionId);
}

function insertEvent(sessionId: number): void {
  (db as unknown as Database.Database).prepare(
    `INSERT INTO events (session_id, type) VALUES (?, 'long_pause')`,
  ).run(sessionId);
}

function insertCoaching(sessionId: number): void {
  (db as unknown as Database.Database).prepare(
    `INSERT INTO coaching (session_id, strengths, misses, alternatives, disc_adaptation, score_breakdown_json, total_score)
     VALUES (?, 'good', 'bad', 'try', 'adapt', '{}', 75)`,
  ).run(sessionId);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

let adminToken: string;

beforeAll(async () => {
  runMigrations(db as unknown as Database.Database);
  seedTestData(db as unknown as Database.Database);
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@test.com', password: 'admin123' });
  adminToken = res.body.token;
});

// ── Service: listSessions ───────────────────────────────────────────────────

describe('listSessions — service', () => {
  let aliveId: number;
  let deletedId: number;

  beforeAll(() => {
    aliveId = insertSession({ endedAt: '2026-01-01T10:00:00' });
    insertTurn(aliveId);
    deletedId = insertSession({ deletedAt: '2026-01-01T09:00:00' });
    insertTurn(deletedId);
  });

  it('excludes soft-deleted sessions', () => {
    const rows = listSessions() as Array<{ id: number }>;
    const ids = rows.map(r => r.id);
    expect(ids).toContain(aliveId);
    expect(ids).not.toContain(deletedId);
  });

  it('derives status=completed when ended_at set and turns>0', () => {
    const row = (listSessions() as Array<{ id: number; status: string }>).find(r => r.id === aliveId);
    expect(row?.status).toBe('completed');
  });

  it('derives status=empty when no turns', () => {
    const emptyId = insertSession({});
    const row = (listSessions() as Array<{ id: number; status: string }>).find(r => r.id === emptyId);
    expect(row?.status).toBe('empty');
  });

  it('derives status=in_progress when turns exist but ended_at is null', () => {
    const ipId = insertSession({ endedAt: null });
    insertTurn(ipId);
    const row = (listSessions() as Array<{ id: number; status: string }>).find(r => r.id === ipId);
    expect(row?.status).toBe('in_progress');
  });

  it('filters by status=completed', () => {
    const rows = listSessions({ status: 'completed' }) as Array<{ status: string }>;
    expect(rows.every(r => r.status === 'completed')).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('filters by userId', () => {
    const rows = listSessions({ userId: 2 }) as Array<{ user_email: string }>;
    expect(rows.every(r => r.user_email === 'pm@test.com')).toBe(true);
  });
});

// ── Service: softDeleteSession ─────────────────────────────────────────────

describe('softDeleteSession — service', () => {
  it('marks the row with deleted_at and returns 1', () => {
    const id = insertSession({ endedAt: '2026-02-01T00:00:00' });
    expect(softDeleteSession(id)).toBe(1);
    const row = (db as unknown as Database.Database)
      .prepare('SELECT deleted_at FROM sessions WHERE id = ?')
      .get(id) as { deleted_at: string | null };
    expect(row.deleted_at).not.toBeNull();
  });

  it('is idempotent — returns 0 on second call', () => {
    const id = insertSession({});
    softDeleteSession(id);
    expect(softDeleteSession(id)).toBe(0);
  });
});

// ── Service: purgeEmptySessions ────────────────────────────────────────────

describe('purgeEmptySessions — service', () => {
  it('soft-deletes sessions with no turns and leaves sessions with turns', () => {
    const withTurnsId = insertSession({});
    insertTurn(withTurnsId);
    const emptyId = insertSession({});

    purgeEmptySessions();

    const withTurnsRow = (db as unknown as Database.Database)
      .prepare('SELECT deleted_at FROM sessions WHERE id = ?')
      .get(withTurnsId) as { deleted_at: string | null };
    const emptyRow = (db as unknown as Database.Database)
      .prepare('SELECT deleted_at FROM sessions WHERE id = ?')
      .get(emptyId) as { deleted_at: string | null };

    expect(withTurnsRow.deleted_at).toBeNull();
    expect(emptyRow.deleted_at).not.toBeNull();
  });
});

// ── Service: purgeExpiredSoftDeletes ───────────────────────────────────────

describe('purgeExpiredSoftDeletes — service', () => {
  it('hard-deletes sessions soft-deleted >30 days ago and cascades', () => {
    const expiredId = insertSession({ deletedAt: '2025-01-01T00:00:00' }); // >30 days old
    insertTurn(expiredId);
    insertEvent(expiredId);
    insertCoaching(expiredId);

    const count = purgeExpiredSoftDeletes();
    expect(count).toBeGreaterThan(0);

    const row = (db as unknown as Database.Database)
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .get(expiredId);
    expect(row).toBeUndefined();

    const turns = (db as unknown as Database.Database)
      .prepare('SELECT id FROM turns WHERE session_id = ?')
      .all(expiredId);
    expect(turns).toHaveLength(0);

    const events = (db as unknown as Database.Database)
      .prepare('SELECT id FROM events WHERE session_id = ?')
      .all(expiredId);
    expect(events).toHaveLength(0);

    const coaching = (db as unknown as Database.Database)
      .prepare('SELECT session_id FROM coaching WHERE session_id = ?')
      .get(expiredId);
    expect(coaching).toBeUndefined();
  });

  it('does NOT delete sessions soft-deleted <30 days ago', () => {
    const recentId = insertSession({ deletedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() });
    purgeExpiredSoftDeletes();
    const row = (db as unknown as Database.Database)
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .get(recentId);
    expect(row).toBeDefined();
  });

  it('returns 0 when no expired rows exist', () => {
    // Remove anything expired first
    (db as unknown as Database.Database).prepare(
      `DELETE FROM sessions WHERE deleted_at IS NOT NULL AND deleted_at <= datetime('now', '-30 days')`,
    ).run();
    expect(purgeExpiredSoftDeletes()).toBe(0);
  });
});

// ── Routes: DELETE /api/admin/sessions/:id ─────────────────────────────────

describe('DELETE /api/admin/sessions/:id', () => {
  it('returns 401 without a token', async () => {
    const id = insertSession({});
    const res = await request(app).delete(`/api/admin/sessions/${id}`);
    expect(res.status).toBe(401);
  });

  it('soft-deletes a session and returns { deleted: true }', async () => {
    const id = insertSession({ endedAt: '2026-03-01T00:00:00' });
    const res = await request(app)
      .delete(`/api/admin/sessions/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const row = (db as unknown as Database.Database)
      .prepare('SELECT deleted_at FROM sessions WHERE id = ?')
      .get(id) as { deleted_at: string | null };
    expect(row.deleted_at).not.toBeNull();
  });

  it('returns 404 for an unknown session id', async () => {
    const res = await request(app)
      .delete('/api/admin/sessions/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ── Routes: POST /api/admin/sessions/purge-empty ──────────────────────────

describe('POST /api/admin/sessions/purge-empty', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/admin/sessions/purge-empty');
    expect(res.status).toBe(401);
  });

  it('purges empty sessions and returns { purged: N }', async () => {
    // Ensure at least one fresh empty session exists
    insertSession({});

    const res = await request(app)
      .post('/api/admin/sessions/purge-empty')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.purged).toBe('number');
    expect(res.body.purged).toBeGreaterThan(0);
  });
});

// ── Routes: GET /api/admin/sessions ───────────────────────────────────────

describe('GET /api/admin/sessions', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/admin/sessions');
    expect(res.status).toBe(401);
  });

  it('returns a list excluding soft-deleted sessions', async () => {
    const liveId = insertSession({ endedAt: '2026-04-01T00:00:00' });
    insertTurn(liveId);
    const deadId = insertSession({ deletedAt: '2026-01-01T00:00:00' });
    insertTurn(deadId);

    const res = await request(app)
      .get('/api/admin/sessions')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.map((r: { id: number }) => r.id);
    expect(ids).toContain(liveId);
    expect(ids).not.toContain(deadId);
  });

  it('filters by status=empty', async () => {
    const res = await request(app)
      .get('/api/admin/sessions?status=empty')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.every((r: { status: string }) => r.status === 'empty')).toBe(true);
  });
});

// ── Routes: GET /export.xlsx with and without filters ─────────────────────

describe('GET /api/admin/export.xlsx', () => {
  it('returns 200 with spreadsheet content-type (no filters)', async () => {
    const res = await request(app)
      .get('/api/admin/export.xlsx')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('returns 200 with spreadsheet content-type (with userId filter)', async () => {
    const res = await request(app)
      .get('/api/admin/export.xlsx?userId=2')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });
});
