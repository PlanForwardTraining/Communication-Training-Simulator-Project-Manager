# Branding Text Token + Scenario Picker Table — Design

**Date:** 2026-06-18  **Status:** Approved for planning  **Author:** Tyler + Claude
**Branch:** continue on `feat/admin-ux-overhaul`.

Two independent enhancements.

---

## Feature A — Text color brand token (+ crisper default)

**Why:** the body text is a warm off-white (`#F0EDE8`) that reads as muddy/not crisp, especially on the teal-slate base. Admins also want control over text color, not just accent + base.

**Decision:** expose **three** controls — Primary, Secondary, **Text** (no separate button color; buttons keep using the Primary accent). Text gets its own control *and* a crisper default.

### Data model
Extend `Branding` from `{ primary, secondary, logoUrl }` to `{ primary, secondary, text, logoUrl }`.
- New `app_settings` key `brand_text`.
- `DEFAULT_BRANDING.text = '#F8FAFC'` (crisp cool near-white — replaces the warm `#F0EDE8`, harmonizes with the cool teal brand).

### Color application
- `deriveBrandShades(primary, secondary, text)` gains a third arg and additionally returns:
  - `--slate-text`: the text color's channels.
  - `--slate-muted`: a muted version = `mix(text, secondary, 0.5)` (text blended halfway toward the dark base) — keeps muted text readable and on-theme.
- `applyBrandingValues(primary, secondary, text)`: `isDefault` now compares all three to `DEFAULTS`; when default → `removeProperty` (fall back to `:root`), else `setProperty` for every var incl. `--slate-text`/`--slate-muted`.
- `:root` defaults in `index.css` updated: `--slate-text: 248 250 252` (#F8FAFC) and `--slate-muted` = the mix of #F8FAFC and the teal base #0E2A33 ≈ `131 146 152`.

### Server
- `branding.ts`: `Branding` interface + `DEFAULT_BRANDING` add `text`; `getBranding`/`setBranding` read/write `brand_text`; validate `text` with `isHexColor`.
- `routes/branding.ts` PATCH: reject if `text` is not `#RRGGBB`.

### Client
- `api/admin.ts` `Branding` type adds `text: string`.
- `applyBranding.ts` `DEFAULTS` adds `text: '#F8FAFC'`; boot passes `b.text` through.
- `AdminBrandingPage.tsx`: add a **Text color** `ColorRow` (between Primary and Secondary, or after Secondary); `DEFAULTS` adds text; save/reset call `applyBrandingValues(primary, secondary, text)`; preview shows text color on the header bar.

### Tests (server)
- `branding.test.ts`: `DEFAULT_BRANDING` includes `text`; set/get round-trips `text`; PATCH validates `text`; reset reverts.

---

## Feature B — Scenario picker as a table

**Why:** the PM "Select a Scenario" screen (`ScenarioSelectPage.tsx`) uses a 2-column pill grid that scales poorly as scenarios grow.

**Decision:** a table with columns **Name · Description · Role(s)**, reusing the existing `DataTable` component. Row click → the existing DISC-select navigation (unchanged downstream flow).

### Backend
- `GET /api/scenarios` (PM-facing) currently filters by the requester's `user_type` and **strips** `visible_to_types`. Change it to **include** `visible_to_types` as a parsed `string[]` (empty array = visible to all) so the picker can render the Role(s) column. (Admins already see all; the field is non-sensitive — it's just which roles a scenario targets.)
- Confirm the list endpoint returns `id`, `slug`, `title`, `description`, `visible_to_types` per scenario.

### Frontend
- `ScenarioSelectPage.tsx`: replace the pill grid with `<DataTable>`:
  - **Name** = `title` (sortable).
  - **Description** = `description` (the short card text; truncate with `line-clamp`/ellipsis so rows stay compact).
  - **Role(s)** = `visible_to_types.length ? visible_to_types.join(', ') : 'All'` (a small chip or plain text).
  - `onRowClick(scenario)` → the same navigation the pill currently triggers (to the DISC-select page for that scenario slug).
- Keep the page header/intro copy. Remove the pill-grid markup. Preserve loading/empty states.
- `api/scenarios.ts`: ensure the PM list type carries `description` and `visible_to_types?: string[]`.

### Tests
- Server: `GET /api/scenarios` as a member returns `visible_to_types` for visible scenarios (and still filters correctly). Add/extend in the existing scenario-visibility test.
- Client: no runner — verify via tsc/build + manual.

---

## Out of scope
- Separate button color / full palette (chose 3 controls).
- Changing the DISC-select or simulation screens.
- A "Start" action column (row-click is enough).

## Docs
Note both in REBUILD_ME_GUIDE §13.21 (branding token + scenario table) + PROGRESS in the same commit.
