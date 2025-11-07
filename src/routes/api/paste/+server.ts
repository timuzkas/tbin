import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import DOMPurify from 'isomorphic-dompurify';
import { log } from '$lib/log';
import { validateAuth } from '$lib/auth';
import { env } from '$env/dynamic/private';

const MAX_PASTE_SIZE = 1024 * 1024;

const UNREGISTERED_RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds

const MAX_UNREGISTERED_REQUESTS_PER_WINDOW = 1;

const OFFENSE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const MAX_OFFENSES = 50;

const noRateLimit = env.NO_RATE_LIMIT === 'true';



export async function POST(event) {

	const clientAddress = event.locals.ip;

	const user = validateAuth(event.cookies);

	const isRegistered = !!user;



	if (!noRateLimit && !isRegistered) {

		const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);

		if (ban) {

			log(`Banned IP attempted to paste: ${clientAddress}`);

			return new Response('You have been permanently banned for abuse.', { status: 403 });

		}



		const offenses = db

			.prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')

			.all(clientAddress, Date.now() - UNREGISTERED_RATE_LIMIT_WINDOW_MS);



		if (offenses.length >= MAX_UNREGISTERED_REQUESTS_PER_WINDOW) {

			db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(

				clientAddress,

				Date.now()

			);

			log(`Rate limit exceeded for IP: ${clientAddress}, offenses: ${offenses.length + 1}`);



			const allOffenses = db

				.prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')

				.all(clientAddress, Date.now() - OFFENSE_EXPIRATION_MS);



			if (allOffenses.length > MAX_OFFENSES) {

				db.prepare('INSERT OR IGNORE INTO bans (ip) VALUES (?)').run(clientAddress);

				log(`Banning IP: ${clientAddress}`);

			}



			return new Response('Rate limit exceeded. Please wait before creating another paste.', {

				status: 429

			});

		}

	}



	const { content, language } = await event.request.json();



	if (content.length > MAX_PASTE_SIZE) {

		log(`Paste content too large for IP: ${clientAddress}`);

		return new Response('Paste content is too large.', { status: 413 });

	}



	const sanitizedContent = DOMPurify.sanitize(content);

	if (sanitizedContent !== content) {

		log(`XSS attempt detected and sanitized for IP: ${clientAddress}`);

	}



	const userId = user?.id || null;



	const id = randomUUID().slice(0, 8);

	db.prepare('INSERT INTO pastes (id, content, language, user_id, created_at) VALUES (?, ?, ?, ?, ?) ').run(

		id,

		sanitizedContent,

		language || 'plaintext',

		userId,

		Date.now()

	);



		log(`Inserted paste with id: ${id} from user ${userId || 'anonymous'} from IP: ${clientAddress}`);



	



		if (!noRateLimit && !isRegistered) {



			db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(clientAddress, Date.now());



		}



	



		return json({ id });

}
