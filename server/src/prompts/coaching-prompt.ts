import { DiscProfileContent, RubricItemContent } from './loader';
import { TurnRecord, EventRecord } from '../types';

export function buildCoachingPrompt(
  turns: TurnRecord[],
  events: EventRecord[],
  pmDisc: DiscProfileContent,
  clientDisc: DiscProfileContent,
  rubric: RubricItemContent[]
): string {
  // Format the transcript
  const transcript = turns
    .map(t => `${t.speaker === 'pm' ? 'PM' : 'Client'}: ${t.content}`)
    .join('\n');

  // Count interruptions (PM interrupted client)
  const pmInterruptions = events.filter(e => e.type === 'user_interrupted_agent').length;

  // Format rubric
  const rubricText = rubric
    .map(r => `- **${r.name}** (${r.weight}%): ${r.description}`)
    .join('\n');

  return `You are an expert communication coach reviewing a roleplay session. A project manager (PM) just had a practice conversation with an AI client. Analyze the conversation and provide structured coaching.

## PM's DISC Profile

${pmDisc.body}

## Client's DISC Profile (the AI they were speaking with)

${clientDisc.body}

## Conversation Transcript

${transcript}

## Interruption Data

The PM interrupted the client ${pmInterruptions} time(s) during this conversation.
${pmInterruptions > 0 ? `Note: This is significant. The client's DISC profile should inform how severely to score this — interrupting an S or C client is more damaging than interrupting a D client.` : ''}

## Scoring Rubric

Score the PM 1-5 on each of the following categories:

${rubricText}

**Scoring scale:** 1 = Significantly below standard, 2 = Below standard, 3 = Meets standard, 4 = Above standard, 5 = Exceptional

## Your Task

Analyze the conversation and return a JSON object with EXACTLY this structure (no markdown, no explanation — raw JSON only):

{
  "strengths": "2-3 specific things the PM did well, with quotes from the transcript",
  "misses": "2-3 specific gaps or mistakes, with quotes from the transcript",
  "alternatives": "Concrete alternative phrases the PM could have used, tailored to the client's DISC profile",
  "discAdaptation": "Specific coaching on how the PM's natural ${pmDisc.code} style helped or hurt when speaking with this ${clientDisc.code} client, and what adjustments to make next time",
  "scoreBreakdown": {
    "empathy": <1-5>,
    "clarity": <1-5>,
    "discAdaptation": <1-5>,
    "solutionOrientation": <1-5>,
    "ownership": <1-5>,
    "composure": <1-5>,
    "activeListening": <1-5>
  },
  "totalScore": <0-100 weighted score>
}

The totalScore formula: ((empathy * 0.13) + (clarity * 0.13) + (discAdaptation * 0.22) + (solutionOrientation * 0.12) + (ownership * 0.12) + (composure * 0.13) + (activeListening * 0.15)) / 5 * 100, rounded to nearest integer.

Be specific, be direct, and be honest. This is a learning tool — vague or overly positive feedback does not help the PM improve.`;
}
