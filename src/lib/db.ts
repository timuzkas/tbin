import Database from 'better-sqlite3';

const dbPath = 'pastes.db';
const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS pastes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'plaintext',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`).run();

export default db;
