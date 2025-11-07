import db from './db';
import { log } from './log';

export function purgeExpiredPastes() {
  const now = Date.now();
  const result = db.prepare('DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at < ?').run(now);
  log(`Deleted ${result.changes} expired pastes.`);
  return result.changes;
}
