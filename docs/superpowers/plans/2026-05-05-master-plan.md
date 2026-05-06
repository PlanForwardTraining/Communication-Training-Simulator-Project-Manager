# Communication Training Simulator — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each phase plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a voice-based AI roleplay training app that lets project managers practice difficult client conversations against DISC-profiled AI personas, then receive personalized coaching and a performance score.

**Architecture:** Real-time phone-call-like voice conversation via **ElevenLabs Conversational AI** (handles continuous mic, VAD, STT, TTS, echo cancellation, interruption detection). Claude is configured as the LLM brain inside the CAI agent — drives the client's persona and responses. Conversation transcripts and interruption events stream into our backend via webhooks and persist to SQLite. After the call, a separate Claude API call analyzes the full transcript + events to produce structured coaching. Excel export keeps the business owner's reporting requirement met. Two roles: `pm` (simulate + view own history) and `admin` (configure everything + view all PMs).

**Tech Stack:** React + Vite + Tailwind CSS (frontend), `@11labs/react` SDK for the voice client, Node.js + Express (backend), SQLite via better-sqlite3, Anthropic Claude API (post-call coaching), ElevenLabs Conversational AI (in-call voice + Claude orchestration), exceljs for Excel export, JWT auth, Railway + Vercel deployment.

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

**Deliverable:** A running Express API with SQLite database, JWT authentication, and full CRUD for users, scenarios, DISC profiles, and rubric items. No frontend yet — verified via curl.

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

## Phase 3 — Real-Time Voice via ElevenLabs Conversational AI

**Sub-plan:** `docs/superpowers/plans/2026-05-05-phase3-voice.md`

**Deliverable:** A PM can start a session, speak naturally without pressing a button, hear the AI client reply in real time with sub-second latency, interrupt the AI by speaking, and have all turns + interruption events captured server-side via webhooks. Verified on desktop Chrome and iPhone Safari.

**Requires Phase 2 complete (in-app coaching pipeline still needed for `/end` flow).**

### What Gets Built

**ElevenLabs Conversational AI Setup (one-time, in their dashboard):**

- [ ] Create a Conversational AI Agent named `Training Simulator — Client Persona`
- [ ] Configure agent voice: the chosen `ELEVENLABS_VOICE_ID`
- [ ] Configure LLM: **Claude** (native Anthropic integration, supply our `ANTHROPIC_API_KEY`)
- [ ] System prompt: a placeholder; we override per-session via the SDK
- [ ] Enable interruption detection
- [ ] Configure VAD sensitivity for typical office/jobsite background
- [ ] Enable webhooks: subscribe to `turn`, `interruption`, `conversation_started`, `conversation_ended`
- [ ] Set webhook URL to our backend `/api/elevenlabs/webhook`
- [ ] Save the resulting `Agent ID` → goes in `.env` as `ELEVENLABS_AGENT_ID`
- [ ] Save the webhook signing secret → `ELEVENLABS_WEBHOOK_SECRET`

**Backend:**

- [ ] `server/src/services/voice-selector.ts`:
  - Loads `/content/voices/*.md` at startup; parses YAML frontmatter for voice_id, gender, age, active flag, DISC compatibility list
  - `selectVoiceForSession(scenarioSlug, clientDiscCode): { voiceId, voiceName }` implementing the three-tier priority:
    1. Scenario-pinned override (if scenario file declares `## Voice Override`)
    2. DISC-aligned random — filter pool by `active=true` AND DISC compatibility match, pick randomly
    3. Forced random — admin scenario flag bypasses DISC filter
- [ ] `server/src/services/elevenlabs-cai.ts`:
  - `getSignedUrlForSession(sessionId, scenarioSlug, clientDiscCode): Promise<{ signedUrl, agentId, voiceId, voiceName }>` — calls voice selector, then ElevenLabs API to mint a per-session signed URL with `conversation_initiation_data` containing both persona prompt AND voice override (Path A)
  - **Path A vs Path B (verify during 1-day spike):** Path A passes voice override per conversation. Path B falls back to one CAI agent per voice (10 agents) if voice override per-conversation isn't supported.
- [ ] `POST /api/sessions` updated to: create session row (with `voice_id`, `voice_name`) + return signed URL + `agentId` + `voiceName`
- [ ] `POST /api/elevenlabs/webhook` — receives ElevenLabs events:
  - Verifies HMAC signature using `ELEVENLABS_WEBHOOK_SECRET`
  - Persists transcript fragments to `turns` table (one row per completed user/agent turn)
  - Persists interruption events to `events` table with `type` of `user_interrupted_agent` or `agent_interrupted_user`
  - Persists `conversation_id` to `sessions.elevenlabs_conversation_id` so we can correlate
- [ ] `POST /api/sessions/:id/end` updated to:
  1. Mark session ended
  2. Fetch all turns + events for the session
  3. Build coaching prompt including interruption count + DISC-weighted severity
  4. Call Claude → coaching JSON
  5. Save coaching, regenerate Excel, return debrief

**Frontend:**

- [ ] Install `@11labs/react`
- [ ] `client/src/hooks/useElevenLabsConversation.ts` — wraps the SDK's `useConversation()` hook with our session lifecycle (start, end, status events)
- [ ] `client/src/pages/SimulationPage.tsx` rewritten:
  - "Start Session" button → calls `/api/sessions` to get signed URL → opens conversation
  - Live status indicator: "Listening…" / "Sarah is speaking…" / "Sarah was interrupted"
  - Live transcript view (populated from SDK callbacks, not webhooks)
  - "End Session" button → confirms → ends conversation → navigates to debrief
- [ ] Interruption indicator: when SDK fires an interruption event (PM interrupts client), show a subtle visual cue in the transcript (not punitive — informational)

**Persona prompt builder (updated for CAI):**

- [ ] `server/src/prompts/persona-prompt.ts` updated to include explicit guidance to the AI:
  - Stay in character; do not break to coach
  - Allowed to interrupt PM only in profile-appropriate ways (D-types may interrupt; S/C-types do not)
  - End the call only when PM clicks End — do not voluntarily say goodbye

**Tests:**

- [ ] Webhook signature verification unit test
- [ ] Webhook handler integration test using a mocked ElevenLabs payload (turn + interruption events)
- [ ] Session lifecycle test: create → simulated turns → simulated interruption → end → coaching includes interruption count

### Phase 3 Done When

- A PM on desktop Chrome can click "Start Session" and have a fluid, phone-call-like conversation with the AI client (sub-second turn-taking)
- Same flow works on iPhone Safari
- When the PM speaks while the AI is still talking, the AI stops mid-sentence and an `events` row is recorded with `type=user_interrupted_agent`
- When a high-D AI client persona interrupts the PM, an `events` row is recorded with `type=agent_interrupted_user` (logged, not penalized)
- The full transcript persists to `turns` table even if the browser closes mid-session
- `/end` returns coaching that explicitly references the interruption count when relevant
- **Voice selection works:** running the same scenario+DISC twice in a row produces different voices on at least some attempts (DISC-aligned random working)
- **Voice persistence:** `sessions.voice_id` and `sessions.voice_name` populated on every session

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
- [ ] `client/src/pages/AdminScenariosPage.tsx` — edit scenario title, description, desired outcomes; **pin a specific voice or set "forced random" mode**
- [ ] `client/src/pages/AdminUsersPage.tsx` — add/edit PM users: name, email, DISC profile; reset password
- [ ] `client/src/pages/AdminRubricPage.tsx` — edit rubric item names, weights, descriptions
- [ ] `client/src/pages/AdminVoicesPage.tsx` — list voice pool with preview audio buttons; toggle voices active/inactive; show usage stats (how many sessions used each voice)
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
| 2 — AI Engine | Claude prompts, coaching pipeline | ~22h | 1.5 weeks |
| 3 — Voice Pipeline | ElevenLabs CAI agent + webhooks + frontend SDK | ~30h | 2 weeks |
| 4 — PM Frontend | Full PM simulation experience | ~30h | 1.5 weeks |
| 5 — Admin Dashboard | Dashboard, Excel export, config | ~20h | 1 week |
| 6 — Polish + Deploy | QA, deployment, docs | ~16h | 1 week |
| **Total** | | **~148h** | **~8.5 weeks** |

**Key risks that can extend the timeline:**
- Prompt engineering for DISC personas takes more iteration than expected (common — budget an extra week)
- ElevenLabs CAI feature stability — newer product; verify pricing, latency, and webhook reliability with a 1-day spike before locking the architecture
- Mobile Safari audio behavior with the ElevenLabs SDK (test explicitly early in Phase 3)
- Business owner content not ready before Phase 2 (blocks AI work entirely)
- Webhook signature verification edge cases (skewed clocks, retries) can surface late if not tested early

**Realistic range:** 8–11 weeks of focused development. With AI-assisted coding via Claude Code, the lower end is achievable.

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
