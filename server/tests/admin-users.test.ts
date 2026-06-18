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
