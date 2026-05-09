import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getCoachingCard, getGeneralCoachingCues } from '../prompts/loader';

const router = Router();

// GET /api/coaching-cards/general — universal coaching cues (always returned)
router.get('/general', requireAuth, (_req: Request, res: Response): void => {
  const body = getGeneralCoachingCues();
  res.json({ disc: 'general', body });
});

// GET /api/coaching-cards/:discCode — DISC-specific PM-facing coaching card.
// The discCode comes URL-encoded (e.g. I%2FS for I/S). Express decodes it
// automatically so req.params.discCode arrives as the decoded value.
router.get('/:discCode', requireAuth, (req: Request, res: Response): void => {
  const code = String(req.params.discCode);
  const body = getCoachingCard(code);
  if (!body) {
    res.status(404).json({ error: `No coaching card for DISC profile: ${code}` });
    return;
  }
  res.json({ disc: code, body });
});

export default router;
