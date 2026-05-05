# Communication Training Simulator — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each phase plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a voice-based AI roleplay training app that lets project managers practice difficult client conversations against DISC-profiled AI personas, then receive personalized coaching and a performance score.

**Architecture:** Turn-based voice conversation (record → Whisper STT → Claude roleplay → ElevenLabs TTS → play audio). Session data persists to SQLite for operations and is exported to Excel for business-owner reporting. Two roles: `pm` (simulate + view own history) and `admin` (configure everything + view all PMs).

**Tech Stack:** React + Vite + Tailwind CSS (frontend), Node.js + Express (backend), SQLite via better-sqlite3, Anthropic Claude API, OpenAI Whisper API, ElevenLabs TTS API, exceljs for Excel export, JWT auth, Railway + Vercel deployment.

---

## Scope Note

This project has six independent subsystems. Each phase below has (or will have) its own detailed sub-plan in `docs/superpowers/plans/`. Do not attempt to execute all phases in a single session — complete and review each phase before starting the next. Each phase produces working, testable software.

---

## Content Blockers — Get These From Business Owner First

Before writing any prompts or configuring scenarios, collect:

- [ ] Five scenario descriptions + desired PM outcomes
- [ ] DISC profile descriptions in company language (for D, I, S, C, D/C, I/S, etc.)
- [ ] Coaching rubric: categories (e.g., "empathy", "clarity", "DISC adaptation"), weights per category, what earns a 1/2/3/4/5 on each
- [ ] Each PM's full name, email address, and DISC profile code
- [ ] Branding: primary color hex, logo file (optional — can use placeholder)
- [ ] Preferred ElevenLabs voice (developer to propose 2-3 options for owner to pick)

---

## Phase 1 — Foundation: Backend, Database, Auth

**Sub-plan:** `docs/superpowers/plans/2026-05-05-phase1-foundation.md`

**Deliverable:** A running Express API with SQLite database, JWT authentication, and full CRUD for users, scenarios, DISC profiles, and rubric items. No frontend yet — verified via API client (curl/Postman/Insomnia).

### What Gets Built

- [ ] Monorepo structure: `/client`, `/server`, `/data`, `/docs`
- [ ] `server/`: Express + TypeScript project with ts-node-dev, Jest, ESLint
- [ ] `client/`: React + Vite + TypeScript + Tailwind placeholder app
- [ ] SQLite schema with all tables (see CLAUDE.md for schema)
- [ ] DB migration runner (`npm run db:migrate`)
- [ ] DB seed script (`npm run db:seed`) with one admin user + 5 PM users + placeholder scenarios
- [ ] `POST /auth/login` → returns JWT
- [ ] `GET /auth/me` → returns current user
- [ ] JWT middleware + role guard middleware
- [ ] `GET/POST /api/scenarios` (admin only for POST)
- [ ] `GET /api/scenarios/:id`
- [ ] `GET/POST/PATCH /api/users` (admin only for POST/PATCH)
- [ ] `GET /api/users/:id`
- [ ] `GET/POST /api/disc-profiles` (admin seeds, owner can update descriptions)
- [ ] `GET/POST /api/rubric-items` (admin only)
- [ ] Integration tests for all routes (happy path + auth rejection)

### Phase 1 Done When

- `npm run dev` starts server on port 3001 without errors
- `npm test` passes all integration tests
- Seed script creates a working admin login
- All routes return correct status codes and shapes for both `pm` and `admin` roles

---

## Phase 2 — AI Engine: Claude Roleplay + Coaching

**Sub-plan:** `docs/superpowers/plans/2026-05-05-phase2-ai-engine.md`

**Deliverable:** A fully tested Claude integration that maintains DISC-consistent client roleplay across a multi-turn conversation and produces a structured coaching debrief + score from a transcript. Verified via automated tests with mock API responses AND at least one live end-to-end manual test per DISC profile.

**Requires Phase 1 complete.** Also requires business-owner content (scenarios, DISC descriptions, rubric).

### What Gets Built

- [ ] `server/src/prompts/disc-personas/` — one `.ts` file per profile (D, I, S, C, D/C, I/S, etc.) exporting a `buildPersonaPrompt(scenario, clientDisc)` function
- [ ] `server/src/prompts/scenarios/` — one `.ts` file per scenario exporting `buildScenarioContext(scenario)`
- [ ] `server/src/prompts/coaching.ts` — `buildCoachingPrompt(transcript, pmDisc, clientDisc, rubricItems)` function
- [ ] `server/src/services/claude.ts`:
  - `sendConversationTurn(history, pmMessage, scenario, clientDisc): Promise<string>` — returns AI client reply text
  - `generateCoaching(transcript, pmDisc, clientDisc, rubric): Promise<CoachingResult>` — returns structured `{strengths, misses, alternatives, discAdaptation, scoreBreakdown, totalScore}`
- [ ] `POST /api/sessions` — create session, returns `sessionId`
- [ ] `POST /api/sessions/:id/turns` — accepts `{ pmText }`, calls Claude, stores turn, returns `{ aiText, turnId }`
- [ ] `POST /api/sessions/:id/end` — calls coaching prompt, stores coaching + score, returns full coaching object
- [ ] `GET /api/sessions/:id` — full session with all turns + coaching
- [ ] `GET /api/sessions` (admin: all; pm: own only)
- [ ] Unit tests for all prompt builders (verify required strings appear in output)
- [ ] Integration tests for session lifecycle (create → turns → end → coaching)

### Phase 2 Done When

- `npm test` passes all tests
- Manual test: create session via API, send 3+ turns, call end, receive structured coaching JSON with `totalScore` field
- Coaching response references PM's DISC profile by name and client DISC by name
- AI client response stays in character (does not break persona, does not offer coaching mid-session)

---

## Phase 3 — Voice Pipeline: Whisper STT + ElevenLabs TTS

**Sub-plan:** `docs/superpowers/plans/2026-05-05-phase3-voice.md`

**Deliverable:** Audio recorded in the browser is transcribed by Whisper and the AI reply is converted to audio by ElevenLabs and played back. The full turn cycle (record → transcribe → AI reply → audio playback) works end-to-end. Verified in a browser on both desktop and mobile (iPhone Safari minimum).

**Requires Phase 2 complete.**

### What Gets Built

- [ ] `server/src/services/whisper.ts` — `transcribeAudio(audioBuffer, mimeType): Promise<string>`
- [ ] `server/src/services/elevenlabs.ts` — `synthesizeSpeech(text, voiceId): Promise<Buffer>` (returns mp3 buffer)
- [ ] `POST /api/sessions/:id/turns` updated to:
  1. Accept multipart form upload (audio file) OR `{ pmText }` JSON
  2. If audio: call Whisper → get `pmText`
  3. Call Claude → get `aiText`
  4. Call ElevenLabs → get audio buffer
  5. Save audio to `/data/audio/{turnId}.mp3`
  6. Return `{ pmText, aiText, audioUrl: '/audio/{turnId}.mp3' }`
- [ ] Static file serving for `/audio/` from Express
- [ ] `client/src/hooks/useAudioRecorder.ts` — wraps browser MediaRecorder API, exposes `start()`, `stop(): Promise<Blob>`, `isRecording`, `audioLevel`
- [ ] `client/src/components/VoiceRecorder.tsx` — microphone button with recording state indicator, sends blob to API
- [ ] `client/src/components/AudioPlayer.tsx` — auto-plays AI response audio when URL received
- [ ] Simple test page at `/test-voice` route (dev only) to exercise the full cycle
- [ ] Integration test: mock Whisper + ElevenLabs, verify turn endpoint accepts audio and returns audioUrl

### Phase 3 Done When

- On desktop Chrome: press record, speak, release, hear AI client respond in voice
- On iPhone Safari: same flow works (test explicitly — Safari has MediaRecorder quirks)
- `audioLevel` indicator shows mic is active during recording
- If Whisper fails to transcribe (silence), returns a helpful error, does not crash

---

## Phase 4 — PM Frontend: Full Simulation Experience

**Sub-plan:** `docs/superpowers/plans/2026-05-05-phase4-pm-frontend.md`

**Deliverable:** A PM can log in on their phone, pick a scenario and client DISC, conduct a full voice simulation, receive their coaching debrief and score, and view their session history. The experience is polished, fast, and works on mobile Safari and Chrome.

**Requires Phase 3 complete.**

### What Gets Built

- [ ] `client/src/pages/LoginPage.tsx` — email + password form, stores JWT in localStorage, redirects to ScenarioSelect
- [ ] `client/src/api/` — typed fetch wrapper for all backend endpoints (auth headers, error handling)
- [ ] `client/src/pages/ScenarioSelectPage.tsx` — card grid of 5 scenarios with title + description
- [ ] `client/src/pages/DISCSelectPage.tsx` — grid of DISC profile options with name + brief description; user selects the client's profile
- [ ] `client/src/pages/SimulationPage.tsx`:
  - Displays scenario name and client DISC badge
  - Shows conversation transcript (both sides) in real time
  - `VoiceRecorder` button (hold to record, release to send)
  - `AudioPlayer` auto-plays each AI response
  - "End Session" button (confirms before ending)
  - Loading states during API calls
- [ ] `client/src/pages/DebriefPage.tsx` — structured display of coaching debrief: score, strengths, misses, alternatives, DISC adaptation notes
- [ ] `client/src/pages/SessionHistoryPage.tsx` — list of own sessions: date, scenario, DISC, score; tap to view full debrief
- [ ] `client/src/hooks/useConversation.ts` — manages full session lifecycle state (sessionId, turns array, session phase: idle/active/ended)
- [ ] Route protection: redirect to login if no valid JWT
- [ ] Responsive layout: tested at 390px (iPhone 14) and 1280px (desktop)

### Phase 4 Done When

- A PM can complete a full session (login → scenario → DISC → simulate → debrief) without touching developer tools
- Session history shows previous sessions with scores
- Works on iPhone Safari (test explicitly)
- "End Session" shows a confirmation dialog before ending
- Coaching debrief is readable and well-formatted on mobile

---

## Phase 5 — Admin Dashboard + Excel Export + Config UI

**Sub-plan:** `docs/superpowers/plans/2026-05-05-phase5-admin.md`

**Deliverable:** The business owner can view all PMs, all sessions, score trends, and configure scenarios and rubric weights — all without developer help. Excel export generates a clean multi-tab .xlsx file and is regenerated each time a session ends.

**Requires Phase 4 complete.**

### What Gets Built

- [ ] `client/src/pages/AdminDashboardPage.tsx`:
  - Summary cards: total sessions, avg score across all PMs, active PMs this week
  - Table of all PMs with: name, DISC profile, total sessions, avg score, last active date
  - Click PM → filtered session history with scores over time (line chart via recharts)
- [ ] Session detail modal/page: full transcript + coaching debrief for any session
- [ ] `client/src/pages/AdminScenariosPage.tsx` — edit scenario title, description, desired outcomes (inline form)
- [ ] `client/src/pages/AdminUsersPage.tsx` — add/edit PM users: name, email, DISC profile; reset password
- [ ] `client/src/pages/AdminRubricPage.tsx` — edit rubric item names, weights, descriptions
- [ ] `server/src/services/excel.ts` — `regenerateExcel()` that writes `data/sessions.xlsx` with tabs:
  - **All Sessions** — one row per session: PM name, DISC, scenario, score, date
  - **Per-PM sheets** — one sheet per PM with their session history
  - **Score Trends** — date + score columns suitable for Excel charting
- [ ] `regenerateExcel()` called in `POST /api/sessions/:id/end` handler after coaching saved
- [ ] `GET /api/admin/export` — streams the current `sessions.xlsx` file (for manual download)
- [ ] Admin-only route guard on all `/admin` routes (frontend + backend)

### Phase 5 Done When

- Admin can log in and see all PMs and all sessions
- Editing a scenario in the UI persists and is reflected in the next simulation
- `data/sessions.xlsx` updates automatically when a PM ends a session
- Download link in admin dashboard produces a valid Excel file
- Adding a new PM user via admin UI allows that user to log in immediately

---

## Phase 6 — Polish, QA, Deployment, Documentation

**Sub-plan:** `docs/superpowers/plans/2026-05-05-phase6-deploy.md`

**Deliverable:** The application is deployed, stable, and the business owner can operate it independently. Full source code is documented and handed off.

### What Gets Built

- [ ] Railway deployment: backend + SQLite file persistence via Railway Volume
- [ ] Vercel deployment: frontend pointing at Railway API URL
- [ ] Production environment variables set in Railway + Vercel dashboards
- [ ] CORS configured for production domains
- [ ] `docs/admin-guide.md` — step-by-step instructions for: adding a user, updating a scenario, changing a rubric weight, downloading the Excel export, resetting a PM's password
- [ ] Error boundary in React: catches crashes, shows friendly message, logs to console
- [ ] Rate limiting on `/api/sessions/:id/turns` (max 60 turns/session, max 10 sessions/day per user) — prevents accidental API cost blowout
- [ ] API cost guardrails: log token usage per session, warn admin if monthly spend exceeds threshold
- [ ] Final QA checklist run on both mobile and desktop
- [ ] Source code review: remove all hardcoded secrets, confirm `.env` is in `.gitignore`
- [ ] Git tag `v1.0.0`

### Phase 6 Done When

- Any PM can access the app from their phone browser without VPN
- Business owner can add a new PM user following the admin guide without developer help
- No API keys or secrets are visible in the client bundle or git history
- `v1.0.0` tag exists on main

---

## Time Estimate

| Phase | Content | Dev Hours | Calendar Time |
|---|---|---|---|
| 1 — Foundation | Backend, DB, auth, CRUD | ~30h | 1.5 weeks |
| 2 — AI Engine | Claude prompts, roleplay, coaching | ~22h | 1.5 weeks |
| 3 — Voice Pipeline | Whisper + ElevenLabs + audio UI | ~22h | 1.5 weeks |
| 4 — PM Frontend | Full PM simulation experience | ~30h | 1.5 weeks |
| 5 — Admin Dashboard | Dashboard, Excel export, config | ~20h | 1 week |
| 6 — Polish + Deploy | QA, deployment, docs | ~16h | 1 week |
| **Total** | | **~140h** | **~8 weeks** |

**Key risks that can extend the timeline:**
- Prompt engineering for DISC personas takes more iteration than expected (common — budget an extra week)
- Mobile Safari audio recording behavior (known quirks with MediaRecorder, budget 3-5 extra days)
- Business owner content not ready before Phase 2 (blocks AI work entirely)
- ElevenLabs voice selection / latency not acceptable (may need streaming TTS in Phase 2)

**Realistic range:** 7–10 weeks of focused development. With AI-assisted coding via Claude Code, the lower end is achievable.

---

## Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
```

Phases 2–5 each depend on the previous phase. Do not parallelize. Complete, review, and commit each phase before starting the next.

Start Phase 2 only after business owner content (scenarios, DISC descriptions, rubric) is received.

---

## First Action

1. Confirm tech stack and architecture with business owner
2. Request all "Content Blockers" listed at the top of this document
3. Start Phase 1 sub-plan (no external content needed for Phase 1)
