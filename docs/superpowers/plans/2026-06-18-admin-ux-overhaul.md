# Admin UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the admin experience — sidebar nav, a filterable/deletable Sessions page, filtered export, tabular lists, all-users dashboard, and admin-managed user types that gate scenario visibility.

**Architecture:** Additive SQLite migrations (idempotent via `migrate.ts`). New admin endpoints alongside the existing `requireAdmin`-guarded router. Frontend gains a reusable `DataTable` and an `AdminSidebar`; admin pages reuse both. Sessions use soft-delete (`deleted_at`) with a 30-day startup purge sweep.

**Tech Stack:** Node + Express + better-sqlite3 + TS (server, Jest+supertest); React + Vite + Tailwind (client, no test runner — verify via tsc/build/manual).

**Branch:** `feat/admin-ux-overhaul` (already created). Do not merge to main until the user asks.

**Spec:** `docs/superpowers/specs/2026-06-18-admin-ux-overhaul-design.md` — read for full rationale.

---

## File Structure

**Create:**
- `client/src/components/DataTable.tsx` — reusable dense sortable table.
- `client/src/components/AdminSidebar.tsx` — left nav.
- `client/src/pages/admin/AdminSessionsPage.tsx` — sessions list/filters/delete/purge/export.
- `server/src/services/sessions-admin.ts` — session list/soft-delete/purge/retention queries.
- `server/src/services/user-types.ts` — user-types CRUD + in-use guard.
- `server/tests/sessions-admin.test.ts`, `server/tests/user-types.test.ts`, `server/tests/scenario-visibility.test.ts`.

**Modify:**
- `server/src/db/schema.sql`, `server/src/db/migrate.ts`, `server/src/db/seed.ts` — migrations + seed `PM` type + retention sweep call.
- `server/src/routes/admin.ts` — all-users in summary/users (stats exclude admins), sessions endpoints, user-types endpoints, export filters, accept `user_type` on create/edit.
- `server/src/routes/scenarios.ts` — accept/return `visible_to_types`; filter `GET /` by requester `user_type`.
- `server/src/services/excel.ts` — accept a filter object.
- `client/src/pages/admin/AdminLayout.tsx` — use `AdminSidebar`.
- `client/src/api/admin.ts`, `client/src/api/scenarios.ts` — new methods/types.
- `client/src/pages/admin/AdminDashboardPage.tsx` — "All Users", include admins.
- `client/src/pages/admin/UserModalForm.tsx` — "Add User", user-type dropdown.
- `client/src/pages/admin/AdminScenariosPage.tsx` + `ScenarioFormModal.tsx` — DataTable + "Visible to user types".
- `client/src/App.tsx` — `/admin/sessions` route.

---

## Unit 0 — Data model migrations

### Task 0.1: Add columns + user_types table

**Files:** Modify `server/src/db/schema.sql`, `server/src/db/migrate.ts`, `server/src/db/seed.ts`; Test `server/tests/sessions-admin.test.ts`

- [ ] **Step 1: Append to `schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS user_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
```
(The `sessions.deleted_at`, `users.user_type`, `scenarios.visible_to_types` columns are added via `ensureColumn` in migrate.ts — Step 2 — so existing prod volumes get them too. Also add them to the `CREATE TABLE` statements in `schema.sql` for fresh DBs: add `deleted_at TEXT` to the `sessions` table DDL, `user_type TEXT` to `users`, `visible_to_types TEXT` to `scenarios`.)

- [ ] **Step 2: Add idempotent column adds in `migrate.ts`** (after the existing `ensureColumn('users', 'active', ...)` line)

```typescript
ensureColumn('sessions', 'deleted_at', 'TEXT');
ensureColumn('users', 'user_type', 'TEXT');
ensureColumn('scenarios', 'visible_to_types', 'TEXT');
```

- [ ] **Step 3: Seed the default `PM` type in `seed.ts`** (add a `seedUserTypes()` and call it in the main seed flow)

```typescript
function seedUserTypes(): void {
  db.prepare(`INSERT OR IGNORE INTO user_types (name) VALUES ('PM')`).run();
}
```
Call `seedUserTypes();` alongside the other seed calls in the main function.

- [ ] **Step 4: Write a migration test** (`server/tests/sessions-admin.test.ts`)

```typescript
import Database from 'better-sqlite3';
import { setupTestDb, runMigrations } from './helpers';
setupTestDb();

describe('admin overhaul migrations', () => {
  it('adds deleted_at, user_type, visible_to_types, and user_types table', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as any[]).map(c => c.name);
    expect(cols('sessions')).toContain('deleted_at');
    expect(cols('users')).toContain('user_type');
    expect(cols('scenarios')).toContain('visible_to_types');
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(r => r.name);
    expect(tables).toContain('user_types');
  });
});
```

- [ ] **Step 5: Run** — `cd server && npx jest sessions-admin -t "adds deleted_at"` → PASS.
- [ ] **Step 6: Commit** — `git add server/src/db server/tests/sessions-admin.test.ts && git commit -m "feat: migrations for soft-delete, user_type, scenario visibility, user_types"`

---

## Unit 1 — Quick wins (all-users dashboard + labels)

### Task 1.1: Dashboard lists all users; stats exclude admins

**Files:** Modify `server/src/routes/admin.ts`; Test `server/tests/coaching-admin.test.ts` is unrelated — add to a new `server/tests/admin-users.test.ts`.

- [ ] **Step 1: Change the user queries in `admin.ts`.** In `/summary` and `/users`, the table/list of users should select ALL users (`SELECT ... FROM users` — drop `WHERE role = 'pm'`). Keep cohort stats (team averages, flagged PMs, sessionsThisWeek) computed over **non-admin** users only: where stats iterate users, filter `u.role !== 'admin'`. Concretely, in `/summary`: keep `const users = ... FROM users` (all), build the table from all, but compute `stats`/flagged/averages from `users.filter(u => u.role !== 'admin' && u.active === 1)`.

- [ ] **Step 2: Test** (`server/tests/admin-users.test.ts`) — seed an admin + 1 pm with sessions; GET `/api/admin/summary`; assert the `pms` array (rename later) includes the admin email, and `cohort.teamAverageScore` is computed without the admin. (Use the existing seed/login pattern from `coaching-admin.test.ts`.)

```typescript
import { setupTestDb } from './helpers';
setupTestDb();
import request from 'supertest';
import db from '../src/db/connection';
import { runMigrations, seedTestData } from './helpers';
import app from '../src/index';
let token: string;
beforeAll(async () => {
  runMigrations(db); seedTestData(db);
  token = (await request(app).post('/auth/login').send({ email: 'admin@test.com', password: 'admin123' })).body.token;
});
it('summary lists all users including admin', async () => {
  const res = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  const emails = res.body.pms.map((u: any) => u.email);
  expect(emails).toContain('admin@test.com');
});
```
(If `seedTestData` doesn't create extra PMs, this still verifies the admin now appears. Adjust assertions to the actual seed.)

- [ ] **Step 3: Run** — `cd server && npx jest admin-users` → PASS. Then full `npx jest`.
- [ ] **Step 4: Commit** — `git commit -am "feat: admin dashboard includes all users; stats still exclude admins"`

### Task 1.2: Frontend labels

**Files:** Modify `client/src/pages/admin/AdminDashboardPage.tsx`, `client/src/pages/admin/UserModalForm.tsx`

- [ ] **Step 1:** Change visible copy "All PMs" → "All Users" and "Add PM" → "Add User" (search those exact strings in the two files; update only display text, not variable names).
- [ ] **Step 2: Verify** — `cd client && npx tsc --noEmit && npm run build` clean.
- [ ] **Step 3: Commit** — `git commit -am "feat: rename All PMs/Add PM to All Users/Add User"`

---

## Unit 2 — Sidebar navigation

### Task 2.1: AdminSidebar component + AdminLayout rework

**Files:** Create `client/src/components/AdminSidebar.tsx`; Modify `client/src/pages/admin/AdminLayout.tsx`

- [ ] **Step 1: Read `AdminLayout.tsx`** to capture the existing nav items, active-detection (`path.startsWith(...)`), BrandLogo usage, identity/sign-out, and mobile drawer behavior.
- [ ] **Step 2: Create `AdminSidebar.tsx`** — a left column (`<aside>`): `BrandLogo` at top, then vertical nav links (Dashboard `/admin`, Sessions `/admin/sessions`, Users `/admin/users` or dashboard, Scenarios `/admin/scenarios`, Coaching `/admin/coaching`, Branding `/admin/branding`), each highlighting when `path.startsWith` matches (gold left-accent bar + bg). Footer: "Run Practice" link (to the PM start route the current nav uses), Export button (reuse existing export action/href), the signed-in identity (person icon + name), and Sign out. Use existing Tailwind utility classes (`text-slate-text`, `text-gold-*`, `bg-navy-*`, `card`, etc.). Mobile: hidden behind a hamburger that opens it as a drawer (mirror the existing mobile pattern in AdminLayout).
- [ ] **Step 3: Rework `AdminLayout.tsx`** to a two-column shell: `<AdminSidebar/>` + a `<main>` content area rendering `children`. Remove the old top `<nav>`. Keep the Excel-export wiring (move into the sidebar footer).
- [ ] **Step 4: Verify** — `cd client && npx tsc --noEmit && npm run build` clean. Manually confirm every admin page still renders with the sidebar and active highlighting works.
- [ ] **Step 5: Commit** — `git add client/src/components/AdminSidebar.tsx client/src/pages/admin/AdminLayout.tsx && git commit -m "feat: left sidebar nav for the admin app"`

---

## Unit 3 — Sessions page (list, filters, soft-delete, purge) + filtered export

### Task 3.1: Backend — session list service + soft-delete + purge + retention

**Files:** Create `server/src/services/sessions-admin.ts`; Modify `server/src/db/seed.ts` or `server/src/index.ts` (retention sweep on startup); Test `server/tests/sessions-admin.test.ts`

- [ ] **Step 1: Implement `sessions-admin.ts`**

```typescript
import db from '../db/connection';

export interface SessionFilter {
  userId?: number; from?: string; to?: string; scenarioId?: number;
  status?: 'completed' | 'in_progress' | 'empty';
}

function whereClause(f: SessionFilter): { sql: string; params: any[] } {
  const cond = ['s.deleted_at IS NULL']; const params: any[] = [];
  if (f.userId) { cond.push('s.user_id = ?'); params.push(f.userId); }
  if (f.scenarioId) { cond.push('s.scenario_id = ?'); params.push(f.scenarioId); }
  if (f.from) { cond.push('s.started_at >= ?'); params.push(f.from); }
  if (f.to) { cond.push('s.started_at <= ?'); params.push(f.to); }
  return { sql: cond.join(' AND '), params };
}

export function listSessions(f: SessionFilter) {
  const { sql, params } = whereClause(f);
  const rows = db.prepare(
    `SELECT s.id, s.started_at, s.ended_at, s.total_score, s.voice_name,
            u.name AS user_name, u.email AS user_email,
            sc.title AS scenario_title, dp.code AS client_disc_code,
            (SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id) AS turn_count
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN scenarios sc ON sc.id = s.scenario_id
       LEFT JOIN disc_profiles dp ON dp.id = s.client_disc_id
      WHERE ${sql}
      ORDER BY s.started_at DESC`,
  ).all(...params) as any[];
  let withStatus = rows.map(r => ({
    ...r,
    status: r.turn_count === 0 ? 'empty' : (r.ended_at ? 'completed' : 'in_progress'),
  }));
  if (f.status) withStatus = withStatus.filter(r => r.status === f.status);
  return withStatus;
}

export function softDeleteSession(id: number): number {
  return db.prepare(`UPDATE sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`).run(id).changes;
}

export function purgeEmptySessions(): number {
  return db.prepare(
    `UPDATE sessions SET deleted_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL
        AND id NOT IN (SELECT DISTINCT session_id FROM turns)`,
  ).run().changes;
}

// Hard-delete soft-deleted sessions older than 30 days + their children.
export function purgeExpiredSoftDeletes(): number {
  const ids = db.prepare(
    `SELECT id FROM sessions WHERE deleted_at IS NOT NULL AND deleted_at <= datetime('now','-30 days')`,
  ).all() as { id: number }[];
  if (ids.length === 0) return 0;
  const list = ids.map(r => r.id);
  const ph = list.map(() => '?').join(',');
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM turns WHERE session_id IN (${ph})`).run(...list);
    db.prepare(`DELETE FROM events WHERE session_id IN (${ph})`).run(...list);
    db.prepare(`DELETE FROM coaching WHERE session_id IN (${ph})`).run(...list);
    db.prepare(`DELETE FROM sessions WHERE id IN (${ph})`).run(...list);
  });
  tx();
  return list.length;
}
```

- [ ] **Step 2: Call retention sweep on startup.** In `server/src/index.ts`, after the app/db are ready (near the `app.listen`), add:
```typescript
import { purgeExpiredSoftDeletes } from './services/sessions-admin';
try { const n = purgeExpiredSoftDeletes(); if (n) console.log(`[retention] purged ${n} soft-deleted sessions >30d`); } catch (e) { console.error('[retention] sweep failed', e); }
```

- [ ] **Step 3: Tests** (append to `sessions-admin.test.ts`) — cover: `listSessions` excludes soft-deleted; status derivation (empty/in_progress/completed); `purgeEmptySessions` only soft-deletes turn-less sessions; `purgeExpiredSoftDeletes` removes >30d soft-deletes and cascades. Use direct inserts into `sessions`/`turns` with a known DB (`runMigrations(db)` first). Example for purge-empty:
```typescript
it('purgeEmptySessions soft-deletes only turn-less sessions', () => {
  runMigrations(db);
  db.prepare('DELETE FROM sessions').run();
  // seed user + scenario ids exist via seedTestData; insert two sessions
  const u = (db.prepare("SELECT id FROM users LIMIT 1").get() as any).id;
  const s1 = db.prepare("INSERT INTO sessions (user_id, started_at) VALUES (?, datetime('now'))").run(u).lastInsertRowid;
  const s2 = db.prepare("INSERT INTO sessions (user_id, started_at) VALUES (?, datetime('now'))").run(u).lastInsertRowid;
  db.prepare("INSERT INTO turns (session_id, speaker, content) VALUES (?, 'pm', 'hi')").run(s2);
  const n = purgeEmptySessions();
  expect(n).toBe(1);
  expect((db.prepare('SELECT deleted_at FROM sessions WHERE id=?').get(s1) as any).deleted_at).not.toBeNull();
  expect((db.prepare('SELECT deleted_at FROM sessions WHERE id=?').get(s2) as any).deleted_at).toBeNull();
});
```
(Confirm actual `sessions`/`turns` column names against `schema.sql` before finalizing inserts.)

- [ ] **Step 4: Run** `cd server && npx jest sessions-admin` → PASS.
- [ ] **Step 5: Commit** — `git add server/src/services/sessions-admin.ts server/src/index.ts server/tests/sessions-admin.test.ts && git commit -m "feat: admin session list/soft-delete/purge + 30-day retention sweep"`

### Task 3.2: Backend — sessions routes + exclude soft-deleted everywhere

**Files:** Modify `server/src/routes/admin.ts`

- [ ] **Step 1: Add routes** (use the `SessionFilter` from the service):
```typescript
import { listSessions, softDeleteSession, purgeEmptySessions } from '../services/sessions-admin';

router.get('/sessions', (req, res) => {
  const f = {
    userId: req.query.userId ? Number(req.query.userId) : undefined,
    scenarioId: req.query.scenarioId ? Number(req.query.scenarioId) : undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    status: req.query.status as any,
  };
  res.json(listSessions(f));
});
router.delete('/sessions/:id', (req, res) => {
  const n = softDeleteSession(Number(req.params.id));
  res.json({ deleted: n });
});
router.post('/sessions/purge-empty', (_req, res) => {
  res.json({ purged: purgeEmptySessions() });
});
```
- [ ] **Step 2: Exclude soft-deleted** in the existing per-user session queries and stats in `admin.ts` (add `AND s.deleted_at IS NULL` / `AND deleted_at IS NULL` to the session SELECTs in `computeUserStats`, `/summary` sessionsThisWeek, `/users/:id`, etc.). Grep `FROM sessions` in `admin.ts` and guard each.
- [ ] **Step 3: Test** (append) — POST `/api/admin/sessions/purge-empty` returns a count and those sessions stop appearing in GET `/api/admin/sessions`; DELETE hides one. Admin-guarded (401 without token).
- [ ] **Step 4: Run** `npx jest` (full) → green.
- [ ] **Step 5: Commit** — `git commit -am "feat: admin sessions routes; exclude soft-deleted from stats"`

### Task 3.3: Filtered export

**Files:** Modify `server/src/services/excel.ts`, `server/src/routes/admin.ts`

- [ ] **Step 1:** Give `regenerateExcel`/the export handler an optional filter. Simplest: in the `/export.xlsx` route, build the Sessions sheet from `listSessions(filter)` (reusing the service) instead of an unfiltered query, reading the same query params as `/sessions`. Keep no-params behavior = everything (minus soft-deleted). If `excel.ts` writes a file, instead stream a filtered workbook for filtered requests; leave the auto-regenerated full file as-is for the non-filtered case.
- [ ] **Step 2: Test** — GET `/api/admin/export.xlsx?userId=<id>` returns 200 with `Content-Type` spreadsheet; (smoke — assert status + content-type, not cell contents).
- [ ] **Step 3: Commit** — `git commit -am "feat: filtered Excel export (user/date/scenario/status)"`

### Task 3.4: DataTable component

**Files:** Create `client/src/components/DataTable.tsx`

- [ ] **Step 1: Implement a generic dense table:**
```tsx
export interface Column<T> { key: string; header: string; render?: (row: T) => React.ReactNode; sortable?: boolean; className?: string; }
export function DataTable<T extends { id: number | string }>(
  { columns, rows, onRowClick }: { columns: Column<T>[]; rows: T[]; onRowClick?: (row: T) => void },
) { /* sortable header click toggles asc/desc on the clicked key; render rows; reuse navy/gold classes; dense padding like the Zenith reference */ }
```
Sorting: local `useState` of `{key, dir}`; clicking a `sortable` header cycles; compare values generically (string/number). Row hover + pointer when `onRowClick`. Match the existing card/table styling and the coaching table's look.
- [ ] **Step 2: Verify** — `tsc --noEmit && build` clean (component unused yet is fine; or temporarily render nowhere).
- [ ] **Step 3: Commit** — `git add client/src/components/DataTable.tsx && git commit -m "feat: reusable DataTable component"`

### Task 3.5: AdminSessionsPage + route + API

**Files:** Create `client/src/pages/admin/AdminSessionsPage.tsx`; Modify `client/src/api/admin.ts`, `client/src/App.tsx`, `client/src/components/AdminSidebar.tsx`

- [ ] **Step 1: API methods** in `admin.ts`:
```typescript
export interface AdminSessionRow { id: number; started_at: string; ended_at: string | null; total_score: number | null; voice_name: string | null; user_name: string; user_email: string; scenario_title: string | null; client_disc_code: string | null; status: 'completed' | 'in_progress' | 'empty'; }
// in adminApi:
sessions: (q: Record<string,string> = {}) => api.get<AdminSessionRow[]>(`/api/admin/sessions?${new URLSearchParams(q)}`),
deleteSession: (id: number) => api.delete<{deleted:number}>(`/api/admin/sessions/${id}`),
purgeEmpty: () => api.post<{purged:number}>(`/api/admin/sessions/purge-empty`, {}),
```
- [ ] **Step 2: Page** — `AdminSessionsPage.tsx`: filter controls (user select, date from/to, scenario select, status select), a `DataTable<AdminSessionRow>` (columns: Date, User, Scenario, DISC, Score, Status), row click → `/admin/sessions/:id`, a per-row Delete (confirm), a "Purge empty sessions" button (confirm), and an "Export" button linking to `/api/admin/export.xlsx?` + current filters. Reload list after delete/purge.
- [ ] **Step 3: Route** in `App.tsx`: `<Route path="/admin/sessions" element={<ProtectedRoute requireAdmin><AdminSessionsPage/></ProtectedRoute>} />` + import. Ensure it does NOT shadow `/admin/sessions/:id` (more specific route still matches its param path; React Router handles exact vs param — keep both).
- [ ] **Step 4: Sidebar link** already added in Unit 2 (`/admin/sessions`).
- [ ] **Step 5: Verify** — `tsc --noEmit && build` clean.
- [ ] **Step 6: Commit** — `git add -A client/src && git commit -m "feat: admin Sessions page (table, filters, delete, purge, export)"`

---

## Unit 4 — Tabular polish (Scenarios + Users on DataTable)

### Task 4.1: Scenarios + Users lists use DataTable

**Files:** Modify `client/src/pages/admin/AdminScenariosPage.tsx`, `client/src/pages/admin/AdminDashboardPage.tsx`

- [ ] **Step 1:** Refactor the Scenarios admin list to render via `DataTable` (columns: Title, Status (active/inactive), Sessions count, + an actions column for edit/deactivate/delete). Preserve all existing actions.
- [ ] **Step 2:** Refactor the dashboard "All Users" list to `DataTable` (columns: Name, Email, Type, Role, Sessions, Avg score, Last active; row click → user detail). Keep flagged-PM styling if present (e.g., a warning chip column).
- [ ] **Step 3: Verify** — `tsc --noEmit && build` clean; actions still work.
- [ ] **Step 4: Commit** — `git commit -am "feat: scenarios + users lists on DataTable"`

---

## Unit 5 — User types + scenario gating

### Task 5.1: Backend — user-types service + routes + user_type on users

**Files:** Create `server/src/services/user-types.ts`; Modify `server/src/routes/admin.ts`; Test `server/tests/user-types.test.ts`

- [ ] **Step 1: Implement `user-types.ts`**
```typescript
import db from '../db/connection';
export function listUserTypes(): { id: number; name: string }[] {
  return db.prepare('SELECT id, name FROM user_types ORDER BY name').all() as any[];
}
export function addUserType(name: string): number {
  return Number(db.prepare('INSERT OR IGNORE INTO user_types (name) VALUES (?)').run(name.trim()).lastInsertRowid);
}
export function userTypeInUse(name: string): number {
  const u = (db.prepare('SELECT COUNT(*) n FROM users WHERE user_type = ?').get(name) as any).n;
  const s = (db.prepare("SELECT COUNT(*) n FROM scenarios WHERE visible_to_types LIKE ?").get(`%"${name}"%`) as any).n;
  return u + s;
}
export function removeUserType(name: string): void {
  db.prepare('DELETE FROM user_types WHERE name = ?').run(name);
}
```
- [ ] **Step 2: Routes** in `admin.ts`:
```typescript
import { listUserTypes, addUserType, userTypeInUse, removeUserType } from '../services/user-types';
router.get('/user-types', (_req,res)=>res.json(listUserTypes()));
router.post('/user-types', (req,res)=>{ const name=(req.body?.name||'').trim(); if(name.length<1){res.status(400).json({error:'name required'});return;} addUserType(name); res.json(listUserTypes()); });
router.delete('/user-types/:name', (req,res)=>{ const n=userTypeInUse(req.params.name); if(n>0){res.status(409).json({error:`In use by ${n} user(s)/scenario(s)`});return;} removeUserType(req.params.name); res.json(listUserTypes()); });
```
- [ ] **Step 3: Accept `user_type`** in POST `/users` and PATCH `/users/:id` — add `user_type` to the destructure and the INSERT/UPDATE column list (nullable). Include `user_type` in the users SELECTs.
- [ ] **Step 4: Tests** (`user-types.test.ts`) — CRUD; in-use guard returns 409 when a user has the type; create user with `user_type` persists it. Admin-guarded.
- [ ] **Step 5: Run** `npx jest` green. **Commit** — `git commit -am "feat: user types CRUD + user_type on users"`

### Task 5.2: Backend — scenario visibility

**Files:** Modify `server/src/routes/scenarios.ts`; Test `server/tests/scenario-visibility.test.ts`

- [ ] **Step 1: Accept/return `visible_to_types`** (stored as a JSON array string) in scenario create (`POST /`) and edit (`PATCH /:id`) and the admin GETs.
- [ ] **Step 2: Filter `GET /api/scenarios`** by the requester's `user_type`: load the user's `user_type` (from `req.user`/DB). Return a scenario if it's admin requester, OR `visible_to_types` is null/empty/`[]`, OR the array includes the user's `user_type`. Implement in SQL or JS post-filter (JS is simpler given JSON storage):
```typescript
const me = db.prepare('SELECT role, user_type FROM users WHERE id = ?').get(req.user!.userId) as any;
rows = rows.filter(r => {
  if (me.role === 'admin') return true;
  if (!r.visible_to_types) return true;
  let types: string[] = []; try { types = JSON.parse(r.visible_to_types); } catch { types = []; }
  return types.length === 0 || (me.user_type && types.includes(me.user_type));
});
```
- [ ] **Step 3: Tests** (`scenario-visibility.test.ts`) — admin sees all; member with type 'PM' sees untyped + PM-typed, not 'Sales'-only; member with NULL type sees only untyped.
- [ ] **Step 4: Run** `npx jest` green. **Commit** — `git commit -am "feat: scenario visibility by user type"`

### Task 5.3: Frontend — user-type dropdown + scenario visibility selector + type management

**Files:** Modify `client/src/pages/admin/UserModalForm.tsx`, `client/src/pages/admin/ScenarioFormModal.tsx`, `client/src/api/admin.ts`, `client/src/api/scenarios.ts`; optionally a small types-manager UI on the Users page.

- [ ] **Step 1: API** — `adminApi.userTypes()/addUserType(name)/removeUserType(name)`; scenarios API carries `visible_to_types: string[]`.
- [ ] **Step 2: UserModalForm** — add a "User type" `<select>` populated from `adminApi.userTypes()`, bound to the user's `user_type`. Send it on create/edit.
- [ ] **Step 3: ScenarioFormModal** — add a "Visible to user types" multi-select (checkbox list from `userTypes()`); empty = all. Store as array; serialize to the API.
- [ ] **Step 4: Type management** — a small panel (on the Users page or a modal): list types, add (text + button), remove (with the 409 in-use message surfaced). Keep minimal.
- [ ] **Step 5: Verify** — `tsc --noEmit && build` clean.
- [ ] **Step 6: Commit** — `git commit -am "feat: user-type dropdown, scenario visibility selector, type management UI"`

---

## Unit 6 — Docs + final verification

### Task 6.1: Docs sync + full verification

- [ ] **Step 1:** Add REBUILD_ME_GUIDE §13.21 (sidebar, Sessions page + soft-delete/30-day retention, filtered export, user types + scenario gating, all-users dashboard) + matching PROGRESS §13.21 block (same commit).
- [ ] **Step 2: Full verify** — `cd server && npm run build && npx jest` (all green); `cd client && npx tsc --noEmit && npm run build` (clean).
- [ ] **Step 3: Commit** — `git commit -am "docs: admin UX overhaul"`

---

## Self-Review

- **Spec coverage:** Unit 1 (#3 quick wins), Unit 2 (#7 sidebar), Unit 3 (#1 tabular sessions + #2 reachable history + #5 soft-delete/purge + #6 filtered export), Unit 4 (#1 across scenarios/users), Unit 5 (#4 user types + scenario gating). Soft-delete + 30-day retention (startup sweep), stats-exclude-admins, admin-sees-all-scenarios — all have tasks. ✓
- **Placeholder scan:** code provided for all backend/data/test tasks; UI tasks specify exact files, props, and which existing components to mirror (DataTable interface + AdminSidebar contents are concrete). No "TBD"/"handle edge cases" left abstract.
- **Type consistency:** `SessionFilter` shared between service (3.1) and routes (3.2/3.3); `AdminSessionRow` matches the service SELECT (3.1) and the client type (3.5); `visible_to_types` is a JSON-array string server-side, `string[]` client-side (serialized at the API boundary — noted in 5.2/5.3); `user_type` nullable string throughout; `purgeExpiredSoftDeletes`/`purgeEmptySessions`/`softDeleteSession`/`listSessions` names consistent between 3.1, 3.2, and index.ts.
