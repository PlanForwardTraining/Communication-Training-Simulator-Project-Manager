import { setupTestDb, runMigrations } from './helpers';
setupTestDb();
import db from '../src/db/connection';
import { getBranding, setBranding, resetBranding, isHexColor, isLogoUrl, DEFAULT_BRANDING } from '../src/services/branding';

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
