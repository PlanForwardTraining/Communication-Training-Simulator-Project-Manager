import fs from 'fs';
import path from 'path';
import { getContentDir } from '../utils/content-dir';

export interface VoiceSelection {
  voiceId: string;
  voiceName: string;
}

interface VoiceProfile {
  voiceId: string;
  displayName: string;
  active: boolean;
  discCompatibility: string[]; // e.g. ['D', 'D/I', 'D/C']
  fileName: string;
}

const CONTENT_DIR = getContentDir();
const VOICES_DIR = path.join(CONTENT_DIR, 'voices');
const SCENARIOS_DIR = path.join(CONTENT_DIR, 'scenarios');

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

function parseDiscCompatibility(body: string): string[] {
  // Look for: "This voice fits: **D, D/I, D/C**"
  const match = body.match(/This voice fits:\s*\*\*([^*]+)\*\*/);
  if (!match) return [];
  return match[1].split(',').map(s => s.trim()).filter(Boolean);
}

function loadVoices(): VoiceProfile[] {
  const files = fs.readdirSync(VOICES_DIR).filter(
    f => f.endsWith('.md') && f !== 'README.md'
  );

  return files.map(fileName => {
    const content = fs.readFileSync(path.join(VOICES_DIR, fileName), 'utf-8');
    const fm = parseFrontmatter(content);
    const disc = parseDiscCompatibility(content);
    return {
      voiceId: fm.voice_id || '',
      displayName: fm.display_name || fileName,
      active: fm.active !== 'false',
      discCompatibility: disc,
      fileName,
    };
  }).filter(v => v.voiceId);
}

function checkScenarioPinnedVoice(scenarioSlug: string): VoiceSelection | null {
  try {
    const scenarioFile = fs.readdirSync(SCENARIOS_DIR)
      .find(f => f.startsWith(scenarioSlug) || f.replace('.md', '') === scenarioSlug);
    if (!scenarioFile) return null;

    const content = fs.readFileSync(path.join(SCENARIOS_DIR, scenarioFile), 'utf-8');
    const overrideMatch = content.match(/##\s+Voice Override\s*\n+([^\n]+)/);
    if (!overrideMatch) return null;

    const pinnedFile = overrideMatch[1].trim();
    const voices = loadVoices();
    const pinned = voices.find(v => v.fileName === pinnedFile || v.fileName === `${pinnedFile}.md`);
    if (!pinned) return null;

    return { voiceId: pinned.voiceId, voiceName: pinned.displayName };
  } catch {
    return null;
  }
}

// Cache voices at module load
const voicePool = loadVoices();

export function selectVoiceForSession(
  scenarioSlug: string,
  clientDiscCode: string
): VoiceSelection {
  // Tier 1: scenario-pinned
  const pinned = checkScenarioPinnedVoice(scenarioSlug);
  if (pinned) return pinned;

  const activeVoices = voicePool.filter(v => v.active && v.voiceId);

  // Tier 2: DISC-aligned random
  const discMatches = activeVoices.filter(v =>
    v.discCompatibility.includes(clientDiscCode)
  );

  const pool = discMatches.length > 0 ? discMatches : activeVoices;

  if (pool.length === 0) {
    throw new Error('No voices available in pool');
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];
  return { voiceId: selected.voiceId, voiceName: selected.displayName };
}
