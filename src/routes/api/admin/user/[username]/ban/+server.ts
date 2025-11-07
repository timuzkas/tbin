import { error, json } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function POST({ request, params, getClientAddress }) {
  validateAdmin(request);

  const { username } = params;
  const { reason } = await request.json();

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!user) {
    throw error(404, 'User not found');
  }

  db.prepare('UPDATE users SET banned = 1 WHERE id = ?').run(user.id);

  const clientAddress = getClientAddress();
  db.prepare('INSERT OR REPLACE INTO bans (ip, reason) VALUES (?, ?)').run(clientAddress, reason);

  return json({ message: `User ${username} has been banned.` });
}
