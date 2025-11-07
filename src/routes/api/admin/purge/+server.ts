import { json } from '@sveltejs/kit';
import db from '$lib/db';
import { log } from '$lib/log';

export async function POST({ request, event }) {
  const clientAddress = event.locals.ip;

  if (clientAddress !== '127.0.0.1' && clientAddress !== '::1') {
    log(`Unauthorized attempt to access purge-and-ban endpoint from ${clientAddress}`);
    return new Response('Unauthorized', { status: 401 });
  }

  const { username } = await request.json();

  if (!username) {
    return new Response('Username is required.', { status: 400 });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return new Response('User not found.', { status: 404 });
  }

  const pastes = db.prepare('SELECT * FROM pastes WHERE user_id = ?').all(user.id);

  db.prepare('DELETE FROM pastes WHERE user_id = ?').run(user.id);

  log(`Purged ${pastes.length} pastes from user ${username}`);

  const lastOffense = db
    .prepare('SELECT * FROM offenses WHERE ip = (SELECT ip FROM offenses ORDER BY timestamp DESC LIMIT 1)')
    .get();

  if (lastOffense) {
    db.prepare('INSERT OR IGNORE INTO bans (ip) VALUES (?)').run(lastOffense.ip);
    log(`Banned user ${username} with IP ${lastOffense.ip}`);
  }

  return json({ message: `Purged and banned user ${username}.` });
}