import { buildCoachingPrompt } from '../../prompts/coaching-prompt';
import { CoachingResult, TurnRecord, EventRecord } from '../../types';
import { DiscProfileContent, RubricItemContent, getSandlerPrimer } from '../../prompts/loader';
import { getActiveProvider, getActiveModel, getProviderKey } from './settings';
import { openaiProvider } from './openai';
import { geminiProvider } from './gemini';
import { anthropicProvider } from './anthropic';
import { CoachingProvider } from './types';

const PROVIDERS: Record<string, CoachingProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider,
  anthropic: anthropicProvider,
};

function parseCoachingFromText(rawText: string): CoachingResult {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : rawText.trim();
  let result: CoachingResult;
  try {
    result = JSON.parse(jsonText);
  } catch {
    console.error('Coaching JSON parse failed. Raw response:', rawText.slice(0, 1000));
    throw new Error(`Coaching model returned non-JSON response: ${rawText.slice(0, 300)}`);
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
  const provider = getActiveProvider();
  const model = getActiveModel(provider);
  const apiKey = getProviderKey(provider);
  if (!apiKey) {
    throw new Error(`No API key configured for coaching provider "${provider}". Add one in Admin → Coaching.`);
  }
  const rawText = await PROVIDERS[provider].streamCoaching({ prompt, model, apiKey, onProgress });
  return parseCoachingFromText(rawText);
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
