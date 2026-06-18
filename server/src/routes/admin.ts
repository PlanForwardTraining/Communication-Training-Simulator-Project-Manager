import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';
import { regenerateExcel, EXCEL_PATH } from '../services/excel';
import { listSessions, softDeleteSession, purgeEmptySessions, type SessionFilter } from '../services/sessions-admin';
import { listUserTypes, addUserType, userTypeInUse, removeUserType } from '../services/user-types';
import fs from 'fs';

const router = Router();
router.use(requireAuth, requireAdmin);

// ---------------------------------------------------------------------------
// Types & shared queries
// ---------------------------------------------------------------------------

interface ScoreBreakdown {
  empathy: number;
  clarity: number;
  discAdaptation: number;
  solutionOrientation: number;
  ownership: number;
  composure: number;
  activeListening: number;
}

interface CoachingRow {
  session_id: number;
  score_breakdown_json: string;
  total_score: number;
}

interface SessionRow {
  id: number;
  user_id: number;
  scenario_id: number;
  client_disc_id: number;
  voice_name: string | null;
  started_at: string;
  ended_at: string | null;
  total_score: number | null;
}

const CATEGORY_KEYS = [
  'empathy',
  'clarity',
  'discAdaptation',
  'solutionOrientation',
  'ownership',
  'composure',
  'activeListening',
] as const;

const CATEGORY_LABELS: Record<typeof CATEGORY_KEYS[number], string> = {
  empathy: 'Empathy & Acknowledgment',
  clarity: 'Clarity & Honesty',
  discAdaptation: 'DISC Adaptation',
  solutionOrientation: 'Solution Orientation',
  ownership: 'Ownership & Accountability',
  composure: 'Confidence & Composure',
  activeListening: 'Active Listening',
};

const FOCUS_THRESHOLD = 3.0; // average must stay below this to be flagged
const FOCUS_MIN_SESSIONS = 3; // need at least 3 sessions before flagging
const ATTENTION_INACTIVE_DAYS = 14;

function safeParseBreakdown(json: string): ScoreBreakdown | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as ScoreBreakdown;
    return null;
  } catch {
    return null;
  }
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function trendOf(scores: number[]): 'up' | 'down' | 'flat' {
  if (scores.length < 3) return 'flat';
  // Compare the average of the most recent 3 sessions to the prior 3 (if available),
  // else just the slope of last-3 vs first.
  const recent = scores.slice(-3);
  const prior = scores.slice(-6, -3);
  const recentAvg = avg(recent);
  if (prior.length === 0) {
    const delta = recent[recent.length - 1] - recent[0];
    if (Math.abs(delta) < 5) return 'flat';
    return delta > 0 ? 'up' : 'down';
  }
  const priorAvg = avg(prior);
  const delta = recentAvg - priorAvg;
  if (Math.abs(delta) < 3) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Load all coaching rows for a set of sessions in one query
function loadCoachingFor(sessionIds: number[]): Map<number, ScoreBreakdown> {
  if (sessionIds.length === 0) return new Map();
  const placeholders = sessionIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT session_id, score_breakdown_json FROM coaching WHERE session_id IN (${placeholders})`,
  ).all(...sessionIds) as Pick<CoachingRow, 'session_id' | 'score_breakdown_json'>[];
  const map = new Map<number, ScoreBreakdown>();
  for (const row of rows) {
    const bd = safeParseBreakdown(row.score_breakdown_json);
    if (bd) map.set(row.session_id, bd);
  }
  return map;
}

interface UserStats {
  id: number;
  name: string;
  email: string;
  disc_profile: string;
  role: string;
  active: number;
  created_at: string;
  user_type: string | null;
  totalSessions: number;
  lastSessionAt: string | null;
  daysSinceLastSession: number | null;
  averageScore: number | null;
  trend: 'up' | 'down' | 'flat';
  focusAreas: { key: string; label: string; average: number; sessionsScored: number }[];
}

function computeUserStats(userRow: {
  id: number;
  name: string;
  email: string;
  disc_profile: string;
  role: string;
  active: number;
  created_at: string;
  user_type?: string | null;
}): UserStats {
  const sessions = db.prepare(
    `SELECT id, started_at, total_score FROM sessions
     WHERE user_id = ? AND ended_at IS NOT NULL AND deleted_at IS NULL
     ORDER BY started_at ASC`,
  ).all(userRow.id) as { id: number; started_at: string; total_score: number | null }[];

  const totalSessions = sessions.length;
  const lastSessionAt = sessions.length > 0 ? sessions[sessions.length - 1].started_at : null;
  const totalScores = sessions
    .map(s => s.total_score)
    .filter((n): n is number => typeof n === 'number');
  const averageScore = totalScores.length > 0 ? Math.round(avg(totalScores)) : null;
  const trend = trendOf(totalScores);

  // Focus areas: which rubric categories are persistently below FOCUS_THRESHOLD?
  const breakdownMap = loadCoachingFor(sessions.map(s => s.id));
  const perCategory: Record<string, number[]> = Object.fromEntries(
    CATEGORY_KEYS.map(k => [k, [] as number[]]),
  );
  for (const session of sessions) {
    const bd = breakdownMap.get(session.id);
    if (!bd) continue;
    for (const key of CATEGORY_KEYS) {
      const v = bd[key];
      if (typeof v === 'number') perCategory[key].push(v);
    }
  }

  const focusAreas: UserStats['focusAreas'] = [];
  for (const key of CATEGORY_KEYS) {
    const scores = perCategory[key];
    if (scores.length < FOCUS_MIN_SESSIONS) continue;
    const a = avg(scores);
    if (a < FOCUS_THRESHOLD) {
      focusAreas.push({
        key,
        label: CATEGORY_LABELS[key],
        average: Number(a.toFixed(2)),
        sessionsScored: scores.length,
      });
    }
  }
  // Sort focus areas by lowest avg first
  focusAreas.sort((a, b) => a.average - b.average);

  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    disc_profile: userRow.disc_profile,
    role: userRow.role,
    active: userRow.active,
    created_at: userRow.created_at,
    user_type: userRow.user_type ?? null,
    totalSessions,
    lastSessionAt,
    daysSinceLastSession: lastSessionAt ? daysSince(lastSessionAt) : null,
    averageScore,
    trend,
    focusAreas,
  };
}

// ---------------------------------------------------------------------------
// GET /api/admin/summary — cohort KPIs + flagged PMs + team focus areas
// ---------------------------------------------------------------------------

router.get('/summary', (_req: Request, res: Response): void => {
  const users = db.prepare(
    `SELECT id, name, email, disc_profile, role, active, created_at, user_type FROM users`,
  ).all() as Parameters<typeof computeUserStats>[0][];

  // Cohort stats (team averages, flagged, etc.) are computed over non-admin active users only
  const activeNonAdminUsers = users.filter(u => u.role !== 'admin' && u.active === 1);
  const stats = activeNonAdminUsers.map(computeUserStats);

  const totalSessions = stats.reduce((sum, s) => sum + s.totalSessions, 0);

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessionsThisWeek = (db.prepare(
    `SELECT COUNT(*) as n FROM sessions WHERE ended_at IS NOT NULL AND deleted_at IS NULL AND started_at >= ?`,
  ).get(oneWeekAgo) as { n: number }).n;

  const allScores = stats
    .flatMap(s => (s.averageScore !== null ? [s.averageScore] : []));
  const teamAverageScore = allScores.length > 0 ? Math.round(avg(allScores)) : null;

  // Team focus areas: aggregate every PM's category averages and find the lowest
  const teamCategoryScores: Record<string, number[]> = Object.fromEntries(
    CATEGORY_KEYS.map(k => [k, [] as number[]]),
  );

  // Re-walk all sessions to build cohort-level category averages
  const allSessions = db.prepare(
    `SELECT s.id FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.ended_at IS NOT NULL AND s.deleted_at IS NULL AND u.role = 'pm' AND u.active = 1`,
  ).all() as { id: number }[];
  const allBreakdowns = loadCoachingFor(allSessions.map(s => s.id));
  for (const bd of allBreakdowns.values()) {
    for (const key of CATEGORY_KEYS) {
      const v = bd[key];
      if (typeof v === 'number') teamCategoryScores[key].push(v);
    }
  }

  const teamCategoryAverages = CATEGORY_KEYS.map(key => ({
    key,
    label: CATEGORY_LABELS[key],
    average: teamCategoryScores[key].length > 0
      ? Number(avg(teamCategoryScores[key]).toFixed(2))
      : null,
    sessionsScored: teamCategoryScores[key].length,
  }));

  const teamFocusAreas = teamCategoryAverages
    .filter(c => c.average !== null && c.sessionsScored >= FOCUS_MIN_SESSIONS && (c.average as number) < FOCUS_THRESHOLD)
    .sort((a, b) => (a.average as number) - (b.average as number))
    .slice(0, 3);

  // PMs needing attention: stale activity OR declining trend OR ≥2 focus areas
  const flagged: Array<UserStats & { reasons: string[] }> = [];
  for (const s of stats) {
    const reasons: string[] = [];
    if (s.totalSessions === 0) {
      reasons.push('No sessions yet');
    } else {
      if (s.daysSinceLastSession !== null && s.daysSinceLastSession >= ATTENTION_INACTIVE_DAYS) {
        reasons.push(`No practice in ${s.daysSinceLastSession} days`);
      }
      if (s.trend === 'down') reasons.push('Total score trending down');
      if (s.focusAreas.length >= 2) reasons.push(`${s.focusAreas.length} categories below standard`);
    }
    if (reasons.length > 0) flagged.push({ ...s, reasons });
  }
  // Sort: most concerning first (more reasons → higher up; tie-broken by lowest avg)
  flagged.sort((a, b) => {
    if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
    return (a.averageScore ?? 100) - (b.averageScore ?? 100);
  });

  // Build the full user list (all roles, all active states) for the dashboard table
  const allUserStats = users.map(computeUserStats);

  res.json({
    cohort: {
      totalPMs: activeNonAdminUsers.length,
      totalSessionsAllTime: totalSessions,
      sessionsThisWeek,
      teamAverageScore,
    },
    teamCategoryAverages,
    teamFocusAreas,
    flaggedPMs: flagged.slice(0, 5),
    pms: allUserStats,
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/users — PM list with rolled-up stats (active + inactive)
// ---------------------------------------------------------------------------

router.get('/users', (_req: Request, res: Response): void => {
  const users = db.prepare(
    `SELECT id, name, email, disc_profile, role, active, created_at, user_type FROM users
     ORDER BY active DESC, name ASC`,
  ).all() as Parameters<typeof computeUserStats>[0][];

  const stats = users.map(computeUserStats);
  res.json(stats);
});

// ---------------------------------------------------------------------------
// GET /api/admin/users/:id — single PM detail with trend + sessions list
// ---------------------------------------------------------------------------

router.get('/users/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const user = db.prepare(
    `SELECT id, name, email, disc_profile, role, active, created_at, user_type FROM users WHERE id = ?`,
  ).get(id) as Parameters<typeof computeUserStats>[0] | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const stats = computeUserStats(user);

  // Sessions list with scenario + voice info
  const sessions = db.prepare(
    `SELECT
       s.id, s.started_at, s.ended_at, s.total_score, s.voice_name,
       sc.title AS scenario_title, sc.slug AS scenario_slug,
       dp.code AS client_disc_code
     FROM sessions s
     JOIN scenarios sc ON sc.id = s.scenario_id
     JOIN disc_profiles dp ON dp.id = s.client_disc_id
     WHERE s.user_id = ? AND s.ended_at IS NOT NULL AND s.deleted_at IS NULL
     ORDER BY s.started_at DESC`,
  ).all(id);

  // Trend data: chronological [{ date, score }] for chart
  const trendRows = db.prepare(
    `SELECT id, started_at, total_score FROM sessions
     WHERE user_id = ? AND ended_at IS NOT NULL AND deleted_at IS NULL AND total_score IS NOT NULL
     ORDER BY started_at ASC`,
  ).all(id) as { id: number; started_at: string; total_score: number }[];

  // Per-category averages
  const breakdownMap = loadCoachingFor(trendRows.map(r => r.id));
  const perCategory: Record<string, number[]> = Object.fromEntries(
    CATEGORY_KEYS.map(k => [k, [] as number[]]),
  );
  for (const r of trendRows) {
    const bd = breakdownMap.get(r.id);
    if (!bd) continue;
    for (const key of CATEGORY_KEYS) {
      const v = bd[key];
      if (typeof v === 'number') perCategory[key].push(v);
    }
  }
  const categoryAverages = CATEGORY_KEYS.map(key => ({
    key,
    label: CATEGORY_LABELS[key],
    average: perCategory[key].length > 0
      ? Number(avg(perCategory[key]).toFixed(2))
      : null,
    sessionsScored: perCategory[key].length,
  }));

  res.json({
    ...stats,
    sessions,
    trendPoints: trendRows.map(r => ({
      sessionId: r.id,
      date: r.started_at,
      score: r.total_score,
    })),
    categoryAverages,
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/sessions — filtered list of sessions (excludes soft-deleted)
// DELETE /api/admin/sessions/:id — soft-delete a session
// POST /api/admin/sessions/purge-empty — soft-delete all turn-less sessions
// ---------------------------------------------------------------------------

router.get('/sessions', (req: Request, res: Response): void => {
  const filter: SessionFilter = {};
  if (req.query.userId)     filter.userId     = Number(req.query.userId);
  if (req.query.scenarioId) filter.scenarioId = Number(req.query.scenarioId);
  if (req.query.from)       filter.from       = String(req.query.from);
  if (req.query.to)         filter.to         = String(req.query.to);
  if (req.query.status)     filter.status     = req.query.status as SessionFilter['status'];
  res.json(listSessions(filter));
});

// NOTE: "purge-empty" must come BEFORE /:id so Express doesn't treat "purge-empty" as an id
router.post('/sessions/purge-empty', (_req: Request, res: Response): void => {
  const purged = purgeEmptySessions();
  res.json({ purged });
});

router.delete('/sessions/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const changes = softDeleteSession(id);
  if (changes === 0) {
    res.status(404).json({ error: 'Session not found or already deleted' });
    return;
  }
  res.json({ deleted: true });
});

// ---------------------------------------------------------------------------
// GET /api/admin/sessions/:id — admin can view any session in detail
// ---------------------------------------------------------------------------

router.get('/sessions/:id', (req: Request, res: Response): void => {
  const sessionId = Number(req.params.id);
  const session = db.prepare(
    `SELECT
       s.id, s.user_id, s.scenario_id, s.client_disc_id, s.voice_id, s.voice_name,
       s.started_at, s.ended_at, s.total_score,
       u.name AS user_name, u.disc_profile AS user_disc,
       sc.title AS scenario_title, sc.slug AS scenario_slug,
       dp.code AS client_disc_code, dp.name AS client_disc_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN scenarios sc ON sc.id = s.scenario_id
     JOIN disc_profiles dp ON dp.id = s.client_disc_id
     WHERE s.id = ? AND s.deleted_at IS NULL`,
  ).get(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const turns = db.prepare(
    `SELECT id, speaker, content, created_at FROM turns WHERE session_id = ? ORDER BY created_at ASC`,
  ).all(sessionId);
  const events = db.prepare(
    `SELECT id, type, occurred_at FROM events WHERE session_id = ? ORDER BY occurred_at ASC`,
  ).all(sessionId);
  const coachingRow = db.prepare(
    `SELECT * FROM coaching WHERE session_id = ?`,
  ).get(sessionId) as
    | {
        strengths: string;
        misses: string;
        alternatives: string;
        disc_adaptation: string;
        score_breakdown_json: string;
        total_score: number;
      }
    | undefined;

  const coaching = coachingRow
    ? {
        strengths: coachingRow.strengths,
        misses: coachingRow.misses,
        alternatives: coachingRow.alternatives,
        discAdaptation: coachingRow.disc_adaptation,
        scoreBreakdown: safeParseBreakdown(coachingRow.score_breakdown_json),
        totalScore: coachingRow.total_score,
      }
    : null;

  res.json({ session, turns, events, coaching });
});

// ---------------------------------------------------------------------------
// User CRUD (admin-only)
// ---------------------------------------------------------------------------

router.post('/users', (req: Request, res: Response): void => {
  const { name, email, password, disc_profile, role, user_type } = req.body;
  if (!name || !email || !password || !disc_profile || !role) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  if (!['pm', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Role must be pm or admin' });
    return;
  }
  const password_hash = bcrypt.hashSync(password, 10);
  const userType = user_type != null ? String(user_type).trim() || null : null;
  try {
    const result = db.prepare(
      `INSERT INTO users (name, email, password_hash, disc_profile, role, user_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(name, email, password_hash, disc_profile, role, userType);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      throw e;
    }
  }
});

router.patch('/users/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const { name, disc_profile, role, password, active, user_type } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | { name: string; disc_profile: string; role: string; password_hash: string; active: number; user_type: string | null }
    | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const newName = name ?? user.name;
  const newDisc = disc_profile ?? user.disc_profile;
  const newRole = role ?? user.role;
  const newHash = password ? bcrypt.hashSync(password, 10) : user.password_hash;
  const newActive = typeof active === 'boolean' ? (active ? 1 : 0) : user.active;
  // user_type: explicit null clears it; string sets it; undefined leaves it unchanged
  const newUserType = user_type !== undefined
    ? (user_type === null ? null : String(user_type).trim() || null)
    : user.user_type;

  db.prepare(
    `UPDATE users SET name = ?, disc_profile = ?, role = ?, password_hash = ?, active = ?, user_type = ? WHERE id = ?`,
  ).run(newName, newDisc, newRole, newHash, newActive, newUserType, id);

  res.json({ updated: true });
});

// ---------------------------------------------------------------------------
// GET /api/admin/export.xlsx — Excel download (supports same filter params as GET /sessions)
// ---------------------------------------------------------------------------

router.get('/export.xlsx', async (req: Request, res: Response): Promise<void> => {
  const filter: SessionFilter = {};
  if (req.query.userId)     filter.userId     = Number(req.query.userId);
  if (req.query.scenarioId) filter.scenarioId = Number(req.query.scenarioId);
  if (req.query.from)       filter.from       = String(req.query.from);
  if (req.query.to)         filter.to         = String(req.query.to);
  if (req.query.status)     filter.status     = req.query.status as SessionFilter['status'];

  // Determine whether a filter was actually applied (any param present)
  const hasFilter = Object.keys(filter).length > 0;

  await regenerateExcel(hasFilter ? filter : undefined);
  if (!fs.existsSync(EXCEL_PATH)) {
    res.status(500).json({ error: 'Excel file could not be generated' });
    return;
  }
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="planforward-training-${new Date().toISOString().slice(0, 10)}.xlsx"`,
  );
  res.sendFile(EXCEL_PATH);
});

// ---------------------------------------------------------------------------
// User types CRUD
// ---------------------------------------------------------------------------

router.get('/user-types', (_req: Request, res: Response): void => {
  res.json(listUserTypes());
});

router.post('/user-types', (req: Request, res: Response): void => {
  const name = (req.body?.name || '').trim();
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  addUserType(name);
  res.json(listUserTypes());
});

router.delete('/user-types/:name', (req: Request, res: Response): void => {
  const typeName = String(req.params.name);
  const count = userTypeInUse(typeName);
  if (count > 0) {
    res.status(409).json({ error: `In use by ${count} user(s)/scenario(s)` });
    return;
  }
  removeUserType(typeName);
  res.json(listUserTypes());
});

// ---------------------------------------------------------------------------
// Coaching settings routes
// ---------------------------------------------------------------------------

import {
  getActiveProvider, getActiveModel, setActiveSelection,
  getProviderStatus, setProviderKey, deleteProviderKey,
} from '../services/coaching/settings';
import { PROVIDERS_META, PROVIDER_ORDER, isCuratedModel, isPickerProvider } from '../services/coaching/models';

router.get('/coaching-settings', (_req: Request, res: Response): void => {
  const activeProvider = getActiveProvider();
  res.json({
    activeProvider,
    activeModel: getActiveModel(activeProvider),
    // Ordered for the picker table; status is masked (last4 only, never the key).
    providers: PROVIDER_ORDER.map((id) => {
      const status = getProviderStatus(id);
      return {
        id,
        label: PROVIDERS_META[id].label,
        models: PROVIDERS_META[id].models,
        connected: status.connected,
        last4: status.last4,
        source: status.source,
      };
    }),
  });
});

router.patch('/coaching-settings', (req: Request, res: Response): void => {
  const { provider, model } = req.body ?? {};
  if (!isPickerProvider(provider)) { res.status(400).json({ error: 'Invalid provider' }); return; }
  if (!isCuratedModel(provider, model)) { res.status(400).json({ error: 'Invalid model for provider' }); return; }
  if (!getProviderStatus(provider).connected) {
    res.status(400).json({ error: `No API key configured for ${provider}` }); return;
  }
  setActiveSelection(provider, model);
  res.json({ updated: true });
});

router.post('/coaching-settings/keys', (req: Request, res: Response): void => {
  const { provider, apiKey } = req.body ?? {};
  if (!isPickerProvider(provider)) { res.status(400).json({ error: 'Invalid provider' }); return; }
  if (typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    res.status(400).json({ error: 'Invalid API key' }); return;
  }
  const trimmed = apiKey.trim();
  setProviderKey(provider, trimmed);
  res.json({ connected: true, last4: trimmed.slice(-4) });
});

router.delete('/coaching-settings/keys/:provider', (req: Request, res: Response): void => {
  const provider = req.params.provider as string;
  if (!isPickerProvider(provider)) { res.status(400).json({ error: 'Invalid provider' }); return; }
  deleteProviderKey(provider);
  res.json({ removed: true });
});

export default router;
