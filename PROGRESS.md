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
- [x] Configure agent LLM *(using Haiku 4.5 or Gemini Flash for testing — swap to Claude Sonnet 4.6 before launch)*
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
- [ ] Install React Router, axios, `@11labs/react`
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
- [ ] Full flow verified in browser (login → simulate → debrief → history) *(do this now)*
- [ ] Works on iPhone Safari *(test after browser verification)*
- [ ] **Phase 4 complete** — commit and push

---

## Part 7 — Admin Dashboard (Phase 5)

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-7--build-the-admin-dashboard-phase-5)

### 7.1 — Install Libraries
- [ ] Install `exceljs` in server
- [ ] Install `recharts` in client

### 7.2 — Excel Export Service
- [ ] `server/src/services/excel.ts` with `regenerateExcel()`
- [ ] Hook into `POST /api/sessions/:id/end`
- [ ] `GET /api/admin/export` route

### 7.3 — Admin Routes
- [ ] `GET /api/admin/summary`
- [ ] `GET /api/admin/users/:id/sessions`
- [ ] `requireAdmin()` guard on all admin routes

### 7.4 — Admin Pages
- [ ] `AdminDashboardPage.tsx`
- [ ] `AdminUserDetailPage.tsx`
- [ ] `AdminSessionDetailPage.tsx`
- [ ] `AdminScenariosPage.tsx` (with voice pin + forced-random options)
- [ ] `AdminUsersPage.tsx`
- [ ] `AdminRubricPage.tsx`
- [ ] `AdminVoicesPage.tsx` (preview audio, toggle active, usage stats)
- [ ] `AdminExportPage.tsx`

### 7.5 — Verify
- [ ] Dashboard shows all PMs and scores
- [ ] Score chart renders
- [ ] Editing a scenario takes effect on next session
- [ ] Adding a PM enables immediate login
- [ ] Excel export downloads valid multi-sheet file
- [ ] Excel auto-regenerates on session end
- [ ] **Phase 5 complete** — commit and push

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
- [ ] Confirm CORS reads `CLIENT_ORIGIN` from env
- [ ] `cd server && npm run build` succeeds with no errors
- [ ] `cd client && npm run build` succeeds with no errors

### 9.2 — Deploy Backend (Railway)
- [ ] Create Railway project from GitHub repo
- [ ] Set root directory to `server`
- [ ] Set build and start commands
- [ ] Add all env variables (with **production** values)
- [ ] Generate new `JWT_SECRET` for prod (do not reuse dev)
- [ ] Add `ELEVENLABS_AGENT_ID` and `ELEVENLABS_WEBHOOK_SECRET`
- [ ] Add Volume mounted at `/data`
- [ ] Deploy succeeds, service is running
- [ ] Run `db:migrate` and `db:seed` on Railway
- [ ] Test `/health` endpoint via curl
- [ ] Copy production Railway URL

### 9.2a — Update ElevenLabs Webhook to Production
- [ ] Update agent webhook URL to `https://<railway-url>/api/elevenlabs/webhook`
- [ ] Test conversation in ElevenLabs dashboard
- [ ] Verify webhooks arrive in Railway logs

### 9.3 — Deploy Frontend (Vercel)
- [ ] Import GitHub repo into Vercel
- [ ] Set root directory to `client`
- [ ] Add `VITE_API_BASE_URL` pointing to Railway URL
- [ ] Deploy succeeds
- [ ] Confirm app loads at vercel.app URL

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

## Notes Section

Use this space for blockers, questions, or decisions made along the way.

> _(empty)_
