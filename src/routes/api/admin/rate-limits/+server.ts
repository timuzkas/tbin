import { error, json } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function GET({ request }) {
  validateAdmin(request);

  const rateLimits = db.prepare('SELECT * FROM rate_limits').all();
  return json(rateLimits);
}

export async function POST({ request }) {
  validateAdmin(request);

  const { action, max_offenses, time_window_seconds, userId } = await request.json();

  if (!action || max_offenses === undefined || time_window_seconds === undefined) {
    throw error(400, 'Action, max_offenses, and time_window_seconds are required.');
  }

  db.prepare(
    'INSERT OR REPLACE INTO rate_limits (action, max_offenses, time_window_seconds, user_id) VALUES (?, ?, ?, ?)'
  ).run(action, max_offenses, time_window_seconds, userId);

  return json({ message: 'Rate limit saved successfully.' });
}

export async function DELETE({ request }) {
  validateAdmin(request);

  const { action, userId } = await request.json();

  if (!action) {
    throw error(400, 'Action is required.');
  }

  db.prepare('DELETE FROM rate_limits WHERE action = ? AND (user_id = ? OR user_id IS NULL)').run(action, userId);

  return json({ message: `Rate limit for action ${action} and user ${userId || 'all'} deleted successfully.` });
}
