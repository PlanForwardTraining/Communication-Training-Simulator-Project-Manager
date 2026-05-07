# Communication Training Simulator — CLAUDE.md

## What This Is

An internal AI-powered voice roleplay training app for project managers (PMs). A PM logs in, picks a scenario and a client DISC personality, then has a **live spoken conversation** with an AI roleplaying that client. After the session, Claude delivers a personalized coaching debrief and score. A business-owner admin dashboard tracks all PMs over time.

This is not a product for sale. It is a world-class internal training tool.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Mobile-first, fast, clean |
| Backend | Node.js + Express | Simple REST API, JS throughout |
| Database | SQLite (via better-sqlite3) | Zero-config, single file, easy backup |
| **Voice (real-time)** | **ElevenLabs Conversational AI** | Phone-call-feel: continuous mic, VAD, streaming STT/TTS, echo cancellation, interruption detection — all managed |
| **AI Brain (in-call)** | **ElevenLabs Qwen3.5-397B** *(configurable)* | Currently set to Qwen3.5-397B for sub-400ms first-token latency. Switchable to Claude Haiku/Sonnet via the agent's LLM dropdown if quality > speed is preferred. Whatever the choice, ElevenLabs CAI invokes it each turn using our persona prompt override. |
| **AI Coaching (post-call)** | Anthropic Claude API (direct) | Always uses Claude Sonnet 4.6 — quality > speed for the coaching debrief. Separate call after session ends; analyzes full transcript + interruption events to produce structured coaching JSON. |
| **Coaching Lens** | **Sandler Sales Methodology** (primary) + Voss labels / calibrated questions / classic active listening (supplementary) | Sandler is built around controlled, honest conversations under emotional pressure — exactly what residential design-build PMs face. Primer at `/content/coaching-rubric/03-sandler-techniques.md` is fed into every coaching prompt and the AI cites techniques by name in feedback. |
| Excel Export | exceljs | Direct .xlsx generation, no Office dependency |
| Auth | JWT + bcrypt | Stateless, secure, simple |
| Deployment | Railway (backend + DB) + Vercel (frontend) | Fast, affordable, no DevOps |

---

## Architecture Overview

```
Browser (React SPA + @elevenlabs/react SDK)
  │
  ├─ REST API calls ────► Express Backend (Railway)
  │                          │
  │                          ├─ POST /api/sessions: assembles persona prompt from /content/
  │                          │   (with the voice's first name injected as the client's identity),
  │                          │   selects voice via DISC-aligned random, mints ElevenLabs signed URL,
  │                          │   returns { sessionId, signedUrl, agentId, voiceId, voiceName,
  │                          │             clientFirstName, personaPrompt, firstMessage }
  │                          │
  │                          ├─ GET /api/scenarios/by-slug/:slug: trims body at "<!-- BRIEF END -->"
  │                          │   so the PM sees only their realistic case file, not the answer key
  │                          │
  │                          ├─ POST /api/sessions/:id/end: receives full transcript + events
  │                          │   from browser, persists to turns/events tables, calls Claude
  │                          │   (Sonnet 4.6 + Sandler primer) for coaching, saves coaching
  │                          │
  │                          └─ SQLite (mounted at /data on Railway volume)
  │
  └─ WebRTC audio ──────► ElevenLabs Conversational AI
                            │
                            ├─ Streaming STT
                            ├─ Voice Activity Detection
                            ├─ Calls configured LLM (Qwen / Claude / etc.) with
                            │  per-session persona prompt + voice override
                            ├─ Streaming TTS (chosen voice)
                            └─ Interruption + echo handling
                            │
                            └─ SDK emits events to browser callbacks:
                               • onMessage (each completed turn)
                               • onInterruption
                               • onStatusChange / onError / onConnect / onDisconnect

The browser captures turns + interruption events via SDK callbacks (NOT via server webhooks).
When PM clicks End Session, the full transcript is sent in the body of POST /api/sessions/:id/end.

Backend coaching pipeline at end:
  Browser (transcript + events) → POST /:id/end
  Backend persists turns + events
  Backend ──► Claude API (direct, Sonnet 4.6) with rubric + transcript
                 → structured coaching JSON + score
                 → saved to SQLite + (future) Excel export

Admin Dashboard (Phase 5 v1 — live)
  Same React app at /admin, role-gated to admin role:
  ├─ /admin             ← cohort dashboard: KPIs, team category averages,
  │                       flagged PMs needing attention, full PM table
  ├─ /admin/users/:id   ← per-PM detail: trend chart, focus areas, sessions
  ├─ /admin/sessions/:id ← full session review with transcript + coaching
  └─ Backend admin routes (/api/admin/*) with requireAdmin guard:
     • GET /summary, /users, /users/:id, /sessions/:id
     • POST /users, PATCH /users/:id (create/edit/deactivate)
     • GET /export.xlsx (multi-sheet Excel — Sessions + PMs)

Excel auto-regenerates after every session end (non-blocking).
Content-editing UIs deferred — /content/*.md is upserted on each deploy.
```

**Conversation flow:**
1. PM picks scenario → reads brief on DISC select page (answer-key sections hidden) → picks DISC profile
2. SimulationPage loads → frontend calls `POST /api/sessions` and `GET /api/scenarios/by-slug/:slug` in parallel. Backend selects a voice (DISC-aligned random), derives the client's first name from the voice's `display_name`, builds the persona prompt with the name injected, and generates a per-session `firstMessage` ("Hello, this is [Name].")
3. Pre-call case-file card shows on screen: large client name, DISC code, scenario title, and the brief in a side panel (persistent on desktop, drawer on mobile)
4. PM hits "Start Session" — frontend opens an ElevenLabs CAI session via `@elevenlabs/react` SDK, passing persona prompt + voice + first_message as `conversation_initiation_client_data` overrides
5. AI client picks up: *"Hello, this is [Name]."* PM responds. ElevenLabs streams audio, transcribes, calls the configured LLM (Qwen3.5-397B by default), streams TTS response back
6. Browser SDK callbacks fire: `onMessage` for each completed turn, `onInterruption` for overlap events. Frontend accumulates these in component state.
7. PM clicks End Session → confirmation → frontend ends CAI session and calls `POST /api/sessions/:id/end` with `{ turns, events }` body
8. Backend persists turns + events, calls Claude (Sonnet 4.6) with the rubric, transcript, and the Sandler primer for analysis
9. Coaching saved as bullet-formatted strengths / misses / alternatives / DISC adaptation; debrief renders via `MarkdownLite` with Sandler techniques cited inline

---

## Project Structure

```
/
├── content/                    # ★ Source-of-truth training content (markdown, owner-editable)
│   ├── scenarios/              # 5 scenarios with bespoke per-scenario structure;
│   │                           # split into PM brief (above) vs. answer key (below) by
│   │                           # an HTML comment marker: <!-- BRIEF END -->
│   ├── disc-profiles/          # 8 DISC client persona files (01-D-dominance.md, etc.)
│   ├── voices/                 # 20 voice profiles (ID + display_name + DISC compatibility);
│   │                           # display_name's first word becomes the client's first name
│   └── coaching-rubric/
│       ├── 01-categories-and-weights.md   # 7 categories summing to 100%
│       ├── 02-scoring-levels.md           # 1-5 scale per category
│       └── 03-sandler-techniques.md       # Primary coaching lens (Sandler) + supplements
│
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ScenarioSelectPage.tsx
│   │   │   ├── DiscSelectPage.tsx       # Shows scenario brief above the DISC grid
│   │   │   ├── SimulationPage.tsx       # ElevenLabs SDK + pre-call case file + side notes panel
│   │   │   ├── DebriefPage.tsx          # SVG score ring + bullet-formatted Sandler-aware feedback
│   │   │   ├── HistoryPage.tsx
│   │   │   └── admin/                   # Admin Dashboard (Phase 5 v1)
│   │   │       ├── AdminLayout.tsx           # Shared admin chrome with Excel export button
│   │   │       ├── AdminDashboardPage.tsx    # Cohort KPIs, flagged PMs, full PM table
│   │   │       ├── AdminUserDetailPage.tsx   # Per-PM trend chart + focus areas + sessions
│   │   │       ├── AdminSessionDetailPage.tsx # Score ring + transcript + coaching
│   │   │       ├── UserModalForm.tsx         # Create / edit / deactivate PMs
│   │   │       └── TrendChart.tsx            # Hand-rolled SVG line chart (no recharts dep)
│   │   ├── components/
│   │   │   ├── DiscBadge.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx          # React Context — single source of truth for auth
│   │   ├── hooks/
│   │   │   └── useAuth.ts               # (legacy — superseded by AuthContext)
│   │   ├── utils/
│   │   │   └── MarkdownLite.tsx         # Tiny renderer: h2/p/ul/ol/**bold**/*italic*
│   │   ├── api/                         # typed fetch wrappers
│   │   │   ├── client.ts                # base fetch with JWT + 401 auto-logout
│   │   │   ├── auth.ts
│   │   │   ├── scenarios.ts             # list() + getBriefing(slug)
│   │   │   ├── disc.ts
│   │   │   └── sessions.ts
│   │   └── App.tsx
│   └── index.html
│
├── server/                     # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts                  # POST /auth/login, GET /auth/me (rejects active=0)
│   │   │   ├── users.ts
│   │   │   ├── scenarios.ts             # list, by-slug brief (trimmed), CRUD
│   │   │   ├── disc-profiles.ts
│   │   │   ├── rubric.ts
│   │   │   ├── sessions.ts              # session lifecycle + ElevenLabs signed URL
│   │   │   ├── admin.ts                 # /api/admin/* — summary, users, sessions, export
│   │   │   └── elevenlabs-webhook.ts    # built but unused (client-side capture instead)
│   │   ├── services/
│   │   │   ├── claude.ts                # generateCoaching() — direct Claude API
│   │   │   ├── elevenlabs-cai.ts        # signed URL + persona + first_message + HMAC
│   │   │   ├── excel.ts                 # regenerateExcel() — multi-sheet workbook
│   │   │   └── voice-selector.ts        # DISC-aligned random; returns clientFirstName
│   │   ├── prompts/
│   │   │   ├── loader.ts                # reads /content/ at startup; serves Sandler primer too
│   │   │   ├── persona-prompt.ts        # buildPersonaPrompt(scenario, clientDisc, clientFirstName)
│   │   │   └── coaching-prompt.ts       # buildCoachingPrompt(turns, events, ..., sandlerPrimer)
│   │   ├── db/
│   │   │   ├── schema.sql               # SQL DDL (copied to dist/db/ at build)
│   │   │   ├── connection.ts            # better-sqlite3 singleton (creates parent dir if missing)
│   │   │   ├── migrate.ts               # Runs schema + idempotent ALTERs for prod-volume DBs
│   │   │   └── seed.ts                  # UPSERTs from /content/; rubric is delete+reinsert
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── roleGuard.ts
│   │   ├── utils/
│   │   │   └── content-dir.ts           # finds /content/ in dev (repo root) or prod (dist/content)
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── tests/                           # Jest + supertest, in-memory SQLite
│   ├── package.json
│   └── tsconfig.json
│
├── railway.toml                # Railway config: build from repo root, cd server
│
├── docs/
│   └── superpowers/plans/      # phase-by-phase plans
│
└── data/                       # Local dev only — production uses /data on Railway volume
    └── .gitkeep
```

---

## Database Schema (SQLite)

```sql
users         (id, name, email, password_hash, disc_profile, role, created_at)
scenarios     (id, slug, title, description, body_markdown, active, updated_at)
disc_profiles (id, code, name, body_markdown)
sessions      (id, user_id, scenario_id, client_disc_id, voice_id, voice_name,
               elevenlabs_conversation_id, started_at, ended_at, total_score)
turns         (id, session_id, speaker, content, started_at_ms, ended_at_ms, created_at)
events        (id, session_id, type, speaker, details_json, occurred_at)
                -- type: 'user_interrupted_agent', 'agent_interrupted_user',
                --       'long_pause', 'overlap'
coaching      (session_id, strengths, misses, alternatives, disc_adaptation,
               score_breakdown_json, total_score, created_at)
rubric_items  (id, name, weight, description, display_order)
```

The `events` table is the source of truth for interruption tracking. Coaching reads from both `turns` and `events` to score Active Listening accurately.

---

## Environment Variables

**Backend dev (`server/.env`):**
```
DATABASE_PATH=./data/simulator.db        # relative — local dev
EXCEL_PATH=./data/sessions.xlsx
JWT_SECRET=<strong random string>
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=...                  # the configured Conversational AI agent (no "agent_" prefix)
ADMIN_PASSWORD=<password for seeded admin user>
PORT=3002                                # 3001 conflicts with gmail-mcp on Tyler's Mac
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Backend production (Railway env vars):**
```
DATABASE_PATH=/data/simulator.db         # absolute — Railway volume mount
EXCEL_PATH=/data/sessions.xlsx
PORT=3001                                # matches Generate Domain dialog
NODE_ENV=production
CLIENT_ORIGIN=https://<vercel-url>       # locked down after Vercel deploys; "*" temporarily during setup
# Plus all the same secrets: JWT_SECRET (different from dev!), ANTHROPIC_API_KEY,
# ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, JWT_EXPIRES_IN, ADMIN_PASSWORD
```

**No longer used:**
- `OPENAI_API_KEY` — ElevenLabs CAI handles STT natively
- `ELEVENLABS_VOICE_ID` — superseded by the voice pool in `/content/voices/`
- `ELEVENLABS_WEBHOOK_SECRET` — webhooks aren't used; transcript captured client-side
- `RESEND_API_KEY` — Resend isn't set up yet (will be added when password reset is needed)

**Frontend (`client/.env`):**
```
# Dev:
VITE_API_BASE_URL=http://localhost:3002

# Vercel production env var:
# VITE_API_BASE_URL=https://<railway-url>
```

---

## Development Commands

```bash
# Install all dependencies
cd server && npm install
cd client && npm install

# Run backend (dev, with auto-reload)
cd server && npm run dev

# Run frontend (dev)
cd client && npm run dev

# Run both concurrently (from root)
npm run dev

# Run backend tests
cd server && npm test

# Build for production
cd client && npm run build
cd server && npm run build
```

---

## Key Design Decisions & Constraints

**Content lives in `/content/`, code lives in `/server/`.** All training content (scenarios, DISC profiles, coaching rubric) is markdown in `/content/`. The backend reads from `/content/` at runtime to assemble prompts in `server/src/prompts/`. This separation lets the business owner edit content directly (or via the admin UI in Phase 5) without touching code.

**DISC Profiles:** The app supports Primary (D, I, S, C) and four combination profiles (D/I, D/C, I/S, S/C). Each profile is a markdown file in `/content/disc-profiles/`. The PM's own DISC profile informs the coaching — the AI highlights gaps between the PM's natural style and what the client needed.

**Voice conversation is real-time and phone-call-like.** PM speaks naturally without pressing a button; ElevenLabs Conversational AI handles continuous mic, voice activity detection, streaming speech-to-text, streaming Claude responses, and streaming text-to-speech. PM and AI client can speak over each other; **interruptions are detected and logged as events** for use in coaching.

**Interruption tracking is a first-class feature.** Every time the PM speaks while the AI client is mid-utterance, an `events` row is recorded. The Active Listening rubric category specifically scores PM→client interruptions, weighted by the client's DISC profile (interrupting an S or C client is penalized more heavily than interrupting a D). The AI client *can* interrupt the PM in profile-appropriate ways (a high-D realistically does talk over people) — those events are logged but do not count against the PM's score.

**Voice variety is a first-class feature.** A voice pool lives in `/content/voices/` (one markdown file per voice with ElevenLabs ID + DISC compatibility metadata). Every session, the backend selects a voice using a three-tier priority: (1) scenario-pinned override, (2) DISC-aligned random from the active pool *(default)*, (3) admin-toggled forced random. The PM never picks the voice. Same scenario+DISC combination will sound different on different days, which both adds realism and prevents PMs from "memorizing" how a particular client sounds. The `sessions` table records `voice_id` and `voice_name` so admin reporting can show who trained against which voices over time.

**The AI client has a name.** Each voice's `display_name` (the voice talent's name from ElevenLabs) is also used as the client's first name — `Bella`, `Sarah`, `Adam`, etc. The first word of `display_name` is taken (so `Adam M` → `Adam`, `Joey Patel` → `Joey`). Because the name and voice come from the same record, gender is paired automatically. The persona prompt injects the name as `## Your Identity`, and the AI picks up the call with `"Hello, this is [Name]."` The PM sees the same name on the simulation page header, in a pre-call case-file card, and on every client transcript bubble — matching the realistic posture of calling a known client.

**Coaching is Sandler-first.** The post-call coaching engine reads `/content/coaching-rubric/03-sandler-techniques.md` as a primer and analyzes the transcript through that lens. Strengths, misses, alternatives, and DISC adaptation notes are returned as 3-5 bulleted lines each, with specific Sandler techniques cited by name (Up-Front Contract, Pain Funnel, Reversing, No Mind Reading, Negative Reverse, Closing the File, Pendulum, Tonality, 3rd Person Story). Voss labels and calibrated questions are pulled in where they fit better than the Sandler equivalent. The goal of every debrief: send the PM home with one or two specific techniques to practice next session, not a generic "be more empathetic" directive.

**The PM's view vs. the AI's view of a scenario are different by design.** Each scenario markdown file has an `<!-- BRIEF END -->` marker. Above the marker = what the PM realistically walks into the call knowing (Setup, What's Happened, What the Client Knows, plus per-scenario context like "What You Already Have In Hand"). Below the marker = answer-key material (Inside the Client's Head, How They Will Likely React, What Success Looks Like, Common Pitfalls, Coaching Focus) that the AI uses to roleplay realistically and the coaching engine uses to score against. The PM never sees the answer key. The AI sees the full file. The brief is shown both on the DISC select page and as a persistent side panel during the call.

**Admin "focus areas" surface patterns, not single bad days.** A category is flagged for a PM only when it averages below 3 across at least 3 sessions — single low scores never trigger flags. A PM is flagged for "needing attention" when at least one of three things is true: (a) no practice in 14+ days, (b) declining recent-3 vs prior-3 average score, or (c) two or more weak categories. The dashboard surfaces the top 5 most-concerning PMs sorted by reasons-count then lowest avg. This gives the owner an at-a-glance read on where to focus coaching effort.

**Auto-end on mutual goodbye.** The simulation page detects closing phrases (word-bounded matches on `bye`, `goodbye`, `take care`, `have a good day/evening/...`, `talk to you soon/later`, `thanks for your time`, etc.) in the most recent turn from each side. After at least 4 turns of conversation, when both the latest PM turn AND the latest client turn contain a closing, a 5-second sticky countdown banner appears with a "Keep going" cancel button. At zero, the existing end-session flow fires (skipping the modal). Conservative on purpose — the regex prefers missed goodbyes over cut-off conversations.

**Mobile mic permission is pre-warmed.** On iOS Safari, the browser's mic permission prompt blocks audio I/O — so the AI's `firstMessage` ("Hello, this is X") was firing while the user was still tapping Allow. The Start button now calls `getUserMedia({ audio: true })` first to confirm permission, stops the resulting stream (the SDK requests its own), then opens the WebSocket. The greeting plays after permission is granted.

**PMs cannot change their own DISC profile.** Only admin can set/update. Enforced at the API layer.

**Excel is the source of truth for business reporting.** The SQLite DB is the operational store; Excel is regenerated/appended on session completion so the business owner always has a fresh readable file.

**Scenario and rubric content is owner-supplied.** The developer builds the system; the owner fills in the five scenario descriptions, DISC profile language, and coaching rubric weights. The admin UI allows the owner to update these without developer help.

**Scale target:** 5 PMs initially, cleanly scales to 30 without rearchitecting. SQLite handles this comfortably; migration path to PostgreSQL is documented if ever needed.

---

## User Roles

| Role | Access |
|---|---|
| `pm` | Login, run simulations, view own history |
| `admin` | All PM access + view all sessions, manage users, configure scenarios/rubric |

---

## Content the Business Owner Provides (Blockers)

Placeholder content for the first three has been drafted in `/content/` so development is unblocked. The owner should review and replace with real company language before launch.

- [x] Five scenario titles, descriptions, and desired outcomes — *placeholders in `/content/scenarios/`*
- [x] DISC profile descriptions — *placeholders in `/content/disc-profiles/`*
- [x] Coaching rubric: categories, weights, scoring levels — *placeholders in `/content/coaching-rubric/`*
- [ ] Each PM's name, email, and DISC profile
- [ ] Branding preferences (colors, logo)
- [ ] Preferred ElevenLabs voice (developer to propose options)

---

## Documentation Sync Rule (IMPORTANT)

[REBUILD_ME_GUIDE.md](REBUILD_ME_GUIDE.md) and [PROGRESS.md](PROGRESS.md) are **paired files** that must stay in sync at all times:

- **REBUILD_ME_GUIDE.md** is the reference manual — explanations, commands, context
- **PROGRESS.md** is the trackable checklist — every actionable step from the guide as `- [ ]`

**The rule:** Any time a step is **added, removed, renamed, or reordered** in one file, the same change must be made in the other in the same edit. They are two views of the same source of truth.

**For AI assistants helping with this project:** When the user asks you to modify either file, you MUST also update the other file to match. Do not edit one without the other. If a change applies only to the explanatory prose in REBUILD_ME_GUIDE.md and does not change any actionable step, no PROGRESS.md update is needed — but be explicit when reporting that.

**For humans editing manually:** If you add a `- [ ]` step to PROGRESS.md, also add it to the matching section of REBUILD_ME_GUIDE.md (and vice versa). The section anchors in PROGRESS.md (e.g., `#part-4--build-the-backend-foundation-phase-1`) must match the heading slugs in the guide.

## Phase Summary

| Phase | What Gets Built | Status |
|---|---|---|
| 1 — Foundation | Backend, DB, auth, user/scenario CRUD | ✅ Done |
| 2 — AI Engine | Claude coaching + persona prompt builders | ✅ Done |
| 3 — Voice Pipeline | ElevenLabs CAI + voice selector + signed URLs | ✅ Done |
| 4 — PM Frontend | Login → scenario → DISC → simulation → debrief → history | ✅ Done |
| 5 — Admin Dashboard | All-PM view, trend chart, auto-flagged focus areas, Excel export, user CRUD | ✅ v1 done — content-editing UIs (scenarios/rubric/voices) deferred since `/content/*.md` is editable directly |
| 6 — Deploy | Production hosting on Railway + Vercel | ✅ Backend (Railway) + Frontend (Vercel) both live |
| Post-deploy polish | Brief panel, named client, Sandler coaching, bullet feedback, content sync | ✅ Done — see Production Build Notes |

Each phase has its own detailed plan in `docs/superpowers/plans/`.

---

## Production Status

- **Frontend:** Live at `https://pm-training-simulator.vercel.app`
  - Vercel Hobby plan, deployed from `client/` root
  - Auto-deploys on push to `main` (commits must be authored as the project-owner email — see Build Notes)
- **Backend:** Live at `https://communication-training-simulator-project-manager-production.up.railway.app`
  - `/health` returns 200 ✅
  - Hobby plan ($5/mo)
  - Volume mounted at `/data` for SQLite + Excel persistence
  - `CLIENT_ORIGIN` locked to the Vercel URL (no longer `*`)
- **Repo:** `https://github.com/PlanForwardTraining/Communication-Training-Simulator-Project-Manager` (public, on Vercel Hobby)

## Production Build Notes

The production build has a few non-obvious behaviors worth knowing:

1. **`/content/` is bundled into `server/dist/content/` during build** — Railway only deploys the build context, so the server is self-contained at runtime. Path resolution helper at `server/src/utils/content-dir.ts` finds content in either `dist/content/` (prod) or repo root (dev).

2. **`server/package.json` `start` runs migrate → seed → server** — admin user uses `INSERT OR IGNORE` (passwords don't reset). Scenarios + DISC profiles use `INSERT ... ON CONFLICT(slug/code) DO UPDATE`. Rubric items are deleted and re-inserted. Net effect: editing `/content/*.md` and pushing is a complete content sync — no manual migration.

3. **`railway.toml` at repo root drives the build** — DO NOT set Railway's "Root Directory" UI setting; that restricts build context and breaks the `cp -r ../content` step. The TOML's `cd server && ...` works because the build runs from repo root.

4. **`engines.node` pinned to `>=20`** — `better-sqlite3@12+` requires Node 20+. Nixpacks defaults to Node 18 without this pin.

5. **`npm install --include=dev` in build command** — `NODE_ENV=production` makes `npm install` skip devDependencies, but `tsc` is a devDependency.

6. **ElevenLabs agent override flags must stay enabled** — at the agent level (configured once, persists), three flags must be `true` in `platform_settings.overrides.conversation_config_override`: `agent.prompt.prompt`, `agent.first_message`, `tts.voice_id`. Without these, the agent ignores the per-session prompt/voice/first-message and falls back to its hardcoded defaults — meaning every session would play the same scenario regardless of what the PM picked. The agent's own default `first_message` should be `""` and its default `prompt` should be a neutral fallback (it shouldn't reference any specific scenario). All four are configured via `PATCH /v1/convai/agents/agent_<id>`.

7. **Vercel Hobby + private repo + multi-author = blocked deploy.** Hobby plan refuses deploys when the commit author email doesn't match the project owner. Two viable workarounds: (a) make the GitHub repo public (current choice — nothing sensitive in git), or (b) author every commit as the Vercel-account email (`planforwardtraining@gmail.com`). We do (a) so any author can push, but the standing convention is still to author commits as the project owner email for consistency.

8. **`<!-- BRIEF END -->` marker splits scenarios** — `server/src/routes/scenarios.ts` `GET /by-slug/:slug` slices the scenario body at this marker. The PM gets only the brief; the AI's persona prompt still gets the full body. Authors can move the marker to control how much the PM sees per scenario without code changes.

9. **Coaching prompt expects bullet output** — Claude is directed to return `strengths`/`misses`/`alternatives`/`discAdaptation` as 3-5 markdown bullets each (`-` prefix, `**bold**` technique names, `*italic*` quoted phrases). The frontend's `MarkdownLite` component renders these. If you change the format on the backend, render must change in lockstep.
