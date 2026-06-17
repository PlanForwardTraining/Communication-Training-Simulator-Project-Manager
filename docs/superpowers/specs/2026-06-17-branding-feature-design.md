# Branding / White-Label Colors — Design

**Date:** 2026-06-17  **Status:** Approved for planning  **Author:** Tyler + Claude

## Why

The app ships with fixed Plan Forward colors (navy + gold). For a clean hand-off, the business owner (Jef) should be able to make the app his own brand — primary/secondary colors and a logo — from inside the app, with no code change and no redeploy. This mirrors how the coaching provider/keys are already admin-managed.

## Goals

- An admin can set a **primary color**, a **secondary color**, and an optional **logo URL** from an **Admin → Branding** page, with a **live preview** and a **Reset to defaults** button.
- Saving re-skins the **entire app** (PM and admin views, including the login screen) — live, no redeploy.
- Jef picks only **two colors**; the full shade ramp the UI needs is derived automatically.
- If nothing is configured, the app looks exactly as it does today (current navy/gold).

## Non-Goals (out of scope)

- Per-shade editing (Jef picks 2 colors, not 12). Shades are derived.
- Light/dark mode switching. The app stays a **dark theme**; the secondary color is expected to be a dark base (like `#2e2b29`). Text colors stay fixed for readability.
- Theming proposals/Excel exports or any non-UI surface.
- Logo upload/hosting. We accept a **URL** to an externally hosted PNG/SVG (matches the reference UI).
- Font/typography customization.

## What's themeable → how it maps

| Admin field | Maps to | Used by |
|---|---|---|
| Primary color | `gold-*` ramp | buttons, accents, highlights, active nav, focus rings |
| Secondary color | `navy-*` ramp | page background, sidebar, headers, cards |
| Logo URL | header wordmark | replaces the "PLAN FORWARD" text logo when set |

Text (`slate-text`, `slate-muted`) and the DISC badge colors stay fixed.

## Technical approach

### 1. Color rewiring (the key move — components don't change)
The Tailwind palette already uses named shades (`navy-900..500`, `gold-400..600`). Change `tailwind.config` so those names resolve to **CSS variables** using the channel syntax that preserves Tailwind's alpha modifiers (e.g. `bg-gold-500/15`):

```js
gold: { 500: 'rgb(var(--gold-500) / <alpha-value>)', ... },
navy: { 900: 'rgb(var(--navy-900) / <alpha-value>)', ... },
```

Defaults are declared in `:root` (in `index.css`) as space-separated RGB channels, equal to today's hex values:

```css
:root { --gold-500: 201 168 76; --navy-900: 11 20 38; /* ...all current shades... */ }
```

Result: every existing `bg-navy-800`, `text-gold-300`, `bg-gold-500/15`, etc. becomes themeable with **zero component edits**. The TipTap editor CSS in `index.css` that hardcodes hex (`#C9A84C`, `#0B1426`, …) is switched to the same `rgb(var(--x))` references.

### 2. Shade derivation (`client/src/utils/deriveBrandShades.ts`)
From the two base hex inputs, produce all required `--gold-*` and `--navy-*` channel strings by stepping lightness in HSL space (primary → light/mid/dark accent steps; secondary → the navy 900→500 background steps). Pure function, unit-testable in isolation.

### 3. Persistence (reuse `app_settings`)
Three rows: `brand_primary`, `brand_secondary`, `brand_logo_url`. No new table.

### 4. Endpoints
- **`GET /api/branding`** — **public** (no auth). Returns `{ primary, secondary, logoUrl }`, falling back to the current defaults when unset. Public so colors apply on the login page before auth.
- **`PATCH /api/admin/branding`** — admin-guarded. Validates each color is a `#RRGGBB` hex and `logoUrl` is empty or an http(s) URL; persists via the existing settings layer.

### 5. Frontend application
- A small boot step (`applyBranding`) fetches `GET /api/branding` and, if values differ from defaults, computes shades via `deriveBrandShades` and sets the `--gold-*`/`--navy-*` custom properties on `document.documentElement`. Runs before first paint where practical to avoid a color flash.
- Header component renders `<img src={logoUrl}>` when a logo URL is set, else the existing wordmark.
- **Admin → Branding page** (`AdminBrandingPage.tsx`, nav link "Branding"): logo URL field, two color inputs (native color picker + hex text, kept in sync), a live preview block (header bar in secondary + a primary button), Save, and Reset to defaults (clears the three rows). On save, re-applies branding immediately.

## Data flow

```
Admin edits colors → PATCH /api/admin/branding → app_settings (DB)
App boot (any page) → GET /api/branding → deriveBrandShades() → set CSS vars on :root → whole app reskinned
Reset → clears the three settings rows → app falls back to default :root values
```

## Error handling / safeguards

- Invalid hex or non-URL logo → 400, admin page shows the error; nothing saved.
- A broken logo image URL → header falls back to the text wordmark (`onError`).
- Reset to defaults always restores the known-good look (can't get stuck on an unreadable theme).
- `GET /api/branding` failure on boot → app uses the baked-in `:root` defaults (current look).

## Testing

- **Unit (server):** branding validation (hex/URL) accept/reject; `GET /api/branding` returns defaults when unset and saved values when set; `PATCH` is admin-guarded and rejects bad input without persisting.
- **Unit (client):** `deriveBrandShades` produces the expected channel strings for a known input and stays within valid RGB ranges; helper is import-safe (the client has no test runner today — add a minimal one or keep the function trivially verifiable + covered by the build/type-check + manual check, consistent with current client practice).
- **Manual:** set primary/secondary in admin → confirm buttons + backgrounds change app-wide incl. login; set a logo URL → confirm it shows and a bad URL falls back; Reset → confirm return to default.

## Documentation

Add a REBUILD_ME_GUIDE §13.20 + matching PROGRESS entry (paired-file rule), and note the `brand_*` settings + `/api/branding` endpoint.
