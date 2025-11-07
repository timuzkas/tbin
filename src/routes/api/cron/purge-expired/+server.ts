import { json } from '@sveltejs/kit';
import { log } from '$lib/log';
import { purgeExpiredPastes } from '$lib/cron';

export async function POST(event) {
  const clientAddress = event.locals.ip;

  if (clientAddress !== '127.0.0.1' && clientAddress !== '::1') {
    log(`Unauthorized attempt to access purge endpoint from ${clientAddress}`);
    return new Response('Unauthorized', { status: 401 });
  }

  const changes = purgeExpiredPastes();

  return json({ message: `Deleted ${changes} expired pastes.` });
}
