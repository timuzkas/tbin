import Database from 'better-sqlite3';

const dbPath = 'pastes.db';
const db = new Database(dbPath);

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS pastes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'plaintext',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER,
    user_id TEXT
  )
`
).run();

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS offenses (
    ip TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`
).run();

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS bans (
    ip TEXT PRIMARY KEY
  )
`
).run();

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    otp_secret TEXT
  )
`
).run();

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



// Check if collection_id column exists, and add it if not

const filesColumns = db.prepare("PRAGMA table_info(files)").all();

const hasCollectionId = filesColumns.some(column => column.name === 'collection_id');



if (!hasCollectionId) {

  db.prepare("ALTER TABLE files ADD COLUMN collection_id TEXT").run();

}

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS file_collections (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER
  )
`
).run();

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS file_collection_items (
    collection_id TEXT NOT NULL,
    file_id TEXT NOT NULL,
    PRIMARY KEY (collection_id, file_id),
    FOREIGN KEY (collection_id) REFERENCES file_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
  )
`
).run();

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS pending_otp (
    username TEXT PRIMARY KEY,
    secret TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER DEFAULT 0
  )
`
).run();

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS otp_lockouts (
    username TEXT PRIMARY KEY,
    ip TEXT,
    locked_until INTEGER NOT NULL
  )
`
).run();

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS failed_otp_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    ip TEXT,
    timestamp INTEGER NOT NULL
  )
`
).run();

db.prepare(
	`
  CREATE INDEX IF NOT EXISTS idx_failed_attempts_username_timestamp
  ON failed_otp_attempts(username, timestamp)
`
).run();

db.prepare(`DELETE FROM pending_otp WHERE expires_at < strftime('%s', 'now')`).run();
db.prepare(`DELETE FROM failed_otp_attempts WHERE timestamp < strftime('%s', 'now') - 3600`).run();

export default db;
