/**
 * roles-unify.test.ts
 *
 * Tests for "Unify Role + User Type into a single Role" (§13.23):
 *  - user_types (roles registry) seeded with Admin + PM
 *  - Admin role is reserved — cannot be deleted
 *  - POST /api/admin/users with unified role name
 *  - PATCH /api/admin/users/:id with role name flips derived flag
 *  - requireAdmin admits Admin-role user; blocks member
 *  - Migration backfill: legacy admin → 'Admin'; untyped pm → 'PM'
 */

import { setupTestDb } from './helpers';
setupTestDb(); // Must be before all other imports

import request from 'supertest';
import bcrypt from 'bcrypt';
import db from '../src/db/connection';
import { runMigrations, seedTestData } from './helpers';
import app from '../src/index';

// ── helpers ──────────────────────────────────────────────────────────────────

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/auth/login').send({ email, password });
  if (!res.body.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeAll(() => {
  runMigrations(db as any);
  seedTestData(db as any);
  // Seed roles registry (mirrors seedUserTypes() in production)
  db.prepare("INSERT OR IGNORE INTO user_types (name) VALUES ('Admin')").run();
  db.prepare("INSERT OR IGNORE INTO user_types (name) VALUES ('PM')").run();
});

// ── 1. Roles registry ─────────────────────────────────────────────────────────

describe('roles registry seed', () => {
  it('contains Admin', async () => {
    const adminToken = await getToken('admin@test.com', 'admin123');
    const res = await request(app)
      .get('/api/admin/user-types')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const names = res.body.map((t: any) => t.name);
    expect(names).toContain('Admin');
  });

  it('contains PM', async () => {
    const adminToken = await getToken('admin@test.com', 'admin123');
    const res = await request(app)
      .get('/api/admin/user-types')
      .set('Authorization', `Bearer ${adminToken}`);
    const names = res.body.map((t: any) => t.name);
    expect(names).toContain('PM');
  });
});

// ── 2. Admin role is reserved ─────────────────────────────────────────────────

describe('Admin role is reserved', () => {
  it('DELETE /api/admin/user-types/Admin → 400 (reserved)', async () => {
    const adminToken = await getToken('admin@test.com', 'admin123');
    const res = await request(app)
      .delete('/api/admin/user-types/Admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reserved/i);
  });

  it('DELETE an unused custom role → 200', async () => {
    const adminToken = await getToken('admin@test.com', 'admin123');
    // Add the custom role first
    await request(app)
      .post('/api/admin/user-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CustomToDelete' });

    const res = await request(app)
      .delete('/api/admin/user-types/CustomToDelete')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const names = res.body.map((t: any) => t.name);
    expect(names).not.toContain('CustomToDelete');
  });
});

// ── 3. POST /api/admin/users with unified role name ───────────────────────────

describe('POST /api/admin/users with role name', () => {
  let adminToken: string;
  beforeAll(async () => {
    adminToken = await getToken('admin@test.com', 'admin123');
    // Add a custom role for tests
    await request(app)
      .post('/api/admin/user-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sales' });
  });

  it('role:Sales → user_type=Sales, derived role flag=pm', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sales Rep',
        email: 'sales-rep@test.com',
        password: 'pass123',
        disc_profile: 'I',
        role: 'Sales',
      });
    expect(res.status).toBe(201);
    const userId = res.body.id;

    const detail = await request(app)
      .get(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.user_type).toBe('Sales');
    expect(detail.body.role).toBe('pm');
  });

  it('role:Admin → user_type=Admin, derived role flag=admin', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Admin',
        email: 'new-admin@test.com',
        password: 'pass123',
        disc_profile: 'D',
        role: 'Admin',
      });
    expect(res.status).toBe(201);
    const userId = res.body.id;

    const detail = await request(app)
      .get(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.user_type).toBe('Admin');
    expect(detail.body.role).toBe('admin');
  });

  it('role:PM → user_type=PM, derived role flag=pm', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Regular PM',
        email: 'regular-pm-unify@test.com',
        password: 'pass123',
        disc_profile: 'S',
        role: 'PM',
      });
    expect(res.status).toBe(201);
    const userId = res.body.id;

    const detail = await request(app)
      .get(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.user_type).toBe('PM');
    expect(detail.body.role).toBe('pm');
  });

  it('role not in registry → 400', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Unknown Role User',
        email: 'unknown-role@test.com',
        password: 'pass123',
        disc_profile: 'C',
        role: 'Janitor',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not exist/i);
  });

  it('missing role field → 400', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'No Role User',
        email: 'no-role@test.com',
        password: 'pass123',
        disc_profile: 'D',
      });
    expect(res.status).toBe(400);
  });
});

// ── 4. PATCH /api/admin/users/:id with role name ──────────────────────────────

describe('PATCH /api/admin/users/:id role name', () => {
  let adminToken: string;
  let userId: number;

  beforeAll(async () => {
    adminToken = await getToken('admin@test.com', 'admin123');
    // Create a PM to patch
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Patchable User',
        email: 'patchable@test.com',
        password: 'pass123',
        disc_profile: 'S',
        role: 'PM',
      });
    userId = res.body.id;
  });

  it('{role:Admin} flips derived flag to admin', async () => {
    await request(app)
      .patch(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'Admin' });

    const detail = await request(app)
      .get(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.role).toBe('admin');
    expect(detail.body.user_type).toBe('Admin');
  });

  it('{role:PM} flips derived flag back to pm', async () => {
    await request(app)
      .patch(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'PM' });

    const detail = await request(app)
      .get(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.role).toBe('pm');
    expect(detail.body.user_type).toBe('PM');
  });

  it('{role: nonexistent} → 400', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'Ghost' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not exist/i);
  });

  it('patch without role field leaves role unchanged', async () => {
    // First make sure it's PM
    await request(app)
      .patch(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'PM' });

    // Patch only the name
    await request(app)
      .patch(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Patchable Renamed' });

    const detail = await request(app)
      .get(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.role).toBe('pm');
    expect(detail.body.user_type).toBe('PM');
    expect(detail.body.name).toBe('Patchable Renamed');
  });
});

// ── 5. requireAdmin — admits Admin-role user, blocks member ──────────────────

describe('requireAdmin access control', () => {
  let memberToken: string;
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getToken('admin@test.com', 'admin123');

    // Create a member user (role='PM')
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Access Check Member',
        email: 'access-member@test.com',
        password: 'pass456',
        disc_profile: 'C',
        role: 'PM',
      });
    expect(res.status).toBe(201);
    memberToken = await getToken('access-member@test.com', 'pass456');
  });

  it('Admin-role user (db role=admin) can reach an admin route', async () => {
    const res = await request(app)
      .get('/api/admin/user-types')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('member (db role=pm) gets 403 on admin route', async () => {
    const res = await request(app)
      .get('/api/admin/user-types')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('unauthenticated request gets 401 on admin route', async () => {
    const res = await request(app).get('/api/admin/user-types');
    expect(res.status).toBe(401);
  });
});

// ── 6. Migration backfill ─────────────────────────────────────────────────────

describe('migration backfill', () => {
  it('legacy role=admin, null user_type → user_type becomes Admin after migration', () => {
    // Use a fresh in-memory db for this test so we don't pollute the shared db
    const Database = require('better-sqlite3');
    const freshDb = new Database(':memory:');
    const path = require('path');
    const fs = require('fs');

    // Apply schema
    const schemaPath = path.resolve(__dirname, '../src/db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    const stmts = sql.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    for (const stmt of stmts) freshDb.exec(stmt + ';');

    // Insert a legacy admin user with null user_type
    const hash = bcrypt.hashSync('pass', 1);
    freshDb.prepare(
      'INSERT INTO users (name, email, password_hash, disc_profile, role) VALUES (?, ?, ?, ?, ?)'
    ).run('Legacy Admin', 'legacy-admin@test.com', hash, 'D', 'admin');

    // Insert a legacy pm user with null user_type
    freshDb.prepare(
      'INSERT INTO users (name, email, password_hash, disc_profile, role) VALUES (?, ?, ?, ?, ?)'
    ).run('Legacy PM', 'legacy-pm@test.com', hash, 'S', 'pm');

    // Insert a pm user with an existing user_type (should keep it)
    freshDb.prepare(
      'INSERT INTO users (name, email, password_hash, disc_profile, role, user_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('Typed PM', 'typed-pm-migr@test.com', hash, 'I', 'pm', 'Sales');

    // Run the backfill (same SQL as migrate.ts)
    freshDb.exec(`
      UPDATE users SET user_type = CASE
        WHEN lower(role) = 'admin' THEN 'Admin'
        WHEN user_type IS NULL OR user_type = '' THEN 'PM'
        ELSE user_type
      END
    `);

    const admin = freshDb.prepare('SELECT user_type FROM users WHERE email = ?').get('legacy-admin@test.com') as { user_type: string };
    const pm = freshDb.prepare('SELECT user_type FROM users WHERE email = ?').get('legacy-pm@test.com') as { user_type: string };
    const typed = freshDb.prepare('SELECT user_type FROM users WHERE email = ?').get('typed-pm-migr@test.com') as { user_type: string };

    expect(admin.user_type).toBe('Admin');
    expect(pm.user_type).toBe('PM');
    expect(typed.user_type).toBe('Sales'); // preserved

    freshDb.close();
  });

  it('backfill is idempotent — running twice yields the same result', () => {
    const Database = require('better-sqlite3');
    const freshDb = new Database(':memory:');
    const path = require('path');
    const fs = require('fs');

    const schemaPath = path.resolve(__dirname, '../src/db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    const stmts = sql.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    for (const stmt of stmts) freshDb.exec(stmt + ';');

    const hash = bcrypt.hashSync('pass', 1);
    freshDb.prepare(
      'INSERT INTO users (name, email, password_hash, disc_profile, role) VALUES (?, ?, ?, ?, ?)'
    ).run('Idempotent Admin', 'idem-admin@test.com', hash, 'D', 'admin');

    const backfill = `
      UPDATE users SET user_type = CASE
        WHEN lower(role) = 'admin' THEN 'Admin'
        WHEN user_type IS NULL OR user_type = '' THEN 'PM'
        ELSE user_type
      END
    `;
    freshDb.exec(backfill);
    freshDb.exec(backfill); // run twice

    const row = freshDb.prepare('SELECT user_type FROM users WHERE email = ?').get('idem-admin@test.com') as { user_type: string };
    expect(row.user_type).toBe('Admin');

    freshDb.close();
  });
});
