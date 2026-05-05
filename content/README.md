# Content Library

This folder is the **single source of truth** for all training content the AI uses during simulations and coaching. The application reads these files at runtime, so any edit you make here flows into the next session — no developer needed.

> ⚠️ All content in this folder is **placeholder material drafted to look realistic for the residential design/build/remodel industry**. Replace it with your real company language, scenarios, and rubric before going live.

---

## Folder Structure

```
content/
├── scenarios/              ← The 5 conversation setups a PM can practice
│   ├── 01-schedule-delay.md
│   ├── 02-budget-overrun.md
│   ├── 03-angry-client.md
│   ├── 04-unexpected-scope-change.md
│   └── 05-micromanaging-client.md
│
├── disc-profiles/          ← How each DISC client behaves in conversation
│   ├── README.md           ← Overview + how the AI uses these
│   ├── 01-D-dominance.md
│   ├── 02-I-influence.md
│   ├── 03-S-steadiness.md
│   ├── 04-C-conscientiousness.md
│   ├── 05-D-I-driver-influencer.md
│   ├── 06-D-C-driver-analyst.md
│   ├── 07-I-S-relator.md
│   └── 08-S-C-stabilizer.md
│
└── coaching-rubric/        ← How the AI scores PM performance
    ├── README.md           ← How the rubric works end-to-end
    ├── 01-categories-and-weights.md
    └── 02-scoring-levels.md
```

---

## How to Edit

Every file is plain Markdown. Open in any editor (VS Code, Notepad, TextEdit) or directly on GitHub.

**To change a scenario:** edit the corresponding file in `scenarios/`. Keep the section headings (`## Setup`, `## Desired Outcomes`, etc.) — the app uses them to structure prompts.

**To rewrite a DISC profile in your company's exact language:** edit the file in `disc-profiles/`. Same rule on headings.

**To re-weight the rubric:** edit `coaching-rubric/01-categories-and-weights.md`. The total must equal 100%.

**To change scoring criteria:** edit `coaching-rubric/02-scoring-levels.md`.

---

## File Naming Convention

- **Numbered prefixes** (`01-`, `02-`) keep the files in display order in any folder view.
- **Hyphenated lowercase** for everything else.
- **Profile files** include the DISC code in the name so it's obvious at a glance: `05-D-I-driver-influencer.md`.

---

## What the AI Sees

When a PM starts a session, the backend assembles a prompt from three pieces:

1. The **scenario** file → tells the AI what the conversation is about
2. The **client DISC profile** file → tells the AI how to behave as the client
3. The PM's own DISC profile (from the database) → only used for coaching, not for client roleplay

When the session ends, the AI reads the **coaching rubric** files to produce a structured debrief and score.

---

## Editing Workflow

1. Open the file you want to change
2. Make your edits (preserve the headings)
3. Save
4. (If deployed) Restart the backend, or wait for the next deploy cycle
5. The next simulation will use your updated content

For non-technical edits done by the business owner, an admin UI for scenarios and rubric is built in **Phase 5** (see master plan). DISC profile content lives here in markdown by design — these change rarely.
