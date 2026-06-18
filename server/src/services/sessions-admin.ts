import db from '../db/connection';

export interface SessionFilter {
  userId?: number;
  from?: string;
  to?: string;
  scenarioId?: number;
  status?: 'completed' | 'in_progress' | 'empty';
}

function whereClause(f: SessionFilter): { sql: string; params: unknown[] } {
  const cond = ['s.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (f.userId) { cond.push('s.user_id = ?'); params.push(f.userId); }
  if (f.scenarioId) { cond.push('s.scenario_id = ?'); params.push(f.scenarioId); }
  if (f.from) { cond.push('s.started_at >= ?'); params.push(f.from); }
  if (f.to) { cond.push('s.started_at <= ?'); params.push(f.to); }
  return { sql: cond.join(' AND '), params };
}

export function listSessions(f: SessionFilter = {}): unknown[] {
  const { sql, params } = whereClause(f);
  const rows = db.prepare(
    `SELECT s.id, s.started_at, s.ended_at, s.total_score, s.voice_name,
        u.name AS user_name, u.email AS user_email,
        sc.title AS scenario_title, dp.code AS client_disc_code,
        (SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id) AS turn_count
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN scenarios sc ON sc.id = s.scenario_id
      LEFT JOIN disc_profiles dp ON dp.id = s.client_disc_id
      WHERE ${sql}
      ORDER BY s.started_at DESC`,
  ).all(...params) as Array<Record<string, unknown> & { turn_count: number; ended_at: string | null }>;

  let result = rows.map(x => ({
    ...x,
    status: x.turn_count === 0 ? 'empty' : (x.ended_at ? 'completed' : 'in_progress'),
  }));

  if (f.status) result = result.filter(x => x.status === f.status);
  return result;
}

export function softDeleteSession(id: number): number {
  return db.prepare(
    `UPDATE sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
  ).run(id).changes;
}

export function purgeEmptySessions(): number {
  return db.prepare(
    `UPDATE sessions SET deleted_at = CURRENT_TIMESTAMP
     WHERE deleted_at IS NULL
       AND id NOT IN (SELECT DISTINCT session_id FROM turns)`,
  ).run().changes;
}

export function purgeExpiredSoftDeletes(): number {
  const ids = db.prepare(
    `SELECT id FROM sessions
     WHERE deleted_at IS NOT NULL AND deleted_at <= datetime('now', '-30 days')`,
  ).all() as { id: number }[];

  if (!ids.length) return 0;

  const list = ids.map(r => r.id);
  const ph = list.map(() => '?').join(',');

  db.transaction(() => {
    db.prepare(`DELETE FROM turns    WHERE session_id IN (${ph})`).run(...list);
    db.prepare(`DELETE FROM events   WHERE session_id IN (${ph})`).run(...list);
    db.prepare(`DELETE FROM coaching WHERE session_id IN (${ph})`).run(...list);
    db.prepare(`DELETE FROM sessions WHERE id          IN (${ph})`).run(...list);
  })();

  return list.length;
}
