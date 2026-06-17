import { setupTestDb, runMigrations } from './helpers';
setupTestDb();
import request from 'supertest';
import db from '../src/db/connection';
import { getBranding, setBranding, resetBranding, isHexColor, isLogoUrl, DEFAULT_BRANDING } from '../src/services/branding';
import app from '../src/index';
import { seedTestData } from './helpers';

describe('branding service', () => {
  beforeAll(() => { runMigrations(db); });
  beforeEach(() => { db.prepare('DELETE FROM app_settings').run(); });

  it('returns defaults when unset', () => {
    expect(getBranding()).toEqual(DEFAULT_BRANDING);
  });
  it('persists and reads back a partial update', () => {
    setBranding({ primary: '#FF8800', secondary: '#222222', logoUrl: 'https://x.com/l.png' });
    expect(getBranding()).toEqual({ primary: '#FF8800', secondary: '#222222', logoUrl: 'https://x.com/l.png' });
  });
  it('reset reverts to defaults', () => {
    setBranding({ primary: '#FF8800', secondary: '#222222', logoUrl: '' });
    resetBranding();
    expect(getBranding()).toEqual(DEFAULT_BRANDING);
  });
  it('validates hex and url', () => {
    expect(isHexColor('#A1B2C3')).toBe(true);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#FFF')).toBe(false);
    expect(isLogoUrl('')).toBe(true);
    expect(isLogoUrl('https://x.com/l.png')).toBe(true);
    expect(isLogoUrl('ftp://x')).toBe(false);
  });
});

describe('branding routes', () => {
  let token: string;
  beforeAll(async () => {
    runMigrations(db);
    seedTestData(db);
    const res = await request(app).post('/auth/login').send({ email: 'admin@test.com', password: 'admin123' });
    token = res.body.token;
  });
  beforeEach(() => { db.prepare('DELETE FROM app_settings').run(); });

  it('GET /api/branding is public and returns defaults', async () => {
    const res = await request(app).get('/api/branding');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(DEFAULT_BRANDING);
  });
  it('PATCH requires admin', async () => {
    const res = await request(app).patch('/api/branding').send({ primary: '#FF8800', secondary: '#222222', logoUrl: '' });
    expect(res.status).toBe(401);
  });
  it('PATCH validates and saves', async () => {
    const bad = await request(app).patch('/api/branding').set('Authorization', `Bearer ${token}`).send({ primary: 'nope', secondary: '#222222', logoUrl: '' });
    expect(bad.status).toBe(400);
    const ok = await request(app).patch('/api/branding').set('Authorization', `Bearer ${token}`).send({ primary: '#FF8800', secondary: '#222222', logoUrl: '' });
    expect(ok.status).toBe(200);
    expect(ok.body.primary).toBe('#FF8800');
  });
  it('DELETE resets to defaults', async () => {
    await request(app).patch('/api/branding').set('Authorization', `Bearer ${token}`).send({ primary: '#FF8800', secondary: '#222222', logoUrl: '' });
    const res = await request(app).delete('/api/branding').set('Authorization', `Bearer ${token}`);
    expect(res.body).toEqual(DEFAULT_BRANDING);
  });
});
