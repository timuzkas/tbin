import { error, json } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function POST({ request, params, getClientAddress }) {
  validateAdmin(request);

  const { username } = params;

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!user) {
    throw error(404, 'User not found');
  }

  db.prepare('UPDATE users SET banned = 0 WHERE id = ?').run(user.id);

  const clientAddress = getClientAddress();
  db.prepare('DELETE FROM bans WHERE ip = ?').run(clientAddress);

  return json({ message: `User ${username} has been unbanned.` });
}
