import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';
import { User } from '../types';

const router = Router();

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

// POST /api/users — admin only
router.post('/', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const { name, email, password, disc_profile, role } = req.body;
  if (!name || !email || !password || !disc_profile || !role) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  if (!['pm', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Role must be pm or admin' });
    return;
  }
  const password_hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, disc_profile, role) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, password_hash, disc_profile, role);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      throw e;
    }
  }
});

// PATCH /api/users/:id — admin only
router.patch('/:id', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const { name, disc_profile, role, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const newName = name ?? user.name;
  const newDisc = disc_profile ?? user.disc_profile;
  const newRole = role ?? user.role;
  const newHash = password ? bcrypt.hashSync(password, 10) : user.password_hash;

  db.prepare(
    'UPDATE users SET name = ?, disc_profile = ?, role = ?, password_hash = ? WHERE id = ?'
  ).run(newName, newDisc, newRole, newHash, id);

  res.json({ updated: true });
});

export default router;
