import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import { validateAuth } from '$lib/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOADS_DIR = 'uploads';
const RATE_LIMIT_WINDOW_MS = 30000;
const MAX_REQUESTS_PER_WINDOW = 3;
const OFFENSE_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const MAX_OFFENSES = 10;
const noRateLimit = env.NO_RATE_LIMIT === 'true';

export async function POST({ request, cookies, getClientAddress }) {
	if (env.FILE_SHARING_ENABLED !== 'TRUE') {
		throw error(404, 'Not Found');
	}

	const clientAddress = getClientAddress();

	if (!noRateLimit) {
		const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);
		if (ban) {
			throw error(403, 'You have been permanently banned for abuse.');
		}

		const offenses = db
			.prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
			.all(clientAddress, Date.now() - RATE_LIMIT_WINDOW_MS);

		if (offenses.length >= MAX_REQUESTS_PER_WINDOW) {
			db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(
				clientAddress,
				Date.now()
			);

			const allOffenses = db
				.prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
				.all(clientAddress, Date.now() - OFFENSE_EXPIRATION_MS);

			if (allOffenses.length > MAX_OFFENSES) {
				db.prepare('INSERT OR IGNORE INTO bans (ip) VALUES (?)').run(clientAddress);
			}

			throw error(429, 'Rate limit exceeded. Please wait before uploading another file.');
		}
	}

	const formData = await request.formData();
	const file = formData.get('file') as File;

	if (!file) {
		throw error(400, 'No file uploaded.');
	}

	if (file.size > MAX_FILE_SIZE) {
		throw error(413, 'File is too large.');
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
		'INSERT INTO files (id, name, type, size, user_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
	).run(id, sanitizedFilename, file.type, file.size, userId, expires_at);

	if (!noRateLimit) {
		db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(clientAddress, Date.now());
	}

	return json({ id });
}
