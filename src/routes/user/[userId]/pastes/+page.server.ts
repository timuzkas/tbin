import { error } from '@sveltejs/kit';
import { validateAuth } '$lib/auth';
import db from '$lib/db';
import { env } from '$env/dynamic/private';

export async function load(event) {
  const { params, cookies } = event;

  if (env.LOGIN_ENABLED === 'false') {
    throw error(404, 'Not Found');
  }

  const user = validateAuth(cookies);

  if (!user || user.id !== params.userId) {
    throw error(403, 'Forbidden');
  }

  const pastes = db.prepare('SELECT id, language, created_at FROM pastes WHERE user_id = ? ORDER BY created_at DESC').all(user.id);

  return {
    pastes,
    username: user.username,
  };
}