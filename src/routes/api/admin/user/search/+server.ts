import { error, json } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function GET({ request, url }) {
  validateAdmin(request);

  const query = url.searchParams.get('query');
  if (!query) {
    return json([]);
  }

  const users = db.prepare('SELECT id, username FROM users WHERE username LIKE ?').all(`%${query}%`);
  return json(users);
}
