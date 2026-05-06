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
  │                          ├─ POST /api/sessions: assembles persona prompt from /content/,
  │                          │   selects voice via DISC-aligned random, mints ElevenLabs signed URL,
  │                          │   returns { sessionId, signedUrl, agentId, voiceId, voiceName, personaPrompt }
  │                          │
  │                          ├─ POST /api/sessions/:id/end: receives full transcript + events
  │                          │   from browser, persists to turns/events tables, calls Claude
  │                          │   for coaching, saves coaching, regenerates Excel
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

Admin Dashboard (Phase 5 — not yet built)
  └─ Same React app, role-gated routes → same backend
```

**Conversation flow:**
1. PM hits "Start" — frontend calls `POST /api/sessions` to get `signedUrl + personaPrompt + voiceId`
2. Frontend opens an ElevenLabs CAI session via `@elevenlabs/react` SDK, passing persona prompt + voice as `conversation_initiation_client_data` overrides
3. PM speaks naturally — ElevenLabs streams audio, transcribes, calls the configured LLM (Qwen3.5-397B by default), streams TTS response back
4. Browser SDK callbacks fire: `onMessage` for each completed turn, `onInterruption` for overlap events. Frontend accumulates these in component state.
5. PM clicks End Session → confirmation → frontend ends CAI session and calls `POST /api/sessions/:id/end` with `{ turns, events }` body
6. Backend persists turns + events, calls Claude (direct API, Sonnet 4.6) for coaching analysis
7. Coaching saved, debrief shown to PM

---

## Project Structure

```
/
├── content/                    # ★ Source-of-truth training content (markdown, owner-editable)
│   ├── scenarios/              # 5 scenario files (01-schedule-delay.md, etc.)
│   ├── disc-profiles/          # 8 DISC client persona files (01-D-dominance.md, etc.)
│   ├── voices/                 # 10 voice profiles (ID + DISC compatibility metadata)
│   └── coaching-rubric/        # Categories, weights, scoring levels
│
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ScenarioSelectPage.tsx
│   │   │   ├── DiscSelectPage.tsx
│   │   │   ├── SimulationPage.tsx       # ElevenLabs SDK voice conversation
│   │   │   ├── DebriefPage.tsx          # SVG score ring + 7-category breakdown
│   │   │   └── HistoryPage.tsx
│   │   ├── components/
│   │   │   ├── DiscBadge.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx          # React Context — single source of truth for auth
│   │   ├── hooks/
│   │   │   └── useAuth.ts               # (legacy — superseded by AuthContext)
│   │   ├── api/                         # typed fetch wrappers
│   │   │   ├── client.ts                # base fetch with JWT + 401 auto-logout
│   │   │   ├── auth.ts
│   │   │   ├── scenarios.ts
│   │   │   ├── disc.ts
│   │   │   └── sessions.ts
│   │   └── App.tsx
│   └── index.html
│
├── server/                     # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts                  # POST /auth/login, GET /auth/me
│   │   │   ├── users.ts
│   │   │   ├── scenarios.ts
│   │   │   ├── disc-profiles.ts
│   │   │   ├── rubric.ts
│   │   │   ├── sessions.ts              # session lifecycle + ElevenLabs signed URL
│   │   │   └── elevenlabs-webhook.ts    # built but unused (client-side capture instead)
│   │   ├── services/
│   │   │   ├── claude.ts                # generateCoaching() — direct Claude API
│   │   │   ├── elevenlabs-cai.ts        # signed URL minting + HMAC verification
│   │   │   └── voice-selector.ts        # DISC-aligned random voice selection
│   │   ├── prompts/
│   │   │   ├── loader.ts                # reads /content/ at startup, in-memory cache
│   │   │   ├── persona-prompt.ts        # buildPersonaPrompt(scenario, clientDisc)
│   │   │   └── coaching-prompt.ts       # buildCoachingPrompt(turns, events, ...)
│   │   ├── db/
│   │   │   ├── schema.sql               # SQL DDL (copied to dist/db/ at build)
│   │   │   ├── connection.ts            # better-sqlite3 singleton (creates parent dir if missing)
│   │   │   ├── migrate.ts
│   │   │   └── seed.ts                  # seeds from /content/ + admin user
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
| 5 — Admin Dashboard | All-PM view, score trends, scenario/rubric/voice config, Excel export | ⏳ Not started — deferred until after deploy |
| 6 — Deploy | Production hosting on Railway + Vercel | 🔶 Backend done, frontend pending |

Each phase has its own detailed plan in `docs/superpowers/plans/`.

---

## Production Status

- **Backend:** Live at `https://communication-training-simulator-project-manager-production.up.railway.app`
  - `/health` returns 200 ✅
  - Hobby plan ($5/mo)
  - Volume mounted at `/data` for SQLite + Excel persistence
- **Frontend:** Not yet deployed to Vercel (next step)
- **Repo:** `https://github.com/PlanForwardTraining/Communication-Training-Simulator-Project-Manager`

## Production Build Notes

The production build has a few non-obvious behaviors worth knowing:

1. **`/content/` is bundled into `server/dist/content/` during build** — Railway only deploys the build context, so the server is self-contained at runtime. Path resolution helper at `server/src/utils/content-dir.ts` finds content in either `dist/content/` (prod) or repo root (dev).

2. **`server/package.json` `start` runs migrate → seed → server** — first-deploy seeds an admin user from `ADMIN_PASSWORD` env var. Idempotent on subsequent deploys (uses INSERT OR IGNORE).

3. **`railway.toml` at repo root drives the build** — DO NOT set Railway's "Root Directory" UI setting; that restricts build context and breaks the `cp -r ../content` step. The TOML's `cd server && ...` works because the build runs from repo root.

4. **`engines.node` pinned to `>=20`** — `better-sqlite3@12+` requires Node 20+. Nixpacks defaults to Node 18 without this pin.

5. **`npm install --include=dev` in build command** — `NODE_ENV=production` makes `npm install` skip devDependencies, but `tsc` is a devDependency.
