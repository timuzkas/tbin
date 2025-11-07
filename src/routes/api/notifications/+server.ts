import { json } from '@sveltejs/kit';
import db from '$lib/db';

export async function GET({ locals }) {
  const userId = locals.user?.id;
  const now = Math.floor(Date.now() / 1000);

  let notifications = [];

  if (userId) {
    notifications = db.prepare(
      'SELECT message FROM notifications WHERE (user_id IS NULL OR user_id = ?) AND (expires_at IS NULL OR expires_at > ?)'
    ).all(userId, now);
  } else {
    notifications = db.prepare(
      'SELECT message FROM notifications WHERE user_id IS NULL AND (expires_at IS NULL OR expires_at > ?)'
    ).all(now);
  }

  return json(notifications);
}
