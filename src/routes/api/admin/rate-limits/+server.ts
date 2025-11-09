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

  const { 
    action, 
    user_type, 
    type, 
    limit_value, 
    time_window_seconds, 
    ban_threshold,
    is_editing,
    original_action,
    original_user_type 
  } = await request.json();

  if (!action || !user_type || !type || limit_value === undefined) {
    throw error(400, 'Action, user_type, type, and limit_value are required.');
  }

  if (is_editing) {
    // If the primary key has changed, delete the old record
    if (action !== original_action || user_type !== original_user_type) {
      db.prepare('DELETE FROM rate_limits WHERE action = ? AND user_type = ?').run(original_action, original_user_type);
    }
  }

  db.prepare(
    'INSERT OR REPLACE INTO rate_limits (action, user_type, type, limit_value, time_window_seconds, ban_threshold) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(action, user_type, type, limit_value, time_window_seconds, ban_threshold);

  return json({ message: 'Rate limit saved successfully.' });
}

export async function DELETE({ request }) {
  validateAdmin(request);

  const { action, user_type } = await request.json();

  if (!action || !user_type) {
    throw error(400, 'Action and user_type are required.');
  }

  db.prepare('DELETE FROM rate_limits WHERE action = ? AND user_type = ?').run(action, user_type);

  return json({ message: `Rate limit for action ${action} and user type ${user_type} deleted successfully.` });
}
