import { validateAuth } from '$lib/auth';
import db from '$lib/db';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { cookies } = event;
	const user = validateAuth(cookies);
	const clientAddress = event.locals.ip;

	const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);
	const noLogin = env.LOGIN_ENABLED === 'false';
	const showCredits = env.SHOW_CREDITS === 'true';
	const fileSharingEnabled = env.FILE_SHARING_ENABLED === 'true';

	if (ban) {
		return {
			banned: true,
			noLogin,
			showCredits,
			fileSharingEnabled,
			isLoggedIn: false,
			username: ''
		};
	}

	const notifications = db
		.prepare(
			`SELECT message, user_id FROM notifications WHERE (user_id IS NULL OR user_id = '' OR user_id = ?) AND (expires_at IS NULL OR expires_at > strftime('%s', 'now'))`
		)
		.all(user?.id || null);

	return {
		banned: false,
		noLogin,
		showCredits,
		fileSharingEnabled,
		isLoggedIn: !!user,
		username: user?.username || '',
		userId: user?.id || null,
		notifications: notifications.map((n) => ({ message: n.message, isUserSpecific: !!n.user_id }))
	};
};
