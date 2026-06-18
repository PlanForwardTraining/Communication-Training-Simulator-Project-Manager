import { DiscProfileContent, RubricItemContent } from './loader';
import { TurnRecord, EventRecord } from '../types';

export function buildCoachingPrompt(
  turns: TurnRecord[],
  events: EventRecord[],
  pmDisc: DiscProfileContent,
  clientDisc: DiscProfileContent,
  rubric: RubricItemContent[],
  sandlerPrimer: string,
): string {
  const transcript = turns
    .map(t => `${t.speaker === 'pm' ? 'PM' : 'Client'}: ${t.content}`)
    .join('\n');

  const pmInterruptions = events.filter(e => e.type === 'user_interrupted_agent').length;

  const rubricText = rubric
    .map(r => `- **${r.name}** (${r.weight}%): ${r.description}`)
    .join('\n');

  return `You are an expert communication coach reviewing a roleplay session. A project manager (PM) just had a practice conversation with an AI client. Your job is to analyze the conversation through the lens of **Sandler Sales Methodology** as the primary framework, supplemented by other respected sales/communication frameworks (Voss labels, calibrated questions, classic active listening) where they fit better.

## Coaching Lens — Sandler & Supplementary Frameworks

${sandlerPrimer}

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

Score the PM 0-5 on each of the following categories:

${rubricText}

**Scoring scale:** 0 = Harmful, 1 = Significantly below standard, 2 = Below standard, 3 = Meets standard, 4 = Above standard, 5 = Exceptional

## Scoring Discipline — read before scoring

Use the **full 0-5 range** and score honestly in *both* directions: real failures fall to 0-1, and genuinely strong execution earns 4-5. Do not compress everything toward a "safe" middle — a 3 everywhere is a cop-out when the work was clearly excellent or clearly poor.

**Automatic fail behaviors.** When the PM does any of the following, the affected categories MUST be scored **0 or 1**, and the overall result should land **near the floor** — do not let unrelated minor positives pull it back up to a middling score:
- Refuses to give a firm answer/date when the client explicitly demands one, or only hedges ("probably," "give or take," "best I can do") when pressed for a hard commitment.
- Dismisses or minimizes the client's concern ("you'll have to just deal with it," "you'll be okay") instead of genuinely engaging it.
- Talks over, hangs up on, or **abandons** the client while they are still asking for help.
- Offers no real plan, no ownership, and no path forward.

A short, dismissive, or abandoning call is a **failing** call — score it near 0, never a charitable 2.

**Reward strong work — do not withhold high marks.** When none of the fail behaviors are present and the PM handled the category's objective well, score generously at the top. **3 means "merely met the standard"** — it is the floor for competent work, not the ceiling. If the PM did a category *well*, that is a **4**; if they did it *excellently* — clear, controlled, well-adapted to the client — that is a **5**. A PM who acknowledged the client's concern, stayed composed under real pressure, owned what was theirs, adapted to the client's DISC style, and delivered a concrete path forward should land **mostly 4s and 5s**, and an excellent call should total in the high 80s or 90s. Defaulting a strong call to straight 3s is a grading error.

**Missing an optional technique is NOT a deduction.** The Sandler/Voss techniques are a coaching vocabulary, not a checklist. If the PM achieved a category's goal well, score it high and mention any un-used technique as an *"even better next time"* note in the feedback. Do **not** lower a score because a Pain Funnel, Reversing, or Negative Reverse "could have" been used. Only score below 3 when something was actually done poorly or omitted *to the client's detriment* — never for a technique the PM simply didn't reach for.

## Output Format

Return a JSON object with EXACTLY this structure (no markdown wrapper, no explanation outside the JSON — raw JSON only):

{
  "strengths": "<bullet list>",
  "misses": "<bullet list>",
  "alternatives": "<bullet list>",
  "discAdaptation": "<bullet list>",
  "scoreBreakdown": {
    "empathy": <0-5>,
    "clarity": <0-5>,
    "discAdaptation": <0-5>,
    "solutionOrientation": <0-5>,
    "ownership": <0-5>,
    "composure": <0-5>,
    "activeListening": <0-5>
  },
  "totalScore": <0-100 weighted score>
}

### How to format each bullet list

Each of strengths / misses / alternatives / discAdaptation must be a **single string containing 3-5 markdown bullets**, separated by newline characters (\\n). Do not number them — use \`- \` at the start of each bullet. Each bullet should be 1-3 sentences. Use \`**bold**\` to highlight the technique name or the specific phrase being discussed.

**strengths** (3-5 bullets) — what the PM did well. Each bullet should:
- Quote a specific moment from the transcript (in quotes)
- Name the Sandler technique used (e.g. "Up-Front Contract", "Pain Funnel", "Reversing", "Closing the File", "Pendulum") OR the supplementary technique if more apt (e.g. "Voss-style label", "calibrated How question")
- Explain in one sentence why it worked here

Example bullet:
\`- **Up-Front Contract** — opened the call with *"I want to walk through three things and end with a clear next step — does that work?"* This set the tone before the financial news landed and removed the client's instinct to brace.\`

**misses** (3-5 bullets) — gaps or mistakes. Each bullet should:
- Quote the moment
- Name the Sandler technique that would have made this stronger
- One sentence on the cost of the miss

Example bullet:
\`- **Mind-Reading instead of Pain Funnel** — when the client said *"this is just a lot,"* you replied *"I know, I'm so sorry."* A second-layer question (*"what's the part that's hitting hardest right now?"*) would have surfaced whether the issue was the money, the surprise, or the trust — three different fixes.\`

**alternatives** (3-5 bullets) — concrete rewrites tailored to this client's DISC. Each bullet should:
- Quote what the PM actually said (in quotes)
- Offer a Sandler-shaped rewrite (in quotes), in the PM's voice given their DISC profile (${pmDisc.code}), respectful of the client's DISC (${clientDisc.code})
- One short sentence on which technique it leans on

Example bullet:
\`- You said: *"I think we should do Option A."* Try: *"Honestly, I'm not sure either option is the obvious right answer for you. What would have to be true for Option A to feel like the right call?"* — that's a **Negative Reverse** + **Reversing**, which fits a C client's need to think it through.\`

**discAdaptation** (3-5 bullets) — coaching specifically on the ${pmDisc.code} → ${clientDisc.code} interaction. Each bullet should:
- Identify a moment where the PM's natural style helped or hurt
- Reference how Sandler techniques work differently across DISC profiles (e.g. Pain Funnel works especially well with C; Reversing tends to escalate D unless paced; Up-Front Contracts calm S clients)
- One concrete adjustment for next time

## Score Calculation

The totalScore formula:
\`((empathy * 0.13) + (clarity * 0.13) + (discAdaptation * 0.22) + (solutionOrientation * 0.12) + (ownership * 0.12) + (composure * 0.13) + (activeListening * 0.15)) / 5 * 100\`, rounded to nearest integer. Because 0 is a valid category score, a dismissive or abandoned call correctly produces a total near 0 — that is the expected outcome, not an error. Do not floor scores at 1.

Be specific, be direct, be honest. This is a learning tool — vague or overly positive feedback does not help the PM improve. The PM should leave the debrief with **one or two specific Sandler techniques to practice next session**, not a generic directive to "be more empathetic."`;
}
