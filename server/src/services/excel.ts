import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import db from '../db/connection';

export const EXCEL_PATH = process.env.EXCEL_PATH || path.resolve(process.cwd(), 'data/sessions.xlsx');

interface SessionExportRow {
  session_id: number;
  date: string;
  pm_name: string;
  pm_email: string;
  pm_disc: string;
  scenario: string;
  client_disc: string;
  voice_name: string | null;
  total_score: number | null;
  empathy: number | null;
  clarity: number | null;
  disc_adaptation: number | null;
  solution_orientation: number | null;
  ownership: number | null;
  composure: number | null;
  active_listening: number | null;
  strengths: string;
  misses: string;
  alternatives: string;
  disc_adaptation_note: string;
}

interface UserExportRow {
  id: number;
  name: string;
  email: string;
  disc_profile: string;
  role: string;
  active: number;
  created_at: string;
  total_sessions: number;
  last_session_at: string | null;
  average_score: number | null;
}

function safeParseScore(json: string, key: string): number | null {
  try {
    const parsed = JSON.parse(json);
    const v = parsed[key];
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Regenerate the Excel workbook from current SQLite state.
 * Multi-sheet: Sessions (one row per completed session), PMs (rolled-up stats).
 * Idempotent — safe to call repeatedly. Writes to EXCEL_PATH.
 */
export async function regenerateExcel(): Promise<void> {
  const dir = path.dirname(EXCEL_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Plan Forward Training Simulator';
  wb.created = new Date();

  // ----- Sessions sheet -----
  const sessions = db.prepare(
    `SELECT
       s.id AS session_id,
       s.started_at AS date,
       u.name AS pm_name,
       u.email AS pm_email,
       u.disc_profile AS pm_disc,
       sc.title AS scenario,
       dp.code AS client_disc,
       s.voice_name,
       s.total_score,
       c.score_breakdown_json,
       c.strengths,
       c.misses,
       c.alternatives,
       c.disc_adaptation AS disc_adaptation_note
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN scenarios sc ON sc.id = s.scenario_id
     JOIN disc_profiles dp ON dp.id = s.client_disc_id
     LEFT JOIN coaching c ON c.session_id = s.id
     WHERE s.ended_at IS NOT NULL
     ORDER BY s.started_at DESC`,
  ).all() as Array<{
    session_id: number;
    date: string;
    pm_name: string;
    pm_email: string;
    pm_disc: string;
    scenario: string;
    client_disc: string;
    voice_name: string | null;
    total_score: number | null;
    score_breakdown_json: string | null;
    strengths: string | null;
    misses: string | null;
    alternatives: string | null;
    disc_adaptation_note: string | null;
  }>;

  const sessionRows: SessionExportRow[] = sessions.map(s => {
    const json = s.score_breakdown_json || '{}';
    return {
      session_id: s.session_id,
      date: s.date,
      pm_name: s.pm_name,
      pm_email: s.pm_email,
      pm_disc: s.pm_disc,
      scenario: s.scenario,
      client_disc: s.client_disc,
      voice_name: s.voice_name,
      total_score: s.total_score,
      empathy: safeParseScore(json, 'empathy'),
      clarity: safeParseScore(json, 'clarity'),
      disc_adaptation: safeParseScore(json, 'discAdaptation'),
      solution_orientation: safeParseScore(json, 'solutionOrientation'),
      ownership: safeParseScore(json, 'ownership'),
      composure: safeParseScore(json, 'composure'),
      active_listening: safeParseScore(json, 'activeListening'),
      strengths: s.strengths || '',
      misses: s.misses || '',
      alternatives: s.alternatives || '',
      disc_adaptation_note: s.disc_adaptation_note || '',
    };
  });

  const sessionsSheet = wb.addWorksheet('Sessions');
  sessionsSheet.columns = [
    { header: 'Session ID', key: 'session_id', width: 11 },
    { header: 'Date', key: 'date', width: 22 },
    { header: 'PM Name', key: 'pm_name', width: 22 },
    { header: 'PM Email', key: 'pm_email', width: 28 },
    { header: 'PM DISC', key: 'pm_disc', width: 9 },
    { header: 'Scenario', key: 'scenario', width: 36 },
    { header: 'Client DISC', key: 'client_disc', width: 11 },
    { header: 'Voice', key: 'voice_name', width: 14 },
    { header: 'Total Score', key: 'total_score', width: 12 },
    { header: 'Empathy', key: 'empathy', width: 9 },
    { header: 'Clarity', key: 'clarity', width: 9 },
    { header: 'DISC Adapt.', key: 'disc_adaptation', width: 12 },
    { header: 'Solution', key: 'solution_orientation', width: 9 },
    { header: 'Ownership', key: 'ownership', width: 11 },
    { header: 'Composure', key: 'composure', width: 11 },
    { header: 'Active Listen.', key: 'active_listening', width: 13 },
    { header: 'Strengths', key: 'strengths', width: 60 },
    { header: 'Misses', key: 'misses', width: 60 },
    { header: 'Alternatives', key: 'alternatives', width: 60 },
    { header: 'DISC Adaptation Note', key: 'disc_adaptation_note', width: 60 },
  ];
  sessionsSheet.addRows(sessionRows);
  sessionsSheet.getRow(1).font = { bold: true };
  sessionsSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ----- PMs sheet (rolled-up stats) -----
  const userStats = db.prepare(
    `SELECT
       u.id, u.name, u.email, u.disc_profile, u.role, u.active, u.created_at,
       COUNT(s.id) AS total_sessions,
       MAX(s.started_at) AS last_session_at,
       AVG(s.total_score) AS average_score
     FROM users u
     LEFT JOIN sessions s ON s.user_id = u.id AND s.ended_at IS NOT NULL
     GROUP BY u.id
     ORDER BY u.role DESC, u.name ASC`,
  ).all() as Array<{
    id: number;
    name: string;
    email: string;
    disc_profile: string;
    role: string;
    active: number;
    created_at: string;
    total_sessions: number;
    last_session_at: string | null;
    average_score: number | null;
  }>;

  const userRows: UserExportRow[] = userStats.map(u => ({
    ...u,
    average_score: u.average_score !== null ? Math.round(u.average_score) : null,
  }));

  const usersSheet = wb.addWorksheet('PMs');
  usersSheet.columns = [
    { header: 'ID', key: 'id', width: 6 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'DISC', key: 'disc_profile', width: 8 },
    { header: 'Role', key: 'role', width: 8 },
    { header: 'Active', key: 'active', width: 8 },
    { header: 'Total Sessions', key: 'total_sessions', width: 14 },
    { header: 'Last Session', key: 'last_session_at', width: 22 },
    { header: 'Average Score', key: 'average_score', width: 14 },
    { header: 'Created', key: 'created_at', width: 22 },
  ];
  usersSheet.addRows(userRows);
  usersSheet.getRow(1).font = { bold: true };
  usersSheet.views = [{ state: 'frozen', ySplit: 1 }];

  await wb.xlsx.writeFile(EXCEL_PATH);
}
