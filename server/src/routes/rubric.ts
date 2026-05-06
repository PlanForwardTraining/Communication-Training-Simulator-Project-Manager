import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// GET /api/rubric-items
router.get('/', requireAuth, (_req: Request, res: Response): void => {
  const items = db.prepare('SELECT * FROM rubric_items ORDER BY display_order').all();
  res.json(items);
});

// POST /api/rubric-items — admin only
router.post('/', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const { name, weight, description, display_order } = req.body;
  if (!name || weight === undefined || !description || display_order === undefined) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const result = db.prepare(
    'INSERT INTO rubric_items (name, weight, description, display_order) VALUES (?, ?, ?, ?)'
  ).run(name, weight, description, display_order);
  res.status(201).json({ id: result.lastInsertRowid });
});

// PATCH /api/rubric-items/:id — admin only
router.patch('/:id', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const { name, weight, description } = req.body;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (weight !== undefined) { updates.push('weight = ?'); values.push(weight); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(id);
  db.prepare(`UPDATE rubric_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ updated: true });
});

export default router;
