import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import db from '$lib/db';
import { authenticator } from 'otplib';
import { randomUUID } from 'crypto';
import { log } from '$lib/log';

const MAX_OTP_ATTEMPTS = 5;
const LOCKOUT_DURATION = 900;

export async function POST(event) {
	const { request, cookies } = event;
	const { username, otp } = await request.json();
	const ip = event.locals.ip;

	if (!username || !otp) {
		return new Response('Username and OTP are required.', { status: 400 });
	}

	const lockout = db
		.prepare('SELECT * FROM otp_lockouts WHERE username = ? OR ip = ?')
		.get(username, ip);
	if (lockout) {
		const now = Math.floor(Date.now() / 1000);
		if (lockout.locked_until > now) {
			const remainingTime = Math.ceil((lockout.locked_until - now) / 60);
			return new Response(
				`Too many failed attempts. Locked out for ${remainingTime} more minutes.`,
				{ status: 429 }
			);
		} else {
			db.prepare('DELETE FROM otp_lockouts WHERE username = ? OR ip = ?').run(username, ip);
		}
	}

	let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
	let secretToVerify = '';
	let isNewRegistration = false;

	if (user && user.otp_secret) {
		secretToVerify = user.otp_secret;
	} else {
		const pending = db.prepare('SELECT * FROM pending_otp WHERE username = ?').get(username);

		if (!pending) {
			return new Response('User not found or OTP not set up.', { status: 404 });
		}

		const now = Math.floor(Date.now() / 1000);
		if (pending.expires_at < now) {
			db.prepare('DELETE FROM pending_otp WHERE username = ?').run(username);
			return new Response('OTP setup expired. Please generate a new QR code.', { status: 410 });
		}

		if (pending.attempts >= MAX_OTP_ATTEMPTS) {
			const lockedUntil = now + LOCKOUT_DURATION;
			db.prepare(
				'INSERT OR REPLACE INTO otp_lockouts (username, ip, locked_until) VALUES (?, ?, ?)'
			).run(username, ip, lockedUntil);
			db.prepare('DELETE FROM pending_otp WHERE username = ?').run(username);
			return new Response('Too many failed attempts. Please try again later.', { status: 429 });
		}

		secretToVerify = pending.secret;
		isNewRegistration = true;
	}

	const isValid = authenticator.verify({ token: otp, secret: secretToVerify });

	if (!isValid) {
		if (isNewRegistration) {
			db.prepare('UPDATE pending_otp SET attempts = attempts + 1 WHERE username = ?').run(username);
			const updated = db
				.prepare('SELECT attempts FROM pending_otp WHERE username = ?')
				.get(username);
			const remainingAttempts = MAX_OTP_ATTEMPTS - updated.attempts;
			return new Response(`Invalid OTP. ${remainingAttempts} attempts remaining.`, { status: 401 });
		} else {
			db.prepare('INSERT INTO failed_otp_attempts (username, ip, timestamp) VALUES (?, ?, ?)').run(
				username,
				ip,
				Math.floor(Date.now() / 1000)
			);

			const recentFailures = db
				.prepare(
					`
				SELECT COUNT(*) as count FROM failed_otp_attempts
				WHERE username = ? AND timestamp > ?
			`
				)
				.get(username, Math.floor(Date.now() / 1000) - 600);

			if (recentFailures.count >= MAX_OTP_ATTEMPTS) {
				const lockedUntil = Math.floor(Date.now() / 1000) + LOCKOUT_DURATION;
				db.prepare(
					'INSERT OR REPLACE INTO otp_lockouts (username, ip, locked_until) VALUES (?, ?, ?)'
				).run(username, ip, lockedUntil);
				return new Response('Too many failed attempts. Account locked for 15 minutes.', {
					status: 429
				});
			}

			return new Response('Invalid OTP.', { status: 401 });
		}
	}

	if (isNewRegistration) {
		const id = randomUUID();
		const token = randomUUID();

		try {
			db.prepare('INSERT INTO users (id, username, token, otp_secret) VALUES (?, ?, ?, ?)').run(
				id,
				username,
				token,
				secretToVerify
			);

			db.prepare('DELETE FROM pending_otp WHERE username = ?').run(username);
			log(`New user registered and logged in: ${username} (ID: ${id}) from IP: ${ip}`);
		} catch (error) {
			return new Response('Failed to create user.', { status: 500 });
		}

		cookies.set('auth_token', token, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 30
		});

		db.prepare('DELETE FROM failed_otp_attempts WHERE username = ?').run(username);

		return json({ success: true, username });
	} else {
		cookies.set('auth_token', user.token, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 30
		});

		db.prepare('DELETE FROM failed_otp_attempts WHERE username = ?').run(username);

		log(`Existing user logged in: ${username} (ID: ${user.id}) from IP: ${ip}`);
		return json({ success: true, username });
	}
}
