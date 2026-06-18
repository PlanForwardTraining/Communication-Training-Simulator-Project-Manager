import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import scenariosRouter from './routes/scenarios';
import discProfilesRouter from './routes/disc-profiles';
import rubricRouter from './routes/rubric';
import sessionsRouter from './routes/sessions';
import adminRouter from './routes/admin';
import coachingCardsRouter from './routes/coaching-cards';
import brandingRouter from './routes/branding';
import elevenLabsWebhookRouter from './routes/elevenlabs-webhook';
import { purgeExpiredSoftDeletes } from './services/sessions-admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CLIENT_ORIGIN may be a single URL or a comma-separated list (used during the
// Vercel migration so both the old and new frontend URLs are allowed at once).
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Webhook route must be registered BEFORE express.json() so it receives the raw body
app.use('/api/elevenlabs/webhook', express.raw({ type: 'application/json' }), elevenLabsWebhookRouter);

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/disc-profiles', discProfilesRouter);
app.use('/api/rubric-items', rubricRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/coaching-cards', coachingCardsRouter);
app.use('/api/branding', brandingRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Retention sweep: hard-delete sessions soft-deleted >30 days ago
  try {
    const purged = purgeExpiredSoftDeletes();
    if (purged > 0) console.log(`[retention] Purged ${purged} expired session(s) (>30d soft-delete)`);
  } catch (err) {
    console.error('[retention] purgeExpiredSoftDeletes failed at startup:', err);
  }
});

export default app;
