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
| **AI Brain (in-call)** | **Claude (via ElevenLabs LLM integration)** | ElevenLabs CAI invokes Claude for each turn using our persona prompt — drives the client's voice and behavior |
| **AI Coaching (post-call)** | Anthropic Claude API (direct) | Same Claude, separate call after session ends — analyzes full transcript + interruption events to produce structured debrief |
| Excel Export | exceljs | Direct .xlsx generation, no Office dependency |
| Auth | JWT + bcrypt | Stateless, secure, simple |
| Deployment | Railway (backend + DB) + Vercel (frontend) | Fast, affordable, no DevOps |

---

## Architecture Overview

```
Browser (React SPA + ElevenLabs CAI SDK)
  │
  ├─ REST API calls ────► Express Backend (Railway)
  │                          │
  │                          ├─ Issues per-session conversation override
  │                          │   (persona prompt built from /content/ files)
  │                          │
  │                          ├─ Receives webhooks from ElevenLabs:
  │                          │   • turn_start / turn_end
  │                          │   • user_interrupted_agent  ← coaching signal
  │                          │   • agent_interrupted_user  ← logged but not penalized
  │                          │   • transcript fragments
  │                          │
  │                          └─ Persists turns + events → SQLite
  │
  └─ WebRTC audio ──────► ElevenLabs Conversational AI
                            │
                            ├─ Streaming STT (own / Deepgram)
                            ├─ Voice Activity Detection
                            ├─ Calls Claude (configured LLM) with
                            │  per-session persona prompt + history
                            ├─ Streaming TTS (chosen voice)
                            └─ Interruption + echo handling
                            │
                            └─ SDK emits real-time events to browser:
                               user_transcript, agent_response, interruption

When PM clicks "End Session":
  Browser sends full transcript + interruption events → POST /api/sessions/:id/end
  Backend saves turns + events to SQLite
  Backend ──► Claude (direct API call)
                 with: full transcript + interruption events + rubric
                 → returns structured coaching JSON + score
                 → saved to SQLite, Excel export regenerated

Note: No server-side webhooks needed for turn capture.
The browser SDK captures everything; the backend receives it all at session end.

Admin Dashboard (same React app, role-gated route)
  └─ REST API calls ──► same backend
```

**Conversation flow:**
1. PM hits "Start" — frontend opens an ElevenLabs CAI session via SDK
2. Backend supplies the **conversation override**: a system prompt assembled from the chosen scenario file + chosen DISC profile file in `/content/`
3. PM speaks naturally — ElevenLabs streams audio, transcribes, calls Claude, streams Claude's response audio back
4. Both speakers' transcript fragments + every interruption event flow as webhooks to our backend, persisted to `turns` and `events` tables
5. PM clicks "End Session" — frontend stops the CAI session, hits our backend `/end` endpoint
6. Backend → Claude (separate call, with full transcript + interruption events + rubric prompt) → structured coaching JSON
7. Coaching saved, Excel regenerated, debrief shown to PM

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
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ScenarioSelectPage.tsx
│   │   │   ├── DISCSelectPage.tsx
│   │   │   ├── SimulationPage.tsx
│   │   │   ├── DebriefPage.tsx
│   │   │   ├── SessionHistoryPage.tsx
│   │   │   └── AdminDashboardPage.tsx
│   │   ├── components/
│   │   │   ├── VoiceRecorder.tsx       # mic capture, waveform
│   │   │   ├── AudioPlayer.tsx         # plays ElevenLabs audio
│   │   │   ├── ConversationLog.tsx     # live transcript display
│   │   │   ├── ScoreCard.tsx
│   │   │   └── DISCBadge.tsx
│   │   ├── hooks/
│   │   │   ├── useConversation.ts      # manages turn-by-turn state
│   │   │   └── useAudioRecorder.ts
│   │   ├── api/                        # typed API client functions
│   │   └── App.tsx
│   └── index.html
│
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── scenarios.ts
│   │   │   ├── sessions.ts
│   │   │   └── admin.ts
│   │   ├── services/
│   │   │   ├── whisper.ts          # STT via OpenAI
│   │   │   ├── elevenlabs.ts       # TTS
│   │   │   ├── claude.ts           # roleplay + coaching
│   │   │   └── excel.ts            # .xlsx export
│   │   ├── db/
│   │   │   ├── schema.ts           # table definitions
│   │   │   ├── migrations/
│   │   │   └── queries/            # typed DB query functions
│   │   ├── prompts/
│   │   │   ├── disc-personas/      # one file per DISC profile
│   │   │   ├── scenarios/          # one file per scenario
│   │   │   └── coaching.ts         # coaching rubric prompt builder
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT verification
│   │   │   └── roleGuard.ts        # admin-only route protection
│   │   └── index.ts
│   └── package.json
│
├── docs/
│   ├── superpowers/plans/          # implementation sub-plans
│   ├── admin-guide.md              # owner: add users, update scenarios
│   └── disc-profiles.md            # company DISC language reference
│
└── data/
    └── sessions.xlsx               # auto-updated export file
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

**Backend (`server/.env`):**
```
DATABASE_PATH=../data/simulator.db
EXCEL_PATH=../data/sessions.xlsx
JWT_SECRET=<strong random string>
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...           # chosen voice for AI client
ELEVENLABS_AGENT_ID=...           # the configured Conversational AI agent
ELEVENLABS_WEBHOOK_SECRET=...     # to verify incoming webhook signatures
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

> **Note:** OpenAI/Whisper is no longer required — ElevenLabs Conversational AI handles speech-to-text natively. We removed `OPENAI_API_KEY` from the stack.

**Frontend (`client/.env`):**
```
VITE_API_BASE_URL=http://localhost:3001
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

| Phase | What Gets Built | Est. Dev Time |
|---|---|---|
| 1 — Foundation | Backend, DB, auth, user/scenario CRUD | 1.5 weeks |
| 2 — AI Engine | Claude roleplay + coaching prompts | 1.5 weeks |
| 3 — Voice Pipeline | Whisper STT + ElevenLabs TTS + audio UI | 1.5 weeks |
| 4 — PM Frontend | Full PM simulation + debrief experience | 1.5 weeks |
| 5 — Admin Dashboard | Dashboards, Excel export, config UI | 1 week |
| 6 — Polish + Deploy | QA, deployment, owner documentation | 1 week |
| **Total** | | **~8 weeks** |

Each phase has its own detailed sub-plan in `docs/superpowers/plans/`.
