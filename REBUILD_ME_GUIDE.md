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
- [Part 12 — Billing & Payment Transfer](#part-12--billing--payment-transfer)
- [Part 13 — Post-Deploy UX & Coaching Polish](#part-13--post-deploy-ux--coaching-polish)
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
| **VS Code** | Code editor + Claude Code host | Download from [code.visualstudio.com](https://code.visualstudio.com) |
| **GitHub Desktop** *(optional)* | Friendly git UI for non-CLI users | [desktop.github.com](https://desktop.github.com) |

> **API testing tools (Postman, Insomnia, etc.) are not needed.** Claude Code handles API verification directly via curl during the build. If you ever bring on a separate human developer who wants their own API client, they can install [Postman](https://www.postman.com) or [Insomnia](https://insomnia.rest) themselves — the project doesn't depend on either being installed.

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

#### 2.4a — Confirm the 20 voice IDs are in your VoiceLab

The voice pool is defined in `/content/voices/` with 20 voices, all verified to exist in the company's ElevenLabs library as of 2026-05-05.

**Original 10 (premade ElevenLabs voices):**

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

**Added 10 (custom voices added by owner):**

```
inGcvmoPgbvKUk9uCvHu   Adam M     (M)  subdued / sad
cNYrMw9glwJZXR8RwbuR   Belle      (F)  Empathetic Customer Service
kdnRe2koJdOK4Ovxn2DI   Eryn       (F)  Genuine, Friendly and Natural
h2I5OFX58E5TL5AitYwR   Joey Patel (M)  Friendly Customer Support
hGQkZQUA5RiOXIw7P9iO   Kiora      (F)  Authentic, Natural Conversation
1SM7GgM6IMuvQlz2BwM3   Mark       (M)  Casual, Relaxed and Light
ljX1ZrXuDIIRVcmiVSyR   Michael    (M)  Genuine and Approachable
ZauUyVXAz5znrgRuElJ5   Russell    (M)  Young, Outgoing and Excited
lAxf5ma5HGtzxC434SWT   Tori       (F)  casual, young
uwJhTSUhU9LVyeRjWtiC   Vexa       (F)  Expressive Outbound Sales
```

The premade voices come with the default library. The custom 10 were added on 2026-05-05. Verify all 20 are present in **Voice Library** in the ElevenLabs dashboard.

For each voice, listen to the preview URL in its profile file (e.g., the URL in `content/voices/01-adam-dominant-male.md`) and confirm the voice's character matches the DISC alignment in the metadata. Adjust if needed before going live.

#### 2.4b — Create the Conversational AI agent

Go to **Conversational AI → Agents → Create Agent**:
   - **Name:** `Training Simulator — Client Persona`
   - **Voice:** Pick any voice from the pool as the default. The backend will override per session.
   - **LLM:** **Claude** (native integration; supply your `ANTHROPIC_API_KEY` when prompted)
   - **System prompt:** placeholder text (we override per-session via the SDK)
   - **Enable interruption detection**
   - Save and copy the **Agent ID**

> **Note on voice override:** Voice and persona overrides are sent by the browser SDK in the WebSocket `conversation_initiation_client_data` message — not in the signed URL request. The backend provides `signedUrl`, `personaPrompt`, and `voiceId` to the frontend; the frontend SDK sends them when opening the connection.

#### 2.4c — Get your account API key

Go to **My Account → API Keys** → copy your API key.

**You'll get:**
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
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
- [ ] `ELEVENLABS_AGENT_ID`
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

Test the login via curl (Claude Code can run this for you):

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@your-company.com","password":"<seed password>"}'
```

You should get back a JWT.

**✅ Phase 1 done when:** all routes work via curl with both `pm` and `admin` JWTs, and `npm test` passes.

Commit:

```bash
git add server
git commit -m "Phase 1: backend foundation with auth and CRUD"
git push
```

---

## Part 5 — Build AI and Voice Services (Phases 2 + 3)

The voice pipeline uses **ElevenLabs Conversational AI** as the real-time engine, with **Claude as the configured LLM**. ElevenLabs handles continuous mic, voice activity detection, streaming STT/TTS, echo cancellation, and interruption events. Claude (separately, via direct API) generates the post-session coaching.

> **Architecture note:** Turns and interruptions are captured **client-side** by the `@11labs/react` SDK. When the PM clicks End Session, the browser sends the full transcript + events to `POST /api/sessions/:id/end`. No server-side webhooks or ngrok are needed.

### 5.1 — Add the AI SDKs

```bash
cd server
npm install @anthropic-ai/sdk
```

### 5.2 — Build the Prompt Layer

- [ ] `server/src/prompts/loader.ts` — reads markdown files from `/content/` and caches them; exposes `getScenario(slug)`, `getDiscProfile(code)`, `getRubric()`
- [ ] `server/src/prompts/persona-prompt.ts` — `buildPersonaPrompt(scenario, clientDisc)` returns the system prompt the frontend sends in the WebSocket initiation message
- [ ] `server/src/prompts/coaching-prompt.ts` — `buildCoachingPrompt(turns, events, pmDisc, clientDisc, rubric)` returns the coaching prompt (includes interruption events for Active Listening scoring)

### 5.3 — Build the Coaching Service

- [ ] `server/src/services/claude.ts` — `generateCoaching(turns, events, pmDisc, clientDisc, rubric): Promise<CoachingResult>`

### 5.4 — Configure the ElevenLabs CAI Agent

Verify before continuing:

- [ ] `ELEVENLABS_AGENT_ID` is set in `server/.env`
- [ ] Agent LLM is set to Claude (or Haiku for testing)
- [ ] No webhook URL needed — transcript is captured by the frontend SDK

### 5.5 — Build the ElevenLabs Service Layer

- [ ] `server/src/services/voice-selector.ts` — reads `/content/voices/*.md`, implements 3-tier DISC-aligned random selection
- [ ] `server/src/services/elevenlabs-cai.ts`:
  - `getSignedUrlForSession(sessionId, scenarioSlug, clientDiscCode)` — mints signed WebSocket URL; also returns `personaPrompt` and `voiceId` so frontend can send them in the WebSocket initiation message
  - `verifyWebhookSignature(rawBody, signature, secret)` — kept for potential future post-call webhook use

### 5.6 — Build the Session API

- [ ] `POST /api/sessions` — creates session, calls `getSignedUrlForSession()`, returns `{ sessionId, signedUrl, agentId, voiceId, voiceName, personaPrompt }`
- [ ] `POST /api/sessions/:id/end` — accepts `{ turns, events }` from the browser, saves to DB, runs coaching, returns debrief
- [ ] `GET /api/sessions/:id` — full session with turns + events + coaching
- [ ] `GET /api/sessions` — admin: all; pm: own only

### 5.7 — Verify (via curl)

Start the server and verify the full lifecycle:

```bash
# Start server
npm run dev &

# Login and create session
TOKEN=$(curl -s -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@planforward.net","password":"admin123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

SESSION=$(curl -s -X POST http://localhost:3002/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scenarioSlug":"01-schedule-delay","clientDiscCode":"S"}')

SESSION_ID=$(echo $SESSION | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])")
echo "signedUrl present:" $(echo $SESSION | python3 -c "import sys,json; print(bool(json.load(sys.stdin).get('signedUrl')))")

# End session with client-captured transcript
curl -X POST http://localhost:3002/api/sessions/$SESSION_ID/end \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"turns":[{"speaker":"pm","content":"Hi, I have difficult news about the project schedule."},{"speaker":"client","content":"Oh no, what happened?"}],"events":[]}'
```

**✅ Phases 2-3 done when:**
- `POST /api/sessions` returns a `signedUrl` and `personaPrompt`
- `POST /api/sessions/:id/end` with turns in body returns coaching JSON with `totalScore`
- 31/31 tests passing

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

> **⚠ Lessons learned the hard way during the original deploy** — read these BEFORE clicking through Railway's UI:
>
> 1. **DO NOT use Railway's "Root Directory" setting.** It restricts the build context to that subfolder, which means our build script can't `cp -r ../content` (the content folder is outside `server/`). Instead, use the `railway.toml` at the repo root that says `cd server && ...`.
> 2. **Pin Node version in `package.json` engines** — Nixpacks defaults to Node 18 which doesn't support `better-sqlite3@12+`. Both root and `server/package.json` should have `"engines": { "node": ">=20.0.0" }`.
> 3. **Use `--include=dev` in the build command** — `NODE_ENV=production` makes `npm install` skip devDependencies, but `tsc` is a devDependency. Build will fail with `tsc: not found` without this flag.
> 4. **Bundle `/content/` into `dist/content/` during build** — the deployed server is self-contained; `/content/` from the repo root is no longer reachable at runtime in some configurations.
> 5. **You MUST attach a Volume at `/data`** — without it, the database resets on every redeploy. Right-click the service → **Attach volume** → mount path `/data`.
> 6. **Generate a public domain explicitly** — Settings → Networking → Generate Domain. Pick port `3001` (or whatever PORT env var you set).

1. Go to [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**
2. Select the repo (e.g. `Communication-Training-Simulator-Project-Manager`)
3. Upgrade to **Hobby plan** ($5/mo) when prompted — required for persistent volumes
4. **Service Settings → Source: leave "Root Directory" EMPTY** — Railway will use the `railway.toml` at the repo root
5. **Variables** → add all of these (use Raw Editor for paste):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ELEVENLABS_API_KEY=sk_...
   ELEVENLABS_AGENT_ID=agent_...
   JWT_SECRET=<generate a fresh 96-char hex>
   JWT_EXPIRES_IN=7d
   ADMIN_PASSWORD=<a real password you'll use to log in>
   DATABASE_PATH=/data/simulator.db
   EXCEL_PATH=/data/sessions.xlsx
   PORT=3001
   NODE_ENV=production
   CLIENT_ORIGIN=*
   ```
   (You'll lock `CLIENT_ORIGIN` to your Vercel URL after step 9.3.)
6. **Right-click the service tile → Attach volume** → mount path `/data`
7. **Settings → Networking → Generate Domain** → enter port `3001`
8. Wait for green "Active" status. Test:
   ```bash
   curl https://<your-railway-url>/health
   ```
   Should return `{"status":"ok",...}`.

The migrations + seed run automatically as part of `npm start` (see `server/package.json`). No manual step needed.

### 9.3 — Deploy the Frontend to Vercel ✅ DONE

**Production URL:** `https://pm-training-simulator.vercel.app`

1. Go to [vercel.com/new](https://vercel.com/new), logged in as the company Gmail account (`planforwardtraining@gmail.com`)
2. Import the repo
3. Set **Root Directory** to `client`
4. Vercel auto-detects Vite. Confirm:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL=https://communication-training-simulator-project-manager-production.up.railway.app`
6. Deploy
7. Vercel gives you a URL like `https://pm-training-simulator.vercel.app` (production alias) and a hash URL for the specific deployment. Use the clean alias.

**Vercel Hobby plan caveat — important.** Hobby refuses deploys when the GitHub commit author is a different account than the Vercel project owner. Two ways through:

- **Make the GitHub repo public** (easiest, current setup) — Hobby allows any author to deploy public repos. Nothing sensitive is in git (secrets are env vars, content is placeholder).
- **OR** author every commit using the Vercel-account email (`git commit --author="Plan Forward Training <planforwardtraining@gmail.com>" ...`).

If you ever flip the repo back to private without upgrading to Pro, you'll need the second option for every push.

### 9.3a — Lock down CORS to your Vercel URL ✅ DONE

Back in Railway (or via the Railway CLI for speed):

```bash
railway login
railway link --project profound-surprise
railway variables --set "CLIENT_ORIGIN=https://pm-training-simulator.vercel.app"
```

Or in the dashboard:

1. Service → **Variables**
2. Edit `CLIENT_ORIGIN` from `*` to your Vercel URL (no trailing slash)
3. Save → Railway redeploys automatically (~1 minute)

Verify with:

```bash
curl -s -I -H "Origin: https://pm-training-simulator.vercel.app" \
  https://communication-training-simulator-project-manager-production.up.railway.app/health \
  | grep -i access-control
```

You should see `access-control-allow-origin: https://pm-training-simulator.vercel.app`.

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

## Part 13 — Post-Deploy UX & Coaching Polish

A round of refinements done immediately after the first production deploy. Every change in this section landed via push to `main` and auto-deployed to Railway + Vercel. This is captured here so a future rebuild lands at the polished state, not the bare-deploy state.

### 13.1 — ElevenLabs Agent Runtime Hardening

The ElevenLabs CAI agent ships with two defaults that quietly break per-session overrides if not addressed:

1. The agent has its own default `first_message` that fires the moment the call connects, **before** any per-session prompt override is processed. If it's set to a scenario-specific line, every session will open the same way regardless of which scenario the PM picked.
2. The agent has override flags that default to `false`. Each flag must be explicitly enabled for the corresponding override to take effect.

Fix once, persists across deploys:

```bash
# Replace AGENT_ID + API_KEY with real values from server/.env
curl -s -X PATCH "https://api.elevenlabs.io/v1/convai/agents/agent_<AGENT_ID>" \
  -H "xi-api-key: <ELEVENLABS_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_settings": {
      "overrides": {
        "conversation_config_override": {
          "agent": {
            "prompt": { "prompt": true },
            "first_message": true,
            "language": false
          },
          "tts": { "voice_id": true }
        }
      }
    },
    "conversation_config": {
      "agent": {
        "first_message": "",
        "prompt": {
          "prompt": "You are roleplaying as a residential design-build client. The system will provide your specific identity, personality, and situation through a per-session override. If for any reason no override is provided, simply say \"Hello?\" and wait for the caller to identify themselves."
        }
      }
    }
  }'
```

Verify both override flags are `true` and the default `first_message` is empty.

### 13.2 — Scenario Brief Endpoint + Marker

PMs need to see the situation context but **must not** see the answer-key sections that the coaching engine scores against.

- New endpoint: `GET /api/scenarios/by-slug/:slug` returns `{ id, slug, title, body_briefing }`.
- The endpoint trims the body at an HTML comment marker `<!-- BRIEF END -->` and strips the `> **Status:**` placeholder blockquote.
- Frontend `scenariosApi.getBriefing(slug)` consumes it.
- Brief is rendered above the DISC grid on `DiscSelectPage`, and again as a side-panel "Notes" reference on `SimulationPage`.

### 13.3 — Scenario Content v2 (Bespoke Per-Scenario Structure)

The first draft of scenarios used a uniform 7-section template. That made every scenario feel templated and leaked the answer key into the brief. Rewrote each one with a structure appropriate to its situation:

- **01 Schedule Delay** — Brief includes "What You Already Have In Hand" (mitigation toolkit) since a real PM walks in with offers ready.
- **02 Budget Overrun** — Brief includes "What You Have Ready For The Call" (signed change orders, contract pages, pre-approved goodwill).
- **03 Angry Client** — Removes "What the PM Must Communicate" entirely; the test is figuring it out live. Adds "What You Don't Know Yet."
- **04 Scope Change** — Engineering options sit in the brief because the PM realistically has the engineer's packet.
- **05 Micromanaging Client** — Adds "What You've Already Tried" so the call reads as next-escalation, not first nudge.

Below the `<!-- BRIEF END -->` marker each scenario has: **Inside the Client's Head**, **How They Will Likely React** (with DISC overlays), **What Success Looks Like**, **Common Pitfalls**, **Coaching Focus**. The AI sees all of it; the PM sees none of it.

### 13.4 — Sandler-First Coaching

The coaching engine uses **Sandler Sales Methodology** as the primary lens, supplemented by Voss labels, calibrated questions, and classic active listening where they fit better.

- Primer at `/content/coaching-rubric/03-sandler-techniques.md` covering: Up-Front Contract, Pain Funnel, Reversing, No Mind Reading, Negative Reverse / Take-Away, Closing the File, Pendulum (bonding ↔ structure), Tonality & Pace, 3rd Person Story / Pattern Interrupt.
- `getSandlerPrimer()` exported from `prompts/loader.ts`; coaching prompt feeds it on every call.
- `buildCoachingPrompt` directs Claude to:
  - Output `strengths` / `misses` / `alternatives` / `discAdaptation` as **3-5 markdown bullets** each (not paragraphs)
  - Cite Sandler techniques by name (`**Up-Front Contract**`, `**Pain Funnel**`, etc.) and italicize quoted phrases (`*"..."*`)
  - Tie technique to DISC fit (Pain Funnel works especially well with C; Reversing must be paced with D; etc.)
  - Send the PM home with **one or two specific Sandler reps to practice** — not a generic "be more empathetic"
- Anthropic `max_tokens` raised 2048 → 3072 to fit the longer bullet output.

### 13.5 — Rubric Weight Fix

`02-scoring-levels.md` had stale per-category percentages from an earlier draft (summed to 115%). Reconciled with `01-categories-and-weights.md`:

| Category | Weight |
|---|---|
| Empathy & Acknowledgment | 13% |
| Clarity & Honesty | 13% |
| DISC Adaptation | 22% |
| Solution Orientation | 12% |
| Ownership & Accountability | 12% |
| Confidence & Composure | 13% |
| Active Listening | 15% |
| **Total** | **100%** |

### 13.6 — Seed Becomes Content Sync

Original `seed.ts` used `INSERT OR IGNORE` everywhere. That meant once a row existed in the production DB, edits to `/content/*.md` were silently ignored on subsequent deploys.

Changed to:

- **Scenarios** — `INSERT INTO scenarios (...) VALUES (...) ON CONFLICT(slug) DO UPDATE SET title=excluded.title, description=excluded.description, body_markdown=excluded.body_markdown, updated_at=CURRENT_TIMESTAMP`
- **DISC profiles** — same pattern keyed on `code`
- **Rubric items** — `DELETE FROM rubric_items` then re-`INSERT` (no UNIQUE constraint to upsert against)
- **Admin user** — still `INSERT OR IGNORE` (don't reset passwords)

Net effect: editing `/content/*.md` and pushing is enough to land content changes — no manual migration step.

### 13.7 — Named Client + Pickup Greeting

Each voice's `display_name` (Adam, Bella, Sarah, etc.) is also the client's first name. The first word of `display_name` is taken so `Adam M` → `Adam` and `Joey Patel` → `Joey`.

- `VoiceSelection` extended with `clientFirstName`.
- Persona prompt now opens with `## Your Identity / Your first name is **<Name>**` and reinforces it in the rules section.
- Per-session `firstMessage` generated as `"Hello, this is <Name>."` — passed to the SDK via `overrides.agent.firstMessage`.
- All 20 voices have name/gender alignment by construction (the name **is** the voice talent's name).

### 13.8 — PM UX Polish

Realistic phone-call posture: the PM walks into a call with a known client, not a stranger.

- `SimulationPage` header shows `Speaking with <Name>` next to the DISC badge.
- Pre-call **case-file card** in the transcript area before the PM clicks Start: large client name, DISC code, scenario title, greeting cue.
- Persistent **left-side notes panel** on lg+ screens with the full brief.
- Mobile **drawer** toggled by a "Notes" button in the header.
- Transcript bubbles label client turns by name (not generic "Client").

### 13.9 — Bullet-Format Coaching Render

To pair with the Sandler-bulleted coaching output:

- New `client/src/utils/MarkdownLite.tsx` — hand-rolled minimal renderer for `## h2`, paragraphs, `- ul`, `1. ol`, `**bold**`, `*italic*`. ~30 lines, no deps.
- `DebriefPage` `FeedbackSection` swapped from `whitespace-pre-line` paragraphs to `<MarkdownLite source={...} />`.
- Italic added so the typical `*"quoted phrase"*` Sandler idiom renders correctly.

### 13.10 — Anthropic Key Fix on Railway

Stale `ANTHROPIC_API_KEY` in Railway returned 401 from the coaching call (failed silently from the PM's perspective — they got a session with no debrief). Replaced with the working local key:

```bash
source server/.env  # exposes ANTHROPIC_API_KEY
railway link --project profound-surprise
railway variables --set "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"
```

Coaching now generates end-to-end on production.

---

## Part 12 — Billing & Payment Transfer

This is the contractor-to-client handoff for billing. Keep accounts the same (preserves data, config, history) — just swap who's paying.

### What's billable

| Service | Tier | Approx. monthly | Why we use it |
|---|---|---|---|
| **Anthropic** (Claude API) | Pay-as-you-go | $5-15 | Coaching debrief generation |
| **ElevenLabs Conversational AI** | Creator $22 / Pro $99 | $22-99 | Real-time voice + LLM during the call |
| **Railway** | Hobby plan | $5 base + ~$0-5 usage | Backend hosting + persistent SQLite/Excel |
| **Vercel** | Hobby (free) → Pro if needed | $0-20 | Frontend hosting |
| **Resend** *(optional)* | Free tier | $0 | Password resets |
| **Domain** | Already client-owned | ~$15/year if renewed | `training.planforward.net` |
| **GitHub** | Free org | $0 | Source code |

**Estimated total at launch:** ~$50-130/month depending on ElevenLabs tier and usage volume.

### How payment transfer works

Each service is owned by an account email (e.g., `TrainingPlanForward@gmail.com`). Within that account, you control which payment method is on file. So the transfer is:

1. **Keep the same account** — no migration of data/config/keys needed
2. **Add the client's payment method** to each account's billing page
3. **Remove the contractor's payment method** so charges only go to client
4. **Verify next invoice** charges the client, not the contractor

### Step-by-step

**Anthropic** (currently personal account)
- Owner: log into [console.anthropic.com](https://console.anthropic.com)
- The cleanest option here is to create a fresh Anthropic account at `TrainingPlanForward@gmail.com` (Anthropic doesn't make org-level payment changes easy)
- Generate a new API key on the new account
- Update `ANTHROPIC_API_KEY` in Railway environment variables (Settings → Variables)
- Set a monthly spending limit on the new account (~$50)
- Trigger a test session, verify Anthropic usage logs show up under the new account
- Rotate / delete the old personal API key

**ElevenLabs** (currently personal account)
- Same situation — easiest to create a fresh account at `TrainingPlanForward@gmail.com`
- Subscribe to Creator or Pro tier
- Recreate the Conversational AI agent (use the same name, voice, LLM, override settings)
- Save the new agent ID and webhook signing secret (when added)
- Confirm all 20 premade voices are present in the new account's voice library
- Update `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in Railway environment variables
- Re-enable per-conversation `voice_id` and `prompt` overrides on the new agent (this guide's Part 5.4 has the details)
- Test a full session end-to-end with new keys

**Railway** (already on `TrainingPlanForward@gmail.com`)
- Account → Billing → Add Plan Forward's credit card / payment method
- Remove the contractor's payment method
- Wait for next invoice to confirm correct billing

**Vercel** (already on `TrainingPlanForward@gmail.com`)
- Settings → Billing → same swap
- Hobby tier is free; only relevant if upgraded to Pro

**Resend** (if added)
- Same process — free tier requires no card; if upgraded, swap payment method

### Source code + access transfer

- Repo is already owned by the `PlanForwardTraining` GitHub org ✅
- Tyler is a collaborator — keep, downgrade to read-only, or remove per contract terms
- Plan Forward has admin access to all of: GitHub org, Anthropic, ElevenLabs, Railway, Vercel, Resend
- All credentials stored in Plan Forward's password manager

### Final verification

After everything is transferred:

- Run a full PM session end-to-end
- Confirm coaching debrief generates correctly
- Verify the next invoice from each service charges Plan Forward, not Tyler
- Get final handoff signed off in writing per the project contract

---

## Done

If you've made it this far, you have a working internal training platform. Save this guide. Update it whenever architecture changes. Re-read Part 11 every quarter to make sure you're operating the system well.

For questions during implementation, refer to:

- [CLAUDE.md](CLAUDE.md) — architecture and design decisions
- [docs/superpowers/plans/2026-05-05-master-plan.md](docs/superpowers/plans/2026-05-05-master-plan.md) — phase-by-phase implementation plan
- [content/](content/) — training content (scenarios, DISC, rubric)
