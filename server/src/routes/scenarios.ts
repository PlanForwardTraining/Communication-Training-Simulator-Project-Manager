import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// GET /api/scenarios
router.get('/', requireAuth, (_req: Request, res: Response): void => {
  const scenarios = db.prepare(
    'SELECT id, slug, title, description, active, updated_at FROM scenarios WHERE active = 1'
  ).all();
  res.json(scenarios);
});

// GET /api/scenarios/by-slug/:slug — briefing view: shows only Setup, What's
// Happened, and What the Client Knows. Hides "What the PM Must Communicate"
// onwards because those sections (must-communicate checklist, desired
// outcomes, pitfalls, realistic pushback) are coaching/scoring material.
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

  // The brief section ends at the explicit marker. Everything below the marker
  // is for the AI client (persona behavior) and the coaching engine (scoring).
  const MARKER_RE = /<!--\s*BRIEF END\s*-->/i;
  const cutoff = briefing.search(MARKER_RE);
  if (cutoff >= 0) briefing = briefing.slice(0, cutoff);

  res.json({
    id: scenario.id,
    slug: scenario.slug,
    title: scenario.title,
    body_briefing: briefing.trim(),
  });
});

// GET /api/scenarios/:id
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
  try {
    const result = db.prepare(
      'INSERT INTO scenarios (slug, title, description, body_markdown) VALUES (?, ?, ?, ?)'
    ).run(slug, title, description, body_markdown);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Slug already exists' });
    } else {
      throw e;
    }
  }
});

// PATCH /api/scenarios/:id — admin only
router.patch('/:id', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const { title, description, body_markdown, active } = req.body;
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

export default router;
