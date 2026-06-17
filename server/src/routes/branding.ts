import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';
import { getBranding, setBranding, resetBranding, isHexColor, isLogoUrl } from '../services/branding';

const router = Router();

// Public — applied app-wide incl. the login page.
router.get('/', (_req: Request, res: Response): void => {
  res.json(getBranding());
});

router.patch('/', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const { primary, secondary, logoUrl } = req.body ?? {};
  if (!isHexColor(primary)) { res.status(400).json({ error: 'primary must be a #RRGGBB hex color' }); return; }
  if (!isHexColor(secondary)) { res.status(400).json({ error: 'secondary must be a #RRGGBB hex color' }); return; }
  if (!isLogoUrl(logoUrl)) { res.status(400).json({ error: 'logoUrl must be empty or an http(s) URL' }); return; }
  setBranding({ primary, secondary, logoUrl });
  res.json(getBranding());
});

router.delete('/', requireAuth, requireAdmin, (_req: Request, res: Response): void => {
  resetBranding();
  res.json(getBranding());
});

export default router;
