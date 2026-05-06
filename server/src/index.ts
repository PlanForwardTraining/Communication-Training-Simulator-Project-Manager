import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Routes (wired up as each is built)
import authRouter from './routes/auth';
app.use('/auth', authRouter);
// import usersRouter from './routes/users';
// app.use('/api/users', usersRouter);
// import scenariosRouter from './routes/scenarios';
// app.use('/api/scenarios', scenariosRouter);
// import discProfilesRouter from './routes/disc-profiles';
// app.use('/api/disc-profiles', discProfilesRouter);
// import rubricRouter from './routes/rubric';
// app.use('/api/rubric-items', rubricRouter);

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
