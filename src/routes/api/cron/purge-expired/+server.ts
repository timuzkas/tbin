import { json } from '@sveltejs/kit';
import db from '$lib/db';
import { log } from '$lib/log';

export async function POST({ event }) {
  const clientAddress = event.locals.ip;

  if (clientAddress !== '127.0.0.1' && clientAddress !== '::1') {
    log(`Unauthorized attempt to access purge endpoint from ${clientAddress}`);
    return new Response('Unauthorized', { status: 401 });
  }

  const now = Date.now();
  const result = db.prepare('DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at < ?').run(now);

  log(`Deleted ${result.changes} expired pastes.`);

  return json({ message: `Deleted ${result.changes} expired pastes.` });
}
