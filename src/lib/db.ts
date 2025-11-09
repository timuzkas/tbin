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
    user_id TEXT,
    ip TEXT
  )
`
).run();

// Add ip column to pastes if it doesn't exist
const pastesColumns = db.prepare('PRAGMA table_info(pastes)').all();
if (!pastesColumns.some((c) => c.name === 'ip')) {
	db.prepare('ALTER TABLE pastes ADD COLUMN ip TEXT').run();
}

// Add title column to pastes if it doesn't exist
if (!pastesColumns.some((c) => c.name === 'title')) {
	db.prepare('ALTER TABLE pastes ADD COLUMN title TEXT').run();
}

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS offenses (
    ip TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    expires_at INTEGER
  )
`
).run();

// Add expires_at to offenses if it doesn't exist
const offensesColumns = db.prepare('PRAGMA table_info(offenses)').all();
if (!offensesColumns.some((c) => c.name === 'expires_at')) {
	db.prepare('ALTER TABLE offenses ADD COLUMN expires_at INTEGER').run();
}

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS paste_counts (
    ip TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
  )
`
).run();

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS bans (
    ip TEXT PRIMARY KEY,
    reason TEXT,
    banned_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`
).run();

// Check if reason column exists in bans table, and add it if not
const bansColumns = db.prepare('PRAGMA table_info(bans)').all();
const hasReasonColumn = bansColumns.some((column) => column.name === 'reason');

if (!hasReasonColumn) {
	db.prepare('ALTER TABLE bans ADD COLUMN reason TEXT').run();
}

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    otp_secret TEXT,
    banned INTEGER DEFAULT 0,
    last_login_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`
).run();

// Check if banned column exists in users table, and add it if not
const usersColumns = db.prepare('PRAGMA table_info(users)').all();
const hasBannedColumn = usersColumns.some((column) => column.name === 'banned');

if (!hasBannedColumn) {
	db.prepare('ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0').run();
}

// Check if last_login_at column exists in users table, and add it if not
const hasLastLoginAtColumn = usersColumns.some((column) => column.name === 'last_login_at');

if (!hasLastLoginAtColumn) {
	db.prepare(`ALTER TABLE users ADD COLUMN last_login_at INTEGER DEFAULT NULL`).run();
	db.prepare(`UPDATE users SET last_login_at = strftime('%s', 'now') WHERE last_login_at IS NULL`).run();
}


db.prepare(
	`

      CREATE TABLE IF NOT EXISTS files (

    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    type TEXT NOT NULL,

    size INTEGER NOT NULL,

    user_id TEXT,

    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    expires_at INTEGER

  )

`
).run();

// Check if collection_id column exists, and add it if not

const filesColumns = db.prepare('PRAGMA table_info(files)').all();

const hasCollectionId = filesColumns.some((column) => column.name === 'collection_id');

if (!hasCollectionId) {
	db.prepare('ALTER TABLE files ADD COLUMN collection_id TEXT').run();
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



db.prepare(
	`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    user_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER
  )
`
).run();

const notificationsColumns = db.prepare('PRAGMA table_info(notifications)').all();
if (!notificationsColumns.some((c) => c.name === 'ip')) {
	db.prepare('ALTER TABLE notifications ADD COLUMN ip TEXT').run();
}

db.prepare('DROP TABLE IF EXISTS rate_limits').run();
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS rate_limits (
    action TEXT NOT NULL,
    user_type TEXT NOT NULL, -- '__GUEST__', '__AUTH__', or a specific user ID
    type TEXT NOT NULL, -- 'cooldown' or 'limit'
    limit_value INTEGER NOT NULL, -- e.g., seconds for cooldown, count for limit
    time_window_seconds INTEGER, -- for 'limit' type
    ban_threshold INTEGER DEFAULT 10,
    PRIMARY KEY (action, user_type)
  )
`
).run();

// Default rate limits
db.prepare(
	`INSERT OR IGNORE INTO rate_limits (action, user_type, type, limit_value, time_window_seconds) VALUES (?, ?, ?, ?, ?)`
).run('paste_creation', '__AUTH__', 'cooldown', 5, null);
db.prepare(
	`INSERT OR IGNORE INTO rate_limits (action, user_type, type, limit_value, time_window_seconds) VALUES (?, ?, ?, ?, ?)`
).run('paste_creation', '__GUEST__', 'cooldown', 15, null);
db.prepare(
	`INSERT OR IGNORE INTO rate_limits (action, user_type, type, limit_value, time_window_seconds) VALUES (?, ?, ?, ?, ?)`
).run('paste_creation', '__GUEST__', 'limit', 25, 3600);
db.prepare(
	`INSERT OR IGNORE INTO rate_limits (action, user_type, type, limit_value, time_window_seconds, ban_threshold) VALUES (?, ?, ?, ?, ?, ?)`
).run('collection_creation', '__AUTH__', 'limit', 5, 3600, 10);
db.prepare(
	`INSERT OR IGNORE INTO rate_limits (action, user_type, type, limit_value, time_window_seconds, ban_threshold) VALUES (?, ?, ?, ?, ?, ?)`
).run('collection_creation', '__GUEST__', 'limit', 2, 3600, 10);

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`
).run();

export default db;
