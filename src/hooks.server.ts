import { log } from './lib/log';

export const handle = async ({ event, resolve }) => {
  const forwardedIp = event.request.headers.get('x-forwarded-for');
  const realIp = event.request.headers.get('x-real-ip');

  let clientIp = 'unknown'; // Default to unknown

  if (forwardedIp) {
    clientIp = forwardedIp.split(',')[0].trim(); // Take the first IP if multiple are forwarded
  } else if (realIp) {
    clientIp = realIp.trim();
  } else {
    try {
      clientIp = event.getClientAddress();
    } catch (e) {
      log(`Warning: Could not determine client address for event: ${e.message}`);
    }
  }

  event.locals.ip = clientIp;

  const response = await resolve(event);
  return response;
};

const purgeExpiredPastes = async () => {
  try {
    log('Running cronjob to delete expired pastes.');
    const response = await fetch('http://localhost:5173/api/cron/purge-expired', {
      method: 'POST',
    });
    if (response.ok) {
      const data = await response.json();
      log(data.message);
    } else {
      log(`Error purging expired pastes: ${response.statusText}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      log(`Error in purgeExpiredPastes: ${error.message}`);
    } else {
      log('An unknown error occurred in purgeExpiredPastes');
    }
  }
};

// Run the cronjob every 5 minutes
setInterval(purgeExpiredPastes, 5 * 60 * 1000);

// Run it once on startup as well
purgeExpiredPastes();
