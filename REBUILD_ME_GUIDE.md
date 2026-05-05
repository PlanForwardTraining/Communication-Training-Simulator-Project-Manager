# Rebuild Me Guide — Communication Training Simulator

> A complete, start-to-finish walkthrough for building, deploying, and operating the application. Designed so a competent developer (or you, with a developer alongside you) can take a fresh laptop and an empty cloud account and end up with a working production system.

This guide is the orchestrator — it tells you **what to do, in what order, with what setup**. The detailed implementation reference is in [docs/superpowers/plans/2026-05-05-master-plan.md](docs/superpowers/plans/2026-05-05-master-plan.md) and the content reference is in [content/](content/).

---

## Table of Contents

- [Part 0 — Read This First](#part-0--read-this-first)
- [Part 1 — Install Local Tools](#part-1--install-local-tools)
- [Part 2 — Create Third-Party Accounts](#part-2--create-third-party-accounts)
- [Part 3 — Set Up the Repository](#part-3--set-up-the-repository)
- [Part 4 — Build the Backend Foundation](#part-4--build-the-backend-foundation-phase-1)
- [Part 5 — Build AI and Voice Services](#part-5--build-ai-and-voice-services-phases-2--3)
- [Part 6 — Build the PM Frontend](#part-6--build-the-pm-frontend-phase-4)
- [Part 7 — Build the Admin Dashboard](#part-7--build-the-admin-dashboard-phase-5)
- [Part 8 — Local End-to-End Testing](#part-8--local-end-to-end-testing)
- [Part 9 — Deploy to Production](#part-9--deploy-to-production)
- [Part 10 — Go Live](#part-10--go-live)
- [Part 11 — Operate the System](#part-11--operate-the-system)
- [Appendix A — Environment Variables Reference](#appendix-a--environment-variables-reference)
- [Appendix B — Cost Monitoring](#appendix-b--cost-monitoring)
- [Appendix C — Glossary](#appendix-c--glossary)

---

## Part 0 — Read This First

### Who This Guide Is For

- **A developer** building the application from scratch
- **A business owner** who wants to understand what's happening and verify each step
- **A future you** who needs to rebuild this in two years from a backup

### Total Time Required

- **Setup (Parts 1-3):** 2-3 hours
- **Build (Parts 4-7):** 4-6 weeks of focused development time, ~140 hours
- **Deploy (Parts 8-9):** 1-2 days
- **Go Live (Part 10):** 1 day

### Estimated Total Cost (One-Time + Monthly)

- **One-time setup:** $0 (all accounts have free tiers; domain ~$15/year if buying new)
- **Monthly operating:** $50-220/month depending on usage (see [Appendix B](#appendix-b--cost-monitoring))
- **Developer cost:** Whatever your dev firm charges for ~140 hours

### Build Philosophy

- Build in phases. Don't skip ahead.
- Test each phase end-to-end before moving on.
- Commit to git frequently (after every working step).
- Keep secrets in `.env` files, **never in git**.
- The `/content/` folder is editable by non-developers — keep it that way.

---

## Part 1 — Install Local Tools

Install on the development machine (Mac, Windows, or Linux).

### 1.1 — Required Tools

| Tool | What For | How to Install |
|---|---|---|
| **Node.js 20 LTS** | Runs both backend and frontend | Download from [nodejs.org](https://nodejs.org). Choose "LTS" version. |
| **Git** | Version control | macOS: `xcode-select --install`. Windows: download from [git-scm.com](https://git-scm.com) |
| **VS Code** | Code editor | Download from [code.visualstudio.com](https://code.visualstudio.com) |
| **GitHub Desktop** *(optional)* | Friendly git UI for non-CLI users | [desktop.github.com](https://desktop.github.com) |
| **Postman** or **Insomnia** | Test the API while building it | [postman.com](https://www.postman.com) or [insomnia.rest](https://insomnia.rest) |

### 1.2 — Verify Installation

Open Terminal (macOS) or Command Prompt (Windows) and run:

```bash
node --version    # Should print v20.x.x or higher
npm --version     # Should print 10.x.x or higher
git --version     # Should print git version 2.x.x or higher
```

If any of these fail, reinstall before continuing.

### 1.3 — Recommended VS Code Extensions

Open VS Code → Extensions panel → install these:

- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier — Code formatter** (esbenp.prettier-vscode)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **SQLite Viewer** (qwtel.sqlite-viewer) — to inspect the database
- **REST Client** (humao.rest-client) — alternative to Postman

---

## Part 2 — Create Third-Party Accounts

Create all of these in the **company name** (not your personal email) so ownership stays clean. Use a shared password manager (1Password, LastPass) so multiple people can access.

### 2.1 — GitHub Organization

1. Go to [github.com/organizations/new](https://github.com/organizations/new)
2. Choose the **Free** plan
3. Name it something like `your-company-name` or `your-company-name-internal`
4. Add the developer as a member with **Owner** or **Member** role (Owner if they need to create repos; Member if you'll create the repo and invite them in)

**You'll get:** A place for the source code to live.

### 2.2 — Anthropic (Claude API)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up using a company email
3. Add a payment method under **Plans & Billing**
4. (Optional) Set a **monthly spending limit** under Plans & Billing — recommend $100/month to start
5. Go to **API Keys** → create a key called `dev-key`
6. Copy and store in your password manager — you cannot view it again

**You'll get:** `ANTHROPIC_API_KEY` (starts with `sk-ant-`)

### 2.3 — ~~OpenAI~~ (no longer required)

> **Note:** ElevenLabs Conversational AI now handles speech-to-text natively, so we no longer need OpenAI Whisper. Skip this step.

### 2.4 — ElevenLabs (Conversational AI + voice pool)

1. Go to [elevenlabs.io/sign-up](https://elevenlabs.io/sign-up)
2. Sign up with company email
3. Go to **My Account → Subscription** and pick a plan that includes Conversational AI:
   - **Creator ($22/mo)** for development and light use
   - **Pro ($99/mo)** for full 5-PM production cadence
   - Confirm the plan includes Conversational AI minutes — this is the real-time voice product, separate from standard TTS

#### 2.4a — Confirm the 10 voice IDs are in your VoiceLab

The voice pool is defined in `/content/voices/` with 10 pre-selected voice IDs, all verified to exist in the company's ElevenLabs library as of 2026-05-05. The IDs are:

```
pNInz6obpgDQGcFmaJgB   Adam       (M)  Dominant, Firm
hpp4J3VqNfWAUOO0d1Us   Bella      (F)  Professional, Bright, Warm
nPczCjzI2devNBz1zQrb   Brian      (M)  Deep, Resonant and Comforting
iP95p4xoKVk53GoZ742B   Chris      (M)  Charming, Down-to-Earth
cjVigY5qzO86Huf0OWal   Eric       (M)  Smooth, Trustworthy
cgSgspJ2msm6clMCkdW9   Jessica    (F)  Playful, Bright, Warm
TX3LPaxmHKxFdv7VOQHJ   Liam       (M)  Energetic, Confident
XrExE9yKIg1WjnnlVkGX   Matilda    (F)  Knowledgable, Professional
CwhRBWXzGAHq8TQ4Fs17   Roger      (M)  Laid-Back, Casual, Resonant
EXAVITQu4vr4xnSDxMaL   Sarah      (F)  Mature, Reassuring, Confident
```

These are all premade ElevenLabs voices and should already be in your default library. Verify in **Voice Library** in the ElevenLabs dashboard. If any are missing, search by name and add them.

For each voice, listen to the preview URL in its profile file (e.g., the URL in `content/voices/01-adam-dominant-male.md`) and confirm the voice's character matches the DISC alignment in the metadata. Adjust if needed before going live.

#### 2.4b — Create the Conversational AI agent

Go to **Conversational AI → Agents → Create Agent**:
   - **Name:** `Training Simulator — Client Persona`
   - **Voice:** Pick any voice from the pool as the default. The backend will override per session.
   - **LLM:** **Claude** (native integration; supply your `ANTHROPIC_API_KEY` when prompted)
   - **System prompt:** placeholder text (we override per-session via the SDK)
   - **Enable interruption detection**
   - **Webhooks:** subscribe to `turn`, `interruption`, `conversation_started`, `conversation_ended` events; URL will be set in Part 9 once backend is deployed (use ngrok URL for dev — see Part 5)
   - Save and copy the **Agent ID**
   - Copy the **Webhook Signing Secret** from the agent's webhook config

> **Note on per-session voice override:** ElevenLabs CAI may support voice override via `conversation_initiation_data` (Path A — preferred). If during development the dev firm finds voice override is not supported per-conversation on the current API, fall back to creating one agent per voice in the pool (Path B — more agents to manage but always works). See [docs/superpowers/plans/2026-05-05-master-plan.md](docs/superpowers/plans/2026-05-05-master-plan.md) Phase 3 for both paths.

#### 2.4c — Get your account API key

Go to **My Account → API Keys** → copy your API key.

**You'll get:**
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `ELEVENLABS_WEBHOOK_SECRET`
- (No single `ELEVENLABS_VOICE_ID` — voice pool is in `/content/voices/`)

### 2.5 — Railway (backend hosting)

1. Go to [railway.app](https://railway.app) → sign up with the **company GitHub org** (sign in with GitHub)
2. Don't create a project yet — we'll do that in Part 9

**You'll get:** A hosting account, no key needed yet.

### 2.6 — Vercel (frontend hosting)

1. Go to [vercel.com/signup](https://vercel.com/signup) → sign up with the **company GitHub org**
2. Don't create a project yet — we'll do that in Part 9

**You'll get:** A hosting account.

### 2.7 — Resend (email for password resets) — *Optional, Recommended*

1. Go to [resend.com](https://resend.com) → sign up
2. Free tier covers 3,000 emails/month — plenty for 5-30 internal users
3. Add and **verify your sending domain** (e.g., `your-company.com`) — Resend gives you DNS records to add
4. Go to **API Keys** → create one called `dev-key`

**You'll get:** `RESEND_API_KEY`

If you skip this in Phase 1, password resets must be handled by the admin manually.

### 2.8 — Domain Name

You almost certainly already own your company's main domain (e.g., `your-company.com`).

**Plan to use a subdomain like `training.your-company.com`.**

If you don't own a domain yet, register one at:
- [namecheap.com](https://namecheap.com) (~$12/year)
- [cloudflare.com/products/registrar](https://www.cloudflare.com/products/registrar/) (cheapest, at-cost pricing)

**You'll need:** Access to your DNS provider's dashboard so you can add CNAME records in Part 9.

### 2.9 — Inventory Checklist

Before continuing, confirm you have all of these in your password manager:

- [ ] GitHub org name + admin access
- [ ] `ANTHROPIC_API_KEY`
- [ ] `ELEVENLABS_API_KEY`
- [ ] `ELEVENLABS_VOICE_ID`
- [ ] `ELEVENLABS_AGENT_ID`
- [ ] `ELEVENLABS_WEBHOOK_SECRET`
- [ ] Railway login
- [ ] Vercel login
- [ ] `RESEND_API_KEY` (if using)
- [ ] DNS dashboard access for the domain you'll use

---

## Part 3 — Set Up the Repository

### 3.1 — Create the GitHub Repo

1. In your GitHub org → **New Repository**
2. Name: `communication-training-simulator`
3. **Private** (this is internal)
4. Initialize with `README.md`, `.gitignore` (Node template), and a license (Proprietary or none for internal)
5. Create

### 3.2 — Clone Locally

```bash
cd ~/Documents/GitHub
git clone https://github.com/YOUR-ORG/communication-training-simulator.git
cd communication-training-simulator
```

### 3.3 — Copy in the Plan Materials

If you've been following along in this repo, copy these into your fresh repo:

- `CLAUDE.md`
- `REBUILD_ME_GUIDE.md` (this file)
- `content/` folder
- `docs/superpowers/plans/2026-05-05-master-plan.md`

Commit:

```bash
git add .
git commit -m "Add planning docs and content library"
git push
```

### 3.4 — Set Up Folder Structure

```bash
mkdir -p server/src/{routes,services,db/migrations,db/queries,prompts/disc-personas,prompts/scenarios,middleware}
mkdir -p client/src/{pages,components,hooks,api}
mkdir -p data
echo "data/*.db
data/*.xlsx
data/audio/
.env
.env.local
node_modules/
dist/
.DS_Store" > .gitignore
git add .
git commit -m "Initialize folder structure and .gitignore"
git push
```

### 3.5 — Create `.env.example` Files

> **Note:** A root-level `.env`, `.env.example`, and `.gitignore` were already created at the start of the project so API keys can be stored before development begins. When the `server/` folder is initialized in Phase 1, copy the values from the root `.env` into a new `server/.env` (same variable names) and delete the root `.env`. The `client/.env` is created fresh in Phase 4.

Create two example files (these go in git so the next developer knows what's needed):

**`server/.env.example`:**
```
# Database
DATABASE_PATH=../data/simulator.db
EXCEL_PATH=../data/sessions.xlsx

# Auth
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ELEVENLABS_AGENT_ID=...
ELEVENLABS_WEBHOOK_SECRET=...

# Email (optional)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@your-company.com

# Server
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**`client/.env.example`:**
```
VITE_API_BASE_URL=http://localhost:3001
```

### 3.6 — Create the Real `.env` Files Locally

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Open both `.env` files in VS Code and paste in the **real** API keys from your password manager. **These files are in `.gitignore` and will not be committed** — verify by running `git status` and confirming `.env` does not appear.

### 3.7 — Generate a Strong JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the output and paste it as the value of `JWT_SECRET` in `server/.env`.

---

## Part 4 — Build the Backend Foundation (Phase 1)

This builds the API server, database, authentication, and basic CRUD. No AI yet.

### 4.1 — Initialize the Server Project

```bash
cd server
npm init -y
npm install express cors dotenv better-sqlite3 bcrypt jsonwebtoken zod
npm install --save-dev typescript ts-node-dev @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken jest @types/jest ts-jest supertest @types/supertest eslint
npx tsc --init
```

Edit `server/package.json` `scripts` section:

```json
"scripts": {
  "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "db:migrate": "ts-node src/db/migrate.ts",
  "db:seed": "ts-node src/db/seed.ts",
  "test": "jest"
}
```

### 4.2 — Define the Database Schema

Create `server/src/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  disc_profile TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('pm','admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disc_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  body_markdown TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id),
  client_disc_id INTEGER NOT NULL REFERENCES disc_profiles(id),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  total_score INTEGER
);

CREATE TABLE IF NOT EXISTS turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK(speaker IN ('pm','client')),
  content TEXT NOT NULL,
  audio_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coaching (
  session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  strengths TEXT NOT NULL,
  misses TEXT NOT NULL,
  alternatives TEXT NOT NULL,
  disc_adaptation TEXT NOT NULL,
  score_breakdown_json TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rubric_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  weight INTEGER NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL
);
```

### 4.3 — Implement These Modules (Refer to Master Plan for Code)

Each item below is a file the developer creates. The detailed code is captured during Phase 1 implementation — see the master plan for what each does.

- [ ] `server/src/index.ts` — Express bootstrap, CORS, JSON, route mounting, error handler
- [ ] `server/src/db/connection.ts` — better-sqlite3 connection singleton
- [ ] `server/src/db/migrate.ts` — runs `schema.sql`
- [ ] `server/src/db/seed.ts` — seeds DISC profiles from `/content/disc-profiles/*.md`, scenarios from `/content/scenarios/*.md`, rubric from `/content/coaching-rubric/`, plus one admin user (email and temp password from environment)
- [ ] `server/src/middleware/auth.ts` — JWT verification, attaches `req.user`
- [ ] `server/src/middleware/roleGuard.ts` — `requireAdmin()` helper
- [ ] `server/src/routes/auth.ts` — `POST /auth/login`, `GET /auth/me`
- [ ] `server/src/routes/users.ts` — admin CRUD
- [ ] `server/src/routes/scenarios.ts` — list, get, admin update
- [ ] `server/src/routes/disc-profiles.ts` — list, get
- [ ] `server/src/routes/rubric.ts` — admin CRUD
- [ ] `server/tests/auth.test.ts` — login happy path + auth rejection
- [ ] `server/tests/scenarios.test.ts` — list returns seeded scenarios

### 4.4 — Run It

```bash
cd server
npm run db:migrate
npm run db:seed
npm run dev
```

You should see `Server running on port 3001`.

In Postman, hit `POST http://localhost:3001/auth/login` with `{"email":"admin@your-company.com","password":"<seed password>"}`. You should get back a JWT.

**✅ Phase 1 done when:** all routes work in Postman with both `pm` and `admin` JWTs, and `npm test` passes.

Commit:

```bash
git add server
git commit -m "Phase 1: backend foundation with auth and CRUD"
git push
```

---

## Part 5 — Build AI and Voice Services (Phases 2 + 3)

The voice pipeline uses **ElevenLabs Conversational AI** as the real-time engine, with **Claude as the configured LLM**. ElevenLabs handles continuous mic, voice activity detection, streaming STT/TTS, echo cancellation, and interruption events. Claude (separately, via direct API) generates the post-session coaching.

### 5.1 — Add the AI SDKs

```bash
cd server
npm install @anthropic-ai/sdk axios
npm install --save-dev @types/node
```

(No multer, no Whisper, no audio files — ElevenLabs streams audio directly between browser and their service.)

### 5.2 — Build the Prompt Layer

The prompt layer reads from `/content/` so the business owner's edits flow through automatically.

- [ ] `server/src/prompts/loader.ts` — reads markdown files from `/content/` and caches them in memory; exposes `getScenario(slug)`, `getDiscProfile(code)`, `getRubric()`
- [ ] `server/src/prompts/persona-prompt.ts` — `buildPersonaPrompt(scenario, clientDisc)` returns the system prompt that ElevenLabs CAI passes to Claude during the live call. Includes:
  - The scenario context
  - The client DISC profile
  - Explicit instructions: stay in character, do not break to coach, do not voluntarily end the call
  - Profile-appropriate interruption guidance (D-types may interrupt PM; S/C types do not)
- [ ] `server/src/prompts/coaching-prompt.ts` — `buildCoachingPrompt(transcript, events, pmDisc, clientDisc, rubric)` returns the prompt for the post-call coaching debrief. **Crucially, this prompt receives the full list of `events` (interruptions, overlaps) and is instructed to weight Active Listening scoring by client DISC profile.**

### 5.3 — Build the Coaching Service

- [ ] `server/src/services/claude.ts`:
  - `generateCoaching(systemPrompt, transcript, events): Promise<CoachingResult>` — returns structured `{strengths, misses, alternatives, discAdaptation, scoreBreakdown, totalScore}`. Score breakdown includes the new `activeListening` field.

### 5.4 — Configure the ElevenLabs CAI Agent

This is the one-time setup you did in Part 2.4. Before continuing, verify:

- [ ] `ELEVENLABS_AGENT_ID` is set in `.env`
- [ ] `ELEVENLABS_WEBHOOK_SECRET` is set in `.env`
- [ ] The agent's webhook URL is reachable from ElevenLabs (use `ngrok` for local dev: `ngrok http 3001` → paste ngrok URL into agent webhook config)
- [ ] The agent's LLM is set to Claude

### 5.5 — Build the ElevenLabs Service Layer

- [ ] `server/src/services/voice-selector.ts`:
  - Reads `/content/voices/*.md` at startup, parses frontmatter (voice_id, gender, age, active flag, DISC compatibility list)
  - `selectVoiceForSession(scenarioSlug, clientDiscCode): { voiceId, voiceName }` implementing the three-tier priority:
    1. Scenario-pinned override (if scenario file has `## Voice Override` section)
    2. DISC-aligned random — filter pool by `active=true` AND DISC compatibility, pick randomly
    3. Forced random — if admin toggle set on the scenario, ignore DISC filter
- [ ] `server/src/services/elevenlabs-cai.ts`:
  - `getSignedUrlForSession(sessionId, scenarioSlug, clientDiscCode): Promise<{ signedUrl: string, agentId: string, voiceId: string, voiceName: string }>` — calls `selectVoiceForSession()`, then ElevenLabs API to mint a per-session signed URL. The signed URL embeds a `conversation_initiation_data` object with persona prompt override AND voice override (Path A) — or selects the agent mapped to that voice (Path B fallback).
  - `verifyWebhookSignature(body, signature): boolean` — HMAC-SHA256 verification against `ELEVENLABS_WEBHOOK_SECRET`

### 5.6 — Build the Session API

- [ ] `server/src/routes/sessions.ts`:
  - `POST /api/sessions` — accepts `{ scenarioSlug, clientDiscCode }`, creates a `sessions` row (storing chosen `voice_id` + `voice_name`), calls `getSignedUrlForSession()`, returns `{ sessionId, signedUrl, agentId, voiceName }`
  - `POST /api/sessions/:id/end` — marks ended, fetches turns + events, calls `generateCoaching()`, saves to `coaching` table, returns the debrief
  - `GET /api/sessions/:id` — full session with turns + events + coaching
  - `GET /api/sessions` — admin: all; pm: own only
- [ ] `server/src/routes/elevenlabs-webhook.ts`:
  - `POST /api/elevenlabs/webhook` — verifies signature, parses event, persists:
    - `turn` events → upserts a row in `turns` table (matched by ElevenLabs turn ID)
    - `interruption` events → inserts row in `events` table with `type=user_interrupted_agent` or `type=agent_interrupted_user`
    - `conversation_started` → updates `sessions.elevenlabs_conversation_id`
    - `conversation_ended` → no-op (the PM clicking End in the UI is the source of truth)

### 5.7 — Test It (Without a Frontend Yet)

For local testing, install [ngrok](https://ngrok.com/) and tunnel your local backend so ElevenLabs can reach the webhook:

```bash
ngrok http 3001
# Copy the https://....ngrok.app URL → set as webhook URL in ElevenLabs agent config
```

Then in the ElevenLabs dashboard:

1. Open the agent → click **Test Agent**
2. Provide a test conversation override matching what our backend would send
3. Speak into the mic — verify Claude responds in character
4. Try interrupting — verify the agent stops mid-sentence
5. Check your backend logs — verify webhooks arrived and rows were inserted into `turns` and `events`

In Postman, hit `POST /api/sessions/:id/end` and verify coaching JSON returned with `activeListening` score reflecting the interruption count.

**✅ Phases 2-3 done when:**
- A live conversation works through the ElevenLabs dashboard test interface
- Webhooks are received and persisted (turns + events visible in SQLite)
- Interruptions are tagged with the correct `type` based on who interrupted whom
- Coaching JSON references both DISC profiles AND interruption count by name

Commit:

```bash
git add server
git commit -m "Phases 2-3: Claude coaching + ElevenLabs CAI integration with interruption tracking"
git push
```

---

## Part 6 — Build the PM Frontend (Phase 4)

### 6.1 — Initialize the Frontend Project

```bash
cd ../client
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom axios @11labs/react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure Tailwind: edit `tailwind.config.js`:

```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

Replace `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 6.2 — Build the API Client

- [ ] `client/src/api/client.ts` — axios instance with auth interceptor (reads JWT from localStorage)
- [ ] `client/src/api/auth.ts` — `login()`, `getMe()`
- [ ] `client/src/api/scenarios.ts` — `listScenarios()`, `getScenario()`
- [ ] `client/src/api/disc.ts` — `listDiscProfiles()`
- [ ] `client/src/api/sessions.ts` — `createSession()`, `sendTurn()`, `sendAudioTurn()`, `endSession()`, `listMySessions()`

### 6.3 — Build the Hooks

- [ ] `client/src/hooks/useAuth.ts` — auth state + login/logout
- [ ] `client/src/hooks/useElevenLabsConversation.ts` — wraps `@11labs/react`'s `useConversation()`, exposes:
  - `start(signedUrl)` / `end()`
  - `status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'interrupted' | 'ended'`
  - `transcript` (live, populated from SDK callbacks)
  - `interruptionCount` (incremented when SDK fires interruption event for the user direction)
- [ ] `client/src/hooks/useSessionLifecycle.ts` — orchestrates: call `/api/sessions` → start CAI conversation → on end, navigate to debrief

### 6.4 — Build the Pages

- [ ] `client/src/pages/LoginPage.tsx` — email/password form
- [ ] `client/src/pages/ScenarioSelectPage.tsx` — card grid of scenarios
- [ ] `client/src/pages/DiscSelectPage.tsx` — card grid of DISC profiles for the client
- [ ] `client/src/pages/SimulationPage.tsx`:
  - Scenario header + client DISC badge
  - "Start Session" button (large, primary) — mints session, opens CAI conversation
  - Live transcript view populated from SDK callbacks (no audio file management)
  - Status indicator: "Listening…" / "Sarah is speaking…" / "Sarah was interrupted"
  - Subtle interruption counter visible during the call (informational, not shaming)
  - Microphone permission prompt handled gracefully
  - "End Session" button with confirm dialog → ends CAI conversation → triggers debrief
- [ ] `client/src/pages/DebriefPage.tsx` — score, strengths, misses, alternative phrasings, DISC adaptation, interruption summary
- [ ] `client/src/pages/SessionHistoryPage.tsx` — list of own past sessions

### 6.5 — Build Shared Components

- [ ] `client/src/components/StartSessionButton.tsx` — handles mic permission + session creation + CAI launch
- [ ] `client/src/components/CallStatusIndicator.tsx` — shows current phase of the call (idle/listening/speaking/interrupted)
- [ ] `client/src/components/ConversationLog.tsx` — live speaker bubbles populated from SDK transcript callbacks
- [ ] `client/src/components/InterruptionBadge.tsx` — small counter displayed during call
- [ ] `client/src/components/ScoreCard.tsx` — score with band color
- [ ] `client/src/components/DiscBadge.tsx` — DISC code in a colored pill

### 6.6 — Wire Up Routing

In `App.tsx`, set up React Router with:

- `/login` → public
- `/` → ScenarioSelect (auth required)
- `/scenarios/:slug/disc` → DiscSelect (auth required)
- `/sessions/:id/simulate` → Simulation (auth required)
- `/sessions/:id/debrief` → Debrief (auth required)
- `/history` → SessionHistory (auth required)
- `/admin/*` → Admin routes (admin required) — placeholder for Phase 5

### 6.7 — Test It

```bash
cd client
npm run dev
```

Open `http://localhost:5173`. Log in as a seeded PM. Walk through: select scenario → select DISC → record voice → hear AI client → end session → see coaching.

**Test on mobile too:**

```bash
# Find your computer's local IP
ifconfig | grep "inet "  # macOS
# Look for something like 192.168.1.X
```

On your phone, go to `http://192.168.1.X:5173` (must be on same WiFi). Make sure `client/.env` has `VITE_API_BASE_URL=http://192.168.1.X:3001` for mobile testing — and start the server with that host binding.

**✅ Phase 4 done when:** A PM can complete a full session on iPhone Safari and desktop Chrome without dev tools.

Commit:

```bash
git add client
git commit -m "Phase 4: PM frontend simulation experience"
git push
```

---

## Part 7 — Build the Admin Dashboard (Phase 5)

### 7.1 — Add the Excel + Charts Libraries

```bash
cd server && npm install exceljs
cd ../client && npm install recharts
```

### 7.2 — Build the Excel Export Service

- [ ] `server/src/services/excel.ts` — `regenerateExcel()` writes `/data/sessions.xlsx` with sheets:
  - **All Sessions** — one row per session (PM, DISC, scenario, score, date)
  - **Per-PM** — one sheet per PM with their full history
  - **Score Trends** — date + score columns suitable for charting
- [ ] Hook `regenerateExcel()` into the `POST /api/sessions/:id/end` route after coaching is saved
- [ ] `GET /api/admin/export` — streams the file for download

### 7.3 — Build the Admin Routes

- [ ] `server/src/routes/admin.ts`:
  - `GET /api/admin/summary` — total sessions, avg score, active PMs
  - `GET /api/admin/users/:id/sessions` — sessions for one PM
  - All routes guarded by `requireAdmin()`

### 7.4 — Build the Admin Pages

- [ ] `client/src/pages/AdminDashboardPage.tsx` — summary cards, table of all PMs with scores
- [ ] `client/src/pages/AdminUserDetailPage.tsx` — one PM's full history with score-over-time line chart
- [ ] `client/src/pages/AdminSessionDetailPage.tsx` — full transcript + coaching for any session
- [ ] `client/src/pages/AdminScenariosPage.tsx` — edit scenario titles/descriptions/body; pin a voice or enable "forced random"
- [ ] `client/src/pages/AdminUsersPage.tsx` — add/edit users, set DISC, reset password
- [ ] `client/src/pages/AdminRubricPage.tsx` — edit rubric items and weights (must total 100%)
- [ ] `client/src/pages/AdminVoicesPage.tsx` — list voice pool, play preview audio, toggle active/inactive, show usage stats per voice
- [ ] `client/src/pages/AdminExportPage.tsx` — download Excel button

### 7.5 — Test It

Log in as admin in your local browser. Walk through:

- Dashboard shows all PMs and their scores
- Click into a PM → see their session history with chart
- Click into a session → see full transcript + coaching
- Edit a scenario → start a new session as a PM → confirm the edited scenario shows up
- Add a new PM → log out → log in as them
- Click "Download Excel" → open the file → confirm sheets are populated

**✅ Phase 5 done when:** All of the above work, AND `data/sessions.xlsx` updates automatically every time a session ends.

Commit:

```bash
git add .
git commit -m "Phase 5: admin dashboard, Excel export, content config"
git push
```

---

## Part 8 — Local End-to-End Testing

Before deploying, run a full smoke test in your local environment.

### 8.1 — Smoke Test Checklist

Run through this entire list. Every box must be checked.

**As PM:**
- [ ] Login works on desktop browser
- [ ] Login works on iPhone Safari
- [ ] Scenarios load and display readable descriptions
- [ ] DISC profiles load and display readable descriptions
- [ ] Microphone permission prompt appears at session start (mobile + desktop)
- [ ] Conversation starts within ~2 seconds of clicking Start
- [ ] Speaking naturally without pressing buttons works
- [ ] AI client begins responding within ~1 second of you finishing
- [ ] AI voice sounds like the chosen ElevenLabs voice
- [ ] You can interrupt the AI by speaking — it stops mid-sentence
- [ ] An interruption is visibly counted in the UI when you cut the AI off
- [ ] AI stays in character (does not break to give advice mid-session)
- [ ] AI client behavior matches the selected DISC profile (S sounds calm, D sounds clipped)
- [ ] A high-D AI client occasionally interrupts the PM in profile-appropriate ways
- [ ] On iPhone Safari: the entire call works without browser quirks blocking it
- [ ] "End Session" requires confirmation
- [ ] Coaching debrief loads and is readable
- [ ] Coaching mentions PM's DISC and client's DISC by name
- [ ] Coaching includes Active Listening score and references interruption count when applicable
- [ ] Total score is between 0-100
- [ ] Session history shows the just-completed session

**As Admin:**
- [ ] Login works
- [ ] Dashboard shows correct PM count and session count
- [ ] Score chart renders for a PM with multiple sessions
- [ ] Editing a scenario persists immediately (refresh confirms)
- [ ] Adding a new PM enables them to log in immediately
- [ ] Resetting a PM's password works
- [ ] Excel export downloads a valid file with multiple tabs

**Edge cases:**
- [ ] PM stays silent for 30+ seconds → AI prompts them gently or holds the silence (verify configured behavior)
- [ ] Network interruption mid-call → SDK reports disconnect, UI shows reconnect option
- [ ] Closing the browser mid-session → ElevenLabs `conversation_ended` webhook fires; session marked ended automatically
- [ ] PM tries to access admin URL → blocked
- [ ] Invalid JWT → redirected to login
- [ ] Webhook signature invalid → backend rejects with 401, logs warning

### 8.2 — If Something Fails

Stop. Fix it locally before deploying. Production debugging is 10x harder.

---

## Part 9 — Deploy to Production

### 9.1 — Prepare the Code for Production

In `server/src/index.ts`, verify CORS allows the production frontend URL via env variable:

```typescript
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
```

Build artifacts are produced by `npm run build` in each project. Make sure both build cleanly:

```bash
cd server && npm run build  # produces server/dist/
cd ../client && npm run build  # produces client/dist/
```

Fix any build errors before continuing.

### 9.2 — Deploy the Backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `communication-training-simulator` → choose the **server** subdirectory as the root
3. Railway auto-detects Node.js
4. Under **Settings**:
   - Set **Root Directory** to `server`
   - Set **Build Command** to `npm install && npm run build`
   - Set **Start Command** to `npm run start`
5. Under **Variables**, add ALL the variables from `server/.env.example` with **production** values:
   - `JWT_SECRET` — generate a NEW random string for production (don't reuse dev)
   - All API keys (same dev keys are OK to start, or create new production keys)
   - `ELEVENLABS_AGENT_ID` and `ELEVENLABS_WEBHOOK_SECRET` (from Part 2.4)
   - `NODE_ENV=production`
   - `CLIENT_ORIGIN=https://training.your-company.com` (set after Vercel deploy in 9.3)
   - `DATABASE_PATH=/data/simulator.db`
   - `EXCEL_PATH=/data/sessions.xlsx`
6. Add a **Volume**:
   - Volumes panel → New Volume → mount path `/data`
   - This ensures the SQLite file and audio files survive deploys
7. Deploy → Railway runs the build and starts the server
8. Get your Railway URL: it will look like `https://your-app-production.up.railway.app`. Copy it.
9. **Run migrations and seed** by opening the Railway shell:
   - In Railway dashboard → your service → **Settings → Deploy Logs** to confirm running
   - Open the **shell** (or run a one-off command): `npm run db:migrate && npm run db:seed`
10. Test: `curl https://your-app-production.up.railway.app/health` should return OK

### 9.3 — Deploy the Frontend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → import the GitHub repo
2. Set **Root Directory** to `client`
3. Vercel auto-detects Vite. Confirm:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL=https://your-app-production.up.railway.app`
5. Deploy
6. Vercel gives you a URL like `https://communication-training-simulator-xyz.vercel.app`. Test it — log in and click around.

### 9.3a — Update ElevenLabs Webhook URL to Production

In the ElevenLabs dashboard:

1. Go to **Conversational AI → Agents → your agent → Webhooks**
2. Update the webhook URL to your Railway backend URL: `https://your-app-production.up.railway.app/api/elevenlabs/webhook`
3. Save
4. Test: start a conversation in the dashboard's Test interface and verify webhooks arrive in Railway logs

### 9.4 — Connect the Custom Domain

In Vercel:

1. Go to your project → **Settings → Domains**
2. Add `training.your-company.com`
3. Vercel shows you DNS records to add (typically a CNAME pointing to `cname.vercel-dns.com`)

In your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.):

1. Log in to DNS dashboard
2. Add a CNAME: `training` → `cname.vercel-dns.com`
3. Save and wait 5-30 minutes for DNS propagation
4. Vercel will auto-issue an SSL certificate

Once `training.your-company.com` resolves, update the Railway env variable:

- `CLIENT_ORIGIN=https://training.your-company.com`
- Redeploy the Railway service

### 9.5 — Final Smoke Test on Production

Repeat the full Part 8 smoke test — but on the production URLs, on real phones, on real WiFi and cellular.

If anything breaks:

- Check Railway logs (dashboard → service → Logs)
- Check Vercel logs (dashboard → project → Logs)
- Check browser DevTools console for frontend errors

### 9.6 — Set Up Cost Alerts

This is a one-time setup that prevents nightmare API bills:

- **Anthropic console** → Plans & Billing → set monthly spend limit to $100 (covers post-call coaching)
- **ElevenLabs** → Subscription → confirm plan tier; review Conversational AI minute usage on the dashboard weekly
- **Railway** → Account → Usage → consider setting a usage alert
- **Vercel** → Settings → Billing → enable spend alerts

> **Note:** ElevenLabs Conversational AI bills two ways: a flat plan fee (Pro: $99/mo) plus per-minute conversation usage. The per-minute charge includes the LLM cost (Claude) when Claude is configured as the agent's LLM. Watch the conversation minutes dashboard in their console.

### 9.7 — Commit Production Configuration Notes

Create `docs/production.md` documenting:

- Railway service URL
- Vercel project URL
- Custom domain
- Where each env variable was set
- Volume mount path
- DNS record details
- Date of first production deploy

This is the doc your future self will thank you for.

---

## Part 10 — Go Live

### 10.1 — Pre-Launch Checklist

Run through this **with the business owner** before announcing the tool:

- [ ] All 5 PMs have user accounts with their real DISC profiles
- [ ] Owner has admin login and has logged in successfully
- [ ] Owner has run a full simulation as a PM and reviewed coaching
- [ ] Excel export downloads correctly
- [ ] Real (not placeholder) scenarios are loaded — or owner has signed off on placeholders for Phase 1
- [ ] DISC profile descriptions match company language — or owner has signed off on placeholders
- [ ] Rubric weights and scoring criteria are owner-approved
- [ ] Branding (logo, colors) is applied
- [ ] Spend limits are set on all three API services
- [ ] First month's expected costs are budgeted and approved
- [ ] Privacy: PMs are informed that voice/transcripts are recorded and visible to admin
- [ ] Backup plan: someone has tested downloading the Excel and the SQLite file

### 10.2 — Soft Launch (1 Week)

1. Pick 1-2 PMs as beta users
2. Have them run 5-10 sessions over the week
3. Daily check-in: any bugs? any AI weirdness? any cost spikes?
4. Owner reviews each session — does coaching feel useful and accurate?
5. Adjust prompts in `/content/` if AI behavior is off

### 10.3 — Full Launch

1. 30-minute kickoff meeting with all 5 PMs:
   - What it's for (practice, growth, not punishment)
   - How to use it (live demo)
   - When to use it (e.g., "before any difficult call you have coming up")
   - What the owner sees (full transparency about admin visibility)
   - Privacy expectations
2. Suggest a **cadence**: 2-3 sessions per PM per week to start
3. Owner reviews dashboard weekly to spot trends and trigger 1:1s

### 10.4 — Adoption Support

The tool only works if PMs actually use it. Set up:

- A weekly check-in for the first month: who used it, what did they learn
- A monthly debrief with the owner: trends across the team, common gaps
- A way to add new scenarios as new client situations come up (admin → Scenarios → Add)

---

## Part 11 — Operate the System

### 11.1 — Common Tasks for the Admin

**Add a new PM:**
1. Log in as admin → **Users**
2. Click **Add User** → enter name, email, set DISC profile, set role to `pm`
3. System sends them a setup email (if Resend is configured) OR show admin a temporary password to share

**Update a scenario:**
1. Log in as admin → **Scenarios**
2. Click the scenario → edit title, description, or body
3. Save → next session uses the new content

**Update DISC language:**
1. DISC profile language is in `/content/disc-profiles/*.md` files in the source repo
2. Edit on GitHub (or in VS Code locally → push)
3. Railway auto-redeploys when GitHub updates → next session reads the new content

**Re-weight the rubric:**
1. Log in as admin → **Rubric**
2. Adjust weights → must total 100%
3. Save → applies to all future coaching

**Reset a PM's password:**
1. Admin → Users → click the PM → **Reset Password**
2. Generate a temp password → share with PM via secure channel

**Download Excel:**
1. Admin → Export → click **Download**
2. Open in Excel → review tabs

### 11.2 — Monitoring (Weekly Habit)

Every Monday, the owner should:

- [ ] Check the admin dashboard — who's using it? who isn't?
- [ ] Spot-check 1-2 sessions — does the coaching make sense?
- [ ] Glance at API spend on each console (Anthropic, OpenAI, ElevenLabs) — any anomalies?
- [ ] Note any feature requests from PMs

### 11.3 — Backups

The SQLite database is the operational source of truth. Back it up.

**Monthly backup procedure:**

1. In Railway → service → **Volumes** → download a snapshot of `/data/simulator.db`
2. Also download `/data/sessions.xlsx`
3. Store both in a company-controlled cloud folder (Google Drive, Dropbox, OneDrive)
4. Tag the backup with the date

Optional: set up a weekly automated backup using a Railway cron job that uploads to S3 or Backblaze B2 — ask the dev firm to add this in a maintenance pass.

### 11.4 — Troubleshooting Cheat Sheet

| Symptom | Likely Cause | Fix |
|---|---|---|
| PM can't log in | Wrong password, or JWT_SECRET changed | Admin resets password |
| Voice recording fails on iPhone | Browser permission denied | PM goes to Settings → Safari → Microphone, grants permission, reloads |
| AI client takes forever to respond | API rate limit, Anthropic outage, or large session | Check status pages; if persistent, lower model or add retry logic |
| Coaching produces gibberish | Prompt issue, content file malformed | Check the scenario/DISC files in `/content/` for syntax errors |
| Excel file won't open | Concurrent write during download | Wait 30 seconds, try again |
| Costs spiking unexpectedly | Someone running many sessions, or runaway loop | Check session count in admin dashboard; check API console usage |
| Site is down | Railway or Vercel outage | Check status.railway.app and vercel-status.com |

### 11.5 — When to Call the Dev Firm

Set expectations with your contract:

- **Critical bug** (no one can use the system): same-day
- **Important bug** (one feature broken): within 1 business day
- **Feature request** (new scenario type, new admin view): scheduled in next maintenance window
- **Question / training**: email response within 2 business days

Most issues fall into "small change to content" which the admin can do via the UI without involving the dev firm at all.

---

## Appendix A — Environment Variables Reference

### Backend (`server/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_PATH` | Yes | Path to SQLite file | `/data/simulator.db` (prod) or `../data/simulator.db` (dev) |
| `EXCEL_PATH` | Yes | Path to Excel export | `/data/sessions.xlsx` |
| `JWT_SECRET` | Yes | Random string for signing tokens | 96-char hex |
| `JWT_EXPIRES_IN` | No | Token expiry | `7d` |
| `ANTHROPIC_API_KEY` | Yes | Claude API key (used for post-call coaching AND inside ElevenLabs CAI as the agent LLM) | `sk-ant-...` |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs key (account-level) | `...` |
| `ELEVENLABS_VOICE_ID` | Yes | Selected voice ID | `21m00Tcm4TlvDq8ikWAM` |
| `ELEVENLABS_AGENT_ID` | Yes | Configured Conversational AI agent | `agent_abc123` |
| `ELEVENLABS_WEBHOOK_SECRET` | Yes | HMAC secret for verifying incoming webhooks | `whsec_...` |
| `RESEND_API_KEY` | No | Email sending (password resets) | `re_...` |
| `RESEND_FROM_EMAIL` | No | Email sender address | `noreply@your-company.com` |
| `PORT` | No | Backend port | `3001` |
| `CLIENT_ORIGIN` | Yes | Frontend URL for CORS | `https://training.your-company.com` |
| `NODE_ENV` | Yes | `development` or `production` | `production` |

### Frontend (`client/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | Backend URL | `https://your-app.up.railway.app` |

---

## Appendix B — Cost Monitoring

### Per-Session Cost Estimate

Assuming a 12-minute session:

| Service | Usage | Cost |
|---|---|---|
| ElevenLabs CAI (per-minute conversation) | 12 minutes | ~$0.84-1.20 |
| ElevenLabs CAI (LLM passthrough — Claude) | included in per-min OR billed via Anthropic depending on config | varies |
| Anthropic Claude (post-call coaching) | ~10K input + 2K output tokens | $0.06 |
| **Total** | | **~$1.00-1.30 per session** |

### Monthly Estimates

| Usage Level | Sessions/Month | Anthropic (coaching) | ElevenLabs CAI plan + minutes | Hosting | **Total** |
|---|---|---|---|---|---|
| Light (5 PMs × 2/wk) | 40 × 12 min = 480 min | ~$3 | $99 plan + ~$30 minutes | $5 | **~$140** |
| Normal (5 PMs × 4/wk) | 80 × 12 min = 960 min | ~$6 | $99 + ~$60 minutes | $5 | **~$170** |
| Heavy (15 PMs × 4/wk) | 240 × 12 min = 2880 min | ~$20 | $99 + ~$200 minutes | $20 | **~$340** |

> Note: ElevenLabs CAI per-minute pricing depends on plan tier and current published rates — verify in their dashboard before committing. Coaching API costs are minor compared to conversation costs.

### Setting Spend Caps

Configure in each console:

- **Anthropic:** console.anthropic.com → Plans & Billing → Spending Limit → set hard cap
- **ElevenLabs:** Subscription page; check the conversation minutes dashboard weekly
- **Railway:** Account → Usage → set notification thresholds
- **Vercel:** Settings → Billing → set spend alerts

---

## Appendix C — Glossary

| Term | Definition |
|---|---|
| **API key** | Secret string that authenticates your code to a third-party service |
| **CORS** | Browser security rule controlling which origins can call your API |
| **DISC** | Personality profiling framework: Dominance, Influence, Steadiness, Conscientiousness |
| **JWT** | JSON Web Token — used for authentication; client stores it after login |
| **Migration** | Script that updates the database schema when it changes |
| **Multipart upload** | HTTP request format for sending file data (like an audio recording) |
| **PM** | Project Manager — the user role for the people being trained |
| **Prompt** | The instructions sent to Claude that tell it how to behave |
| **Roleplay** | The AI staying in character as a client through the conversation |
| **Seed** | Loading initial data into the database (admin user, scenarios, DISC profiles) |
| **SQLite** | A file-based database — no separate server needed |
| **CAI** | ElevenLabs Conversational AI — the real-time voice product (continuous mic, VAD, streaming STT/TTS, interruption handling) |
| **STT** | Speech-to-Text — done by ElevenLabs CAI |
| **TTS** | Text-to-Speech — done by ElevenLabs CAI |
| **Webhook** | A URL on our backend that ElevenLabs calls with events (turn ended, user interrupted agent, etc.) |
| **Signed URL** | A short-lived URL we mint per session that authorizes the browser to start a CAI conversation with our system prompt override |
| **Interruption** | Speaker overlap event — the rubric's Active Listening category specifically scores PM→client interruptions |
| **Vite** | Build tool for the frontend |
| **Volume** | A persistent disk on Railway that survives deploys |

---

## Done

If you've made it this far, you have a working internal training platform. Save this guide. Update it whenever architecture changes. Re-read Part 11 every quarter to make sure you're operating the system well.

For questions during implementation, refer to:

- [CLAUDE.md](CLAUDE.md) — architecture and design decisions
- [docs/superpowers/plans/2026-05-05-master-plan.md](docs/superpowers/plans/2026-05-05-master-plan.md) — phase-by-phase implementation plan
- [content/](content/) — training content (scenarios, DISC, rubric)
