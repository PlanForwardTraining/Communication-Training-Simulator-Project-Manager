/**
 * Unit tests for friendlyCoachingError — the helper that converts raw provider
 * errors into safe, human-readable messages sent to the client.
 *
 * These tests verify:
 *   1. Quota / rate-limit errors (HTTP 429, RESOURCE_EXHAUSTED, etc.)
 *   2. Auth / bad-key errors (HTTP 401/403, "API key" / "unauthorized" etc.)
 *   3. Generic fallback
 *   4. Provider label appears correctly for all three providers
 */

import { friendlyCoachingError } from '../src/services/coaching/service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeError(message: string, status?: number): Error & { status?: number } {
  const err = new Error(message) as Error & { status?: number };
  if (status !== undefined) err.status = status;
  return err;
}

// ---------------------------------------------------------------------------
// Quota / rate-limit
// ---------------------------------------------------------------------------

describe('friendlyCoachingError — quota / rate-limit', () => {
  it('maps HTTP 429 status to the quota message', () => {
    const msg = friendlyCoachingError(makeError('Too many requests', 429), 'gemini');
    expect(msg).toMatch(/rate-limited or out of quota/);
    expect(msg).toMatch(/Google Gemini/);
    expect(msg).toMatch(/Admin → Coaching/);
  });

  it('matches RESOURCE_EXHAUSTED in message (Gemini style)', () => {
    const raw = makeError(
      'GoogleGenerativeAIError: [429 Too Many Requests] {"error":{"code":429,"message":"Resource has been exhausted","status":"RESOURCE_EXHAUSTED"}}',
    );
    const msg = friendlyCoachingError(raw, 'gemini');
    expect(msg).toMatch(/rate-limited or out of quota/);
    expect(msg).toMatch(/Google Gemini/);
    // Must not leak the raw JSON
    expect(msg).not.toMatch(/\{.*code.*429/);
  });

  it('matches "quota" keyword', () => {
    const msg = friendlyCoachingError(makeError('You have exceeded your daily quota.'), 'openai');
    expect(msg).toMatch(/rate-limited or out of quota/);
    expect(msg).toMatch(/OpenAI/);
  });

  it('matches "rate limit" keyword', () => {
    const msg = friendlyCoachingError(makeError('rate limit reached for model'), 'openai');
    expect(msg).toMatch(/rate-limited or out of quota/);
  });

  it('matches "Too Many Requests" text (case-insensitive)', () => {
    const msg = friendlyCoachingError(makeError('too many requests'), 'anthropic');
    expect(msg).toMatch(/rate-limited or out of quota/);
    expect(msg).toMatch(/Anthropic/);
  });
});

// ---------------------------------------------------------------------------
// Auth / bad key
// ---------------------------------------------------------------------------

describe('friendlyCoachingError — auth / bad key', () => {
  it('maps HTTP 401 to the key message', () => {
    const msg = friendlyCoachingError(makeError('Unauthorized', 401), 'openai');
    expect(msg).toMatch(/API key was rejected/);
    expect(msg).toMatch(/OpenAI/);
    expect(msg).toMatch(/Admin → Coaching/);
  });

  it('maps HTTP 403 to the key message', () => {
    const msg = friendlyCoachingError(makeError('Forbidden', 403), 'gemini');
    expect(msg).toMatch(/API key was rejected/);
    expect(msg).toMatch(/Google Gemini/);
  });

  it('matches "API key" text (OpenAI SDK style)', () => {
    const msg = friendlyCoachingError(makeError('Incorrect API key provided: sk-...'), 'openai');
    expect(msg).toMatch(/API key was rejected/);
  });

  it('matches "invalid" near "key"', () => {
    const msg = friendlyCoachingError(makeError('invalid api_key'), 'anthropic');
    expect(msg).toMatch(/API key was rejected/);
  });

  it('matches "unauthorized"', () => {
    const msg = friendlyCoachingError(makeError('unauthorized request'), 'anthropic');
    expect(msg).toMatch(/API key was rejected/);
    expect(msg).toMatch(/Anthropic/);
  });

  it('matches "permission denied"', () => {
    const msg = friendlyCoachingError(makeError('permission denied on this resource'), 'gemini');
    expect(msg).toMatch(/API key was rejected/);
  });
});

// ---------------------------------------------------------------------------
// Fallback (unknown / generic error)
// ---------------------------------------------------------------------------

describe('friendlyCoachingError — fallback', () => {
  it('returns the fallback message for a generic error', () => {
    const msg = friendlyCoachingError(new Error('network error'), 'gemini');
    expect(msg).toMatch(/couldn't be generated/);
    expect(msg).toMatch(/Google Gemini/);
    expect(msg).toMatch(/Please retry/);
    // Must NOT claim it's a rate-limit or key error
    expect(msg).not.toMatch(/rate-limited/);
    expect(msg).not.toMatch(/API key was rejected/);
  });

  it('handles a non-Error thrown value gracefully', () => {
    const msg = friendlyCoachingError('something went wrong', 'openai');
    expect(msg).toMatch(/couldn't be generated/);
    expect(msg).toMatch(/OpenAI/);
  });

  it('handles null/undefined gracefully', () => {
    expect(() => friendlyCoachingError(null, 'gemini')).not.toThrow();
    expect(() => friendlyCoachingError(undefined, 'openai')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Provider label
// ---------------------------------------------------------------------------

describe('friendlyCoachingError — provider label', () => {
  it('uses "OpenAI" for openai', () => {
    expect(friendlyCoachingError(makeError('quota exceeded'), 'openai')).toMatch(/OpenAI/);
  });

  it('uses "Google Gemini" for gemini', () => {
    expect(friendlyCoachingError(makeError('quota exceeded'), 'gemini')).toMatch(/Google Gemini/);
  });

  it('uses "Anthropic" for anthropic', () => {
    expect(friendlyCoachingError(makeError('quota exceeded'), 'anthropic')).toMatch(/Anthropic/);
  });

  it('echoes unknown provider IDs as-is', () => {
    expect(friendlyCoachingError(makeError('quota exceeded'), 'some-future-provider')).toMatch(/some-future-provider/);
  });
});
