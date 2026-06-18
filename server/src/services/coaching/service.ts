import { buildCoachingPrompt } from '../../prompts/coaching-prompt';
import { CoachingResult, TurnRecord, EventRecord } from '../../types';
import { DiscProfileContent, RubricItemContent, getSandlerPrimer } from '../../prompts/loader';
import { getActiveProvider, getActiveModel, getProviderKey, getProviderStatus } from './settings';
import { openaiProvider } from './openai';
import { geminiProvider } from './gemini';
import { anthropicProvider } from './anthropic';
import { CoachingProvider, PickerProvider } from './types';
import { PROVIDER_ORDER, DEFAULT_MODEL } from './models';

const PROVIDERS: Record<PickerProvider, CoachingProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider,
  anthropic: anthropicProvider,
};

/** Map internal provider IDs to human-readable labels shown in error messages. */
function providerLabel(provider: string): string {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'gemini') return 'Google Gemini';
  if (provider === 'anthropic') return 'Anthropic';
  return provider;
}

/**
 * Convert a raw provider error into a concise, user-facing message.
 * NEVER leaks raw JSON or HTTP response bodies to the caller.
 *
 * Exported so it can be unit-tested directly.
 */
export function friendlyCoachingError(err: unknown, provider: string): string {
  const label = providerLabel(provider);
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const errObj = err != null && typeof err === 'object' ? err as Record<string, unknown> : {};
  const status = (errObj.status as number | undefined) ?? (errObj.statusCode as number | undefined);

  // Quota / rate-limit: HTTP 429 or well-known message tokens
  const isRateLimit =
    status === 429 ||
    /RESOURCE_EXHAUSTED|quota|rate.?limit|too many requests/i.test(msg);

  // Auth / bad key: HTTP 401 / 403 or well-known message tokens
  const isAuthError =
    status === 401 ||
    status === 403 ||
    /api.?key|invalid.{0,30}key|unauthorized|permission denied/i.test(msg);

  if (isRateLimit) {
    return (
      `Coaching couldn't be generated — the ${label} AI is rate-limited or out of quota. ` +
      `An admin can switch the coaching provider in Admin → Coaching, or try again shortly.`
    );
  }

  if (isAuthError) {
    return (
      `Coaching couldn't be generated — the ${label} API key was rejected. ` +
      `An admin can update it in Admin → Coaching.`
    );
  }

  // Fall-through: non-JSON parse failure or unknown
  return (
    `Coaching couldn't be generated (${label}). ` +
    `Please retry; if it persists, an admin can check Admin → Coaching.`
  );
}

function parseCoachingFromText(rawText: string, provider: string): CoachingResult {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : rawText.trim();
  let result: CoachingResult;
  try {
    result = JSON.parse(jsonText);
  } catch {
    console.error('Coaching JSON parse failed. Raw response:', rawText.slice(0, 1000));
    const label = providerLabel(provider);
    throw new Error(
      `Coaching couldn't be generated — the ${label} AI returned an unexpected response. Please retry.`
    );
  }
  if (typeof result.totalScore !== 'number' || !result.scoreBreakdown) {
    throw new Error('Coaching response missing required fields');
  }
  return result;
}

export async function generateCoachingStream(
  turns: TurnRecord[],
  events: EventRecord[],
  pmDisc: DiscProfileContent,
  clientDisc: DiscProfileContent,
  rubric: RubricItemContent[],
  onProgress: (info: { charsReceived: number }) => void,
): Promise<CoachingResult> {
  const prompt = buildCoachingPrompt(turns, events, pmDisc, clientDisc, rubric, getSandlerPrimer());
  const activeProvider = getActiveProvider();

  // Build the ordered try list: active provider first, then every OTHER connected
  // provider in PROVIDER_ORDER. Deduplicate while preserving order.
  const seen = new Set<PickerProvider>();
  const tryOrder: PickerProvider[] = [];
  for (const p of [activeProvider, ...PROVIDER_ORDER]) {
    if (!seen.has(p) && getProviderStatus(p).connected) {
      seen.add(p);
      tryOrder.push(p);
    }
  }

  if (tryOrder.length === 0) {
    throw new Error(
      `No API key configured for coaching provider "${activeProvider}". Add one in Admin → Coaching.`,
    );
  }

  let lastError: unknown;
  for (const provider of tryOrder) {
    const apiKey = getProviderKey(provider);
    if (!apiKey) continue; // key disappeared between status check and use — skip
    const model =
      provider === activeProvider ? getActiveModel(provider) : DEFAULT_MODEL[provider];

    let rawText: string;
    try {
      rawText = await PROVIDERS[provider].streamCoaching({ prompt, model, apiKey, onProgress });
    } catch (err) {
      console.warn(`[coaching] provider "${provider}" failed (will try next):`, err);
      lastError = err;
      continue;
    }

    try {
      const result = parseCoachingFromText(rawText, provider);
      result.gradedProvider = provider;
      result.gradedModel = model;
      if (provider !== activeProvider) {
        console.warn(`[coaching] fell back from "${activeProvider}" → "${provider}"`);
      }
      return result;
    } catch (err) {
      console.warn(`[coaching] parse failed for provider "${provider}":`, err);
      lastError = err;
    }
  }

  // All candidates exhausted
  throw new Error(friendlyCoachingError(lastError, activeProvider));
}

export async function generateCoaching(
  turns: TurnRecord[],
  events: EventRecord[],
  pmDisc: DiscProfileContent,
  clientDisc: DiscProfileContent,
  rubric: RubricItemContent[],
): Promise<CoachingResult> {
  return generateCoachingStream(turns, events, pmDisc, clientDisc, rubric, () => {});
}
