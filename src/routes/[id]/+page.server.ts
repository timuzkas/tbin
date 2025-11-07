import db from '$lib/db';
import { error } from '@sveltejs/kit';
import { validateAuth } from '$lib/auth';
import { env } from '$env/dynamic/private';

export async function load({ params, cookies }) {
	const { id } = params;
	const stmt = db.prepare('SELECT * FROM pastes WHERE id = ?');
	const paste = stmt.get(id);

	if (!paste) {
		throw error(404, 'Paste not found');
	}

	const user = validateAuth(cookies);

	return {
		paste,
		isOwner: paste.user_id === user?.id,
		loginEnabled: env.LOGIN_ENABLED !== 'false'
	};
}
