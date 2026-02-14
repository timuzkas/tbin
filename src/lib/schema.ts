import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const pastes = sqliteTable('pastes', {
	id: text('id').primaryKey(),
	content: text('content').notNull(),
	language: text('language').default('plaintext'),
	createdAt: integer('created_at'),
	expiresAt: integer('expires_at'),
	userId: text('user_id'),
	ip: text('ip'),
	title: text('title')
});

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	token: text('token').notNull().unique(),
	otpSecret: text('otp_secret'),
	banned: integer('banned').default(0),
	lastLoginAt: integer('last_login_at')
});

export const files = sqliteTable('files', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	type: text('type').notNull(),
	size: integer('size').notNull(),
	userId: text('user_id'),
	createdAt: integer('created_at'),
	expiresAt: integer('expires_at'),
	collectionId: text('collection_id')
});

export const fileCollections = sqliteTable('file_collections', {
	id: text('id').primaryKey(),
	userId: text('user_id'),
	createdAt: integer('created_at'),
	expiresAt: integer('expires_at')
});

export const fileCollectionItems = sqliteTable('file_collection_items', {
	collectionId: text('collection_id').notNull(),
	fileId: text('file_id').notNull()
});

export const bans = sqliteTable('bans', {
	ip: text('ip').primaryKey(),
	reason: text('reason'),
	bannedAt: integer('banned_at')
});

export const offenses = sqliteTable('offenses', {
	ip: text('ip').notNull(),
	timestamp: integer('timestamp').notNull(),
	expiresAt: integer('expires_at')
});

export const pasteCounts = sqliteTable('paste_counts', {
	ip: text('ip').primaryKey(),
	count: integer('count').notNull().default(0)
});

export const pendingOtp = sqliteTable('pending_otp', {
	username: text('username').primaryKey(),
	secret: text('secret').notNull(),
	expiresAt: integer('expires_at').notNull(),
	attempts: integer('attempts').default(0)
});

export const otpLockouts = sqliteTable('otp_lockouts', {
	username: text('username').primaryKey(),
	ip: text('ip'),
	lockedUntil: integer('locked_until').notNull()
});

export const failedOtpAttempts = sqliteTable('failed_otp_attempts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull(),
	ip: text('ip'),
	timestamp: integer('timestamp').notNull()
});

export const notifications = sqliteTable('notifications', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	message: text('message').notNull(),
	userId: text('user_id'),
	createdAt: integer('created_at'),
	expiresAt: integer('expires_at'),
	ip: text('ip')
});

export const rateLimits = sqliteTable('rate_limits', {
	action: text('action').notNull(),
	userType: text('user_type').notNull(),
	type: text('type').notNull(),
	limitValue: integer('limit_value').notNull(),
	timeWindowSeconds: integer('time_window_seconds'),
	banThreshold: integer('ban_threshold').default(10)
});

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});
