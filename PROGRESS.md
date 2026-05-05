# Build Progress Tracker

A linear checklist of every action in [REBUILD_ME_GUIDE.md](REBUILD_ME_GUIDE.md). Check items off as you go.

**How to toggle:** With the VS Code extension *Markdown All in One* installed, put your cursor on a line and press `Cmd+Shift+C` (Mac) or `Ctrl+Shift+C` (Windows). Or just edit `[ ]` to `[x]` by hand.

**Need detail on a step?** Each section links back to the matching part of the guide.

---

## Part 1 — Install Local Tools

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-1--install-local-tools)

- [ ] Install Node.js 20 LTS
- [ ] Install Git
- [ ] Install VS Code
- [ ] Install Postman or Insomnia
- [ ] Verify versions in terminal: `node --version`, `npm --version`, `git --version`
- [ ] VS Code extension: ESLint
- [ ] VS Code extension: Prettier — Code formatter
- [ ] VS Code extension: Tailwind CSS IntelliSense
- [ ] VS Code extension: SQLite Viewer
- [ ] VS Code extension: REST Client *(optional)*
- [ ] VS Code extension: Markdown All in One *(for this checklist)*

---

## Part 2 — Create Third-Party Accounts

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-2--create-third-party-accounts)

### 2.1 — GitHub Organization
- [ ] Create GitHub org in company name
- [ ] Add developer as Owner or Member

### 2.2 — Anthropic (Claude API)
- [ ] Sign up at console.anthropic.com with company email
- [ ] Add payment method
- [ ] Set monthly spending limit (~$100)
- [ ] Create API key named `dev-key`
- [ ] Save key in password manager

### 2.3 — OpenAI (Whisper)
- [ ] Sign up at platform.openai.com with company email
- [ ] Add payment method, prepay $20
- [ ] Set monthly hard usage limit (~$50)
- [ ] Create API key named `dev-key`
- [ ] Save key in password manager

### 2.4 — ElevenLabs (TTS)
- [ ] Sign up at elevenlabs.io with company email
- [ ] Pick a plan (Starter / Creator / Pro)
- [ ] Browse Voice Library, add 2-3 candidate voices to VoiceLab
- [ ] Test each voice with a sample line
- [ ] Pick winning voice, copy its Voice ID
- [ ] Copy API key
- [ ] Save key + voice ID in password manager

### 2.5 — Railway
- [ ] Sign up at railway.app using company GitHub org

### 2.6 — Vercel
- [ ] Sign up at vercel.com using company GitHub org

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
- [ ] GitHub org name + admin access confirmed
- [ ] `ANTHROPIC_API_KEY` saved
- [ ] `OPENAI_API_KEY` saved
- [ ] `ELEVENLABS_API_KEY` saved
- [ ] `ELEVENLABS_VOICE_ID` saved
- [ ] Railway login working
- [ ] Vercel login working
- [ ] `RESEND_API_KEY` saved *(if using)*
- [ ] DNS dashboard access confirmed

---

## Part 3 — Set Up the Repository

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-3--set-up-the-repository)

- [ ] Create private GitHub repo `communication-training-simulator`
- [ ] Clone repo locally
- [ ] Copy planning materials into repo (CLAUDE.md, REBUILD_ME_GUIDE.md, content/, master plan)
- [ ] Commit and push planning materials
- [ ] Create folder structure (`server/`, `client/`, `data/`, `docs/`)
- [ ] Add `.gitignore` with secrets and build artifacts excluded
- [ ] Commit folder structure
- [ ] Create `server/.env.example`
- [ ] Create `client/.env.example`
- [ ] Copy `.env.example` files to real `.env` files
- [ ] Paste real API keys into `server/.env`
- [ ] Generate strong `JWT_SECRET` and add to `server/.env`
- [ ] Verify `git status` shows `.env` is ignored

---

## Part 4 — Backend Foundation (Phase 1)

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-4--build-the-backend-foundation-phase-1)

### 4.1 — Initialize Server Project
- [ ] Run `npm init -y` in `server/`
- [ ] Install runtime dependencies (express, cors, dotenv, etc.)
- [ ] Install dev dependencies (typescript, ts-node-dev, jest, etc.)
- [ ] Initialize TypeScript config
- [ ] Add npm scripts (dev, build, start, db:migrate, db:seed, test)

### 4.2 — Database Schema
- [ ] Create `server/src/db/schema.sql` with all tables (users, scenarios, disc_profiles, sessions, turns, coaching, rubric_items)

### 4.3 — Implement Modules
- [ ] `server/src/index.ts` (Express bootstrap, CORS, error handler)
- [ ] `server/src/db/connection.ts`
- [ ] `server/src/db/migrate.ts`
- [ ] `server/src/db/seed.ts` (seeds DISC, scenarios, rubric, admin user)
- [ ] `server/src/middleware/auth.ts` (JWT verification)
- [ ] `server/src/middleware/roleGuard.ts` (admin guard)
- [ ] `server/src/routes/auth.ts`
- [ ] `server/src/routes/users.ts`
- [ ] `server/src/routes/scenarios.ts`
- [ ] `server/src/routes/disc-profiles.ts`
- [ ] `server/src/routes/rubric.ts`
- [ ] `server/tests/auth.test.ts`
- [ ] `server/tests/scenarios.test.ts`

### 4.4 — Run and Verify
- [ ] `npm run db:migrate` succeeds
- [ ] `npm run db:seed` succeeds
- [ ] `npm run dev` starts on port 3001
- [ ] Test admin login in Postman, receive JWT
- [ ] All routes verified with `pm` and `admin` JWTs
- [ ] `npm test` passes
- [ ] **Phase 1 complete** — commit and push

---

## Part 5 — AI and Voice Services (Phases 2 + 3)

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-5--build-ai-and-voice-services-phases-2--3)

### 5.1 — Install SDKs
- [ ] Install `@anthropic-ai/sdk`, `openai`, `axios`, `form-data`, `multer`

### 5.2 — Prompt Layer
- [ ] `server/src/prompts/loader.ts` (reads from `/content/`)
- [ ] `server/src/prompts/persona-prompt.ts`
- [ ] `server/src/prompts/coaching-prompt.ts`

### 5.3 — Service Layer
- [ ] `server/src/services/claude.ts` (sendConversationTurn + generateCoaching)
- [ ] `server/src/services/whisper.ts` (transcribeAudio)
- [ ] `server/src/services/elevenlabs.ts` (synthesizeSpeech)

### 5.4 — Session API
- [ ] `POST /api/sessions` (create session)
- [ ] `POST /api/sessions/:id/turns` (audio or text input)
- [ ] `POST /api/sessions/:id/end` (generate coaching)
- [ ] `GET /api/sessions/:id`
- [ ] `GET /api/sessions` (filtered by role)
- [ ] Static file serving for `/audio/` directory

### 5.5 — Verify End-to-End in Postman
- [ ] Create session via API
- [ ] Send 3-4 text turns, AI client responds in character
- [ ] Open returned `audioUrl` in browser, hear AI voice
- [ ] Call `/end`, receive structured coaching JSON
- [ ] Coaching references both DISC profiles by name
- [ ] **Phases 2-3 complete** — commit and push

---

## Part 6 — PM Frontend (Phase 4)

🔗 [Guide reference](REBUILD_ME_GUIDE.md#part-6--build-the-pm-frontend-phase-4)

### 6.1 — Initialize Frontend
- [ ] Create Vite + React + TypeScript project in `client/`
- [ ] Install React Router and axios
- [ ] Install + configure Tailwind CSS
- [ ] Configure `tailwind.config.js`
- [ ] Update `src/index.css` with Tailwind directives

### 6.2 — API Client
- [ ] `client/src/api/client.ts` (axios with auth interceptor)
- [ ] `client/src/api/auth.ts`
- [ ] `client/src/api/scenarios.ts`
- [ ] `client/src/api/disc.ts`
- [ ] `client/src/api/sessions.ts`

### 6.3 — Hooks
- [ ] `client/src/hooks/useAuth.ts`
- [ ] `client/src/hooks/useAudioRecorder.ts`
- [ ] `client/src/hooks/useConversation.ts`

### 6.4 — Pages
- [ ] `LoginPage.tsx`
- [ ] `ScenarioSelectPage.tsx`
- [ ] `DiscSelectPage.tsx`
- [ ] `SimulationPage.tsx`
- [ ] `DebriefPage.tsx`
- [ ] `SessionHistoryPage.tsx`

### 6.5 — Shared Components
- [ ] `VoiceRecorder.tsx`
- [ ] `AudioPlayer.tsx`
- [ ] `ConversationLog.tsx`
- [ ] `ScoreCard.tsx`
- [ ] `DiscBadge.tsx`

### 6.6 — Routing
- [ ] Set up React Router with all PM routes
- [ ] Add auth route protection

### 6.7 — Verify
- [ ] Full flow works on desktop Chrome (login → simulate → debrief → history)
- [ ] Full flow works on iPhone Safari
- [ ] Microphone permission prompt appears
- [ ] AI voice plays automatically
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
- [ ] `AdminScenariosPage.tsx`
- [ ] `AdminUsersPage.tsx`
- [ ] `AdminRubricPage.tsx`
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
- [ ] Microphone permission prompt appears (mobile + desktop)
- [ ] Voice recording works on iPhone Safari
- [ ] AI client audio plays automatically
- [ ] Audio sounds like the chosen voice
- [ ] AI stays in character (no mid-session coaching)
- [ ] AI behavior matches selected DISC profile
- [ ] "End Session" requires confirmation
- [ ] Coaching debrief loads and is readable
- [ ] Coaching mentions PM's DISC and client's DISC by name
- [ ] Score is between 0-100
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
- [ ] Recording silence → graceful error, no crash
- [ ] Network interruption mid-turn → graceful error
- [ ] Closing browser mid-session — behavior decided and verified
- [ ] PM blocked from admin URLs
- [ ] Invalid JWT redirects to login

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
- [ ] Add Volume mounted at `/data`
- [ ] Deploy succeeds, service is running
- [ ] Run `db:migrate` and `db:seed` on Railway
- [ ] Test `/health` endpoint via curl
- [ ] Copy production Railway URL

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
- [ ] OpenAI usage limit set
- [ ] ElevenLabs plan tier confirmed
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

## Notes Section

Use this space for blockers, questions, or decisions made along the way.

> _(empty)_
