import Database from 'better-sqlite3';

const dbPath = 'pastes.db';
const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS pastes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'plaintext',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER,
    user_id TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS offenses (
    ip TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS bans (
    ip TEXT PRIMARY KEY
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    otp_secret TEXT
  )
`).run();

export default db;
