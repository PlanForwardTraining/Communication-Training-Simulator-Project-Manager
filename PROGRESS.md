# Build Progress Tracker

A linear checklist of every action in [REBUILD_ME_GUIDE.md](REBUILD_ME_GUIDE.md). Check items off as you go.

**How to toggle:** With the VS Code extension *Markdown All in One* installed, put your cursor on a line and press `Cmd+Shift+C` (Mac) or `Ctrl+Shift+C` (Windows). Or just edit `[ ]` to `[x]` by hand.

**Need detail on a step?** Each section links back to the matching part of the guide.

---

## Part 1 — Install Local Tools

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-1--install-local-tools)

- [x] Install Node.js 20 LTS
- [x] Install Git
- [x] Install VS Code
- [x] Verify versions in terminal: `node --version`, `npm --version`, `git --version`
- [x] VS Code extension: ESLint
- [x] VS Code extension: Prettier — Code formatter
- [x] VS Code extension: Tailwind CSS IntelliSense
- [x] VS Code extension: SQLite Viewer
- [x] VS Code extension: Markdown All in One *(for this checklist)*

> Postman / Insomnia / REST Client are **not** required — Claude Code handles API testing directly.

---

## Part 2 — Create Third-Party Accounts

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-2--create-third-party-accounts)

### 2.1 — GitHub Organization
- [x] Create GitHub org in company name
- [x] Add developer as Owner or Member

### 2.2 — Anthropic (Claude API)
- [x] Sign up at console.anthropic.com with company email *(using personal account for now — swap to company email before launch)*
- [x] Add payment method
- [x] Set monthly spending limit (~$100)
- [x] Create API key named `dev-key`
- [x] Save key in password manager

### 2.3 — OpenAI (no longer required)
- [x] *Skipped — ElevenLabs Conversational AI handles speech-to-text natively*

### 2.4 — ElevenLabs (Conversational AI + voice pool)
- [x] Sign up at elevenlabs.io with company email *(using personal account for now — swap before launch)*
- [x] Pick a plan that includes Conversational AI (Creator or Pro)
- [x] Confirm all 20 voices in `/content/voices/` are present in your Voice Library *(verified via API 2026-05-05)*
- [x] Listen to each voice's preview URL to confirm DISC alignment
- [x] Adjust voice metadata in `/content/voices/*.md` if any voice's character differs from its description
- [x] Create Conversational AI Agent named "Training Simulator — Client Persona"
- [x] Pick any voice as default (overridden per-session)
- [x] Configure agent LLM *(Qwen3.5-397B for sub-400ms latency — switchable to Claude in the agent's LLM dropdown if quality > speed is preferred)*
- [x] Set temperature 0.7 and disable the `end_call` built-in tool
- [x] Set placeholder system prompt *(ElevenLabs auto-generated — overridden per session)*
- [x] Enable interruption detection
- [x] Copy Agent ID
- [x] Copy main API key
- [ ] Save all values in password manager

### 2.5 — Railway
- [x] Sign up at railway.app using company GitHub org

### 2.6 — Vercel
- [x] Sign up at vercel.com using company GitHub org

### 2.7 — Resend *(optional but recommended)*
- [ ] Sign up at resend.com
- [ ] Verify sending domain (add DNS records)
- [ ] Create API key named `dev-key`
- [ ] Save key in password manager

### 2.8 — Domain & DNS
- [ ] Confirm ownership of company domain
- [ ] Confirm DNS dashboard access
- [ ] Decide on subdomain (e.g., `training.yourcompany.com`)

### 2.9 — Final Inventory Check
- [x] GitHub org name + admin access confirmed
- [x] `ANTHROPIC_API_KEY` saved
- [x] `ELEVENLABS_API_KEY` saved
- [x] `ELEVENLABS_AGENT_ID` saved
- [ ] Railway login working
- [ ] Vercel login working
- [ ] `RESEND_API_KEY` saved *(optional — skip if not using)*
- [ ] DNS dashboard access confirmed

---

## Part 3 — Set Up the Repository

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-3--set-up-the-repository)

- [x] Create private GitHub repo `communication-training-simulator`
- [x] Clone repo locally
- [x] Copy planning materials into repo (CLAUDE.md, REBUILD_ME_GUIDE.md, content/, master plan)
- [x] Commit and push planning materials
- [x] Create folder structure (`server/`, `client/`, `data/`)
- [x] Add `.gitignore` with secrets and build artifacts excluded
- [x] Commit folder structure
- [x] Create `server/.env.example`
- [ ] Create `client/.env.example` *(Phase 4)*
- [x] Copy `.env.example` files to real `.env` files
- [x] Paste real API keys into `.env`
- [x] Generate strong `JWT_SECRET` and add to `.env`
- [x] Verify `git status` shows `.env` is ignored

---

## Part 4 — Backend Foundation (Phase 1)

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-4--build-the-backend-foundation-phase-1)

### 4.1 — Initialize Server Project
- [x] Run `npm init -y` in `server/`
- [x] Install runtime dependencies (express, cors, dotenv, etc.)
- [x] Install dev dependencies (typescript, ts-node-dev, jest, etc.)
- [x] Initialize TypeScript config
- [x] Add npm scripts (dev, build, start, db:migrate, db:seed, test)

### 4.2 — Database Schema
- [x] Create `server/src/db/schema.sql` with all tables (users, scenarios, disc_profiles, sessions, turns, events, coaching, rubric_items)

### 4.3 — Implement Modules
- [x] `server/src/index.ts` (Express bootstrap, CORS, error handler)
- [x] `server/src/db/connection.ts`
- [x] `server/src/db/migrate.ts`
- [x] `server/src/db/seed.ts` (seeds DISC, scenarios, rubric, admin user from /content/)
- [x] `server/src/middleware/auth.ts` (JWT verification)
- [x] `server/src/middleware/roleGuard.ts` (admin guard)
- [x] `server/src/routes/auth.ts`
- [x] `server/src/routes/users.ts`
- [x] `server/src/routes/scenarios.ts`
- [x] `server/src/routes/disc-profiles.ts`
- [x] `server/src/routes/rubric.ts`
- [x] `server/tests/auth.test.ts`
- [x] `server/tests/scenarios.test.ts`

### 4.4 — Run and Verify
- [x] `npm run db:migrate` succeeds
- [x] `npm run db:seed` succeeds *(seeds 1 admin, 5 scenarios, 8 DISC profiles, 7 rubric items)*
- [x] `npm run dev` starts *(port 3002 on this machine — port 3001 occupied by gmail-mcp)*
- [x] Test admin login via curl, receive JWT
- [x] All routes verified with `pm` and `admin` JWTs
- [x] `npm test` passes — 10/10 tests ✅
- [x] **Phase 1 complete** — committed and pushed

---

## Part 5 — AI and Voice Services (Phases 2 + 3)

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-5--build-ai-and-voice-services-phases-2--3)

### 5.1 — Install SDKs
- [x] Install `@anthropic-ai/sdk` in server

### 5.2 — Prompt Layer *(Phase 2 complete)*
- [x] `server/src/prompts/loader.ts` (reads from `/content/`)
- [x] `server/src/prompts/persona-prompt.ts`
- [x] `server/src/prompts/coaching-prompt.ts` (scores Active Listening using interruption events)

### 5.3 — Coaching Service *(Phase 2 complete)*
- [x] `server/src/services/claude.ts` (`generateCoaching` — calls Claude after session ends)

### 5.4 — Verify ElevenLabs CAI Agent Configured *(done in Part 2)*
- [x] `ELEVENLABS_AGENT_ID` in `server/.env`
- [x] Agent LLM configured
- [x] No webhook URL needed — transcript captured by frontend SDK *(architecture simplified)*

### 5.5 — Voice Selector + ElevenLabs Service Layer *(Phase 3 complete)*
- [x] `server/src/services/voice-selector.ts` — DISC-aligned random, 3-tier priority, randomness verified
- [x] `server/src/services/elevenlabs-cai.ts`:
  - [x] `getSignedUrlForSession()` — returns signedUrl + personaPrompt + voiceId/voiceName
  - [x] `verifyWebhookSignature()` HMAC-SHA256 check
  - *Note: voice override is sent by browser SDK in WebSocket initiation message, not in signed URL request*

### 5.6 — Session API *(Phase 3 complete)*
- [x] `POST /api/sessions` returns `{ sessionId, signedUrl, agentId, voiceId, voiceName, personaPrompt }`
- [x] `POST /api/sessions/:id/end` accepts `{ turns, events }` from browser, saves to DB, runs coaching ✅
- [x] `GET /api/sessions/:id` returns full session with turns + events + coaching
- [x] `GET /api/sessions` filtered by role
- [x] `POST /api/elevenlabs/webhook` — built but not required (client-side capture is primary)

### 5.7 — Verify End-to-End
- [x] `POST /api/sessions` returns signed URL and personaPrompt ✅
- [x] `POST /api/sessions/:id/end` with client-captured turns returns coaching JSON ✅
- [x] Live Claude coaching verified (score: 46, full debrief with both DISC profiles named)
- [x] **Phases 2-3 complete — 31/31 tests passing ✅**

---

## Part 6 — PM Frontend (Phase 4)

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-6--build-the-pm-frontend-phase-4)

### 6.1 — Initialize Frontend
- [ ] Create Vite + React + TypeScript project in `client/`
- [ ] Install React Router, axios, `@elevenlabs/react`
- [ ] Install + configure Tailwind CSS
- [ ] Configure `tailwind.config.js`
- [ ] Update `src/index.css` with Tailwind directives

### 6.2 — API Client
- [x] `client/src/api/client.ts` (fetch wrapper with auth + 401 auto-logout)
- [x] `client/src/api/auth.ts`
- [x] `client/src/api/scenarios.ts`
- [x] `client/src/api/disc.ts`
- [x] `client/src/api/sessions.ts`

### 6.3 — Hooks
- [x] `client/src/hooks/useAuth.ts`
- [x] ElevenLabs conversation via `@elevenlabs/react` `useConversation` (built into SimulationPage)

### 6.4 — Pages
- [x] `LoginPage.tsx` — Executive Dark design, gold wordmark, error states
- [x] `ScenarioSelectPage.tsx` — cards with gold left border, loading skeleton
- [x] `DiscSelectPage.tsx` — DISC color-coded grid (D=red, I=amber, S=green, C=blue)
- [x] `SimulationPage.tsx` — ElevenLabs SDK, real-time transcript bubbles, interruption counter
- [x] `DebriefPage.tsx` — SVG score ring, 7-category bars, qualitative feedback sections
- [x] `HistoryPage.tsx` — reverse-chronological session list, color-coded score badges

### 6.5 — Shared Components
- [x] `DiscBadge.tsx` — color-coded DISC code badge
- [x] Status indicator + interruption counter built into SimulationPage
- [x] Score ring + category bars built into DebriefPage

### 6.6 — Routing
- [x] React Router with all PM routes
- [x] `ProtectedRoute` component with loading spinner
- [x] Auth route protection (401 redirects to /login)

### 6.7 — Verify
- [x] Both servers running (backend :3002, frontend :5173) ✅
- [x] Frontend builds cleanly (`✓ built in 371ms`) ✅
- [x] Title: "PlanForward Training" ✅
- [x] Full flow verified in browser (login → simulate → debrief → history) *(do this now)*
- [ ] Works on iPhone Safari *(test after browser verification)*
- [ ] **Phase 4 complete** — commit and push

---

## Part 7 — Admin Dashboard (Phase 5)

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-7--build-the-admin-dashboard-phase-5)

### 7.1 — Install Libraries
- [x] Install `exceljs` in server
- [ ] ~~Install `recharts` in client~~ — used a hand-rolled SVG `TrendChart` instead (no dep)

### 7.2 — Excel Export Service
- [x] `server/src/services/excel.ts` with `regenerateExcel()` (Sessions sheet + PMs sheet)
- [x] Hook into `POST /api/sessions/:id/end` (non-blocking — failures log only)
- [x] `GET /api/admin/export.xlsx` route (regenerates on demand + serves the file)

### 7.3 — Admin Routes
- [x] `GET /api/admin/summary` (cohort KPIs + team category averages + flagged PMs)
- [x] `GET /api/admin/users` and `GET /api/admin/users/:id` (with trend points + category averages)
- [x] `GET /api/admin/sessions/:id` (full session detail with transcript + coaching)
- [x] `POST /api/admin/users` and `PATCH /api/admin/users/:id`
- [x] `requireAdmin()` guard on all admin routes
- [x] Schema migration: `users.active` column added (idempotent ALTER in migrate.ts)
- [x] Login rejects inactive users with 403

### 7.4 — Admin Pages
- [x] `AdminDashboardPage.tsx` — KPIs, team category strip, flagged PMs cards, full PM table
- [x] `AdminUserDetailPage.tsx` — trend chart, focus areas, category bars, session history
- [x] `AdminSessionDetailPage.tsx` — score ring, breakdown, full coaching, transcript
- [x] `AdminLayout.tsx` — shared admin chrome with Excel export button
- [x] `UserModalForm.tsx` — add + edit + deactivate (no hard delete)
- [x] `TrendChart.tsx` — small SVG line chart (mean baseline)
- [x] Admin link surfaced on `ScenarioSelectPage` header (gold "Admin" button) for admin users
- [ ] ~~`AdminScenariosPage.tsx`~~ — deferred (edit `/content/*.md` and push; seed upserts)
- [ ] ~~`AdminRubricPage.tsx`~~ — deferred (same — content lives in markdown)
- [ ] ~~`AdminVoicesPage.tsx`~~ — deferred (same)

### 7.5 — Verify
- [x] Dashboard shows all PMs with rolled-up stats
- [x] Trend chart renders with mean baseline
- [x] "Focus areas" auto-flagged when avg < 3 across ≥3 sessions per category
- [x] "PMs needing attention" flagged for stale activity (≥14d) / declining trend / ≥2 weak categories
- [x] Adding a PM enables immediate login
- [x] Deactivating a PM blocks their login (active=0 → 403 on auth)
- [x] Excel export downloads valid multi-sheet file (Sessions + PMs)
- [x] Excel auto-regenerates on every session end (non-blocking)
- [x] All 31 server tests still pass
- [x] **Phase 5 complete** — committed and pushed

---

## Part 8 — Local End-to-End Testing

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-8--local-end-to-end-testing)

### As PM
- [ ] Login works on desktop browser
- [ ] Login works on iPhone Safari
- [ ] Scenarios load with readable descriptions
- [ ] DISC profiles load with readable descriptions
- [ ] Microphone permission prompt appears at session start
- [ ] Conversation starts within ~2 seconds of clicking Start
- [ ] Speaking naturally without buttons works
- [ ] AI begins responding within ~1 second of PM finishing
- [ ] AI voice sounds like chosen ElevenLabs voice
- [ ] PM can interrupt AI by speaking (AI stops mid-sentence)
- [ ] Interruption visibly counted in UI
- [ ] AI stays in character (no mid-session coaching)
- [ ] AI behavior matches selected DISC profile
- [ ] High-D AI client occasionally interrupts PM appropriately
- [ ] iPhone Safari: full call works without browser quirks
- [ ] "End Session" requires confirmation
- [ ] Coaching debrief loads and is readable
- [ ] Coaching mentions PM's DISC and client's DISC by name
- [ ] Coaching includes Active Listening score with interruption commentary
- [ ] Total score is between 0-100
- [ ] Session history shows the just-completed session

### As Admin
- [ ] Login works
- [ ] Dashboard shows correct PM and session counts
- [ ] Score chart renders for a PM with multiple sessions
- [ ] Scenario edit persists immediately
- [ ] New PM can log in immediately after creation
- [ ] Password reset works
- [ ] Excel export downloads valid file with multiple tabs

### Edge Cases
- [ ] PM stays silent 30+ seconds → AI responds gracefully (verify configured behavior)
- [ ] Network interruption mid-call → SDK reports disconnect, UI shows reconnect option
- [ ] Closing browser mid-session → `conversation_ended` webhook fires, session marked ended
- [ ] PM blocked from admin URLs
- [ ] Invalid JWT redirects to login
- [ ] Webhook with invalid signature is rejected (401)

---

## Part 9 — Deploy to Production

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-9--deploy-to-production)

### 9.1 — Pre-Deploy
- [x] Confirm CORS reads `CLIENT_ORIGIN` from env
- [x] `cd server && npm run build` succeeds with no errors
- [x] `cd client && npm run build` succeeds with no errors

### 9.2 — Deploy Backend (Railway) ✅ DONE

**Production URL:** `https://communication-training-simulator-project-manager-production.up.railway.app`
**Verified:** `/health` returns `{"status":"ok",...}` HTTP 200

- [x] Create Railway project from GitHub repo
- [x] Hobby plan upgrade ($5/mo) — required for persistent volume
- [x] **Do NOT set "Root Directory"** — leave empty so railway.toml controls build
- [x] `railway.toml` at repo root configures build/start commands (`cd server`)
- [x] `engines.node` pinned to `>=20` in both root and server `package.json` (better-sqlite3 needs Node 20+)
- [x] Build command uses `--include=dev` so `tsc` is available
- [x] Build copies `/content/` into `dist/content/` so server is self-contained
- [x] All env variables added (10 vars; values match production needs)
- [x] Fresh `JWT_SECRET` (different from dev)
- [x] `DATABASE_PATH=/data/simulator.db` and `EXCEL_PATH=/data/sessions.xlsx` (absolute, on volume)
- [x] `NODE_ENV=production`, `CLIENT_ORIGIN=*` (will lock to Vercel URL after frontend deploys)
- [x] `ADMIN_PASSWORD` set to a real password (so admin can log in to seeded user)
- [x] Volume mounted at `/data` (right-click service → "Attach volume")
- [x] `PORT=3001` set + Generate Domain → port 3001
- [x] Deploy succeeds, `/health` returns 200

### 9.3 — Deploy Frontend (Vercel) ✅ DONE

**Production URL:** `https://pm-training-simulator.vercel.app`

- [x] Sign in to [vercel.com/new](https://vercel.com/new) as `planforwardtraining@gmail.com`
- [x] Import `Communication-Training-Simulator-Project-Manager` repo
- [x] **Root Directory**: `client`
- [x] Framework Preset: Vite (auto-detected)
- [x] **Environment Variables**: `VITE_API_BASE_URL=https://communication-training-simulator-project-manager-production.up.railway.app`
- [x] `client/vercel.json` SPA rewrite (`/(.*) → /index.html`) so deep-link refresh on `/history`, `/admin`, etc. doesn't 404
- [x] Deploy succeeds, app loads at `pm-training-simulator.vercel.app` (Status 200, title "PlanForward Training")
- [x] **Vercel Hobby caveat** — repo made **public** (Hobby blocks multi-author deploys on private repos); commits authored as `planforwardtraining@gmail.com` to match project owner

### 9.3a — Lock down CORS (after Vercel URL is known) ✅ DONE

- [x] Update Railway `CLIENT_ORIGIN` env var from `*` to `https://pm-training-simulator.vercel.app`
- [x] Verified header `access-control-allow-origin: https://pm-training-simulator.vercel.app` returned by `/health`

### 9.4 — Custom Domain
- [ ] Add custom domain in Vercel
- [ ] Add CNAME record in DNS provider
- [ ] Wait for DNS propagation
- [ ] SSL certificate issued
- [ ] Update Railway `CLIENT_ORIGIN` to custom domain
- [ ] Redeploy Railway
- [ ] Production URL loads correctly

### 9.5 — Production Smoke Test
- [ ] Re-run all Part 8 checks against production URLs
- [ ] Test on real phone over cellular network

### 9.6 — Cost Alerts
- [ ] Anthropic spending limit set
- [ ] ElevenLabs plan tier confirmed; conversation minutes dashboard reviewed
- [ ] Railway usage alerts set
- [ ] Vercel spend alerts set

### 9.7 — Document Production Configuration
- [ ] Create `docs/production.md` with URLs, env-var locations, DNS records, deploy date
- [ ] Commit and push

---

## Part 10 — Go Live

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-10--go-live)

### 10.1 — Pre-Launch Checklist
- [ ] All 5 PMs have user accounts with real DISC profiles
- [ ] Owner has admin login working
- [ ] Owner has run a full simulation as a PM
- [ ] Excel export downloads correctly
- [ ] Real (or signed-off placeholder) scenarios loaded
- [ ] DISC profile descriptions match company language (or signed off)
- [ ] Rubric weights and criteria approved
- [ ] Branding (logo, colors) applied
- [ ] Spend limits set on all three API services
- [ ] First-month cost budget approved
- [ ] PMs informed about voice/transcript recording
- [ ] Backup procedure tested (Excel + SQLite download)

### 10.2 — Soft Launch (1 Week)
- [ ] Pick 1-2 beta PMs
- [ ] Beta PMs run 5-10 sessions over the week
- [ ] Daily check-ins for bugs / AI weirdness / cost spikes
- [ ] Owner reviews each beta session
- [ ] Adjust prompts in `/content/` if needed

### 10.3 — Full Launch
- [ ] 30-minute kickoff meeting with all 5 PMs
- [ ] Demo of full flow
- [ ] Cadence agreed (e.g., 2-3 sessions/PM/week)
- [ ] Owner sets weekly dashboard review

### 10.4 — Adoption Support
- [ ] Weekly check-in scheduled for first month
- [ ] Monthly debrief cadence with owner set
- [ ] Process for adding new scenarios documented

---

## Part 11 — Operate the System (Ongoing)

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-11--operate-the-system)

These don't get permanently checked — re-run on cadence.

### First Week
- [ ] First admin dashboard review
- [ ] First spot-check of session coaching quality
- [ ] First API spend check across all three consoles

### First Month
- [ ] First monthly database + Excel backup downloaded
- [ ] First content review (any scenarios needing edits?)
- [ ] First adoption metric review (who's using, who isn't)

### Quarterly
- [ ] Content review with owner
- [ ] Prompt-quality review (is coaching still landing?)
- [ ] Cost trend review
- [ ] Backup restoration test (can you actually restore from a backup?)

---

## Part 12 — Billing & Payment Transfer to Client

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-12--billing--payment-transfer)

Track every paid service and transfer billing from FoundationalFlow (contractor) to Plan Forward (client) at handoff.

### Paid services in use

| Service | Tier | Approx. monthly cost | Current billing | Status |
|---|---|---|---|---|
| **Anthropic** (Claude API) | Pay-as-you-go | ~$5-15 (5 PMs at normal cadence) | Tyler personal | ⏳ Swap before launch |
| **ElevenLabs** | Conversational AI plan | TBD (Creator $22 / Pro $99) | Tyler personal | ⏳ Swap before launch |
| **Railway** | Hobby | $5 base + ~$0-5 usage | TrainingPlanForward@gmail.com | ⏳ Move payment to client card |
| **Vercel** | Hobby (free) → Pro if needed | $0 → $20 if upgrading | TrainingPlanForward@gmail.com | ⏳ Move payment to client card if upgraded |
| **Resend** *(optional)* | Free tier | $0 | TBD | ⏳ Set up when password resets needed |
| **Domain** *(optional)* | n/a | ~$15/year if new domain | Plan Forward owns planforward.net | ✅ Already client-owned |
| **GitHub** | Free org | $0 | PlanForwardTraining org | ✅ Already client-owned |

**Estimated total monthly cost at launch:** ~$50-130/month depending on ElevenLabs plan and PM usage.

### Pre-launch payment handoff checklist

For each service Tyler is paying for, swap to Plan Forward's billing. Approach: keep the SAME account (data, history, config preserved), just change the payment source.

#### Anthropic
- [ ] Plan Forward creates Anthropic account at `TrainingPlanForward@gmail.com` (or Plan Forward owner does it)
- [ ] Generate new API key on Plan Forward's account
- [ ] Update `ANTHROPIC_API_KEY` in Railway env vars
- [ ] Set monthly spending limit on Plan Forward's account (~$50)
- [ ] Verify a test session uses the new key (check Anthropic console for usage spike)
- [ ] Disable / rotate Tyler's personal API key

#### ElevenLabs
- [ ] Plan Forward creates ElevenLabs account at `TrainingPlanForward@gmail.com`
- [ ] Pick plan tier (Creator or Pro depending on volume)
- [ ] Recreate the Conversational AI agent under Plan Forward's account *(or transfer if ElevenLabs supports it)*
- [ ] Confirm all 20 voices are in Plan Forward's library
- [ ] Generate new API key + agent ID
- [ ] Update `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in Railway env vars
- [ ] Re-enable voice/prompt overrides on the new agent
- [ ] Test a full session end-to-end with new keys
- [ ] Disable Tyler's personal account or downgrade

#### Railway
- [ ] Confirm Railway account is owned by `TrainingPlanForward@gmail.com` (already is)
- [ ] Add Plan Forward's payment method to the account
- [ ] Remove Tyler's payment method (if it was added)
- [ ] Verify next invoice charges Plan Forward

#### Vercel
- [ ] Confirm Vercel account is owned by `TrainingPlanForward@gmail.com` (already is)
- [ ] If on a paid plan, add Plan Forward's payment method
- [ ] Remove Tyler's payment method (if it was added)

#### Resend *(if/when added)*
- [ ] Account on `TrainingPlanForward@gmail.com`
- [ ] Plan Forward payment method (if upgrading from free)

#### Source code & access transfer
- [ ] Repo is in `PlanForwardTraining` GitHub org (already is)
- [ ] Tyler is a collaborator (currently is) — keep, downgrade, or remove per contract
- [ ] Plan Forward has admin access to GitHub org
- [ ] Plan Forward has logins for all platform accounts (Railway, Vercel, Anthropic, ElevenLabs, Resend)
- [ ] All credentials stored in Plan Forward's password manager
- [ ] Final code handoff confirmed in writing (per contract)

### Final post-handoff verification

After all of the above is complete:

- [ ] Run a full PM session end-to-end with the production deploy
- [ ] Confirm the session shows up in admin dashboard (when Phase 5 is built)
- [ ] Confirm coaching debrief generates correctly
- [ ] Confirm Excel export downloads correctly (when Phase 5 is built)
- [ ] Verify no service is silently still billing Tyler

---

## Part 13 — Post-Deploy UX & Coaching Polish

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-13--post-deploy-ux--coaching-polish)

A round of refinements done immediately after first production deploy. Each sub-section is a self-contained improvement that landed via push to `main` and auto-deployed.

### 13.1 — ElevenLabs Agent Runtime Hardening
- [x] Enable per-session override flags via `PATCH /v1/convai/agents/agent_<id>`: `agent.prompt.prompt`, `agent.first_message`, `tts.voice_id`
- [x] Clear hardcoded default `first_message` (was reciting one specific scenario regardless of selection)
- [x] Replace agent's default prompt with a neutral fallback (`"...say 'Hello?' and wait for the caller..."`)
- [x] Document this in CLAUDE.md "Production Build Notes" so future deploys keep the flags on

### 13.2 — Scenario Brief Endpoint + Marker
- [x] `GET /api/scenarios/by-slug/:slug` endpoint added — trims body at `<!-- BRIEF END -->`
- [x] Strips the `> **Status:**` placeholder blockquote from the briefing view
- [x] Frontend `scenariosApi.getBriefing(slug)` API method
- [x] Brief shown above DISC grid on `DiscSelectPage`

### 13.3 — Scenario Content v2 (Bespoke Per-Scenario Structure)
- [x] All 5 scenarios rewritten — same topics, situation-appropriate sections (no more cookie-cutter template)
- [x] Each scenario file split with `<!-- BRIEF END -->` so PM brief and AI/coaching content live in one file
- [x] Per scenario: 01 Schedule Delay, 02 Budget Overrun, 03 Angry Client, 04 Scope Change, 05 Micromanaging
- [x] Hidden answer-key sections per scenario (Inside the Client's Head, How They Will Likely React, What Success Looks Like, Common Pitfalls, Coaching Focus)

### 13.4 — Sandler-First Coaching
- [x] `/content/coaching-rubric/03-sandler-techniques.md` primer added (Up-Front Contract, Pain Funnel, Reversing, No Mind Reading, Negative Reverse, Closing the File, Pendulum, Tonality, 3rd Person Story + Voss labels and calibrated questions as supplements)
- [x] Loader exposes `getSandlerPrimer()`; coaching prompt feeds it on every call
- [x] Coaching prompt rewritten to require 3-5 bullets per section with technique names cited
- [x] Tone shifts to "send the PM home with one or two specific Sandler reps to practice"
- [x] Anthropic `max_tokens` raised 2048 → 3072 to fit the longer bullet output

### 13.5 — Rubric Weight Fix
- [x] `02-scoring-levels.md` percentages reconciled with `01-categories-and-weights.md` (was 115%, now 13/13/22/12/12/13/15 = 100%)

### 13.6 — Seed Becomes Content Sync
- [x] `seedScenarios()` now `INSERT ... ON CONFLICT(slug) DO UPDATE`
- [x] `seedDiscProfiles()` now `INSERT ... ON CONFLICT(code) DO UPDATE`
- [x] `seedRubricItems()` now `DELETE` then re-`INSERT`
- [x] Admin user remains `INSERT OR IGNORE` (don't reset passwords)
- [x] Net effect: editing `/content/*.md` and pushing is enough — no manual migration

### 13.7 — Named Client + Pickup Greeting
- [x] Voice's `display_name` first word becomes the client's first name (`Adam M` → `Adam`)
- [x] `VoiceSelection` extended with `clientFirstName`
- [x] Persona prompt opens with `## Your Identity / Your first name is **<Name>**` and reinforces in rules
- [x] Per-session `firstMessage` generated as `"Hello, this is <Name>."` — passed via SDK override
- [x] Verified: all 20 voices have name/gender alignment by construction (name == voice talent's name)

### 13.8 — PM UX Polish
- [x] Header on `SimulationPage` shows `Speaking with <Name>`
- [x] Pre-call case-file card (large name, DISC code, scenario title, greeting cue) before Start Session
- [x] Persistent left-side notes panel on lg+ screens with the brief
- [x] Mobile drawer toggled by a "Notes" header button
- [x] Transcript bubbles label client turns by name (not "Client")

### 13.9 — Bullet-Format Coaching Render
- [x] New `client/src/utils/MarkdownLite.tsx` — renders h2, p, ul, ol, `**bold**`, `*italic*`
- [x] `DebriefPage` `FeedbackSection` swaps `whitespace-pre-line` paragraphs for `<MarkdownLite>`
- [x] Italic added to MarkdownLite for the typical `*"quoted phrase"*` Sandler idiom

### 13.10 — Anthropic Key Fix on Railway
- [x] Stale `ANTHROPIC_API_KEY` (returned 401) replaced with the working local key on Railway via `railway variables --set`
- [x] Coaching now generates successfully end-to-end

### 13.11 — Mobile Mic Pre-Warm
- [x] `getUserMedia({ audio: true })` called before opening the WebSocket so the AI's first message isn't lost behind the iOS Safari permission prompt
- [x] Acquired stream tracks stopped immediately (the SDK requests its own)
- [x] Start button shows "Requesting microphone…" with spinner during the brief permission window
- [x] Permission denial shows a clear error with retry guidance

### 13.12 — Auto-End on Mutual Goodbye
- [x] Word-bounded `CLOSING_REGEX` covering all common closings (bye/goodbye/take care/have a good X/talk to you soon/thanks for your time/see you/appreciate it)
- [x] Detection only fires after >= 4 turns of conversation
- [x] Sticky banner with 5-second countdown + "Keep going" cancel button
- [x] At zero, fires the existing end-session flow (skips the manual confirmation modal)
- [x] Countdown clears if either side breaks the closing pattern

### 13.13 — DISC Coaching Cards (PM-facing)
- [x] `/content/coaching-cards/*.md` — 8 DISC profile cards + 1 general/universal cues file
- [x] `loader.loadCoachingCards()` reads from filesystem at startup (cached)
- [x] `getCoachingCard(code)` and `getGeneralCoachingCues()` exported from loader
- [x] `GET /api/coaching-cards/:discCode` and `/general` endpoints
- [x] `client/src/api/coachingCards.ts` typed wrappers
- [x] SimulationPage pre-call card surfaces the matched DISC card prominently with universal cues collapsed below
- [x] Side notes panel during call gains a Brief / Coaching tabs strip
- [x] Falls back gracefully if a card is missing (404 ignored client-side)

### 13.14 — Admin-Managed Scenarios (Phase 5 v2)
- [x] `seedScenarios()` reverted to `INSERT OR IGNORE` so deploys never clobber UI edits
- [x] `loader.getScenario()` and `getAllScenarios()` query the DB at request time (was: filesystem cache loaded at startup)
- [x] `voice-selector.checkScenarioPinnedVoice()` reads scenario body from DB (was: filesystem)
- [x] `POST /api/scenarios` and `PATCH /:id` validate that body contains `<!-- BRIEF END -->` marker; slug must match `^[a-z0-9]+(-[a-z0-9]+)*$`
- [x] `GET /api/scenarios/admin` returns all scenarios (active+inactive) with session counts
- [x] `DELETE /api/scenarios/:id` — admin only; refuses if any sessions reference the scenario, with the session count surfaced in the 409 error so the UI can show it
- [x] `client/src/pages/admin/AdminScenariosPage.tsx` — table of all scenarios with edit / deactivate / delete actions
- [x] `client/src/pages/admin/ScenarioFormModal.tsx` — TipTap WYSIWYG editor for creating + editing. Toolbar: H2/H3/Bold/Italic/Bullet/Numbered/Quote/Insert BRIEF END. Auto-suggests slug from title in create mode.
- [x] `client/src/pages/admin/HardDeleteScenarioModal.tsx` — "type DELETE to confirm" gate; if any sessions reference the scenario, hard delete is blocked and "Deactivate instead" is offered
- [x] AdminLayout adds "Scenarios" nav link
- [x] All 33 server tests pass (added 2 new tests covering BRIEF END marker validation and slug format validation)

### 13.15 — Post-Phase-1 UX Polish
- [x] Slug field hidden from the scenario form (auto-derived from title under the hood — non-technical owners don't see it)
- [x] TipTap editor formatting visually distinct via scoped `.scenario-editor` CSS (H2/H3/Bold/Italic/Lists/Quote/HR each have unique styling instead of relying on the absent Tailwind Typography plugin)
- [x] BRIEF END divider in the editor renders as a gold dashed line with a centered "— BRIEF END — answer key below is hidden from the PM —" overlay label so authors can see exactly where the cut is
- [x] Admin nav reworked: gold-underline active-page indicator, Export Excel demoted from filled button to ghost styling, user identity prefixed with person icon and separated by a vertical divider so it doesn't look like a nav item
- [x] DiscSelectPage CTA framing clarified — heading reworded to "Pick a client profile to start", action subhead added, hover-revealed "Start →" pill on each card so the click action is unambiguous

### 13.16 — Streaming Coaching with a Real Progress Bar
- [x] `POST /api/sessions/:id/end` switched to Server-Sent Events (`Content-Type: text/event-stream`, `X-Accel-Buffering: no`) emitting `progress` events as Claude streams
- [x] `server/src/services/claude.ts` exposes `generateCoachingStream()` reporting characters received
- [x] Coaching row still written to SQLite once at the end; Excel still regenerates non-blocking
- [x] `DebriefPage` loader shows a moving progress bar + calculated ETA + rotating stage messages instead of an indeterminate spinner

### 13.17 — Raw Transcript on the Debrief
- [x] `DebriefPage.tsx` gained a collapsible "Conversation Transcript" section (collapsed by default)
- [x] Renders named, speaker-labeled bubbles — parity with the admin session-detail view

### 13.18 — End-Session Resilience
- [x] `POST /api/sessions/:id/end` is idempotent — safe to retry (manual button / confirm modal / auto-end) without double-writing coaching
- [x] Coaching JSON parsed defensively (tolerates code-fence wrappers / stray prose) so a slightly-formatted response still saves a debrief

### 13.19 — Configurable Coaching Provider
- [x] `server/src/services/coaching/` provider abstraction replaces `claude.ts` — `types.ts` interface + `openai.ts` / `gemini.ts` / `anthropic.ts` implementations + `service.ts` dispatch
- [x] `models.ts` `PROVIDERS_META` — metadata-driven registry (label + env-key + curated models); shipped: OpenAI (gpt-4o/gpt-4.1), Gemini (gemini-2.5-pro/flash), Anthropic (claude-opus-4-8/claude-sonnet-4-6); **default OpenAI gpt-4o**. Grok/Kimi prototyped then dropped (unverified IDs)
- [x] `app_settings` + `provider_keys` SQLite tables added to `schema.sql`
- [x] `server/src/utils/crypto.ts` — AES-256-GCM encrypt/decrypt (key from `SETTINGS_ENC_KEY`, falls back to `JWT_SECRET`)
- [x] `settings.ts` — key resolution DB → env → none; `getProviderStatus()` reports `source` ('db'|'env'|null); env keys keep working until an in-app key is saved
- [x] `GET/PATCH /api/admin/coaching-settings` + `POST/DELETE /api/admin/coaching-settings/keys` (admin-guarded; keys write-only, only `last4` ever returned)
- [x] `AdminCoachingSettingsPage.tsx` (`/admin/coaching`, "Coaching" nav link) — **provider table**: Connect / Connected ····last4 + Remove (env keys show "from server env", not removable); model pills activate per provider; rows without a key greyed out; header clarifies it's the feedback AI + links to ElevenLabs for the in-call model
- [x] Persona prompt forbids spoken audio tags; `client/src/utils/stripAudioTags.ts` scrubs stray `[serious]`/`[cold]` tags from the transcript
- [x] `sessions.ts` import switched from `services/claude` to `services/coaching/service`; `claude.ts` deleted
- [x] All server tests pass (54); client type-checks + builds clean
- [ ] Ship: remove `COACHING_PROVIDER`/`COACHING_MODEL` from Railway (so OpenAI default governs), add `SETTINGS_ENC_KEY` (or rely on `JWT_SECRET`), merge `feat/coaching-provider-switch` → `main`, production-verify (deploys live — do with Tyler)

### 13.20 — Branding / White-Label Colors
- [x] `tailwind.config.js` navy/gold/slate → `rgb(var(--x) / <alpha-value>)`; `index.css` `:root` channel defaults (no visual change); TipTap CSS uses the same vars
- [x] `client/src/utils/deriveBrandShades.ts` — two hex colors → 8-var `--gold-*`/`--navy-*` channel ramp
- [x] `server/src/services/branding.ts` — `brand_primary`/`brand_secondary`/`brand_logo_url` in `app_settings`, defaults + hex/URL validation (tests)
- [x] `server/src/routes/branding.ts` — public `GET /api/branding`, admin `PATCH`/`DELETE` (mounted in `index.ts`; tests)
- [x] `client/src/utils/applyBranding.ts` — boot fetch (4s timeout) sets CSS vars on `:root`; reset removes inline overrides; called in `main.tsx`
- [x] `client/src/components/BrandLogo.tsx` — logo image or text wordmark fallback; live-updates via `branding:logo` event; used in AdminLayout/LoginPage/ScenarioSelectPage
- [x] `AdminBrandingPage.tsx` (`/admin/branding`, "Branding" nav link) — logo URL + primary/secondary color inputs + live preview + Save + Reset
- [x] All server tests pass (62); client type-checks + builds clean

### 13.21 — Admin UX Overhaul (branch `feat/admin-ux-overhaul`)
- [x] Migrations: `sessions.deleted_at`, `users.user_type`, `scenarios.visible_to_types`, `user_types` table; seed `PM`
- [x] Left sidebar nav (`AdminSidebar.tsx`) replaces top nav in `AdminLayout.tsx` (admin shell only; mobile drawer)
- [x] Dashboard lists all users incl. admins; cohort stats still exclude admins; "All Users" / "Add User"
- [x] `server/src/services/sessions-admin.ts` — listSessions(filter) / softDeleteSession / purgeEmptySessions / purgeExpiredSoftDeletes; startup retention sweep in `index.ts`
- [x] Routes: `GET /api/admin/sessions`, `DELETE /api/admin/sessions/:id`, `POST /api/admin/sessions/purge-empty`; all existing session queries exclude soft-deleted
- [x] Filtered export `GET /api/admin/export.xlsx?userId/from/to/scenarioId/status`; `EXCEL_PATH` path.resolve fix
- [x] `client/src/components/DataTable.tsx` (reusable sortable dense table)
- [x] `AdminSessionsPage.tsx` (`/admin/sessions`) — filters + delete + purge + filtered export
- [x] Scenarios + Users lists refactored onto DataTable
- [x] `server/src/services/user-types.ts` + `GET/POST/DELETE /api/admin/user-types` (in-use 409 guard); `user_type` on users
- [x] Scenario `visible_to_types`; `GET /api/scenarios` filters by requester `user_type` (admin=all, untyped=all, NULL-type=untyped only)
- [x] Frontend: user-type dropdown (UserModalForm), scenario "Visible to user types" selector (ScenarioFormModal), UserTypesPanel (Dashboard)
- [x] All server tests pass (108, 14 suites); client type-checks + builds clean

### 13.22 — Post-Overhaul Polish (branch `feat/admin-ux-overhaul`)
- [x] Plan Forward teal rebrand as defaults: `#1C8CAB` accent / `#0E2A33` base / `#F8FAFC` text in `:root` + `DEFAULT_BRANDING` + applyBranding/AdminBrandingPage DEFAULTS (matches planforward.net)
- [x] Score rings (DebriefPage, AdminSessionDetailPage) + TrendChart switched from hardcoded gold to theme-driven classes
- [x] Text brand token: `brand_text` + `Branding.text`; `deriveBrandShades(primary,secondary,text)` emits `--slate-text`/`--slate-muted`; Text color control in the picker
- [x] Sidebar: "Run Practice" moved into nav (Dashboard→Run Practice→Sessions); redundant "Export Excel" removed
- [x] Dedicated `/admin/users` page (`AdminUsersPage.tsx`) — table + Add User + User Types; Dashboard slimmed to cohort analytics; `UserTypesPanel` extracted
- [x] Scenario picker is a `DataTable` (Name/Description/Role(s)); `GET /api/scenarios` returns `visible_to_types`; descriptions markdown-stripped
- [x] `npm run dev` runs migrate + seed before serving (dev parity with prod)
- [x] All server tests pass (114); client type-checks + builds clean
- [x] Merged `feat/admin-ux-overhaul` → `main` + deployed

### 13.23 — Unified Role (branch `feat/unify-roles`)
- [x] Roles registry = `user_types` table, seeded **Admin** + PM; **Admin reserved** (DELETE → 400; UI hides remove)
- [x] Safe storage: role NAME in `users.user_type`; `users.role` kept as derived access flag (`admin` iff name=Admin, else `pm`) — no CHECK change, no table rebuild; `requireAdmin`/JWT/stat-filtering untouched
- [x] `POST`/`PATCH /api/admin/users` accept single `role` = name, validate against registry, derive both columns
- [x] Idempotent migration backfill (`migrate.ts`): admins→`Admin`, untyped members→`PM`, typed members preserved
- [x] Frontend: single "Role" dropdown (UserModalForm), Roles panel (Admin not removable), one Role column (Users table), scenario "Visible to roles" excludes Admin
- [x] Removed stale `/api/users` create/edit (second unvalidated write path)
- [x] All server tests pass (136, incl. new `roles-unify.test.ts`); client builds clean; auth-focused review passed
- [x] Merge `feat/unify-roles` → `main` (deployed live)

### 13.24 — Coaching Provider Failover + Admin Re-Grade (branch `feat/coaching-resilience`)
- [x] `generateCoachingStream` failover: active provider first, then other connected providers in `PROVIDER_ORDER` (dedup), fall through on request/parse error
- [x] `CoachingResult.gradedProvider` / `gradedModel` recorded (active uses `getActiveModel`, fallback uses `DEFAULT_MODEL[provider]`)
- [x] `friendlyCoachingError(err, provider)` — concise rate-limit/auth/generic messages, never leaks JSON/HTTP bodies (exported + unit-tested)
- [x] `POST /api/admin/sessions/:id/regrade` — re-run coaching on a finished/stuck/failed session, persist, regenerate Excel; returns `{ regraded, gradedProvider, gradedModel, totalScore }`
- [x] Merged → `main` + deployed

### 13.25 — True-Zero Coaching Calibration (branches `feat/harsher-scoring` + `feat/scoring-rebalance`)
- [x] Per-category scale widened 1–5 → **0–5**; `coaching-prompt.ts` scale + `scoreBreakdown` `<0-5>`; `02-scoring-levels.md` adds level 0 (Harmful)
- [x] "Scoring Discipline" automatic-fail conditions (no firm commitment when pressed, dismissal, hang-up/abandonment, no plan) → affected categories 0–1, overall near floor
- [x] Rebalance: 3 = met standard / 4 = done well / 5 = excellent; missing an optional technique is NOT a deduction; strong calls land high-80s/90s
- [x] Score-bar UI already renders 0 (empty bar) — no client change; build + tests pass
- [x] Both branches merged → `main` + deployed

### 13.26 — Guarded User Delete (branch `feat/user-delete`)
- [x] `DELETE /api/admin/users/:id` — hard-delete only users with no sessions; 409 + `sessionCount` otherwise; blocks self-delete (400) and last-admin (400)
- [x] `adminApi.deleteUser` + "Delete User" button in edit-user modal (confirm + guard hint; 409/400 inline)
- [x] Tests: happy path, 409 session-guard, 400 self-guard (`admin-users.test.ts`); 174 server tests pass
- [x] Merged → `main` + deployed

---

## Notes Section

Use this space for blockers, questions, or decisions made along the way.

> _(empty)_
