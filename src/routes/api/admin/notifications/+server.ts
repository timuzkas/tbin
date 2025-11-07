import { error, json } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function GET({ request }) {
  validateAdmin(request);

  const notifications = db.prepare('SELECT * FROM notifications').all();
  return json(notifications);
}

export async function POST({ request }) {
  validateAdmin(request);

  const { message, userId, expiresAt: rawExpiresAt } = await request.json();

  if (!message) {
    throw error(400, 'Message is required');
  }

  let expiresAt = rawExpiresAt;
  if (!expiresAt || expiresAt < Date.now() / 1000) { // If not provided or in the past
    expiresAt = (Date.now() / 1000) + (7 * 24 * 60 * 60); // 1 week from now in seconds
  }

  db.prepare(
    'INSERT INTO notifications (message, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(message, userId, expiresAt);

  return json({ message: 'Notification created successfully.' });
}
