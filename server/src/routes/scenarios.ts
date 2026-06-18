import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// Brief vs. answer-key marker. PM-facing brief view stops here; persona prompt
// builder uses the full body. Scenario edits via the admin UI must include
// this marker — validation below enforces it.
const MARKER_RE = /<!--\s*BRIEF END\s*-->/i;

// Slug must be URL-safe lowercase-dashes, e.g. "06-budget-pushback".
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface ScenarioRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  body_markdown: string;
  active: number;
  updated_at: string;
  visible_to_types: string | null;
}

/**
 * Parse visible_to_types from a JSON string to an array.
 * Returns null when the field is empty/missing (means "visible to all").
 */
function parseVisibleToTypes(raw: string | null | undefined): string[] | null {
  if (!raw || raw.trim() === '' || raw.trim() === '[]') return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(v => typeof v === 'string')) {
      return parsed.length === 0 ? null : parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Check whether a scenario (with visible_to_types JSON string) is visible to a requester.
 * Admin always sees everything. A scenario with null/empty visible_to_types is visible to all.
 */
function isVisibleTo(
  scenarioVisibleToTypesRaw: string | null | undefined,
  requesterRole: string,
  requesterUserType: string | null | undefined,
): boolean {
  if (requesterRole === 'admin') return true;
  const types = parseVisibleToTypes(scenarioVisibleToTypesRaw);
  if (!types) return true; // untyped — visible to all
  if (!requesterUserType) return false; // typed scenario, but user has no type
  return types.includes(requesterUserType);
}

/**
 * Validate visible_to_types input: must be omitted/null/'' or a JSON array of strings.
 * Returns the canonical JSON string to store (null if empty/omitted).
 */
function validateAndNormalizeVisibleToTypes(value: unknown): { stored: string | null } | { error: string } {
  if (value === undefined || value === null || value === '') {
    return { stored: null };
  }
  if (Array.isArray(value)) {
    if (!value.every(v => typeof v === 'string')) {
      return { error: 'visible_to_types must be an array of strings' };
    }
    return { stored: value.length === 0 ? null : JSON.stringify(value) };
  }
  if (typeof value === 'string') {
    if (value.trim() === '' || value.trim() === '[]') return { stored: null };
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.every(v => typeof v === 'string')) {
        return { stored: parsed.length === 0 ? null : JSON.stringify(parsed) };
      }
    } catch {
      // fall through
    }
  }
  return { error: 'visible_to_types must be a JSON array of strings or omitted' };
}

function validateScenarioBody(body: string): string | null {
  if (typeof body !== 'string' || body.trim().length < 20) {
    return 'Scenario body is too short.';
  }
  if (!MARKER_RE.test(body)) {
    return 'Scenario body must include a "<!-- BRIEF END -->" marker so the PM brief can be separated from the answer-key sections.';
  }
  return null;
}

// GET /api/scenarios — PM view: only active scenarios, filtered by user_type visibility
router.get('/', requireAuth, (req: Request, res: Response): void => {
  // Load the requester's role + user_type from DB (req.user only carries userId + role from JWT)
  const me = db.prepare('SELECT role, user_type FROM users WHERE id = ?').get(req.user!.userId) as
    | { role: string; user_type: string | null }
    | undefined;

  const scenarios = db.prepare(
    'SELECT id, slug, title, description, active, updated_at, visible_to_types FROM scenarios WHERE active = 1'
  ).all() as ScenarioRow[];

  const filtered = scenarios.filter(s =>
    isVisibleTo(s.visible_to_types, me?.role ?? 'pm', me?.user_type ?? null)
  );

  // Include visible_to_types as a parsed string[] so the PM picker can render the Role(s) column.
  // Empty array means "visible to all" (no restriction). Filtering already happened above.
  res.json(filtered.map(({ visible_to_types, ...rest }) => ({
    ...rest,
    visible_to_types: parseVisibleToTypes(visible_to_types) ?? [],
  })));
});

// GET /api/scenarios/admin — admin view: all scenarios with session counts
router.get('/admin', requireAuth, requireAdmin, (_req: Request, res: Response): void => {
  const rows = db.prepare(`
    SELECT
      s.id, s.slug, s.title, s.description, s.active, s.updated_at,
      s.visible_to_types,
      (SELECT COUNT(*) FROM sessions WHERE scenario_id = s.id AND deleted_at IS NULL) AS session_count
    FROM scenarios s
    ORDER BY s.active DESC, s.slug ASC
  `).all();
  res.json(rows);
});

// GET /api/scenarios/by-slug/:slug — briefing view: trims at BRIEF END marker
router.get('/by-slug/:slug', requireAuth, (req: Request, res: Response): void => {
  const scenario = db.prepare(
    'SELECT id, slug, title, body_markdown FROM scenarios WHERE slug = ? AND active = 1'
  ).get(req.params.slug) as
    | { id: number; slug: string; title: string; body_markdown: string }
    | undefined;

  if (!scenario) {
    res.status(404).json({ error: 'Scenario not found' });
    return;
  }

  let briefing = scenario.body_markdown;
  briefing = briefing.replace(/^>\s*\*\*Status:\*\*[^\n]*\n?/m, '');
  const cutoff = briefing.search(MARKER_RE);
  if (cutoff >= 0) briefing = briefing.slice(0, cutoff);

  res.json({
    id: scenario.id,
    slug: scenario.slug,
    title: scenario.title,
    body_briefing: briefing.trim(),
  });
});

// GET /api/scenarios/:id — admin: full record incl. body_markdown
router.get('/:id', requireAuth, (req: Request, res: Response): void => {
  const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(Number(req.params.id));
  if (!scenario) {
    res.status(404).json({ error: 'Scenario not found' });
    return;
  }
  res.json(scenario);
});

// POST /api/scenarios — admin only
router.post('/', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const { slug, title, description, body_markdown, visible_to_types } = req.body;
  if (!slug || !title || !description || !body_markdown) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  if (!SLUG_RE.test(slug)) {
    res.status(400).json({ error: 'Slug must be lowercase letters, numbers, and dashes only.' });
    return;
  }
  const bodyError = validateScenarioBody(body_markdown);
  if (bodyError) {
    res.status(400).json({ error: bodyError });
    return;
  }
  const vttResult = validateAndNormalizeVisibleToTypes(visible_to_types);
  if ('error' in vttResult) {
    res.status(400).json({ error: vttResult.error });
    return;
  }
  try {
    const result = db.prepare(
      'INSERT INTO scenarios (slug, title, description, body_markdown, visible_to_types) VALUES (?, ?, ?, ?, ?)'
    ).run(slug, title, description, body_markdown, vttResult.stored);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'A scenario with that slug already exists.' });
    } else {
      throw e;
    }
  }
});

// PATCH /api/scenarios/:id — admin only
router.patch('/:id', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const { title, description, body_markdown, active, visible_to_types } = req.body;

  if (body_markdown !== undefined) {
    const err = validateScenarioBody(body_markdown);
    if (err) {
      res.status(400).json({ error: err });
      return;
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (body_markdown !== undefined) { updates.push('body_markdown = ?'); values.push(body_markdown); }
  if (active !== undefined) { updates.push('active = ?'); values.push(active ? 1 : 0); }

  if (visible_to_types !== undefined) {
    const vttResult = validateAndNormalizeVisibleToTypes(visible_to_types);
    if ('error' in vttResult) {
      res.status(400).json({ error: vttResult.error });
      return;
    }
    updates.push('visible_to_types = ?');
    values.push(vttResult.stored);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  db.prepare(`UPDATE scenarios SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ updated: true });
});

// DELETE /api/scenarios/:id — admin only, hard delete with FK guard.
// Refuses if any sessions reference this scenario; admin must soft-delete
// (set active=false via PATCH) instead.
router.delete('/:id', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const scenario = db.prepare('SELECT id FROM scenarios WHERE id = ?').get(id) as
    | { id: number }
    | undefined;
  if (!scenario) {
    res.status(404).json({ error: 'Scenario not found' });
    return;
  }

  // Intentionally counts ALL rows including soft-deleted: a physical FK row still
  // references this scenario, so the DB would reject the DELETE regardless of deleted_at.
  const sessionCount = (db
    .prepare('SELECT COUNT(*) AS n FROM sessions WHERE scenario_id = ?')
    .get(id) as { n: number }).n;

  if (sessionCount > 0) {
    res.status(409).json({
      error: `Cannot hard-delete — ${sessionCount} past session(s) reference this scenario. Deactivate it instead.`,
      sessionCount,
    });
    return;
  }

  db.prepare('DELETE FROM scenarios WHERE id = ?').run(id);
  res.json({ deleted: true });
});

export default router;
