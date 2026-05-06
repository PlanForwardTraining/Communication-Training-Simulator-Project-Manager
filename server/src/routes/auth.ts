import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { User, JwtPayload } from '../types';

const router = Router();

// POST /auth/login
router.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const payload: JwtPayload = { userId: user.id, role: user.role };
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as import('ms').StringValue;
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      disc_profile: user.disc_profile,
      role: user.role,
    },
  });
});

// GET /auth/me
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  const user = db.prepare('SELECT id, name, email, disc_profile, role FROM users WHERE id = ?')
    .get(req.user!.userId) as Omit<User, 'password_hash' | 'created_at'> | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

export default router;
