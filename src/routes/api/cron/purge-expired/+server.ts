import { json } from '@sveltejs/kit';
import { log } from '$lib/log';
import { runAllPurges } from '$lib/cron'; // Import runAllPurges

export async function POST(event) {
  const clientAddress = event.locals.ip;

  if (clientAddress !== '127.0.0.1' && clientAddress !== '::1') {
    log(`Unauthorized attempt to access purge endpoint from ${clientAddress}`);
    return new Response('Unauthorized', { status: 401 });
  }

  await runAllPurges(); // Call the unified purge function

  return json({ message: `All purge operations completed.` }); // Update response message
}
