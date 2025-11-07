import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import { validateAuth } from '$lib/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOADS_DIR = 'uploads';

// Individual file upload rate limits
const INDIVIDUAL_RATE_LIMIT_WINDOW_MS = 30000; // 30 seconds
const MAX_INDIVIDUAL_REQUESTS_PER_WINDOW = 3;

// Collection file upload rate limits
const COLLECTION_RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_COLLECTION_REQUESTS_PER_WINDOW = 25;

const OFFENSE_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const MAX_OFFENSES = 10;
const noRateLimit = env.NO_RATE_LIMIT === 'true';

export async function POST({ request, cookies, getClientAddress }) {
	if (env.FILE_SHARING_ENABLED !== 'TRUE') {
		throw error(404, 'Not Found');
	}

	const clientAddress = getClientAddress();

	const formData = await request.formData();
	const file = formData.get('file') as File;
	const collection_id = formData.get('collection_id') as string | null;

	if (!file) {
		throw error(400, 'No file uploaded.');
	}

	if (file.size > MAX_FILE_SIZE) {
		throw error(413, 'File is too large.');
	}

	// Rate Limiting Logic
	if (!noRateLimit) {
		const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);
		if (ban) {
			throw error(403, 'You have been permanently banned for abuse.');
		}

		let rateLimitWindow = INDIVIDUAL_RATE_LIMIT_WINDOW_MS;
		let maxRequests = MAX_INDIVIDUAL_REQUESTS_PER_WINDOW;
		let rateLimitKey = clientAddress; // Default to IP for individual uploads

		if (collection_id) {
			// For collection uploads, rate limit per collection_id (or user_id if available)
			rateLimitWindow = COLLECTION_RATE_LIMIT_WINDOW_MS;
			maxRequests = MAX_COLLECTION_REQUESTS_PER_WINDOW;
			// If a user is logged in, use user_id for collection rate limiting, otherwise use collection_id
			const user = validateAuth(cookies);
			rateLimitKey = user?.id || collection_id;
		}

		const offenses = db
			.prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
			.all(rateLimitKey, Date.now() - rateLimitWindow);

		if (offenses.length >= maxRequests) {
			db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(
				rateLimitKey,
				Date.now()
			);

			const allOffenses = db
				.prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
				.all(rateLimitKey, Date.now() - OFFENSE_EXPIRATION_MS);

			if (allOffenses.length > MAX_OFFENSES) {
				db.prepare('INSERT OR IGNORE INTO bans (ip) VALUES (?)').run(rateLimitKey);
			}

			throw error(429, 'Rate limit exceeded. Please wait before uploading another file.');
		}
	}

	const id = randomUUID();
	const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
	const filePath = path.join(UPLOADS_DIR, `${id}-${sanitizedFilename}`);

	const buffer = Buffer.from(await file.arrayBuffer());
	await fs.writeFile(filePath, buffer);

	const user = validateAuth(cookies);
	const userId = user?.id || null;

	let expires_at;
	if (userId) {
		expires_at = Date.now() + 7 * 24 * 60 * 60 * 1000;
	} else {
		expires_at = Date.now() + 24 * 60 * 60 * 1000;
	}

	db.prepare(
		'INSERT INTO files (id, name, type, size, user_id, expires_at, collection_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
	).run(id, sanitizedFilename, file.type, file.size, userId, expires_at, collection_id);

	if (!noRateLimit) {
		db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(clientAddress, Date.now());
	}

	return json({ id });
}
