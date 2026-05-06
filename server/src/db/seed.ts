import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import db from './connection';
import { getContentDir } from '../utils/content-dir';

// ── Paths ────────────────────────────────────────────────────────────────────

const CONTENT_ROOT = getContentDir();
const SCENARIOS_DIR = path.join(CONTENT_ROOT, 'scenarios');
const DISC_DIR = path.join(CONTENT_ROOT, 'disc-profiles');
const RUBRIC_FILE = path.join(CONTENT_ROOT, 'coaching-rubric', '01-categories-and-weights.md');

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTitle(content: string, filename: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  if (!match) {
    console.warn(`[WARN] Could not extract title from ${filename}`);
    return null;
  }
  return match[1].trim();
}

/**
 * Find the first non-empty paragraph that doesn't start with >, #, or ---
 * after the status blockquote block.
 */
function extractDescription(content: string, filename: string): string {
  const lines = content.split('\n');

  // Find the line index of the > **Status:** block
  let statusIdx = lines.findIndex(l => l.startsWith('> **Status:**'));

  // Collect paragraph lines after the status block (or from the top if not found)
  const startIdx = statusIdx >= 0 ? statusIdx + 1 : 0;

  const paragraphLines: string[] = [];
  let inParagraph = false;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip lines starting with >, #, ---
    if (trimmed.startsWith('>') || trimmed.startsWith('#') || trimmed.startsWith('---')) {
      if (inParagraph) break; // end of found paragraph
      continue;
    }

    if (trimmed === '') {
      if (inParagraph) break; // end of paragraph
      continue; // skip blank lines before the paragraph
    }

    // We have a content line
    inParagraph = true;
    paragraphLines.push(trimmed);
  }

  if (paragraphLines.length === 0) {
    console.warn(`[WARN] Could not extract description from ${filename}`);
    return '';
  }

  return paragraphLines.join(' ');
}

/**
 * Derive DISC code from a filename like "05-D-I-driver-influencer.md".
 * Strategy: take all uppercase single-letter segments between the leading
 * number and the first lowercase word.
 */
function deriveDiscCode(filename: string): string | null {
  // Remove extension, e.g. "05-D-I-driver-influencer"
  const base = filename.replace(/\.md$/, '');
  // Split on dashes
  const parts = base.split('-');
  // Skip the numeric prefix (parts[0] = "05")
  const codeParts: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    // A DISC letter part is exactly 1 uppercase letter
    if (/^[A-Z]$/.test(p)) {
      codeParts.push(p);
    } else {
      break; // hit the descriptive word part, stop
    }
  }
  if (codeParts.length === 0) {
    console.warn(`[WARN] Could not derive DISC code from ${filename}`);
    return null;
  }
  return codeParts.join('/');
}

// ── Seed functions ───────────────────────────────────────────────────────────

function seedAdmin(): number {
  const email = process.env.ADMIN_EMAIL ?? 'admin@planforward.net';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const passwordHash = bcrypt.hashSync(password, 10);

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password_hash, disc_profile, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run('Admin', email, passwordHash, 'D', 'admin');
  // changes === 1 means inserted, 0 means ignored (already existed)
  return result.changes;
}

function seedScenarios(): number {
  const files = fs.readdirSync(SCENARIOS_DIR).filter(f => f.endsWith('.md')).sort();

  // Upsert by slug so /content/ edits land on the next deploy without manual migration.
  const upsert = db.prepare(`
    INSERT INTO scenarios (slug, title, description, body_markdown)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      body_markdown = excluded.body_markdown,
      updated_at = CURRENT_TIMESTAMP
  `);

  let count = 0;
  const tx = db.transaction(() => {
    for (const file of files) {
      const filePath = path.join(SCENARIOS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const slug = file.replace(/\.md$/, '');
      const title = extractTitle(content, file);
      if (!title) continue;
      const description = extractDescription(content, file);
      const result = upsert.run(slug, title, description, content);
      count += result.changes;
    }
  });
  tx();

  return count;
}

function seedDiscProfiles(): number {
  const files = fs
    .readdirSync(DISC_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort();

  const upsert = db.prepare(`
    INSERT INTO disc_profiles (code, name, body_markdown)
    VALUES (?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      body_markdown = excluded.body_markdown
  `);

  let count = 0;
  const tx = db.transaction(() => {
    for (const file of files) {
      const filePath = path.join(DISC_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const code = deriveDiscCode(file);
      if (!code) continue;
      const name = extractTitle(content, file);
      if (!name) continue;
      const result = upsert.run(code, name, content);
      count += result.changes;
    }
  });
  tx();

  return count;
}

function seedRubricItems(): number {
  const content = fs.readFileSync(RUBRIC_FILE, 'utf-8');
  const lines = content.split('\n');

  // Find the header row of the table (contains "Category" and "Weight")
  const headerIdx = lines.findIndex(
    l => l.includes('Category') && l.includes('Weight')
  );
  if (headerIdx === -1) {
    console.warn('[WARN] Could not find rubric table header');
    return 0;
  }

  // Rows start after header + separator line
  const dataLines = lines.slice(headerIdx + 2);

  // rubric_items has no UNIQUE constraint — clear and re-insert on every deploy
  // so weight changes in the rubric markdown land without manual migration.
  const clearStmt = db.prepare(`DELETE FROM rubric_items`);
  const insert = db.prepare(`
    INSERT INTO rubric_items (name, weight, description, display_order)
    VALUES (?, ?, ?, ?)
  `);

  let count = 0;
  let displayOrder = 1;

  const tx = db.transaction(() => {
    clearStmt.run();
    for (const line of dataLines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|')) break; // end of table

      // Split on | and remove empty first/last elements
      const cells = trimmed.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

      // cells: [#, Category, Weight, What It Measures]
      if (cells.length < 4) continue;

      const [numCell, categoryCell, weightCell, descCell] = cells;

      // Skip the TOTAL row
      if (!numCell || numCell === '' || numCell.toLowerCase() === 'total') continue;

      // Parse the category name — strip markdown bold **...**
      const name = categoryCell.replace(/\*\*/g, '').trim();
      if (!name) continue;

      // Parse weight integer from "13%"
      const weightMatch = weightCell.match(/(\d+)/);
      if (!weightMatch) {
        console.warn(`[WARN] Could not parse weight from "${weightCell}" for category "${name}"`);
        continue;
      }
      const weight = parseInt(weightMatch[1], 10);

      const description = descCell.trim();

      insert.run(name, weight, description, displayOrder);
      count++;
      displayOrder++;
    }
  });
  tx();

  return count;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const adminCount = seedAdmin();
  const scenarioCount = seedScenarios();
  const discCount = seedDiscProfiles();
  const rubricCount = seedRubricItems();

  console.log(
    `Seeded: ${adminCount} admin, ${scenarioCount} scenarios, ${discCount} DISC profiles, ${rubricCount} rubric items`
  );
}

main();
