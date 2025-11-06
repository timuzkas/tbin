import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

export async function POST({ request }) {
  const { username } = await request.json();

  if (!username) {
    return new Response('Username is required.', { status: 400 });
  }

  let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  let secret;

  if (user && user.otp_secret) {
    secret = user.otp_secret;
  } else {
    secret = authenticator.generateSecret();
    const id = user ? user.id : randomUUID();
    const token = user ? user.token : randomUUID();
    if (user) {
      db.prepare('UPDATE users SET otp_secret = ? WHERE id = ?').run(secret, id);
    } else {
      db.prepare(
        'INSERT INTO users (id, username, token, otp_secret) VALUES (?, ?, ?, ?)'
      ).run(id, username, token, secret);
    }
  }

  const otpauth = authenticator.keyuri(username, 'tbin', secret);

  const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

  return json({ qrCodeDataUrl });
}
