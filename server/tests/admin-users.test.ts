import { setupTestDb } from './helpers';
setupTestDb();
import request from 'supertest';
import db from '../src/db/connection';
import { runMigrations, seedTestData } from './helpers';
import app from '../src/index';

let token: string;
beforeAll(async () => {
  runMigrations(db as any);
  seedTestData(db as any);
  const res = await request(app).post('/auth/login').send({ email: 'admin@test.com', password: 'admin123' });
  token = res.body.token;
});

it('summary lists all users including the admin', async () => {
  const res = await request(app)
    .get('/api/admin/summary')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.pms.map((u: any) => u.email)).toContain('admin@test.com');
});

it('summary pms array includes non-admin users too', async () => {
  const res = await request(app)
    .get('/api/admin/summary')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.pms.map((u: any) => u.email)).toContain('pm@test.com');
});

it('summary cohort.totalPMs excludes admins', async () => {
  const res = await request(app)
    .get('/api/admin/summary')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  // seedTestData creates 1 PM and 1 admin; totalPMs should count only PMs
  expect(res.body.cohort.totalPMs).toBe(1);
});

it('GET /users includes admin users', async () => {
  const res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.map((u: any) => u.email)).toContain('admin@test.com');
  expect(res.body.map((u: any) => u.email)).toContain('pm@test.com');
});

describe('DELETE /api/admin/users/:id (guarded)', () => {
  function insertUser(email: string, role = 'pm'): number {
    const r = db.prepare(
      'INSERT INTO users (name, email, password_hash, disc_profile, role) VALUES (?, ?, ?, ?, ?)'
    ).run('Throwaway', email, 'x', 'D', role);
    return Number(r.lastInsertRowid);
  }

  it('hard-deletes a user with no sessions', async () => {
    const id = insertUser('nosessions@test.com');
    const res = await request(app)
      .delete(`/api/admin/users/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
    const gone = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    expect(gone).toBeUndefined();
  });

  it('refuses (409) to delete a user that has sessions', async () => {
    const id = insertUser('hassessions@test.com');
    db.prepare(
      'INSERT INTO sessions (user_id, scenario_id, client_disc_id) VALUES (?, ?, ?)'
    ).run(id, 1, 1);
    const res = await request(app)
      .delete(`/api/admin/users/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.sessionCount).toBe(1);
    // user still present
    expect(db.prepare('SELECT id FROM users WHERE id = ?').get(id)).toBeTruthy();
  });

  it('refuses (400) to delete your own account', async () => {
    const meId = (db.prepare('SELECT id FROM users WHERE email = ?').get('admin@test.com') as { id: number }).id;
    const res = await request(app)
      .delete(`/api/admin/users/${meId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(db.prepare('SELECT id FROM users WHERE id = ?').get(meId)).toBeTruthy();
  });
});
