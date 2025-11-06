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

db.prepare(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    user_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS file_collections (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS file_collection_items (
    collection_id TEXT NOT NULL,
    file_id TEXT NOT NULL,
    PRIMARY KEY (collection_id, file_id),
    FOREIGN KEY (collection_id) REFERENCES file_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
  )
`).run();

export default db;
