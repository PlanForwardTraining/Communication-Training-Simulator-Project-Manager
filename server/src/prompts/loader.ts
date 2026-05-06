import fs from 'fs';
import path from 'path';

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

const CONTENT_DIR = path.resolve(__dirname, '../../../content');

function loadScenarios(): Map<string, ScenarioContent> {
  const dir = path.join(CONTENT_DIR, 'scenarios');
  const map = new Map<string, ScenarioContent>();

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const slug = file.replace('.md', '');
    const body = fs.readFileSync(path.join(dir, file), 'utf-8');
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;
    map.set(slug, { slug, title, body });
  }

  return map;
}

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

// Load once at startup and cache
const scenarios = loadScenarios();
const discProfiles = loadDiscProfiles();
const rubricItems = loadRubric();

export function getScenario(slug: string): ScenarioContent | undefined {
  return scenarios.get(slug);
}

export function getDiscProfile(code: string): DiscProfileContent | undefined {
  return discProfiles.get(code);
}

export function getRubric(): RubricItemContent[] {
  return rubricItems;
}

export function getAllScenarios(): ScenarioContent[] {
  return Array.from(scenarios.values());
}

export function getAllDiscProfiles(): DiscProfileContent[] {
  return Array.from(discProfiles.values());
}
