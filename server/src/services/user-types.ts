import db from '../db/connection';

export function listUserTypes(): { id: number; name: string }[] {
  return db.prepare('SELECT id, name FROM user_types ORDER BY name').all() as { id: number; name: string }[];
}

export function addUserType(name: string): void {
  db.prepare('INSERT OR IGNORE INTO user_types (name) VALUES (?)').run(name.trim());
}

export function userTypeInUse(name: string): number {
  const u = (db.prepare('SELECT COUNT(*) AS n FROM users WHERE user_type = ?').get(name) as { n: number }).n;
  const s = (db.prepare('SELECT COUNT(*) AS n FROM scenarios WHERE visible_to_types LIKE ?').get(`%"${name}"%`) as { n: number }).n;
  return u + s;
}

export function removeUserType(name: string): void {
  db.prepare('DELETE FROM user_types WHERE name = ?').run(name);
}
