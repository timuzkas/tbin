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
