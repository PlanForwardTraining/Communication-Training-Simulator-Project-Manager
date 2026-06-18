# Unify Role + User Type into a single "Role" — Design

**Date:** 2026-06-18  **Status:** Approved for planning  **Author:** Tyler + Claude
**Branch:** `feat/unify-roles`.

## Why
Today a user has two overlapping fields: **Role** (`admin`|`pm`, controls admin access) and **User type** (a label for scenario gating). "PM" lives in both, which is confusing. Collapse them into **one admin-managed Role** per user.

## Model
- A single admin-managed **Roles** list (reuses the existing `user_types` table — UI relabeled "Roles"). Seeded with **Admin** + **PM**.
- **"Admin" is reserved**: it is the role that grants the admin dashboard, and it cannot be deleted or renamed. Every other role (PM, Sales, Superintendent, …) is a member role that also gates scenarios.
- Each user has exactly **one** role.

## Safety-first storage (no risky migration)
The users table has a hard `CHECK(role IN ('pm','admin'))` constraint; storing arbitrary role names there would require rebuilding the table on the live volume (FK from `sessions` → risky). Instead:
- The user-facing **Role = the role name**, stored in **`users.user_type`** (no CHECK — safe for any name).
- **`users.role`** is kept as an internal **derived access flag**: `'admin'` iff the role name is `Admin`, else `'pm'`. Maintained server-side on every create/edit. This keeps the existing CHECK satisfied and leaves `requireAdmin` / JWT / admin stat-filtering (`role !== 'admin'`) **unchanged and secure**.
- Net: one field in the UI; the derived flag is invisible plumbing.

## Migration (idempotent, no rebuild)
- Seed `Admin` into `user_types` (alongside `PM`).
- Backfill `users.user_type`: `UPDATE users SET user_type = CASE WHEN lower(role)='admin' THEN 'Admin' WHEN user_type IS NULL OR user_type='' THEN 'PM' ELSE user_type END`. (Existing admins → `Admin`; untyped members → `PM`; members with a type keep it.) `users.role` already holds `admin`/`pm` and stays consistent. Re-running is safe.

## Backend
- **Seed:** add `Admin` to the `user_types` registry.
- **Roles registry endpoints** (currently `/api/admin/user-types`): keep the path; **block deleting `Admin`** (reserved → 400) in addition to the existing in-use guard.
- **`POST /api/admin/users` + `PATCH /api/admin/users/:id`:** accept a single `role` = **role name** (e.g. `"Admin"`, `"PM"`, `"Sales"`). Validate it exists in the roles registry. Derive and store: `user_type = name`; `role = (name === 'Admin' ? 'admin' : 'pm')`. (The admin UI is the only caller.)
- The admin user list/detail keep returning both `role` (access flag) and `user_type` (name) — no response-shape break; the **name is the displayed Role**.
- `requireAdmin`, JWT, `/summary` & `/users` stat filtering (`role !== 'admin'`), and scenario gating (`visible_to_types` matched against `user_type`) are **unchanged**.

## Frontend
- **Roles panel** (was "User Types", on the Users page): heading → **Roles**; helper text updated; **Admin** shown but its remove-× is hidden/disabled (reserved); adding/removing other roles unchanged.
- **Add/Edit User form** (`UserModalForm`): replace the separate Role (admin/pm) dropdown **and** the User-type dropdown with **one "Role" dropdown** sourced from the roles registry (includes Admin). On submit send `role: <name>`. Edit pre-selects the user's current role name (from `user_type`, or `Admin` if the user is an admin).
- **Users table:** a single **Role** column showing the role name (drop the separate Type/Role split).
- **Scenario editor:** "Visible to user types" → **"Visible to roles"**; the checklist is the roles list **excluding Admin** (admins always see everything, so listing it is meaningless).

## Tests (server)
- Roles registry seeded with `Admin` + `PM`; **cannot delete `Admin`** (reserved → 400); in-use guard still works for others.
- Create user with role `Sales` → stored `user_type='Sales'`, `role='pm'`; create with `Admin` → `role='admin'`, `user_type='Admin'`.
- `requireAdmin` still admits an Admin-role user and rejects a member.
- Scenario gating by role name still filters correctly (admin sees all; member sees own-role + untyped).
- Migration backfill: an existing `role='admin'` user ends with `user_type='Admin'`; an untyped `pm` user ends with `PM`.

## Out of scope
- True single DB column / dropping the CHECK constraint (deliberately avoided — too risky on the live volume).
- Per-role granular permissions beyond Admin-vs-member.

## Docs
REBUILD_ME_GUIDE §13.23 + PROGRESS (paired) describing the unified Role model + the derived-flag approach.
