import Anthropic from '@anthropic-ai/sdk';
import { buildCoachingPrompt } from '../prompts/coaching-prompt';
import { CoachingResult, TurnRecord, EventRecord } from '../types';
import { DiscProfileContent, RubricItemContent, getSandlerPrimer } from '../prompts/loader';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateCoaching(
  turns: TurnRecord[],
  events: EventRecord[],
  pmDisc: DiscProfileContent,
  clientDisc: DiscProfileContent,
  rubric: RubricItemContent[]
): Promise<CoachingResult> {
  const prompt = buildCoachingPrompt(turns, events, pmDisc, clientDisc, rubric, getSandlerPrimer());

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3072,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const rawText = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  // Strip markdown code fences if Claude wrapped the JSON
  const jsonText = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

  let result: CoachingResult;
  try {
    result = JSON.parse(jsonText);
  } catch {
    throw new Error(`Claude returned non-JSON response: ${rawText.slice(0, 200)}`);
  }

  // Validate required fields
  if (typeof result.totalScore !== 'number' || !result.scoreBreakdown) {
    throw new Error('Claude response missing required coaching fields');
  }

  return result;
}
