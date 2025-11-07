// src/routes/api/files/upload/+server.ts
import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import { validateAuth } from '$lib/auth';
import { log } from '$lib/log';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOADS_DIR = 'uploads';
const RATE_LIMIT_WINDOW_MS = 30000;
const MAX_REQUESTS_PER_WINDOW = 3;
const OFFENSE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_OFFENSES = 50;
const noRateLimit = env.NO_RATE_LIMIT === 'true';

const ANONYMOUS_MAX_COLLECTION_FILES = 10;
const ANONYMOUS_MAX_COLLECTION_SIZE_MB = 20;
const AUTHENTICATED_MAX_COLLECTION_FILES = 50;
const AUTHENTICATED_MAX_COLLECTION_SIZE_MB = 100;

export async function POST({ request, cookies, event }) {
	if (env.FILE_SHARING_ENABLED !== 'TRUE') throw error(404, 'Not Found');

	const clientAddress = event.locals.ip;
	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	let collection_id: string | null = formData.get('collection_id') as string | null;

	if (collection_id === '' || collection_id === 'null') collection_id = null;

	if (!noRateLimit && !collection_id) {
		const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);
		if (ban) throw error(403, 'You have been permanently banned for abuse.');

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

	if (!file || file.size === 0) throw error(400, 'No file uploaded.');
	if (file.size > MAX_FILE_SIZE) throw error(413, 'File is too large.');

	const user = validateAuth(cookies);
	const userId = user?.id || null;

	if (collection_id) {
		const collectionFiles = db
			.prepare(
				'SELECT COALESCE(SUM(size),0) as totalSize, COUNT(id) as fileCount FROM files WHERE collection_id = ?'
			)
			.get(collection_id) || { totalSize: 0, fileCount: 0 };

		const maxFiles = userId ? AUTHENTICATED_MAX_COLLECTION_FILES : ANONYMOUS_MAX_COLLECTION_FILES;
		const maxSizeMB = userId
			? AUTHENTICATED_MAX_COLLECTION_SIZE_MB
			: ANONYMOUS_MAX_COLLECTION_SIZE_MB;

		if (collectionFiles.fileCount >= maxFiles) {
			throw error(400, `Collection file count limit exceeded. Max ${maxFiles} files.`);
		}
		const newSizeMB = (collectionFiles.totalSize + file.size) / (1024 * 1024);
		if (newSizeMB > maxSizeMB) {
			throw error(400, `Collection total size limit exceeded. Max ${maxSizeMB} MB.`);
		}
	}

	const id = randomUUID();
	const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
	const filePath = path.join(UPLOADS_DIR, `${id}-${sanitizedFilename}`);
	const buffer = Buffer.from(await file.arrayBuffer());
	await fs.mkdir(UPLOADS_DIR, { recursive: true });
	await fs.writeFile(filePath, buffer);

	const expires_at = userId
		? Date.now() + 7 * 24 * 60 * 60 * 1000
		: Date.now() + 24 * 60 * 60 * 1000;

	db.prepare(
		'INSERT INTO files (id, name, type, size, user_id, expires_at, collection_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
	).run(id, sanitizedFilename, file.type, file.size, userId, expires_at, collection_id);

	if (collection_id) {
		db.prepare('INSERT INTO file_collection_items (collection_id, file_id) VALUES (?, ?)').run(collection_id, id);
		log(`File ${id} (${sanitizedFilename}) added to collection ${collection_id} by user ${userId || 'anonymous'} from IP ${clientAddress}`);
	} else {
		log(`File ${id} (${sanitizedFilename}) uploaded by user ${userId || 'anonymous'} from IP ${clientAddress}`);
	}

	if (!noRateLimit) {
		db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(clientAddress, Date.now());
	}

	return json({ id });
}
