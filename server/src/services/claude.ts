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

  // Extract the JSON object from the response, regardless of any markdown
  // wrapping or preamble Claude might include. The greedy match grabs from
  // the first '{' to the last '}', which is exactly the top-level object.
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : rawText.trim();

  let result: CoachingResult;
  try {
    result = JSON.parse(jsonText);
  } catch (err) {
    console.error('Coaching JSON parse failed. Raw response:', rawText.slice(0, 1000));
    throw new Error(
      `Claude returned non-JSON response: ${rawText.slice(0, 300)}`,
    );
  }

  // Validate required fields
  if (typeof result.totalScore !== 'number' || !result.scoreBreakdown) {
    throw new Error('Claude response missing required coaching fields');
  }

  return result;
}
