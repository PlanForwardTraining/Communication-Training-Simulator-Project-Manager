# Admin UX Overhaul — Design

**Date:** 2026-06-18  **Status:** Approved for planning  **Author:** Tyler + Claude

## Why

Post-handoff polish for Jef. The admin experience has rough edges: top-nav feels cramped, session history is only reachable via the post-call popup, the dashboard hides admins, there's no way to delete junk sessions, exports can't be filtered, and there's no concept of user types to scope which scenarios a person trains on. This overhaul addresses all of it.

## Scope — five units

Built in sequence, continuously. The **Sessions page (Unit 3)** is the centerpiece and establishes the dense-table template the other lists reuse.

---

### Unit 1 — Quick wins
- Rename "All PMs" → **"All Users"**; "Add PM" → **"Add User"**.
- Dashboard user table includes **all users incl. admins** (remove the `WHERE role = 'pm'` filter in `server/src/routes/admin.ts` `/summary` and `/users`). Cohort KPIs (team averages, flagged PMs) should still be computed over **trainees only** (non-admin) so an admin who never trains doesn't skew "team average" — i.e., the *table* lists everyone, but the *stats* exclude admins.

### Unit 2 — Sidebar navigation
- Replace the top nav (`AdminLayout.tsx`) with a **left sidebar** (Zenith-style): brand/logo at top, then nav items — Dashboard, Sessions, Users, Scenarios, Coaching, Branding — and a footer area with Run Practice, Export, the signed-in identity, and Sign out.
- Active-item highlight (gold left-accent), respects branding colors (already CSS-var driven).
- **Applies to the admin app shell only.** The PM-facing call flow (scenario select → simulation → debrief) stays full-screen and focused; a sidebar there would clutter the live call. PM history/landing keeps its current simple header.
- Collapsible on narrow screens (hamburger → drawer), mirroring the existing mobile pattern.

### Unit 3 — Sessions page (centerpiece)
A new admin route `/admin/sessions` (distinct from the existing `/admin/sessions/:id` detail page).
- **Dense, sortable table:** Date, User, Scenario, Client DISC, Voice, Score, Status (completed / in-progress / empty), with a row click → existing session detail.
- **Filters:** by user, by date range, by scenario, by status. Filter state is shared with export.
- **Delete:** per-row delete (soft delete, see Data model) behind a confirm; plus a **"Purge empty sessions"** action that soft-deletes all sessions with no transcript turns.
- **Export honors the active filters** (see Unit 3b).

#### Unit 3b — Filtered export (#6)
- `GET /api/admin/export.xlsx` gains optional query params: `userId`, `from`, `to`, `scenarioId`, `status`. With none, behaves as today (everything). The Sessions page's "Export" button passes the current filters.

### Unit 4 — Tabular polish
- Apply the Unit-3 table component to the **Scenarios** admin list and the **Users** list so all three match. Extract a reusable `<DataTable>` (columns config + rows + optional row-click) rather than duplicating markup.

### Unit 5 — User types + scenario gating
- **User types** are an admin-managed list (PM, Sales, Superintendent, …), stored in a new `user_types` table (`id, name`), seeded with `PM`. Managed from a small admin UI (a section on the Users page or a settings tab).
- **Access level is unchanged and stays two-level:** `role` = `admin` (sees admin app) vs everyone else (sees base app). We do NOT add per-type permissions. Existing `role` values keep working (`pm` continues to mean non-admin/member; new users default to a non-admin role). User *type* is a separate label, not a permission.
- Each user gets a `user_type` (label). Create/Edit User form gains a "User type" dropdown sourced from `user_types`.
- **Scenario gating lives on the scenario editor:** scenarios gain a "Visible to user types" multi-select. A scenario with **no** types selected is visible to everyone; otherwise it's visible only to users whose `user_type` is in the list. **Admins always see all scenarios.** The PM-facing scenario list (`GET /api/scenarios`) filters by the requester's `user_type`.

---

## Data model changes (SQLite)

```sql
-- Unit 3: soft delete + 30-day retention
ALTER TABLE sessions ADD COLUMN deleted_at TEXT;   -- NULL = live; ISO timestamp = soft-deleted

-- Unit 5: user types
CREATE TABLE IF NOT EXISTS user_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
ALTER TABLE users ADD COLUMN user_type TEXT;        -- label, e.g. 'PM'; NULL allowed
ALTER TABLE scenarios ADD COLUMN visible_to_types TEXT; -- JSON array of type names; NULL/'' = all
```
All adds are idempotent via the existing `migrate.ts` `ensureColumn()` helper + `CREATE TABLE IF NOT EXISTS`. Seed `user_types` with `PM`.

## Soft delete + retention behavior

- Deleting a session (per-row or via "purge empties") sets `deleted_at = now`. All list/stats/export queries exclude `deleted_at IS NOT NULL`.
- A `purgeExpiredSoftDeletes()` routine **hard-deletes** sessions (and their `turns`, `events`, `coaching` rows) where `deleted_at` is older than **30 days**. It runs on **server startup** (cheap, deterministic, no external scheduler needed on Railway) — documented as the retention mechanism. Idempotent.
- "Empty session" = a session with zero `turns` rows.

## API surface (additions)

- `GET /api/admin/sessions` — filterable list (`userId`, `from`, `to`, `scenarioId`, `status`), excludes soft-deleted.
- `DELETE /api/admin/sessions/:id` — soft delete (sets `deleted_at`).
- `POST /api/admin/sessions/purge-empty` — soft-delete all empty sessions; returns count.
- `GET /api/admin/export.xlsx?...filters` — same filters as the list.
- `GET/POST/DELETE /api/admin/user-types` — list / add / remove user types (admin-guarded).
- Users create/edit payloads accept `user_type`.
- Scenarios create/edit payloads accept `visible_to_types`; `GET /api/scenarios` filters by the requester's `user_type` (admins unfiltered).

## Frontend structure

- `client/src/components/DataTable.tsx` — reusable dense sortable table (Unit 3, reused in 4).
- `client/src/components/AdminSidebar.tsx` + reworked `AdminLayout.tsx` (Unit 2).
- `client/src/pages/admin/AdminSessionsPage.tsx` (Unit 3) — table + filters + delete + purge + export button.
- Scenarios/Users pages refactored onto `DataTable` (Unit 4).
- User-type management UI + scenario "Visible to types" selector (Unit 5).

## Error handling / safeguards
- Delete + purge are confirm-gated; soft delete means an accidental delete is recoverable within 30 days (direct DB un-set of `deleted_at`).
- Removing a `user_type` that's in use: block with a 409 + the count of users/scenarios referencing it (mirror the scenario hard-delete FK guard pattern), or reassign — block is simpler; go with block.
- Scenario filter: a member whose `user_type` is NULL sees only untyped (all-visible) scenarios.

## Testing
- Server (Jest + supertest): soft-delete hides sessions from list/export/stats; purge-empty only targets transcript-less sessions; retention sweep removes >30-day soft-deletes and cascades to turns/events/coaching; export honors each filter; user-types CRUD + in-use guard; scenario visibility filtering by user_type (incl. admin-sees-all and NULL-type member).
- Client: no test runner; verify via `tsc --noEmit` + build + manual, per existing practice.

## Out of scope
- Per-type *permissions* (explicitly declined — type is a label, not an ACL).
- Sidebar on the PM call flow.
- A real cron scheduler (startup sweep is sufficient for this internal tool).
- Reworking the live PM simulation/debrief screens.

## Docs
Add REBUILD_ME_GUIDE §13.21 + matching PROGRESS entries (paired-file rule).
