import Anthropic from '@anthropic-ai/sdk';
import { buildCoachingPrompt } from '../prompts/coaching-prompt';
import { CoachingResult, TurnRecord, EventRecord } from '../types';
import { DiscProfileContent, RubricItemContent, getSandlerPrimer } from '../prompts/loader';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_TOKENS = 3072;

function parseCoachingFromText(rawText: string): CoachingResult {
  // Extract the JSON object from the response, regardless of any markdown
  // wrapping or preamble Claude might include. Greedy match grabs from
  // the first '{' to the last '}', which is the top-level object.
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : rawText.trim();

  let result: CoachingResult;
  try {
    result = JSON.parse(jsonText);
  } catch {
    console.error('Coaching JSON parse failed. Raw response:', rawText.slice(0, 1000));
    throw new Error(`Claude returned non-JSON response: ${rawText.slice(0, 300)}`);
  }

  if (typeof result.totalScore !== 'number' || !result.scoreBreakdown) {
    throw new Error('Claude response missing required coaching fields');
  }

  return result;
}

/**
 * Streaming version: emits onProgress with cumulative chars received as
 * Claude generates the response. The caller can use this to drive a real
 * progress bar (instead of guessing from elapsed time).
 */
export async function generateCoachingStream(
  turns: TurnRecord[],
  events: EventRecord[],
  pmDisc: DiscProfileContent,
  clientDisc: DiscProfileContent,
  rubric: RubricItemContent[],
  onProgress: (info: { charsReceived: number }) => void,
): Promise<CoachingResult> {
  const prompt = buildCoachingPrompt(turns, events, pmDisc, clientDisc, rubric, getSandlerPrimer());

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });

  let textSoFar = '';
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta?.type === 'text_delta'
    ) {
      textSoFar += event.delta.text;
      onProgress({ charsReceived: textSoFar.length });
    }
  }

  const final = await stream.finalMessage();
  const rawText = final.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  return parseCoachingFromText(rawText);
}

export async function generateCoaching(
  turns: TurnRecord[],
  events: EventRecord[],
  pmDisc: DiscProfileContent,
  clientDisc: DiscProfileContent,
  rubric: RubricItemContent[]
): Promise<CoachingResult> {
  return generateCoachingStream(turns, events, pmDisc, clientDisc, rubric, () => {});
}
