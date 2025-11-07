import { json } from '@sveltejs/kit';
import db from '$lib/db';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

export async function POST({ request }) {
	const { username } = await request.json();

	if (!username) {
		return new Response('Username is required.', { status: 400 });
	}

	if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
		return new Response('Invalid username format.', { status: 400 });
	}

	let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

	if (user && user.otp_secret) {
		return json({ registered: true });
	} else {
		const secret = authenticator.generateSecret();
		const expiresAt = Math.floor(Date.now() / 1000) + 600;

		db.prepare(
			`
			INSERT OR REPLACE INTO pending_otp (username, secret, expires_at, attempts)
			VALUES (?, ?, ?, 0)
		`
		).run(username, secret, expiresAt);

		const otpauth = authenticator.keyuri(username, 'tbin', secret);
		const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

		return json({ qrCodeDataUrl, registered: false });
	}
}
