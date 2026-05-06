import { setupTestDb } from './helpers';
setupTestDb(); // Must be before all other imports

import request from 'supertest';
import Database from 'better-sqlite3';
import { runMigrations, seedTestData } from './helpers';
import db from '../src/db/connection';
import app from '../src/index';

// Run migrations and seed on the in-memory DB
beforeAll(() => {
  runMigrations(db as unknown as Database.Database);
  seedTestData(db as unknown as Database.Database);
});

describe('POST /auth/login', () => {
  it('returns 400 if email or password missing', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'admin@test.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns token and user for valid admin login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('returns token for valid pm login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'pm@test.com', password: 'pm123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('pm');
  });
});

describe('GET /auth/me', () => {
  let adminToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    adminToken = res.body.token;
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user for valid token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@test.com');
    expect(res.body.password_hash).toBeUndefined();
  });
});
