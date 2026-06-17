process.env.SETTINGS_ENC_KEY = 'unit-test-enc-key';
import { encryptSecret, decryptSecret } from '../src/utils/crypto';

describe('crypto', () => {
  it('round-trips a secret', () => {
    const secret = 'sk-proj-abc123-DEF456';
    const blob = encryptSecret(secret);
    expect(blob).not.toContain(secret);          // not stored in plaintext
    expect(decryptSecret(blob)).toBe(secret);
  });
  it('produces different ciphertext each call (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });
});
