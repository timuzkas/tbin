import db from '../src/lib/db.js';

function deleteExpiredPastes() {
  const now = Date.now();
  const result = db.prepare('DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at < ?').run(now);
  console.log(`Deleted ${result.changes} expired pastes.`);
}

deleteExpiredPastes();
