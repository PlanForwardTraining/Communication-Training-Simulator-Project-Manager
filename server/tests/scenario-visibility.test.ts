import { setupTestDb } from './helpers';
setupTestDb();

import request from 'supertest';
import bcrypt from 'bcrypt';
import db from '../src/db/connection';
import { runMigrations, seedTestData } from './helpers';
import app from '../src/index';

const VALID_BODY = '# Scenario\n\nSetup paragraph.\n\n<!-- BRIEF END -->\n\n## Coaching Focus\n\nDetails for the AI.';

beforeAll(() => {
  runMigrations(db as any);
  seedTestData(db as any);
  // Seed user_types
  db.prepare("INSERT OR IGNORE INTO user_types (name) VALUES ('PM')").run();
  db.prepare("INSERT OR IGNORE INTO user_types (name) VALUES ('Sales')").run();
});

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/auth/login').send({ email, password });
  if (!res.body.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

async function createUser(token: string, email: string, userType: string | null) {
  const hash = bcrypt.hashSync('pass123', 1);
  db.prepare(
    'INSERT INTO users (name, email, password_hash, disc_profile, role, user_type) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(`User ${email}`, email, hash, 'D', 'pm', userType);
}

async function createScenario(token: string, slug: string, visibleToTypes: string[] | null) {
  const res = await request(app)
    .post('/api/scenarios')
    .set('Authorization', `Bearer ${token}`)
    .send({
      slug,
      title: `Scenario ${slug}`,
      description: 'desc',
      body_markdown: VALID_BODY,
      visible_to_types: visibleToTypes,
    });
  if (res.status !== 201) throw new Error(`Failed to create scenario ${slug}: ${JSON.stringify(res.body)}`);
  return res.body.id as number;
}

describe('scenario visibility filtering', () => {
  let adminToken: string;
  let pmTypedEmail: string;
  let pmNullTypeEmail: string;

  beforeAll(async () => {
    adminToken = await getToken('admin@test.com', 'admin123');

    // Create users directly in DB (faster than going through the API for setup)
    pmTypedEmail = 'vis-pm-typed@test.com';
    pmNullTypeEmail = 'vis-pm-null@test.com';
    await createUser(adminToken, pmTypedEmail, 'PM');
    await createUser(adminToken, pmNullTypeEmail, null);

    // Create scenarios with different visibility settings
    // 'untyped-vis' — no visible_to_types (visible to all)
    await createScenario(adminToken, 'untyped-vis', null);
    // 'pm-only-vis' — only visible to 'PM' type
    await createScenario(adminToken, 'pm-only-vis', ['PM']);
    // 'sales-only-vis' — only visible to 'Sales' type
    await createScenario(adminToken, 'sales-only-vis', ['Sales']);
  });

  it('admin sees all scenarios', async () => {
    const res = await request(app)
      .get('/api/scenarios')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const slugs = res.body.map((s: any) => s.slug);
    expect(slugs).toContain('untyped-vis');
    expect(slugs).toContain('pm-only-vis');
    expect(slugs).toContain('sales-only-vis');
  });

  it('PM-typed member sees untyped + PM-typed scenarios but NOT sales-only', async () => {
    const token = await getToken(pmTypedEmail, 'pass123');
    const res = await request(app)
      .get('/api/scenarios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const slugs = res.body.map((s: any) => s.slug);
    expect(slugs).toContain('untyped-vis');
    expect(slugs).toContain('pm-only-vis');
    expect(slugs).not.toContain('sales-only-vis');
  });

  it('member with NULL user_type sees only untyped scenarios', async () => {
    const token = await getToken(pmNullTypeEmail, 'pass123');
    const res = await request(app)
      .get('/api/scenarios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const slugs = res.body.map((s: any) => s.slug);
    expect(slugs).toContain('untyped-vis');
    expect(slugs).not.toContain('pm-only-vis');
    expect(slugs).not.toContain('sales-only-vis');
  });

  it('GET /api/scenarios returns visible_to_types as a parsed string[] for each scenario', async () => {
    const token = await getToken(pmTypedEmail, 'pass123');
    const res = await request(app)
      .get('/api/scenarios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Every returned scenario must include visible_to_types as an array (empty = "All")
    for (const s of res.body) {
      expect(s).toHaveProperty('visible_to_types');
      expect(Array.isArray(s.visible_to_types)).toBe(true);
    }
    // The PM-typed scenario should have ['PM'], untyped should have []
    const pmScenario = res.body.find((s: any) => s.slug === 'pm-only-vis');
    expect(pmScenario).toBeDefined();
    expect(pmScenario.visible_to_types).toEqual(['PM']);

    const untypedScenario = res.body.find((s: any) => s.slug === 'untyped-vis');
    expect(untypedScenario).toBeDefined();
    expect(untypedScenario.visible_to_types).toEqual([]);
  });

  it('filtering still works — Sales-only scenario is hidden from PM-typed member', async () => {
    const token = await getToken(pmTypedEmail, 'pass123');
    const res = await request(app)
      .get('/api/scenarios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const slugs = res.body.map((s: any) => s.slug);
    expect(slugs).not.toContain('sales-only-vis');
  });
});

describe('scenario visible_to_types create/patch', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getToken('admin@test.com', 'admin123');
  });

  it('creates scenario with visible_to_types and admin GET returns it', async () => {
    const res = await request(app)
      .post('/api/scenarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'vtt-create-test',
        title: 'VTT Create Test',
        description: 'desc',
        body_markdown: VALID_BODY,
        visible_to_types: ['PM', 'Sales'],
      });
    expect(res.status).toBe(201);

    const detail = await request(app)
      .get(`/api/scenarios/${res.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    const parsed = JSON.parse(detail.body.visible_to_types);
    expect(parsed).toEqual(expect.arrayContaining(['PM', 'Sales']));
  });

  it('PATCH updates visible_to_types', async () => {
    const createRes = await request(app)
      .post('/api/scenarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'vtt-patch-test',
        title: 'VTT Patch Test',
        description: 'desc',
        body_markdown: VALID_BODY,
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    await request(app)
      .patch(`/api/scenarios/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ visible_to_types: ['Sales'] });

    const detail = await request(app)
      .get(`/api/scenarios/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    const parsed = JSON.parse(detail.body.visible_to_types);
    expect(parsed).toEqual(['Sales']);
  });

  it('PATCH clears visible_to_types with null (scenario becomes untyped)', async () => {
    const createRes = await request(app)
      .post('/api/scenarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'vtt-clear-test',
        title: 'VTT Clear Test',
        description: 'desc',
        body_markdown: VALID_BODY,
        visible_to_types: ['PM'],
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    await request(app)
      .patch(`/api/scenarios/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ visible_to_types: null });

    const detail = await request(app)
      .get(`/api/scenarios/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.visible_to_types).toBeNull();
  });

  it('returns 400 for invalid visible_to_types', async () => {
    const res = await request(app)
      .post('/api/scenarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'vtt-invalid-test',
        title: 'VTT Invalid Test',
        description: 'desc',
        body_markdown: VALID_BODY,
        visible_to_types: 'not-an-array',
      });
    expect(res.status).toBe(400);
  });

  it('visible_to_types appears in admin GET /api/scenarios/admin list', async () => {
    const res = await request(app)
      .get('/api/scenarios/admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    // Every row should have the visible_to_types key
    for (const s of res.body) {
      expect(s).toHaveProperty('visible_to_types');
    }
  });
});
