import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';
import { generateCoaching } from '../services/claude';
import { getDiscProfile, getRubric } from '../prompts/loader';
import { TurnRecord, EventRecord, User } from '../types';
import { getSignedUrlForSession } from '../services/elevenlabs-cai';

const router = Router();

// POST /api/sessions — create a new session
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { scenarioSlug, clientDiscCode } = req.body;

  if (!scenarioSlug || !clientDiscCode) {
    res.status(400).json({ error: 'scenarioSlug and clientDiscCode are required' });
    return;
  }

  // Validate scenario exists in DB
  const scenario = db.prepare('SELECT id FROM scenarios WHERE slug = ? AND active = 1').get(scenarioSlug) as { id: number } | undefined;
  if (!scenario) {
    res.status(404).json({ error: 'Scenario not found' });
    return;
  }

  // Validate DISC profile exists
  const discProfile = db.prepare('SELECT id FROM disc_profiles WHERE code = ?').get(clientDiscCode) as { id: number } | undefined;
  if (!discProfile) {
    res.status(404).json({ error: 'DISC profile not found' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO sessions (user_id, scenario_id, client_disc_id, voice_id, voice_name) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user!.userId, scenario.id, discProfile.id, '', '');

  const sessionId = result.lastInsertRowid as number;

  try {
    const { signedUrl, agentId, voiceId, voiceName, personaPrompt } =
      await getSignedUrlForSession(sessionId, scenarioSlug, clientDiscCode);

    db.prepare('UPDATE sessions SET voice_id = ?, voice_name = ? WHERE id = ?')
      .run(voiceId, voiceName, sessionId);

    res.status(201).json({ sessionId, signedUrl, agentId, voiceId, voiceName, personaPrompt });
  } catch (err) {
    console.error('Failed to get signed URL from ElevenLabs:', err);
    res.status(500).json({ error: 'Failed to initialize ElevenLabs session' });
  }
});

// POST /api/sessions/:id/end — generate coaching and close session
router.post('/:id/end', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const sessionId = Number(req.params.id);

  // Get session and verify ownership
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as {
    id: number; user_id: number; scenario_id: number; client_disc_id: number;
    started_at: string; ended_at: string | null; total_score: number | null;
  } | undefined;

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (req.user!.role !== 'admin' && session.user_id !== req.user!.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (session.ended_at) {
    // Session already ended — return existing coaching
    const existing = db.prepare('SELECT * FROM coaching WHERE session_id = ?').get(sessionId);
    res.json(existing);
    return;
  }

  // Get PM's DISC profile
  const pmUser = db.prepare('SELECT disc_profile FROM users WHERE id = ?').get(session.user_id) as { disc_profile: string } | undefined;
  if (!pmUser) {
    res.status(404).json({ error: 'PM user not found' });
    return;
  }

  // Get client DISC profile
  const clientDiscRow = db.prepare('SELECT code FROM disc_profiles WHERE id = ?').get(session.client_disc_id) as { code: string } | undefined;
  if (!clientDiscRow) {
    res.status(404).json({ error: 'Client DISC profile not found' });
    return;
  }

  const pmDisc = getDiscProfile(pmUser.disc_profile);
  const clientDisc = getDiscProfile(clientDiscRow.code);

  if (!pmDisc || !clientDisc) {
    res.status(400).json({ error: 'DISC profile content not found in /content/' });
    return;
  }

  // Accept transcript from client (browser SDK captured these during the call)
  const body = (req.body || {}) as {
    turns?: { speaker: 'pm' | 'client'; content: string }[];
    events?: { type: string; speaker?: string }[];
  };
  const { turns: clientTurns, events: clientEvents } = body;

  // Save turns from client to DB
  if (clientTurns && clientTurns.length > 0) {
    const insertTurn = db.prepare(
      'INSERT INTO turns (session_id, speaker, content) VALUES (?, ?, ?)'
    );
    for (const turn of clientTurns) {
      insertTurn.run(sessionId, turn.speaker, turn.content);
    }
  }

  // Save events from client to DB
  if (clientEvents && clientEvents.length > 0) {
    const insertEvent = db.prepare(
      'INSERT INTO events (session_id, type, speaker) VALUES (?, ?, ?)'
    );
    for (const event of clientEvents) {
      insertEvent.run(sessionId, event.type, event.speaker || null);
    }
  }

  // Read all turns + events from DB (now includes client-submitted data)
  const turns = db.prepare(
    'SELECT * FROM turns WHERE session_id = ? ORDER BY created_at'
  ).all(sessionId) as TurnRecord[];
  const events = db.prepare(
    'SELECT * FROM events WHERE session_id = ? ORDER BY occurred_at'
  ).all(sessionId) as EventRecord[];

  if (turns.length === 0) {
    res.status(400).json({ error: 'No turns provided — cannot generate coaching' });
    return;
  }

  try {
    const rubric = getRubric();
    const coaching = await generateCoaching(turns, events, pmDisc, clientDisc, rubric);

    // Mark session as ended
    db.prepare('UPDATE sessions SET ended_at = CURRENT_TIMESTAMP, total_score = ? WHERE id = ?')
      .run(coaching.totalScore, sessionId);

    // Save coaching
    db.prepare(`
      INSERT OR REPLACE INTO coaching
        (session_id, strengths, misses, alternatives, disc_adaptation, score_breakdown_json, total_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      coaching.strengths,
      coaching.misses,
      coaching.alternatives,
      coaching.discAdaptation,
      JSON.stringify(coaching.scoreBreakdown),
      coaching.totalScore
    );

    res.json({
      sessionId,
      ...coaching,
    });
  } catch (err) {
    console.error('Coaching generation failed:', err);
    res.status(500).json({ error: 'Failed to generate coaching' });
  }
});

// GET /api/sessions — admin: all; pm: own only
router.get('/', requireAuth, (req: Request, res: Response): void => {
  if (req.user!.role === 'admin') {
    const sessions = db.prepare('SELECT * FROM sessions ORDER BY started_at DESC').all();
    res.json(sessions);
  } else {
    const sessions = db.prepare(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY started_at DESC'
    ).all(req.user!.userId);
    res.json(sessions);
  }
});

// GET /api/sessions/:id — full session with turns, events, and coaching
router.get('/:id', requireAuth, (req: Request, res: Response): void => {
  const sessionId = Number(req.params.id);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as {
    id: number; user_id: number;
  } | undefined;

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (req.user!.role !== 'admin' && session.user_id !== req.user!.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const turns = db.prepare('SELECT * FROM turns WHERE session_id = ? ORDER BY created_at').all(sessionId);
  const events = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY occurred_at').all(sessionId);
  const coachingRow = db.prepare('SELECT * FROM coaching WHERE session_id = ?').get(sessionId) as {
    strengths: string;
    misses: string;
    alternatives: string;
    disc_adaptation: string;
    score_breakdown_json: string;
    total_score: number;
  } | undefined;

  // Transform DB row → camelCase shape the frontend expects
  const coaching = coachingRow
    ? {
        strengths: coachingRow.strengths,
        misses: coachingRow.misses,
        alternatives: coachingRow.alternatives,
        discAdaptation: coachingRow.disc_adaptation,
        scoreBreakdown: JSON.parse(coachingRow.score_breakdown_json),
        totalScore: coachingRow.total_score,
      }
    : null;

  res.json({ ...session, turns, events, coaching: coaching || null });
});

export default router;
