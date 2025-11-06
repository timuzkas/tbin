import { json } from '@sveltejs/kit';
import db from '$lib/db';
import { authenticator } from 'otplib';

export async function POST({ request }) {
  const { username, otp } = await request.json();

  if (!username || !otp) {
    return new Response('Username and OTP are required.', { status: 400 });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !user.otp_secret) {
    return new Response('User not found or OTP not set up.', { status: 404 });
  }

  const isValid = authenticator.verify({ token: otp, secret: user.otp_secret });

  if (!isValid) {
    return new Response('Invalid OTP.', { status: 401 });
  }

  return json({ token: user.token });
}
