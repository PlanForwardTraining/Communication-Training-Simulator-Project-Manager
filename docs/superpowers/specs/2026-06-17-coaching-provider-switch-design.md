# Coaching Provider Switch + In-App Key Management — Design

**Date:** 2026-06-17
**Status:** Approved for planning
**Author:** Tyler + Claude

## Why

Jef does not want to use Anthropic for coaching; the company will use **OpenAI and/or Google Gemini**. The post-call coaching engine currently calls Anthropic (Claude Sonnet 4.6) and is hardcoded. We need to:

1. Switch coaching to OpenAI/Gemini (provider-selectable).
2. Let a non-technical admin (Jef) **manage the coaching provider, model, and API keys from inside the app** — no `.env` edits, no redeploys.

This also removes the last dependency on Tyler's personal Anthropic account.

## Goals

- Coaching runs on a **selectable provider + model**, chosen by an admin in the app, effective on the next session (no redeploy).
- Admin can **enter/rotate/remove API keys in the app**, stored encrypted; keys are never returned to the browser.
- A **curated model picker** grouped by provider; a model is selectable only if its provider has a key (DB or env), otherwise greyed out.
- **No disruption** to what's already deployed: existing Railway env keys keep working as a fallback.

## Non-Goals (out of scope)

- Anthropic in the user-facing picker (excluded per Jef). The provider abstraction keeps an Anthropic implementation for local/dev use only.
- Dynamic model discovery from provider APIs (explicitly rejected — returns mostly unusable models, adds filtering maintenance, risks bad-model selection). Curated list instead.
- Per-user / multi-tenant keys.
- A "test this model" button (noted as a future nice-to-have).
- Moving non-coaching secrets (ElevenLabs, JWT, admin password) into the app — those stay as Railway env vars.

## Architecture

### 1. Provider abstraction (backend)

New module `server/src/services/coaching/`:

- `types.ts` — `CoachingProvider` interface:
  ```
  streamCoaching(opts: {
    prompt: string;
    model: string;
    apiKey: string;
    onProgress: (info: { charsReceived: number }) => void;
  }): Promise<string>   // returns raw text
  ```
- `openai.ts` — uses the `openai` SDK: `chat.completions.create({ stream: true, response_format: { type: 'json_object' } })`, accumulates text deltas → `onProgress(charsReceived)`.
- `gemini.ts` — uses `@google/genai`: `generateContentStream` with `generationConfig.responseMimeType = 'application/json'`, accumulates chunk text → `onProgress`.
- `anthropic.ts` — the existing streaming logic (dev/fallback only; not surfaced in the picker).
- `index.ts` — `resolveCoaching()` reads the active provider + model + key (see §3) and returns the right implementation, model id, and key.

`server/src/services/claude.ts` is refactored (and renamed to `coaching/service.ts`): `generateCoachingStream(...)` keeps its **exact current signature** (the SSE endpoint in `routes/sessions.ts` is unchanged). Internally it: builds the prompt via the unchanged `buildCoachingPrompt` (model-neutral) → resolves provider/model/key → calls `provider.streamCoaching` → runs the unchanged `parseCoachingFromText` (greedy `{...}` extraction; robust across providers). JSON-output mode on each provider improves reliability; `parseCoachingFromText` remains the safety net.

### 2. Curated model list (static config)

`server/src/services/coaching/models.ts` — shipped in code, no key required to know it:

| Provider | Models |
|---|---|
| openai | `gpt-4o`, `gpt-4.1` |
| gemini | `gemini-2.5-pro`, `gemini-2.5-flash` |

Default selection: provider `gemini`, model `gemini-2.5-pro`. Adding a model later = a one-line edit here. Every listed model must be coaching-validated before being added.

### 3. Settings + key storage

Two new SQLite tables (added to `schema.sql`; created idempotently in `migrate.ts`):

- `app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)` — holds `coaching_provider` and `coaching_model`.
- `provider_keys (provider TEXT PRIMARY KEY, encrypted_key TEXT, last4 TEXT, updated_at TEXT)` — encrypted API keys per provider, plus last-4 for masked display.

**Encryption:** `server/src/utils/crypto.ts` — AES-256-GCM. The encryption key is derived from a server env secret `SETTINGS_ENC_KEY` (falls back to deriving from `JWT_SECRET` if unset, so no new required env var). Round-trip helpers `encryptSecret()` / `decryptSecret()`.

**Resolution order (the env-fallback behavior):**
- Active provider/model: `app_settings` row → else `COACHING_PROVIDER` / `COACHING_MODEL` env → else defaults (`gemini` / `gemini-2.5-pro`).
- API key for the active provider: `provider_keys` row (decrypted) → else `process.env.OPENAI_API_KEY` / `GEMINI_API_KEY`.

So today's Railway env keys keep working until an in-app key is entered; then the DB key takes over. The two coaching keys can later be removed from Railway, leaving the DB as source of truth.

### 4. Admin API (all `requireAdmin`)

In `server/src/routes/admin.ts`:

- `GET /api/admin/coaching-settings` → `{ activeProvider, activeModel, models: {openai:[...], gemini:[...]}, providers: { openai: {connected, last4}, gemini: {connected, last4} } }`. **Never returns full keys.** `connected` is true if a key exists in DB or env.
- `PATCH /api/admin/coaching-settings` `{ provider, model }` → validates the provider is connected and the model is in that provider's curated list; writes `app_settings`.
- `PUT /api/admin/coaching-settings/keys/:provider` `{ apiKey }` → encrypts + stores; records `last4`. Write-only.
- `DELETE /api/admin/coaching-settings/keys/:provider` → removes the stored key (resolution falls back to env if present).

### 5. Admin UI

New page `client/src/pages/admin/AdminCoachingSettingsPage.tsx`, route `/admin/coaching`, with a "Coaching" link in `AdminLayout` (lg+). Typed wrappers in `client/src/api/admin.ts`.

- **Provider key cards** (OpenAI, Gemini): status line — `Connected ···· 4A2` or `Not connected` — a field to paste/update a key (write-only; on save it posts and re-fetches masked status), and a Remove button.
- **Model picker**: curated models grouped by provider, mirroring the reference UI. A model row is selectable only if its provider is connected; otherwise greyed with "Add an OpenAI/Gemini key to enable." Selecting + Save calls `PATCH`.
- Reflects the active provider/model with a checkmark.

## Data flow

```
Admin enters key  → PUT keys/:provider → encrypt → provider_keys
Admin picks model → PATCH coaching-settings → app_settings
Session ends      → SSE /sessions/:id/end → generateCoachingStream
                    → resolve(provider, model, key from DB→env)
                    → provider.streamCoaching (onProgress drives the progress bar)
                    → parseCoachingFromText → save coaching → debrief
```

## Error handling

- `PATCH` rejects selecting a provider with no key, so the active provider is always connected.
- Defensive: if no key resolves at coaching time, throw a clear error surfaced through the existing SSE error path so the debrief screen shows a real message (not a silent blank).
- Provider 401/quota errors are caught and surfaced with a readable message.

## Testing

- Encryption round-trip (`encryptSecret`/`decryptSecret`).
- Key resolution (DB present, DB absent→env, neither→error).
- Provider dispatch returns the right implementation/model.
- `PATCH` validation (unconnected provider rejected; non-curated model rejected).
- Admin routes: auth-guarded; `GET` never leaks full keys (only `last4`).
- SDK calls mocked in all tests.

## Dependencies & env

- Add server deps: `openai`, `@google/genai`.
- Env: optional `SETTINGS_ENC_KEY` (else derived from `JWT_SECRET`). Existing `OPENAI_API_KEY` / `GEMINI_API_KEY` / `COACHING_PROVIDER` remain valid as fallback.

## Deploy / source of truth

One repo (`PlanForwardTraining/Communication-Training-Simulator-Project-Manager`) is source of truth. Merge to `main` auto-deploys backend (Railway) and frontend (Vercel). Schema changes apply via the idempotent `migrate.ts` on deploy.

## Verification (after deploy)

1. Admin → Coaching: Gemini shows connected (from env key), `gemini-2.5-pro` selectable; OpenAI shows connected too (env key present).
2. Run a real session → debrief generates via Gemini; Sandler bullets + score breakdown render cleanly.
3. Switch the picker to OpenAI `gpt-4o`, save → run another session → debrief generates via OpenAI.
4. Enter a key in-app for one provider → confirm it's used (and masked everywhere; never returned in full by any endpoint).

## Open decision for review

- **Anthropic excluded from the picker** (per Jef). Abstraction keeps an Anthropic impl for dev only. Flag if you'd rather show it greyed-out as a third option.
