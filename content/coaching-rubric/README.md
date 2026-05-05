# Coaching Rubric

> **Status:** Placeholder content. Replace with your company's real rubric before going live.

This folder defines exactly how the AI coach evaluates a PM's performance after each simulation.

---

## Files

| File | What's In It |
|---|---|
| [01-categories-and-weights.md](01-categories-and-weights.md) | The six scoring categories and what percentage each one contributes to the final score |
| [02-scoring-levels.md](02-scoring-levels.md) | What earns a 1, 2, 3, 4, or 5 in each category, with example PM behaviors |

---

## How Scoring Works

After the PM ends a session, the AI receives:

1. The full conversation transcript (PM and AI client turns)
2. The scenario file
3. The client's DISC profile
4. The PM's own DISC profile (from the database)
5. The contents of this rubric folder

The AI then produces:

- A **1-5 score for each of the 6 categories**
- A **weighted total** out of 100 (each category's score × its weight, summed)
- A **structured debrief** for each category: what the PM did, why that score, and concrete alternative phrasings
- A **DISC adaptation note** specifically calling out where the PM's natural style helped or hurt with this client profile

---

## Score-to-Grade Mapping

| Total Score | Performance Band |
|---|---|
| 90-100 | Exceptional — model performance, share with the team |
| 80-89 | Strong — minor coaching opportunities |
| 70-79 | Solid — meeting the bar with clear room to grow |
| 60-69 | Developing — important gaps to address |
| Below 60 | Needs focused practice — schedule a 1:1 with the owner |

These bands are advisory, not punitive. The point of the simulator is **growth**, not gatekeeping.

---

## Editing the Rubric

To change a category, weight, or scoring level:

1. Edit the relevant file in this folder
2. Make sure the weights in `01-categories-and-weights.md` still total 100%
3. Save
4. Next session uses the updated rubric

For non-technical edits by the business owner, an admin UI for the rubric is built in **Phase 5**.

---

## Why These Six Categories

The six categories are designed to capture what excellent client communication looks like in residential design/build/remodel specifically. They balance:

- **Emotional intelligence** (Empathy, Composure)
- **Substance** (Clarity, Solution Orientation, Ownership)
- **DISC fluency** (DISC Adaptation — the heaviest weighted, because that's the differentiator the company is investing in)

You can rename, re-weight, add, or remove categories. Just keep the file structure consistent so the AI can read it.
