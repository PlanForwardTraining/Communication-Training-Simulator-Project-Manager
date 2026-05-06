import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/disc-profiles
router.get('/', requireAuth, (_req: Request, res: Response): void => {
  const profiles = db.prepare('SELECT id, code, name FROM disc_profiles ORDER BY id').all();
  res.json(profiles);
});

// GET /api/disc-profiles/:code
router.get('/:code', requireAuth, (req: Request, res: Response): void => {
  const profile = db.prepare('SELECT * FROM disc_profiles WHERE code = ?').get(req.params.code);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json(profile);
});

export default router;
