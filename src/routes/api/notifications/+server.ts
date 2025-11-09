import { json } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAuth } from '$lib/auth';

export async function GET({ cookies, locals }) {
	const user = validateAuth(cookies);
	const ip = locals.ip;
	const now = Math.floor(Date.now() / 1000);

	const notifications = db
		.prepare(
			`SELECT message FROM notifications 
     WHERE 
       (
         user_id = ? 
         OR (ip = ? AND user_id IS NULL)
         OR (user_id IS NULL AND ip IS NULL)
       )
       AND (expires_at IS NULL OR expires_at > ?)`
		)
		.all(user ? user.id : null, ip, now);

	return json(notifications);
}

