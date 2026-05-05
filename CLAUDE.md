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
| AI Roleplay + Coaching | Anthropic Claude API | Complex persona + nuanced coaching |
| Speech-to-Text | OpenAI Whisper API | Accurate, handles jobsite background noise |
| Text-to-Speech | ElevenLabs API | Natural-sounding voice for AI client |
| Excel Export | exceljs | Direct .xlsx generation, no Office dependency |
| Auth | JWT + bcrypt | Stateless, secure, simple |
| Deployment | Railway (backend + DB) + Vercel (frontend) | Fast, affordable, no DevOps |

---

## Architecture Overview

```
Browser (React SPA)
  └─ REST API calls ──► Express Backend (Railway)
  └─ Audio blob upload ──► Whisper (OpenAI) → transcript
                           Claude API → AI client reply text
                           ElevenLabs → AI client audio
                           ↓
                         SQLite DB (session, transcript, score)
                           ↓
                         Excel export (on demand or auto)

Admin Dashboard (same React app, role-gated route)
  └─ REST API calls ──► same backend
```

**Conversation flow:**
1. PM records audio → sends blob to backend
2. Backend → Whisper → PM transcript text
3. Backend → Claude (with conversation history + DISC persona prompt) → AI client reply text
4. Backend → ElevenLabs → audio file URL/stream
5. Frontend plays audio to PM
6. Loop until PM ends session
7. Backend → Claude (with full transcript + coaching prompt) → coaching debrief + score
8. Session saved to SQLite + Excel export updated

---

## Project Structure

```
/
├── content/                    # ★ Source-of-truth training content (markdown, owner-editable)
│   ├── scenarios/              # 5 scenario files (01-schedule-delay.md, etc.)
│   ├── disc-profiles/          # 8 DISC client persona files (01-D-dominance.md, etc.)
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
scenarios     (id, title, description, setup_context, desired_outcomes)
disc_profiles (id, code, name, description, communication_style, triggers, needs)
sessions      (id, user_id, scenario_id, client_disc_id, started_at, ended_at, score)
turns         (id, session_id, speaker, content, audio_url, timestamp)
coaching      (id, session_id, strengths, misses, alternatives, disc_adaptation, score_breakdown)
rubric_items  (id, name, weight, description)
```

---

## Environment Variables

**Backend (`server/.env`):**
```
DATABASE_PATH=../data/simulator.db
EXCEL_PATH=../data/sessions.xlsx
JWT_SECRET=<strong random string>
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...        # chosen voice for AI client
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

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

**Voice conversation is turn-based, not streaming.** PM records → sends → gets AI audio back. This avoids complex WebSocket/streaming architecture in Phase 1 while still feeling conversational.

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
