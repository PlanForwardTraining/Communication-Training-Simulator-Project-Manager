/**
 * Tests for the coaching provider failover logic in generateCoaching.
 *
 * Strategy: mock the individual provider modules + settings so we can
 * control which providers are "connected" and which calls succeed/fail,
 * without making real API calls or touching the DB.
 */

// ---- mock settings before any imports ----
// We'll override these per-test via jest.fn() return values.
jest.mock('../src/services/coaching/settings', () => ({
  getActiveProvider: jest.fn(),
  getActiveModel: jest.fn(),
  getProviderKey: jest.fn(),
  getProviderStatus: jest.fn(),
}));

// ---- mock individual providers ----
jest.mock('../src/services/coaching/openai', () => ({
  openaiProvider: { streamCoaching: jest.fn() },
}));
jest.mock('../src/services/coaching/gemini', () => ({
  geminiProvider: { streamCoaching: jest.fn() },
}));
jest.mock('../src/services/coaching/anthropic', () => ({
  anthropicProvider: { streamCoaching: jest.fn() },
}));

// ---- mock prompt builder + loader (no filesystem needed) ----
jest.mock('../src/prompts/coaching-prompt', () => ({
  buildCoachingPrompt: jest.fn().mockReturnValue('mock-prompt'),
}));
jest.mock('../src/prompts/loader', () => ({
  getSandlerPrimer: jest.fn().mockReturnValue('sandler primer'),
  getDiscProfile: jest.fn(),
  getRubric: jest.fn(),
}));

import { generateCoaching } from '../src/services/coaching/service';
import {
  getActiveProvider,
  getActiveModel,
  getProviderKey,
  getProviderStatus,
} from '../src/services/coaching/settings';
import { openaiProvider } from '../src/services/coaching/openai';
import { geminiProvider } from '../src/services/coaching/gemini';
import { anthropicProvider } from '../src/services/coaching/anthropic';

// Typed mock helpers
const mockGetActiveProvider = getActiveProvider as jest.MockedFunction<typeof getActiveProvider>;
const mockGetActiveModel = getActiveModel as jest.MockedFunction<typeof getActiveModel>;
const mockGetProviderKey = getProviderKey as jest.MockedFunction<typeof getProviderKey>;
const mockGetProviderStatus = getProviderStatus as jest.MockedFunction<typeof getProviderStatus>;

const mockOpenaiStream = openaiProvider.streamCoaching as jest.MockedFunction<typeof openaiProvider.streamCoaching>;
const mockGeminiStream = geminiProvider.streamCoaching as jest.MockedFunction<typeof geminiProvider.streamCoaching>;
const mockAnthropicStream = anthropicProvider.streamCoaching as jest.MockedFunction<typeof anthropicProvider.streamCoaching>;

// A minimal valid coaching JSON response
const validCoachingJson = JSON.stringify({
  strengths: '- Good listening',
  misses: '- Missed Up-Front Contract',
  alternatives: '- Try reversing',
  discAdaptation: '- Slow down for S client',
  scoreBreakdown: {
    empathy: 4, clarity: 3, discAdaptation: 3,
    solutionOrientation: 4, ownership: 4, composure: 4, activeListening: 3,
  },
  totalScore: 72,
});

// Minimal inputs (content doesn't matter — prompt builder is mocked)
const dummyTurns = [{ id: 1, session_id: 1, speaker: 'pm', content: 'Hello', created_at: '' }] as any;
const dummyEvents = [] as any;
const dummyPmDisc = {} as any;
const dummyClientDisc = {} as any;
const dummyRubric = [] as any;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Failover: active provider fails → fallback provider succeeds
// ---------------------------------------------------------------------------

describe('generateCoaching — failover', () => {
  it('falls back to a second connected provider when the active one throws a 429', async () => {
    // Active = gemini (fails); fallback = openai (succeeds); anthropic = not connected
    mockGetActiveProvider.mockReturnValue('gemini');
    mockGetActiveModel.mockReturnValue('gemini-2.5-pro');

    mockGetProviderStatus.mockImplementation((p) => {
      if (p === 'gemini') return { connected: true, last4: 'abc1', source: 'db' };
      if (p === 'openai') return { connected: true, last4: 'xyz2', source: 'env' };
      return { connected: false, last4: null, source: null };
    });

    mockGetProviderKey.mockImplementation((p) => {
      if (p === 'gemini') return 'gemini-key';
      if (p === 'openai') return 'openai-key';
      return null;
    });

    // Gemini throws a 429-style error
    const rateLimitErr = Object.assign(new Error('Resource has been exhausted (RESOURCE_EXHAUSTED)'), { status: 429 });
    mockGeminiStream.mockRejectedValueOnce(rateLimitErr);

    // OpenAI succeeds
    mockOpenaiStream.mockResolvedValueOnce(validCoachingJson);

    const result = await generateCoaching(dummyTurns, dummyEvents, dummyPmDisc, dummyClientDisc, dummyRubric);

    expect(result.gradedProvider).toBe('openai');
    expect(result.totalScore).toBe(72);
    // Gemini should have been tried first
    expect(mockGeminiStream).toHaveBeenCalledTimes(1);
    expect(mockOpenaiStream).toHaveBeenCalledTimes(1);
    // Anthropic was not connected — should not be tried
    expect(mockAnthropicStream).not.toHaveBeenCalled();
  });

  it('uses the active provider model for the active provider, DEFAULT_MODEL for fallbacks', async () => {
    mockGetActiveProvider.mockReturnValue('openai');
    mockGetActiveModel.mockReturnValue('gpt-4.1'); // non-default model selected by admin

    mockGetProviderStatus.mockImplementation((p) => ({
      connected: p === 'openai' || p === 'anthropic',
      last4: 'test',
      source: 'db' as const,
    }));
    mockGetProviderKey.mockImplementation((p) => {
      if (p === 'openai') return 'openai-key';
      if (p === 'anthropic') return 'anthropic-key';
      return null;
    });

    // OpenAI fails
    mockOpenaiStream.mockRejectedValueOnce(new Error('network error'));
    // Anthropic succeeds
    mockAnthropicStream.mockResolvedValueOnce(validCoachingJson);

    await generateCoaching(dummyTurns, dummyEvents, dummyPmDisc, dummyClientDisc, dummyRubric);

    // Active provider (openai) should have been called with the admin-selected model
    expect(mockOpenaiStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4.1' }),
    );
    // Fallback (anthropic) should use DEFAULT_MODEL (claude-opus-4-8)
    expect(mockAnthropicStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-8' }),
    );
  });

  it('resolves with the active provider when it succeeds (no failover needed)', async () => {
    mockGetActiveProvider.mockReturnValue('gemini');
    mockGetActiveModel.mockReturnValue('gemini-2.5-pro');
    mockGetProviderStatus.mockImplementation((p) => ({
      connected: p === 'gemini' || p === 'openai',
      last4: '1234',
      source: 'db' as const,
    }));
    mockGetProviderKey.mockReturnValue('any-key');
    mockGeminiStream.mockResolvedValueOnce(validCoachingJson);

    const result = await generateCoaching(dummyTurns, dummyEvents, dummyPmDisc, dummyClientDisc, dummyRubric);

    expect(result.gradedProvider).toBe('gemini');
    expect(mockOpenaiStream).not.toHaveBeenCalled();
  });

  it('skips providers that have no API key even when status reports connected', async () => {
    mockGetActiveProvider.mockReturnValue('gemini');
    mockGetActiveModel.mockReturnValue('gemini-2.5-pro');
    // All three appear connected by status…
    mockGetProviderStatus.mockReturnValue({ connected: true, last4: 'test', source: 'db' });
    // …but only anthropic has a key (simulates key disappearing between status check and use)
    mockGetProviderKey.mockImplementation((p) => p === 'anthropic' ? 'anth-key' : null);
    mockAnthropicStream.mockResolvedValueOnce(validCoachingJson);

    const result = await generateCoaching(dummyTurns, dummyEvents, dummyPmDisc, dummyClientDisc, dummyRubric);

    expect(result.gradedProvider).toBe('anthropic');
    expect(mockGeminiStream).not.toHaveBeenCalled();
    expect(mockOpenaiStream).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// All providers fail → friendly error
// ---------------------------------------------------------------------------

describe('generateCoaching — all providers fail', () => {
  it('rejects with a friendly message when every connected provider fails', async () => {
    mockGetActiveProvider.mockReturnValue('openai');
    mockGetActiveModel.mockReturnValue('gpt-4o');
    mockGetProviderStatus.mockImplementation((p) => ({
      connected: p === 'openai' || p === 'gemini',
      last4: 'test',
      source: 'db' as const,
    }));
    mockGetProviderKey.mockReturnValue('some-key');

    const rateLimitErr = Object.assign(new Error('rate limit reached'), { status: 429 });
    mockOpenaiStream.mockRejectedValueOnce(rateLimitErr);
    mockGeminiStream.mockRejectedValueOnce(new Error('quota exceeded'));

    await expect(
      generateCoaching(dummyTurns, dummyEvents, dummyPmDisc, dummyClientDisc, dummyRubric),
    ).rejects.toThrow(/rate-limited or out of quota|couldn't be generated/);
  });

  it('rejects when no provider is connected at all', async () => {
    mockGetActiveProvider.mockReturnValue('gemini');
    mockGetActiveModel.mockReturnValue('gemini-2.5-pro');
    mockGetProviderStatus.mockReturnValue({ connected: false, last4: null, source: null });
    mockGetProviderKey.mockReturnValue(null);

    await expect(
      generateCoaching(dummyTurns, dummyEvents, dummyPmDisc, dummyClientDisc, dummyRubric),
    ).rejects.toThrow(/No API key configured/);
  });
});
