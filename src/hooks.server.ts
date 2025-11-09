import { log } from './lib/log';
import { runAllPurges } from '$lib/cron'; // Import runAllPurges

let cronInitialized = false; // Flag to ensure cron job is initialized only once

export const handle = async ({ event, resolve }) => {
	// Initialize cron job if not already initialized
	if (!cronInitialized) {
		console.log('[Server Cron] Initializing cron job...');
		// Run immediately on server start
		runAllPurges();
		// Then run every 10 minutes
		setInterval(
			async () => {
				console.log('[Server Cron] Triggering scheduled cron job...');
				await runAllPurges();
			},
			10 * 60 * 1000
		); // 10 minutes
		cronInitialized = true;
		console.log('[Server Cron] Cron job initialized.');
	}

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
