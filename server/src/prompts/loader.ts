import fs from 'fs';
import path from 'path';
import { getContentDir } from '../utils/content-dir';
import db from '../db/connection';

export interface ScenarioContent {
  slug: string;
  title: string;
  body: string;
}

export interface DiscProfileContent {
  code: string;
  name: string;
  body: string;
}

export interface RubricItemContent {
  name: string;
  weight: number;
  description: string;
}

const CONTENT_DIR = getContentDir();

// Scenarios are now read from the DB at request time so admin UI edits are
// reflected immediately without a server restart. The DB is hydrated from
// /content/scenarios/*.md on first deploy via seed.ts (INSERT OR IGNORE).

function loadDiscProfiles(): Map<string, DiscProfileContent> {
  const dir = path.join(CONTENT_DIR, 'disc-profiles');
  const map = new Map<string, DiscProfileContent>();

  const codeMap: Record<string, string> = {
    '01-D-dominance': 'D',
    '02-I-influence': 'I',
    '03-S-steadiness': 'S',
    '04-C-conscientiousness': 'C',
    '05-D-I-driver-influencer': 'D/I',
    '06-D-C-driver-analyst': 'D/C',
    '07-I-S-relator': 'I/S',
    '08-S-C-stabilizer': 'S/C',
  };

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md')) {
    const slug = file.replace('.md', '');
    const code = codeMap[slug];
    if (!code) continue;

    const body = fs.readFileSync(path.join(dir, file), 'utf-8');
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const name = titleMatch ? titleMatch[1].trim() : code;
    map.set(code, { code, name, body });
  }

  return map;
}

function loadRubric(): RubricItemContent[] {
  const filePath = path.join(CONTENT_DIR, 'coaching-rubric', '01-categories-and-weights.md');
  const content = fs.readFileSync(filePath, 'utf-8');
  const items: RubricItemContent[] = [];

  const tableMatch = content.match(/\|[^\n]+\|\n\|[-| :]+\|\n((?:\|[^\n]+\|\n?)+)/);
  if (!tableMatch) return items;

  for (const line of tableMatch[1].trim().split('\n')) {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 4) continue;
    const name = cols[1].replace(/\*\*/g, '').trim();
    const weight = parseInt(cols[2].replace('%', ''), 10);
    const description = cols[3];
    if (name && !isNaN(weight)) {
      items.push({ name, weight, description });
    }
  }

  return items;
}

function loadSandlerPrimer(): string {
  const filePath = path.join(CONTENT_DIR, 'coaching-rubric', '03-sandler-techniques.md');
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function loadCoachingCards(): Map<string, string> {
  const dir = path.join(CONTENT_DIR, 'coaching-cards');
  const map = new Map<string, string>();
  if (!fs.existsSync(dir)) return map;

  // File naming: D.md, I.md, S.md, C.md, D-I.md, D-C.md, I-S.md, S-C.md, general.md
  // The DISC code uses '/', the filename uses '-' to avoid path separators.
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const base = file.replace(/\.md$/, '');
    const key = base === 'general' ? 'general' : base.replace(/-/g, '/');
    const body = fs.readFileSync(path.join(dir, file), 'utf-8');
    map.set(key, body);
  }
  return map;
}

// Load once at startup and cache (everything except scenarios, which now
// query the DB so UI edits land immediately).
const discProfiles = loadDiscProfiles();
const rubricItems = loadRubric();
const sandlerPrimer = loadSandlerPrimer();
const coachingCards = loadCoachingCards();

export function getScenario(slug: string): ScenarioContent | undefined {
  const row = db
    .prepare('SELECT slug, title, body_markdown FROM scenarios WHERE slug = ? AND active = 1')
    .get(slug) as { slug: string; title: string; body_markdown: string } | undefined;
  if (!row) return undefined;
  return { slug: row.slug, title: row.title, body: row.body_markdown };
}

export function getDiscProfile(code: string): DiscProfileContent | undefined {
  return discProfiles.get(code);
}

export function getRubric(): RubricItemContent[] {
  return rubricItems;
}

export function getSandlerPrimer(): string {
  return sandlerPrimer;
}

export function getCoachingCard(discCode: string): string | undefined {
  return coachingCards.get(discCode);
}

export function getGeneralCoachingCues(): string {
  return coachingCards.get('general') ?? '';
}

export function getAllScenarios(): ScenarioContent[] {
  const rows = db
    .prepare('SELECT slug, title, body_markdown FROM scenarios WHERE active = 1 ORDER BY slug')
    .all() as Array<{ slug: string; title: string; body_markdown: string }>;
  return rows.map(r => ({ slug: r.slug, title: r.title, body: r.body_markdown }));
}

export function getAllDiscProfiles(): DiscProfileContent[] {
  return Array.from(discProfiles.values());
}
