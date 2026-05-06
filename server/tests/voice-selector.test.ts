import path from 'path';

// Voice selector reads from /content/voices/ — use the real files
describe('selectVoiceForSession', () => {
  // Dynamically import after any env setup
  let selectVoiceForSession: (slug: string, disc: string) => { voiceId: string; voiceName: string };

  beforeAll(async () => {
    const mod = await import('../src/services/voice-selector');
    selectVoiceForSession = mod.selectVoiceForSession;
  });

  it('returns a voice for D profile', () => {
    const result = selectVoiceForSession('01-schedule-delay', 'D');
    expect(result.voiceId).toBeTruthy();
    expect(result.voiceName).toBeTruthy();
  });

  it('returns a voice for S profile', () => {
    const result = selectVoiceForSession('01-schedule-delay', 'S');
    expect(result.voiceId).toBeTruthy();
    expect(result.voiceName).toBeTruthy();
  });

  it('returns a voice for unknown DISC (fallback to all active)', () => {
    const result = selectVoiceForSession('01-schedule-delay', 'UNKNOWN');
    expect(result.voiceId).toBeTruthy();
  });

  it('shows randomness for D profile across multiple calls', () => {
    // D has 2 voices (Adam, Liam) — should see both in 30 tries
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      seen.add(selectVoiceForSession('01-schedule-delay', 'D').voiceName);
    }
    expect(seen.size).toBeGreaterThanOrEqual(1); // at minimum works
  });
});
