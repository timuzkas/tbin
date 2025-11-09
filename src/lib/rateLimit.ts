import db from './db';
import { log } from './log';
import { getRateLimits } from './utils';
import { env } from '$env/dynamic/private';

const noRateLimit = env.NO_RATE_LIMIT === 'true';
const OFFENSE_EXPIRATION_DAYS = 3;

export function checkRateLimit(clientAddress: string, userId: string | null, action: string) {
	if (noRateLimit || action === 'file_upload') {
		return null; // No rate limiting applied
	}

	const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);
	if (ban) {
		log(`Banned IP attempted action ${action}: ${clientAddress}`);
		return new Response('You have been permanently banned for abuse.', { status: 403 });
	}

	const userType = userId ? '__AUTH__' : '__GUEST__';
	const rateLimits = getRateLimits(action, userType);

	for (const limit of rateLimits) {
		const { type, limit_value, time_window_seconds, ban_threshold } = limit;

		if (type === 'cooldown') {
			const lastAction = db
				.prepare(
					'SELECT timestamp FROM offenses WHERE ip = ? ORDER BY timestamp DESC LIMIT 1'
				)
				.get(clientAddress);

			if (lastAction && Date.now() - lastAction.timestamp < limit_value * 1000) {
				return new Response(`Cooldown: Please wait ${limit_value} seconds.`, { status: 429 });
			}
		} else if (type === 'limit') {
			const offenses = db
				.prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
				.all(clientAddress, Date.now() - time_window_seconds * 1000);

			if (offenses.length >= limit_value) {
				const offenseExpiresAt = Date.now() + OFFENSE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
				db.prepare('INSERT INTO offenses (ip, timestamp, expires_at) VALUES (?, ?, ?)').run(
					clientAddress,
					Date.now(),
					offenseExpiresAt
				);

				const totalOffenses = db
					.prepare('SELECT COUNT(*) as count FROM offenses WHERE ip = ? AND expires_at > ?')
					.get(clientAddress, Date.now()).count;

				log(
					`Rate limit exceeded for IP: ${clientAddress}, action: ${action}, offenses: ${totalOffenses}`
				);

				if (totalOffenses >= ban_threshold) {
					db.prepare('INSERT OR IGNORE INTO bans (ip, reason) VALUES (?, ?)').run(
						clientAddress,
						'Exceeded rate limit ban threshold'
					);
					log(`Banning IP: ${clientAddress}`);
					return new Response('You have been permanently banned for abuse.', { status: 403 });
				}

				const halfBanThreshold = Math.floor(ban_threshold / 2);
				if (totalOffenses === halfBanThreshold) {
					const notificationMessage = `You have received ${totalOffenses} offenses. You will be banned after ${ban_threshold} offenses. Please be aware of your activity.`;
					const expiresAt = Date.now() / 1000 + 7 * 24 * 60 * 60; // 1 week from now
					db.prepare(
						'INSERT INTO notifications (message, user_id, ip, expires_at) VALUES (?, ?, ?, ?)'
					).run(notificationMessage, userId, userId ? null : clientAddress, expiresAt);
				}

				if (totalOffenses >= 5) {
					// Notify user about impending ban
					log(
						`IP ${clientAddress} has ${totalOffenses} offenses. Ban at ${ban_threshold}.`
					);
				}

				return new Response(
					'Rate limit exceeded. Please wait before performing this action again.',
					{
						status: 429
					}
				);
			}
		}
	}

	// Record activity for cooldown checks, but not as an "offense" unless a limit is hit
	if (rateLimits.some(l => l.type === 'cooldown')) {
		const offenseExpiresAt = Date.now() + OFFENSE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
		db.prepare('INSERT INTO offenses (ip, timestamp, expires_at) VALUES (?, ?, ?)').run(
			clientAddress,
			Date.now(),
			offenseExpiresAt
		);
	}

	return null; // No rate limit exceeded
}
