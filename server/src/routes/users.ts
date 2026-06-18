import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireAuth } from '../middleware/auth';

const router = Router();

// NOTE: user create/edit lives on the admin routes (`POST`/`PATCH /api/admin/users`),
// which derive the access flag from the unified Role name. The create/edit handlers
// that used to live here were removed to avoid a second, unvalidated write path.

// GET /api/users — admin: all users; pm: own user only
router.get('/', requireAuth, (req: Request, res: Response): void => {
  if (req.user!.role === 'admin') {
    const users = db.prepare(
      'SELECT id, name, email, disc_profile, role, created_at FROM users'
    ).all();
    res.json(users);
  } else {
    const user = db.prepare(
      'SELECT id, name, email, disc_profile, role, created_at FROM users WHERE id = ?'
    ).get(req.user!.userId);
    res.json(user ? [user] : []);
  }
});

// GET /api/users/:id — admin: any user; pm: own only
router.get('/:id', requireAuth, (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  if (req.user!.role !== 'admin' && req.user!.userId !== id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const user = db.prepare(
    'SELECT id, name, email, disc_profile, role, created_at FROM users WHERE id = ?'
  ).get(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

export default router;
