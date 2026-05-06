import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import scenariosRouter from './routes/scenarios';
import discProfilesRouter from './routes/disc-profiles';
import rubricRouter from './routes/rubric';
import sessionsRouter from './routes/sessions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
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
});

export default app;
