import { setupTestDb } from './helpers';
setupTestDb();

import request from 'supertest';
import Database from 'better-sqlite3';
import { runMigrations, seedTestData } from './helpers';
import db from '../src/db/connection';
import app from '../src/index';

beforeAll(() => {
  runMigrations(db as unknown as Database.Database);
  seedTestData(db as unknown as Database.Database);
});

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token;
}

describe('GET /api/scenarios', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/scenarios');
    expect(res.status).toBe(401);
  });

  it('returns scenarios for authenticated user', async () => {
    const token = await getToken('pm@test.com', 'pm123');
    const res = await request(app)
      .get('/api/scenarios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].slug).toBe('test-scenario');
  });
});

describe('POST /api/scenarios (admin only)', () => {
  it('returns 403 for pm role', async () => {
    const token = await getToken('pm@test.com', 'pm123');
    const res = await request(app)
      .post('/api/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'new', title: 'New', description: 'desc', body_markdown: '# New' });
    expect(res.status).toBe(403);
  });

  it('creates scenario for admin', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    const validBody = '# Admin Created\n\n## Setup\n\nA brief setup paragraph.\n\n<!-- BRIEF END -->\n\n## Coaching Focus\n\nDetails for the AI.';
    const res = await request(app)
      .post('/api/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'admin-created', title: 'Admin Created', description: 'desc', body_markdown: validBody });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('rejects body without BRIEF END marker', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    const res = await request(app)
      .post('/api/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'no-marker', title: 'No Marker', description: 'desc', body_markdown: '# Body without the marker. Just enough text to pass length check.' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/BRIEF END/);
  });

  it('rejects invalid slug', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    const validBody = '# T\n\n<!-- BRIEF END -->\n\nbody body body body';
    const res = await request(app)
      .post('/api/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'BadSlug WithSpaces', title: 'T', description: 'd', body_markdown: validBody });
    expect(res.status).toBe(400);
  });
});
