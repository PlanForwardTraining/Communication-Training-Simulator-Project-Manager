# DISC Profiles — Client Personas

> **Status:** Placeholder content. Replace with your company's real DISC language before going live.

This folder contains one file per DISC profile the AI can roleplay as a client. Every PM session begins with the PM choosing which profile they want to practice against. The AI reads that file and stays in character throughout the conversation.

---

## Profile Library

| File | Code | Common Name | Personality Snapshot |
|---|---|---|---|
| [01-D-dominance.md](01-D-dominance.md) | D | Driver | Direct, decisive, results-focused, impatient with detail |
| [02-I-influence.md](02-I-influence.md) | I | Promoter | Enthusiastic, social, optimistic, dislikes conflict |
| [03-S-steadiness.md](03-S-steadiness.md) | S | Supporter | Calm, loyal, methodical, dislikes sudden change |
| [04-C-conscientiousness.md](04-C-conscientiousness.md) | C | Analyst | Precise, data-driven, cautious, asks deep questions |
| [05-D-I-driver-influencer.md](05-D-I-driver-influencer.md) | D/I | Director-Promoter | Decisive AND charismatic — visionary, fast-paced |
| [06-D-C-driver-analyst.md](06-D-C-driver-analyst.md) | D/C | Director-Analyst | Decisive AND data-hungry — high-stakes researchers |
| [07-I-S-relator.md](07-I-S-relator.md) | I/S | Relator | Warm AND steady — relationship-first, conflict-averse |
| [08-S-C-stabilizer.md](08-S-C-stabilizer.md) | S/C | Stabilizer | Steady AND careful — methodical planners, slow to decide |

---

## How the AI Uses These

When a session starts, the backend assembles a prompt that includes:

1. **The full text of the chosen DISC profile file** — this is the AI's "character bible" for the client
2. **The scenario file** — what the conversation is about
3. **System instructions** — how to stay in character, when to escalate, when to soften

The AI is told to **never break character mid-session** and to make the client behave consistently with their profile through every emotional beat (initial reaction, pushback, de-escalation, resolution).

---

## How These Profiles Inform Coaching

After the session ends, the AI compares:

- The **PM's own DISC profile** (stored in the database from admin setup) → the PM's natural communication style
- The **client's DISC profile** (the one selected for this session) → what the client actually needed

The coaching specifically calls out where the PM's natural style **helped** and where it **hurt**, and offers profile-specific alternative phrasings.

For example: a high-D PM speaking with a high-S client may have come across as too blunt and rushed. Coaching will name that gap explicitly and suggest pacing and language adjustments.

---

## File Structure (Each Profile)

Every profile file uses the same section headings so the AI can parse them consistently:

```
## Snapshot
## Communication Style
## What They Value
## What Frustrates Them
## How They React Under Stress
## How They Want to Receive Bad News
## Voice & Phrasing Examples
## What They Need to Feel Resolved
## Red Flags from a PM (Things That Make This Profile Disengage)
```

Keep these headings when editing.
