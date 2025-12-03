import { log } from './lib/log';
import { runAllPurges } from '$lib/cron';

let cronInitialized = false;

// CORS routes
const CORS_ROUTES = ['/api/auth'];

export const handle = async ({ event, resolve }) => {
	// ---- Cron init ----
	if (!cronInitialized) {
		console.log('[Server Cron] Initializing cron job...');
		runAllPurges();
		setInterval(async () => {
			console.log('[Server Cron] Triggering scheduled cron job...');
			await runAllPurges();
		}, 10 * 60 * 1000);
		cronInitialized = true;
		console.log('[Server Cron] Cron job initialized.');
	}

	// ---- IP detection ----
	const forwardedIp = event.request.headers.get('x-forwarded-for');
	const realIp = event.request.headers.get('x-real-ip');

	let clientIp = 'unknown';

	if (forwardedIp) {
		clientIp = forwardedIp.split(',')[0].trim();
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

	// ---- CORS ----
	const isCorsRoute = CORS_ROUTES.some((r) => event.url.pathname.startsWith(r));

	if (isCorsRoute) {
		if (event.request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization'
				}
			});
		}

		const response = await resolve(event);
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		return response;
	}

	// ---- Default ----
	return resolve(event);
};
