import { setupTestDb } from './helpers';
setupTestDb();

import request from 'supertest';
import db from '../src/db/connection';
import { runMigrations, seedTestData } from './helpers';
import app from '../src/index';

beforeAll(() => {
  runMigrations(db as any);
  seedTestData(db as any);
  // Seed the 'PM' user_type (done by seed.ts in production; we do it here for tests)
  db.prepare("INSERT OR IGNORE INTO user_types (name) VALUES ('PM')").run();
});

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token;
}

describe('GET /api/admin/user-types', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/admin/user-types');
    expect(res.status).toBe(401);
  });

  it('returns 403 for pm role', async () => {
    const token = await getToken('pm@test.com', 'pm123');
    const res = await request(app)
      .get('/api/admin/user-types')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('lists user types (has PM seeded)', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    const res = await request(app)
      .get('/api/admin/user-types')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const names = res.body.map((t: any) => t.name);
    expect(names).toContain('PM');
  });
});

describe('POST /api/admin/user-types', () => {
  it('adds a new user type', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    const res = await request(app)
      .post('/api/admin/user-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sales' });
    expect(res.status).toBe(200);
    const names = res.body.map((t: any) => t.name);
    expect(names).toContain('Sales');
  });

  it('returns 400 when name is missing', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    const res = await request(app)
      .post('/api/admin/user-types')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name required/i);
  });

  it('is idempotent (INSERT OR IGNORE)', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    await request(app)
      .post('/api/admin/user-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate' });
    const res = await request(app)
      .post('/api/admin/user-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate' });
    expect(res.status).toBe(200);
    const names = res.body.map((t: any) => t.name);
    expect(names.filter((n: string) => n === 'Duplicate').length).toBe(1);
  });
});

describe('DELETE /api/admin/user-types/:name', () => {
  it('deletes unused user type', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    // Add a type to delete
    await request(app)
      .post('/api/admin/user-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ToDelete' });

    const res = await request(app)
      .delete('/api/admin/user-types/ToDelete')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const names = res.body.map((t: any) => t.name);
    expect(names).not.toContain('ToDelete');
  });

  it('returns 409 when user type is in use by a user', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    // Ensure 'InUseType' exists
    await request(app)
      .post('/api/admin/user-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'InUseType' });

    // Create a user with that type
    await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Type User',
        email: 'typeuser@test.com',
        password: 'pass123',
        disc_profile: 'D',
        role: 'pm',
        user_type: 'InUseType',
      });

    const res = await request(app)
      .delete('/api/admin/user-types/InUseType')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/In use/i);
  });
});

describe('user_type on users', () => {
  it('creates user with user_type and returns it', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    const createRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Typed PM',
        email: 'typed-pm@test.com',
        password: 'pass123',
        disc_profile: 'I',
        role: 'pm',
        user_type: 'PM',
      });
    expect(createRes.status).toBe(201);
    const userId = createRes.body.id;

    const detailRes = await request(app)
      .get(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.user_type).toBe('PM');
  });

  it('PATCH updates user_type', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    const createRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Patch Type PM',
        email: 'patch-type-pm@test.com',
        password: 'pass123',
        disc_profile: 'C',
        role: 'pm',
      });
    expect(createRes.status).toBe(201);
    const userId = createRes.body.id;

    await request(app)
      .patch(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_type: 'PM' });

    const detailRes = await request(app)
      .get(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detailRes.body.user_type).toBe('PM');
  });

  it('user_type is returned in GET /api/admin/users list', async () => {
    const token = await getToken('admin@test.com', 'admin123');
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Every user object should have user_type key (may be null)
    for (const u of res.body) {
      expect(u).toHaveProperty('user_type');
    }
  });
});
