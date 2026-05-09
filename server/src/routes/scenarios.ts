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

// GET /api/scenarios — PM view: only active scenarios
router.get('/', requireAuth, (_req: Request, res: Response): void => {
  const scenarios = db.prepare(
    'SELECT id, slug, title, description, active, updated_at FROM scenarios WHERE active = 1'
  ).all();
  res.json(scenarios);
});

// GET /api/scenarios/admin — admin view: all scenarios with session counts
router.get('/admin', requireAuth, requireAdmin, (_req: Request, res: Response): void => {
  const rows = db.prepare(`
    SELECT
      s.id, s.slug, s.title, s.description, s.active, s.updated_at,
      (SELECT COUNT(*) FROM sessions WHERE scenario_id = s.id) AS session_count
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
  const { slug, title, description, body_markdown } = req.body;
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
  try {
    const result = db.prepare(
      'INSERT INTO scenarios (slug, title, description, body_markdown) VALUES (?, ?, ?, ?)'
    ).run(slug, title, description, body_markdown);
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
  const { title, description, body_markdown, active } = req.body;

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
