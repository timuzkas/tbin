import { json, error } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function GET(event) {
  const { params, request } = event;
  const { username } = params;

  validateAdmin(request);

  const user = db.prepare('SELECT id, username, banned FROM users WHERE username = ?').get(username);
  if (!user) {
    throw error(404, 'User not found');
  }

  const pastes = db.prepare('SELECT id, language, created_at FROM pastes WHERE user_id = ?').all(user.id);
  const collections = db.prepare('SELECT id, created_at FROM file_collections WHERE user_id = ?').all(user.id);

  return json({ user, pastes, collections });
}
