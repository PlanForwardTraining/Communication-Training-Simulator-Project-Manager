# Coaching Provider Switch + In-App Key Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin choose the post-call coaching provider (OpenAI/Gemini) and model from inside the app, with API keys entered in-app (encrypted, env-fallback), replacing the hardcoded Anthropic call — without breaking the live deployments.

**Architecture:** A provider abstraction (`server/src/services/coaching/`) with one implementation per provider behind a shared `streamCoaching` interface. Active provider/model and encrypted keys live in two new SQLite tables, resolved at coaching time with env-var fallback. An admin settings page drives a curated model picker that greys out providers without a key.

**Tech Stack:** Node + Express + better-sqlite3 (backend), React + Vite + Tailwind (frontend), `openai` + `@google/genai` SDKs, Node `crypto` (AES-256-GCM), Jest + supertest.

**Branch:** All work on `feat/coaching-provider-switch`. Do NOT merge to `main` until Task 12 passes — `main` auto-deploys to live Railway/Vercel.

---

## File Structure

**Create:**
- `server/src/utils/crypto.ts` — AES-256-GCM encrypt/decrypt for secrets at rest.
- `server/src/services/coaching/types.ts` — `CoachingProvider` interface + `ProviderName`.
- `server/src/services/coaching/models.ts` — curated model list + defaults + validation.
- `server/src/services/coaching/settings.ts` — DB-backed active provider/model + key storage + resolution (DB→env→default).
- `server/src/services/coaching/openai.ts` — OpenAI streaming implementation.
- `server/src/services/coaching/gemini.ts` — Gemini streaming implementation.
- `server/src/services/coaching/anthropic.ts` — Anthropic implementation (dev/fallback; not in picker).
- `server/src/services/coaching/service.ts` — `generateCoachingStream` / `generateCoaching` (replaces `claude.ts`).
- `server/tests/crypto.test.ts`, `server/tests/coaching-settings.test.ts`, `server/tests/coaching-providers.test.ts`, `server/tests/coaching-admin.test.ts`.
- `client/src/pages/admin/AdminCoachingSettingsPage.tsx` — settings UI.

**Modify:**
- `server/src/db/schema.sql` — add `app_settings`, `provider_keys` tables.
- `server/src/db/migrate.ts` — (no change needed; schema runs via CREATE TABLE IF NOT EXISTS — verify in Task 1).
- `server/src/routes/sessions.ts:5` — import from `../services/coaching/service` instead of `../services/claude`.
- `server/src/routes/admin.ts` — append coaching-settings routes.
- `server/package.json` — add `openai`, `@google/genai`.
- `client/src/api/admin.ts` — add coaching-settings types + `adminApi` methods.
- `client/src/App.tsx` — add `/admin/coaching` route.
- `client/src/pages/admin/AdminLayout.tsx:103-106` — add "Coaching" nav link + active detection.

**Delete:**
- `server/src/services/claude.ts` — logic moves to `coaching/service.ts`.

---

### Task 0: Create branch + add dependencies

**Files:** `server/package.json`

- [ ] **Step 1: Create the feature branch**

```bash
cd "/Users/Tyler/Documents/GitHub/Communication Training Simulator - Project Manager"
git checkout -b feat/coaching-provider-switch
```

- [ ] **Step 2: Install the two SDKs in the server**

```bash
cd server && npm install openai @google/genai
```

- [ ] **Step 3: Verify they're in package.json dependencies**

Run: `grep -E '"openai"|"@google/genai"' server/package.json`
Expected: both lines present.

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add openai + @google/genai SDKs for coaching providers"
```

---

### Task 1: Database tables for settings + keys

**Files:**
- Modify: `server/src/db/schema.sql`
- Test: `server/tests/coaching-settings.test.ts`

- [ ] **Step 1: Add tables to `schema.sql`** (append at end)

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_keys (
  provider TEXT PRIMARY KEY,
  encrypted_key TEXT NOT NULL,
  last4 TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Write a failing test that the tables exist after migration**

```typescript
// server/tests/coaching-settings.test.ts
import Database from 'better-sqlite3';
import { setupTestDb, runMigrations } from './helpers';

setupTestDb();

describe('coaching settings schema', () => {
  it('creates app_settings and provider_keys tables', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all().map((r: any) => r.name);
    expect(tables).toContain('app_settings');
    expect(tables).toContain('provider_keys');
  });
});
```

- [ ] **Step 3: Run it**

Run: `cd server && npx jest coaching-settings -t "creates app_settings"`
Expected: PASS (schema.sql already updated). If FAIL, the schema edit is wrong — fix.

- [ ] **Step 4: Commit**

```bash
git add server/src/db/schema.sql server/tests/coaching-settings.test.ts
git commit -m "feat: add app_settings + provider_keys tables"
```

---

### Task 2: Secret encryption helper

**Files:**
- Create: `server/src/utils/crypto.ts`
- Test: `server/tests/crypto.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/tests/crypto.test.ts
process.env.SETTINGS_ENC_KEY = 'unit-test-enc-key';
import { encryptSecret, decryptSecret } from '../src/utils/crypto';

describe('crypto', () => {
  it('round-trips a secret', () => {
    const secret = 'sk-proj-abc123-DEF456';
    const blob = encryptSecret(secret);
    expect(blob).not.toContain(secret);          // not stored in plaintext
    expect(decryptSecret(blob)).toBe(secret);
  });
  it('produces different ciphertext each call (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd server && npx jest crypto`
Expected: FAIL — cannot find module `../src/utils/crypto`.

- [ ] **Step 3: Implement `crypto.ts`**

```typescript
import crypto from 'crypto';

function key(): Buffer {
  const secret =
    process.env.SETTINGS_ENC_KEY || process.env.JWT_SECRET || 'dev-only-fallback-secret';
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes for AES-256
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decryptSecret(blob: string): string {
  const [ivB64, tagB64, dataB64] = blob.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd server && npx jest crypto`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/crypto.ts server/tests/crypto.test.ts
git commit -m "feat: AES-256-GCM secret encryption helper"
```

---

### Task 3: Curated model config

**Files:**
- Create: `server/src/services/coaching/types.ts`, `server/src/services/coaching/models.ts`
- Test: add to `server/tests/coaching-settings.test.ts`

- [ ] **Step 1: Create `types.ts`**

```typescript
export type ProviderName = 'openai' | 'gemini' | 'anthropic';
export type PickerProvider = 'openai' | 'gemini';

export interface StreamCoachingOpts {
  prompt: string;
  model: string;
  apiKey: string;
  onProgress: (info: { charsReceived: number }) => void;
}

export interface CoachingProvider {
  streamCoaching(opts: StreamCoachingOpts): Promise<string>;
}
```

- [ ] **Step 2: Create `models.ts`**

```typescript
import { PickerProvider } from './types';

export const CURATED_MODELS: Record<PickerProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4.1'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'],
};

export const DEFAULT_PROVIDER: PickerProvider = 'gemini';

export const DEFAULT_MODEL: Record<PickerProvider, string> = {
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-pro',
};

export function isPickerProvider(p: string): p is PickerProvider {
  return p === 'openai' || p === 'gemini';
}

export function isCuratedModel(provider: string, model: string): boolean {
  return isPickerProvider(provider) && CURATED_MODELS[provider].includes(model);
}
```

- [ ] **Step 3: Add a test for validation**

```typescript
// append to server/tests/coaching-settings.test.ts
import { isCuratedModel, isPickerProvider } from '../src/services/coaching/models';

describe('curated models', () => {
  it('accepts known models, rejects unknown', () => {
    expect(isCuratedModel('gemini', 'gemini-2.5-pro')).toBe(true);
    expect(isCuratedModel('openai', 'gpt-4o')).toBe(true);
    expect(isCuratedModel('gemini', 'whisper-1')).toBe(false);
    expect(isCuratedModel('anthropic', 'claude-sonnet-4-6')).toBe(false);
  });
  it('identifies picker providers', () => {
    expect(isPickerProvider('openai')).toBe(true);
    expect(isPickerProvider('anthropic')).toBe(false);
  });
});
```

- [ ] **Step 4: Run**

Run: `cd server && npx jest coaching-settings -t "curated models"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/coaching/types.ts server/src/services/coaching/models.ts server/tests/coaching-settings.test.ts
git commit -m "feat: curated coaching model config + validation"
```

---

### Task 4: Settings + key data layer (DB→env→default resolution)

**Files:**
- Create: `server/src/services/coaching/settings.ts`
- Test: add to `server/tests/coaching-settings.test.ts`

> **Note on test DB:** `db/connection.ts` reads `DATABASE_PATH=:memory:` (set by `setupTestDb()`). Each test process gets one shared in-memory DB. The test must run migrations on that same connection. Import `db` from connection and run `runMigrations(db)` once in `beforeAll`.

- [ ] **Step 1: Create `settings.ts`**

```typescript
import db from '../../db/connection';
import { encryptSecret, decryptSecret } from '../../utils/crypto';
import { DEFAULT_PROVIDER, DEFAULT_MODEL } from './models';
import { PickerProvider } from './types';

const ENV_KEY: Record<PickerProvider, string> = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
  ).run(key, value);
}

export function getActiveProvider(): PickerProvider {
  const v = getSetting('coaching_provider') || process.env.COACHING_PROVIDER || DEFAULT_PROVIDER;
  return v === 'openai' ? 'openai' : 'gemini';
}

export function getActiveModel(provider: PickerProvider): string {
  return getSetting('coaching_model') || process.env.COACHING_MODEL || DEFAULT_MODEL[provider];
}

export function setActiveSelection(provider: PickerProvider, model: string): void {
  setSetting('coaching_provider', provider);
  setSetting('coaching_model', model);
}

export function getProviderKey(provider: PickerProvider): string | null {
  const row = db.prepare('SELECT encrypted_key FROM provider_keys WHERE provider = ?').get(provider) as
    | { encrypted_key: string }
    | undefined;
  if (row) return decryptSecret(row.encrypted_key);
  return process.env[ENV_KEY[provider]] || null;
}

export function setProviderKey(provider: PickerProvider, apiKey: string): void {
  db.prepare(
    `INSERT INTO provider_keys (provider, encrypted_key, last4, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(provider) DO UPDATE SET encrypted_key = excluded.encrypted_key,
       last4 = excluded.last4, updated_at = CURRENT_TIMESTAMP`,
  ).run(provider, encryptSecret(apiKey), apiKey.slice(-4));
}

export function deleteProviderKey(provider: PickerProvider): void {
  db.prepare('DELETE FROM provider_keys WHERE provider = ?').run(provider);
}

export function getProviderStatus(provider: PickerProvider): { connected: boolean; last4: string | null } {
  const row = db.prepare('SELECT last4 FROM provider_keys WHERE provider = ?').get(provider) as
    | { last4: string }
    | undefined;
  if (row) return { connected: true, last4: row.last4 };
  const envKey = process.env[ENV_KEY[provider]];
  if (envKey) return { connected: true, last4: envKey.slice(-4) };
  return { connected: false, last4: null };
}
```

- [ ] **Step 2: Write tests** (append to `coaching-settings.test.ts`)

```typescript
import db from '../src/db/connection';
import { runMigrations as _rm } from './helpers';
import {
  getActiveProvider, getActiveModel, setActiveSelection,
  getProviderKey, setProviderKey, deleteProviderKey, getProviderStatus,
} from '../src/services/coaching/settings';

describe('settings resolution', () => {
  beforeAll(() => { _rm(db); });
  beforeEach(() => {
    db.prepare('DELETE FROM app_settings').run();
    db.prepare('DELETE FROM provider_keys').run();
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.COACHING_PROVIDER;
  });

  it('defaults to gemini/gemini-2.5-pro when nothing set', () => {
    expect(getActiveProvider()).toBe('gemini');
    expect(getActiveModel('gemini')).toBe('gemini-2.5-pro');
  });

  it('DB selection overrides default', () => {
    setActiveSelection('openai', 'gpt-4o');
    expect(getActiveProvider()).toBe('openai');
    expect(getActiveModel('openai')).toBe('gpt-4o');
  });

  it('key resolution: DB beats env', () => {
    process.env.OPENAI_API_KEY = 'env-key';
    setProviderKey('openai', 'db-key-XY99');
    expect(getProviderKey('openai')).toBe('db-key-XY99');
    expect(getProviderStatus('openai')).toEqual({ connected: true, last4: 'XY99' });
  });

  it('key resolution: falls back to env when no DB key', () => {
    process.env.GEMINI_API_KEY = 'env-gemini-1234';
    expect(getProviderKey('gemini')).toBe('env-gemini-1234');
    expect(getProviderStatus('gemini')).toEqual({ connected: true, last4: '1234' });
  });

  it('not connected when neither DB nor env', () => {
    expect(getProviderStatus('openai')).toEqual({ connected: false, last4: null });
    expect(getProviderKey('openai')).toBeNull();
  });

  it('deleteProviderKey reverts to env fallback', () => {
    process.env.OPENAI_API_KEY = 'env-key-AAAA';
    setProviderKey('openai', 'db-key-BBBB');
    deleteProviderKey('openai');
    expect(getProviderKey('openai')).toBe('env-key-AAAA');
  });
});
```

- [ ] **Step 3: Run**

Run: `cd server && npx jest coaching-settings -t "settings resolution"`
Expected: PASS (all 6).

- [ ] **Step 4: Commit**

```bash
git add server/src/services/coaching/settings.ts server/tests/coaching-settings.test.ts
git commit -m "feat: coaching settings + key resolution (DB->env->default)"
```

---

### Task 5: Provider implementations

**Files:**
- Create: `server/src/services/coaching/openai.ts`, `gemini.ts`, `anthropic.ts`
- Test: `server/tests/coaching-providers.test.ts`

- [ ] **Step 1: Create `openai.ts`**

```typescript
import OpenAI from 'openai';
import { CoachingProvider } from './types';

export const openaiProvider: CoachingProvider = {
  async streamCoaching({ prompt, model, apiKey, onProgress }) {
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 3072,
      stream: true,
    });
    let text = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        text += delta;
        onProgress({ charsReceived: text.length });
      }
    }
    return text;
  },
};
```

- [ ] **Step 2: Create `gemini.ts`**

```typescript
import { GoogleGenAI } from '@google/genai';
import { CoachingProvider } from './types';

export const geminiProvider: CoachingProvider = {
  async streamCoaching({ prompt, model, apiKey, onProgress }) {
    const ai = new GoogleGenAI({ apiKey });
    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: { responseMimeType: 'application/json', maxOutputTokens: 3072 },
    });
    let text = '';
    for await (const chunk of stream) {
      const t = chunk.text;
      if (t) {
        text += t;
        onProgress({ charsReceived: text.length });
      }
    }
    return text;
  },
};
```

- [ ] **Step 3: Create `anthropic.ts`** (dev/fallback; preserves old behavior)

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { CoachingProvider } from './types';

export const anthropicProvider: CoachingProvider = {
  async streamCoaching({ prompt, model, apiKey, onProgress }) {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model,
      max_tokens: 3072,
      messages: [{ role: 'user', content: prompt }],
    });
    let text = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        text += event.delta.text;
        onProgress({ charsReceived: text.length });
      }
    }
    await stream.finalMessage();
    return text;
  },
};
```

- [ ] **Step 4: Write a test that mocks the OpenAI SDK and verifies streaming accumulation**

```typescript
// server/tests/coaching-providers.test.ts
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(
          (async function* () {
            yield { choices: [{ delta: { content: '{"a":' } }] };
            yield { choices: [{ delta: { content: '1}' } }] };
          })(),
        ),
      },
    },
  }));
});

import { openaiProvider } from '../src/services/coaching/openai';

describe('openai provider', () => {
  it('accumulates streamed text and reports progress', async () => {
    const progress: number[] = [];
    const text = await openaiProvider.streamCoaching({
      prompt: 'p',
      model: 'gpt-4o',
      apiKey: 'k',
      onProgress: ({ charsReceived }) => progress.push(charsReceived),
    });
    expect(text).toBe('{"a":1}');
    expect(progress).toEqual([5, 7]);
  });
});
```

- [ ] **Step 5: Run**

Run: `cd server && npx jest coaching-providers`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/coaching/openai.ts server/src/services/coaching/gemini.ts server/src/services/coaching/anthropic.ts server/tests/coaching-providers.test.ts
git commit -m "feat: openai/gemini/anthropic coaching provider implementations"
```

---

### Task 6: Coaching service (replaces claude.ts) + dispatch

**Files:**
- Create: `server/src/services/coaching/service.ts`
- Modify: `server/src/routes/sessions.ts:5`
- Delete: `server/src/services/claude.ts`

- [ ] **Step 1: Create `service.ts`** (parser copied verbatim from claude.ts — repeated here so it's self-contained)

```typescript
import { buildCoachingPrompt } from '../../prompts/coaching-prompt';
import { CoachingResult, TurnRecord, EventRecord } from '../../types';
import { DiscProfileContent, RubricItemContent, getSandlerPrimer } from '../../prompts/loader';
import { getActiveProvider, getActiveModel, getProviderKey } from './settings';
import { openaiProvider } from './openai';
import { geminiProvider } from './gemini';
import { anthropicProvider } from './anthropic';
import { CoachingProvider } from './types';

const PROVIDERS: Record<string, CoachingProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider,
  anthropic: anthropicProvider,
};

function parseCoachingFromText(rawText: string): CoachingResult {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : rawText.trim();
  let result: CoachingResult;
  try {
    result = JSON.parse(jsonText);
  } catch {
    console.error('Coaching JSON parse failed. Raw response:', rawText.slice(0, 1000));
    throw new Error(`Coaching model returned non-JSON response: ${rawText.slice(0, 300)}`);
  }
  if (typeof result.totalScore !== 'number' || !result.scoreBreakdown) {
    throw new Error('Coaching response missing required fields');
  }
  return result;
}

export async function generateCoachingStream(
  turns: TurnRecord[],
  events: EventRecord[],
  pmDisc: DiscProfileContent,
  clientDisc: DiscProfileContent,
  rubric: RubricItemContent[],
  onProgress: (info: { charsReceived: number }) => void,
): Promise<CoachingResult> {
  const prompt = buildCoachingPrompt(turns, events, pmDisc, clientDisc, rubric, getSandlerPrimer());
  const provider = getActiveProvider();
  const model = getActiveModel(provider);
  const apiKey = getProviderKey(provider);
  if (!apiKey) {
    throw new Error(`No API key configured for coaching provider "${provider}". Add one in Admin → Coaching.`);
  }
  const rawText = await PROVIDERS[provider].streamCoaching({ prompt, model, apiKey, onProgress });
  return parseCoachingFromText(rawText);
}

export async function generateCoaching(
  turns: TurnRecord[],
  events: EventRecord[],
  pmDisc: DiscProfileContent,
  clientDisc: DiscProfileContent,
  rubric: RubricItemContent[],
): Promise<CoachingResult> {
  return generateCoachingStream(turns, events, pmDisc, clientDisc, rubric, () => {});
}
```

- [ ] **Step 2: Update the import in `sessions.ts`**

Change line 5 from:
```typescript
import { generateCoachingStream } from '../services/claude';
```
to:
```typescript
import { generateCoachingStream } from '../services/coaching/service';
```
(If `generateCoaching` is imported anywhere, grep `grep -rn "services/claude" server/src` and update each to `services/coaching/service`.)

- [ ] **Step 3: Delete the old file**

```bash
git rm server/src/services/claude.ts
```

- [ ] **Step 4: Verify the project compiles and existing tests pass**

Run: `cd server && npm run build && npx jest`
Expected: build succeeds; all prior tests still PASS (no `claude.ts` references remain).

- [ ] **Step 5: Commit**

```bash
git add -A server/src
git commit -m "refactor: dispatch coaching through provider abstraction; remove claude.ts"
```

---

### Task 7: Admin coaching-settings routes

**Files:**
- Modify: `server/src/routes/admin.ts`
- Test: `server/tests/coaching-admin.test.ts`

- [ ] **Step 1: Append routes to `admin.ts`** (after existing routes, before `export default router`)

```typescript
import {
  getActiveProvider, getActiveModel, setActiveSelection,
  getProviderStatus, setProviderKey, deleteProviderKey,
} from '../services/coaching/settings';
import { CURATED_MODELS, isCuratedModel, isPickerProvider } from '../services/coaching/models';

router.get('/coaching-settings', (_req: Request, res: Response): void => {
  const activeProvider = getActiveProvider();
  res.json({
    activeProvider,
    activeModel: getActiveModel(activeProvider),
    models: CURATED_MODELS,
    providers: {
      openai: getProviderStatus('openai'),
      gemini: getProviderStatus('gemini'),
    },
  });
});

router.patch('/coaching-settings', (req: Request, res: Response): void => {
  const { provider, model } = req.body ?? {};
  if (!isPickerProvider(provider)) { res.status(400).json({ error: 'Invalid provider' }); return; }
  if (!isCuratedModel(provider, model)) { res.status(400).json({ error: 'Invalid model for provider' }); return; }
  if (!getProviderStatus(provider).connected) {
    res.status(400).json({ error: `No API key configured for ${provider}` }); return;
  }
  setActiveSelection(provider, model);
  res.json({ updated: true });
});

router.post('/coaching-settings/keys', (req: Request, res: Response): void => {
  const { provider, apiKey } = req.body ?? {};
  if (!isPickerProvider(provider)) { res.status(400).json({ error: 'Invalid provider' }); return; }
  if (typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    res.status(400).json({ error: 'Invalid API key' }); return;
  }
  const trimmed = apiKey.trim();
  setProviderKey(provider, trimmed);
  res.json({ connected: true, last4: trimmed.slice(-4) });
});

router.delete('/coaching-settings/keys/:provider', (req: Request, res: Response): void => {
  const { provider } = req.params;
  if (!isPickerProvider(provider)) { res.status(400).json({ error: 'Invalid provider' }); return; }
  deleteProviderKey(provider);
  res.json({ removed: true });
});
```

- [ ] **Step 2: Write supertest tests** (mirror the existing admin/auth test setup — get an admin token via `POST /auth/login` with the seeded admin)

```typescript
// server/tests/coaching-admin.test.ts
import { setupTestDb } from './helpers';
setupTestDb();
import request from 'supertest';
import db from '../src/db/connection';
import { runMigrations, seedTestData } from './helpers';
import app from '../src/index';

let token: string;
beforeAll(async () => {
  runMigrations(db);
  seedTestData(db);
  const res = await request(app).post('/auth/login').send({ email: 'admin@test.com', password: 'admin123' });
  token = res.body.token;
});
beforeEach(() => {
  db.prepare('DELETE FROM app_settings').run();
  db.prepare('DELETE FROM provider_keys').run();
  process.env.OPENAI_API_KEY = 'env-openai-LIVE';
  delete process.env.GEMINI_API_KEY;
});

const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

it('GET coaching-settings returns masked status, never full keys', async () => {
  const res = await auth(request(app).get('/api/admin/coaching-settings'));
  expect(res.status).toBe(200);
  expect(res.body.providers.openai).toEqual({ connected: true, last4: 'LIVE' });
  expect(res.body.providers.gemini).toEqual({ connected: false, last4: null });
  expect(JSON.stringify(res.body)).not.toContain('env-openai-LIVE');
  expect(res.body.models.gemini).toContain('gemini-2.5-pro');
});

it('POST keys stores a key (write-only) and returns last4', async () => {
  const res = await auth(request(app).post('/api/admin/coaching-settings/keys'))
    .send({ provider: 'gemini', apiKey: 'AIza-secret-9ZQ7' });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ connected: true, last4: '9ZQ7' });
  // confirm GET now reports gemini connected, still masked
  const get = await auth(request(app).get('/api/admin/coaching-settings'));
  expect(get.body.providers.gemini.connected).toBe(true);
  expect(JSON.stringify(get.body)).not.toContain('AIza-secret-9ZQ7');
});

it('PATCH rejects a provider with no key', async () => {
  const res = await auth(request(app).patch('/api/admin/coaching-settings'))
    .send({ provider: 'gemini', model: 'gemini-2.5-pro' });
  expect(res.status).toBe(400);
});

it('PATCH rejects a non-curated model', async () => {
  const res = await auth(request(app).patch('/api/admin/coaching-settings'))
    .send({ provider: 'openai', model: 'whisper-1' });
  expect(res.status).toBe(400);
});

it('PATCH sets selection when provider is connected', async () => {
  const res = await auth(request(app).patch('/api/admin/coaching-settings'))
    .send({ provider: 'openai', model: 'gpt-4o' });
  expect(res.status).toBe(200);
  const get = await auth(request(app).get('/api/admin/coaching-settings'));
  expect(get.body.activeProvider).toBe('openai');
  expect(get.body.activeModel).toBe('gpt-4o');
});

it('requires admin auth', async () => {
  const res = await request(app).get('/api/admin/coaching-settings');
  expect(res.status).toBe(401);
});
```

- [ ] **Step 3: Run**

Run: `cd server && npx jest coaching-admin`
Expected: PASS (all 6).

- [ ] **Step 4: Run the FULL suite to confirm nothing regressed**

Run: `cd server && npx jest`
Expected: all suites PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/admin.ts server/tests/coaching-admin.test.ts
git commit -m "feat: admin coaching-settings routes (get/patch/keys)"
```

---

### Task 8: Frontend API wrappers

**Files:** `client/src/api/admin.ts`

- [ ] **Step 1: Add the type + methods**

Add after the `UpdateUserPayload` interface:
```typescript
export interface CoachingSettings {
  activeProvider: 'openai' | 'gemini';
  activeModel: string;
  models: { openai: string[]; gemini: string[] };
  providers: {
    openai: { connected: boolean; last4: string | null };
    gemini: { connected: boolean; last4: string | null };
  };
}
```

Add to the `adminApi` object (before the closing `}`):
```typescript
  coachingSettings: () => api.get<CoachingSettings>('/api/admin/coaching-settings'),
  setCoachingSelection: (provider: string, model: string) =>
    api.patch<{ updated: boolean }>('/api/admin/coaching-settings', { provider, model }),
  setCoachingKey: (provider: string, apiKey: string) =>
    api.post<{ connected: boolean; last4: string }>('/api/admin/coaching-settings/keys', { provider, apiKey }),
  removeCoachingKey: (provider: string) =>
    api.delete<{ removed: boolean }>(`/api/admin/coaching-settings/keys/${provider}`),
```

- [ ] **Step 2: Type-check**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/api/admin.ts
git commit -m "feat: admin API wrappers for coaching settings"
```

---

### Task 9: Coaching Settings admin page

**Files:**
- Create: `client/src/pages/admin/AdminCoachingSettingsPage.tsx`
- Modify: `client/src/App.tsx`, `client/src/pages/admin/AdminLayout.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { adminApi, CoachingSettings } from '../../api/admin';

const PROVIDER_LABELS: Record<string, string> = { openai: 'OpenAI', gemini: 'Google Gemini' };

export function AdminCoachingSettingsPage() {
  const [settings, setSettings] = useState<CoachingSettings | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({ openai: '', gemini: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => adminApi.coachingSettings().then(setSettings).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const saveKey = async (provider: string) => {
    setBusy(true); setError(null);
    try {
      await adminApi.setCoachingKey(provider, keyInputs[provider]);
      setKeyInputs(s => ({ ...s, [provider]: '' }));
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const removeKey = async (provider: string) => {
    setBusy(true); setError(null);
    try { await adminApi.removeCoachingKey(provider); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const selectModel = async (provider: string, model: string) => {
    setBusy(true); setError(null);
    try { await adminApi.setCoachingSelection(provider, model); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl text-slate-text mb-1">Coaching Engine</h1>
      <p className="text-slate-muted text-sm mb-6">
        Choose which AI provider and model generate the post-call coaching, and manage their API keys.
      </p>
      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}
      {!settings ? (
        <p className="text-slate-muted">Loading…</p>
      ) : (
        <div className="space-y-8">
          {/* Provider key cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(['openai', 'gemini'] as const).map(provider => {
              const status = settings.providers[provider];
              return (
                <div key={provider} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-slate-text">{PROVIDER_LABELS[provider]}</span>
                    <span className={status.connected ? 'text-green-400 text-xs' : 'text-slate-muted text-xs'}>
                      {status.connected ? `Connected ···· ${status.last4}` : 'Not connected'}
                    </span>
                  </div>
                  <input
                    type="password"
                    placeholder="Paste API key to set/replace"
                    value={keyInputs[provider]}
                    onChange={e => setKeyInputs(s => ({ ...s, [provider]: e.target.value }))}
                    className="input w-full mb-2"
                  />
                  <div className="flex gap-2">
                    <button className="btn-primary text-sm" disabled={busy || keyInputs[provider].length < 10}
                      onClick={() => saveKey(provider)}>Save key</button>
                    {status.connected && (
                      <button className="btn-ghost text-sm" disabled={busy}
                        onClick={() => removeKey(provider)}>Remove</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Model picker */}
          <div className="card p-4">
            <h2 className="font-display text-slate-text mb-3">Active model</h2>
            {(['openai', 'gemini'] as const).map(provider => {
              const connected = settings.providers[provider].connected;
              return (
                <div key={provider} className="mb-3">
                  <div className="text-xs uppercase tracking-wide text-slate-muted mb-1">{PROVIDER_LABELS[provider]}</div>
                  <div className="space-y-1">
                    {settings.models[provider].map(model => {
                      const active = settings.activeProvider === provider && settings.activeModel === model;
                      return (
                        <button
                          key={model}
                          disabled={!connected || busy}
                          onClick={() => selectModel(provider, model)}
                          className={
                            'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ' +
                            (active ? 'bg-gold-500/15 text-gold-300 ' : 'text-slate-text hover:bg-navy-700 ') +
                            (!connected ? 'opacity-40 cursor-not-allowed' : '')
                          }
                        >
                          <span>{model}</span>
                          {active && <span>✓</span>}
                          {!connected && <span className="text-xs text-slate-muted">Add a {PROVIDER_LABELS[provider]} key to enable</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
```

> **Note:** reuse whatever utility classes already exist (`card`, `input`, `btn-primary`, `btn-ghost`). If `card`/`input` aren't defined in `index.css`, substitute the closest existing classes used by `UserModalForm.tsx` / `AdminDashboardPage.tsx` — check those files first and match.

- [ ] **Step 2: Add the route in `App.tsx`**

Find the admin routes block (the `<Route path="/admin/scenarios" ...>` line) and add alongside it:
```tsx
<Route path="/admin/coaching" element={<ProtectedRoute requireAdmin><AdminCoachingSettingsPage /></ProtectedRoute>} />
```
Add the import at top: `import { AdminCoachingSettingsPage } from './pages/admin/AdminCoachingSettingsPage';`
(Match the exact `ProtectedRoute` usage of the neighboring admin routes — copy their wrapper form.)

- [ ] **Step 3: Add the nav link in `AdminLayout.tsx`**

At line ~72 add: `const onCoaching = path.startsWith('/admin/coaching');`
In the `<nav>` (line ~103-106) add after the Scenarios link:
```tsx
<NavLink to="/admin/coaching" label="Coaching" active={onCoaching} />
```

- [ ] **Step 4: Type-check + build the client**

Run: `cd client && npx tsc --noEmit && npm run build`
Expected: no errors; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/AdminCoachingSettingsPage.tsx client/src/App.tsx client/src/pages/admin/AdminLayout.tsx
git commit -m "feat: admin Coaching Engine settings page (keys + model picker)"
```

---

### Task 10: Full verification (local)

- [ ] **Step 1: Backend — build + full test suite**

Run: `cd server && npm run build && npx jest`
Expected: build clean; all suites green (including the new coaching tests + the prior 33).

- [ ] **Step 2: Frontend — build**

Run: `cd client && npm run build`
Expected: clean build.

- [ ] **Step 3: Manual smoke (local dev, optional but recommended)**

Start backend (`cd server && npm run dev`) and frontend (`cd client && npm run dev`) with `GEMINI_API_KEY` + `OPENAI_API_KEY` in `server/.env`. Log in as admin → `/admin/coaching`:
- Both providers show **Connected** (from env keys).
- Pick OpenAI `gpt-4o` → run a full PM session → confirm a coaching debrief generates.
- Switch to Gemini `gemini-2.5-pro` → run another session → confirm debrief generates.
- Paste a key in the OpenAI field → Save → status shows masked `···· last4`; confirm no full key appears in the network response (DevTools).

- [ ] **Step 4: Commit any fixes from smoke testing**

```bash
git add -A && git commit -m "fix: coaching switch smoke-test corrections"
```

---

### Task 11: Docs sync

**Files:** `REBUILD_ME_GUIDE.md`, `PROGRESS.md`, `CLAUDE.md`

- [ ] **Step 1:** Add a Part 13 subsection (e.g., `13.19 — Configurable Coaching Provider`) to `REBUILD_ME_GUIDE.md` describing the provider abstraction, the `app_settings`/`provider_keys` tables, the admin Coaching page, and the env vars (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `COACHING_PROVIDER`, optional `SETTINGS_ENC_KEY`). Per the project's documentation-sync rule, add the matching checklist block to `PROGRESS.md` in the same commit.

- [ ] **Step 2:** Update `CLAUDE.md`: change the "AI Coaching (post-call)" row/notes from "always Claude Sonnet 4.6" to "configurable provider (OpenAI/Gemini) via admin toggle; Anthropic dev-only," and note Anthropic is no longer used in production.

- [ ] **Step 3: Commit**

```bash
git add REBUILD_ME_GUIDE.md PROGRESS.md CLAUDE.md
git commit -m "docs: document configurable coaching provider"
```

---

### Task 12: Ship (with the user)

> Do NOT do this task autonomously — confirm with Tyler first, because merging to `main` deploys to live Railway + Vercel.

- [ ] **Step 1:** Add `SETTINGS_ENC_KEY` to Railway env (a fresh long random string) — or rely on the `JWT_SECRET` fallback (already set). Confirm `OPENAI_API_KEY` + `GEMINI_API_KEY` are present (they are).
- [ ] **Step 2:** Merge `feat/coaching-provider-switch` → `main`; push. Railway + Vercel auto-deploy.
- [ ] **Step 3:** Production verify: admin → Coaching shows both providers connected; run one real session per provider and confirm debriefs generate; confirm no key leaks in any response.
- [ ] **Step 4:** (Optional) once Jef has entered keys in-app, remove `OPENAI_API_KEY`/`GEMINI_API_KEY` from Railway so the DB is the source of truth.

---

## Self-Review

- **Spec coverage:** provider abstraction (T5/T6), curated models (T3), in-app encrypted keys + env fallback (T2/T4), grey-out picker (T9), admin routes (T7), masking/never-leak (T7 tests), tests (T1-T7), verification (T10/T12), docs (T11), Anthropic excluded from picker but kept for dev (T5). All spec sections map to a task.
- **Placeholder scan:** none — every code step has complete code; test steps have real assertions; commands are exact. The one soft spot (Tailwind class names in T9) has an explicit instruction to match existing files.
- **Type consistency:** `PickerProvider` ('openai'|'gemini') used consistently across `models.ts`, `settings.ts`, routes; `getActiveProvider/getActiveModel/getProviderKey/getProviderStatus/setActiveSelection/setProviderKey/deleteProviderKey` signatures match between `settings.ts` (T4), `service.ts` (T6), and `admin.ts` (T7); `CoachingProvider.streamCoaching` opts identical across T5 implementations and T6 caller; frontend `CoachingSettings` shape (T8) matches the `GET /coaching-settings` response (T7).
