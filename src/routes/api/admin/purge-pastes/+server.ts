import { json, error } from '@sveltejs/kit';
import db from '$lib/db';
import { env } from '$env/dynamic/private';
import { log } from '$lib/log';
import { hashPassword } from '$lib/utils';

export async function POST(event) {
	const { request } = event;
	const clientAddress = event.locals.ip;

	if (clientAddress !== '127.0.0.1' && clientAddress !== '::1') {
		log(`Unauthorized attempt to access purge-pastes endpoint from ${clientAddress}`);
		throw error(401, 'Unauthorized');
	}

	const { password, username } = await request.json();

	if (env.ADMIN_PASSWORD === undefined) {
		throw error(500, 'ADMIN_PASSWORD environment variable is not set.');
	}
	if (env.ADMIN_PASSWORD_SALT === undefined) {
		throw error(500, 'ADMIN_PASSWORD_SALT environment variable is not set.');
	}

	const hashedPassword = hashPassword(password, env.ADMIN_PASSWORD_SALT);

	if (hashedPassword !== env.ADMIN_PASSWORD) {
		log(
			`Unauthorized attempt to access purge-pastes endpoint with incorrect password from ${clientAddress}`
		);
		throw error(401, 'Incorrect password');
	}

	let deletedCount = 0;
	let message = '';

	if (username) {
		const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
		if (!user) {
			throw error(404, 'User not found');
		}

		const result = db.prepare('DELETE FROM pastes WHERE user_id = ?').run(user.id);
		deletedCount = result.changes;
		message = `Purged ${deletedCount} pastes for user ${username}.`;
		log(message);
	} else {
		// Purge all pastes
		const result = db.prepare('DELETE FROM pastes').run();
		deletedCount = result.changes;
		message = `Purged ${deletedCount} pastes.`;
		log(message);
	}

	return json({ message });
}
