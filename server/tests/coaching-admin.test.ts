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
beforeEach(() => {
  db.prepare('DELETE FROM app_settings').run();
  db.prepare('DELETE FROM provider_keys').run();
  process.env.OPENAI_API_KEY = 'env-openai-LIVE';
  delete process.env.GEMINI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.MOONSHOT_API_KEY;
});

const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
const findProvider = (body: any, id: string) =>
  body.providers.find((p: any) => p.id === id);

it('GET coaching-settings returns masked status as an ordered list, never full keys', async () => {
  const res = await auth(request(app).get('/api/admin/coaching-settings'));
  expect(res.status).toBe(200);
  // Ordered array with the three shipped providers
  expect(res.body.providers.map((p: any) => p.id)).toEqual([
    'gemini', 'openai', 'anthropic',
  ]);
  const openai = findProvider(res.body, 'openai');
  expect(openai).toMatchObject({ connected: true, last4: 'LIVE', label: 'OpenAI', source: 'env' });
  expect(openai.models).toContain('gpt-4o');
  const gemini = findProvider(res.body, 'gemini');
  expect(gemini).toMatchObject({ connected: false, last4: null });
  expect(gemini.models).toContain('gemini-2.5-pro');
  expect(JSON.stringify(res.body)).not.toContain('env-openai-LIVE');
});

it('POST keys stores a key (write-only) and returns last4', async () => {
  const res = await auth(request(app).post('/api/admin/coaching-settings/keys'))
    .send({ provider: 'gemini', apiKey: 'AIza-secret-9ZQ7' });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ connected: true, last4: '9ZQ7' });
  // confirm GET now reports gemini connected, still masked
  const get = await auth(request(app).get('/api/admin/coaching-settings'));
  expect(findProvider(get.body, 'gemini')).toMatchObject({ connected: true, source: 'db' });
  expect(JSON.stringify(get.body)).not.toContain('AIza-secret-9ZQ7');
});

it('accepts a key for a newly added provider (anthropic)', async () => {
  const res = await auth(request(app).post('/api/admin/coaching-settings/keys'))
    .send({ provider: 'anthropic', apiKey: 'sk-ant-secret-CL4U' });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ connected: true, last4: 'CL4U' });
  const patch = await auth(request(app).patch('/api/admin/coaching-settings'))
    .send({ provider: 'anthropic', model: 'claude-opus-4-8' });
  expect(patch.status).toBe(200);
  const get = await auth(request(app).get('/api/admin/coaching-settings'));
  expect(get.body.activeProvider).toBe('anthropic');
  expect(get.body.activeModel).toBe('claude-opus-4-8');
});

it('rejects grok/kimi as removed providers', async () => {
  const res = await auth(request(app).post('/api/admin/coaching-settings/keys'))
    .send({ provider: 'grok', apiKey: 'xai-secret-GR0K' });
  expect(res.status).toBe(400);
});

it('PATCH rejects a provider with no key', async () => {
  const res = await auth(request(app).patch('/api/admin/coaching-settings'))
    .send({ provider: 'gemini', model: 'gemini-2.5-pro' });
  expect(res.status).toBe(400);
});

it('PATCH rejects a non-curated model', async () => {
  const res = await auth(request(app).patch('/api/admin/coaching-settings'))
    .send({ provider: 'openai', model: 'whisper-1' });
  expect(res.status).toBe(400);
});

it('PATCH sets selection when provider is connected', async () => {
  const res = await auth(request(app).patch('/api/admin/coaching-settings'))
    .send({ provider: 'openai', model: 'gpt-4o' });
  expect(res.status).toBe(200);
  const get = await auth(request(app).get('/api/admin/coaching-settings'));
  expect(get.body.activeProvider).toBe('openai');
  expect(get.body.activeModel).toBe('gpt-4o');
});

it('requires admin auth', async () => {
  const res = await request(app).get('/api/admin/coaching-settings');
  expect(res.status).toBe(401);
});
