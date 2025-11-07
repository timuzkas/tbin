import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import { log } from '$lib/log';
import { validateAuth } from '$lib/auth';
import { env } from '$env/dynamic/private';
import { checkRateLimit } from '$lib/rateLimit';

const MAX_PASTE_SIZE = 1024 * 1024;

export async function POST(event) {
	const clientAddress = event.locals.ip;
	const user = validateAuth(event.cookies);

	// Check guest paste creation setting
	const guestPasteCreationsEnabledSetting = db.prepare(
		'SELECT value FROM settings WHERE key = \'guest_paste_creations_enabled\''
	).get();
	const isGuestPasteCreationAllowed = guestPasteCreationsEnabledSetting ? guestPasteCreationsEnabledSetting.value === 'true' : false;

	if (!user && env.ALLOW_ANONYMOUS_UPLOADS === 'false' && !isGuestPasteCreationAllowed) {
		throw error(403, 'Guest paste creation is disabled.');
	}

  const rateLimitResponse = checkRateLimit(clientAddress, user?.id, 'paste_creation');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

	const { content, language } = await event.request.json();

	if (content.length > MAX_PASTE_SIZE) {
		log(`Paste content too large for IP: ${clientAddress}`);
		return new Response('Paste content is too large.', { status: 413 });
	}

	const userId = user?.id || null;

	const id = randomUUID().slice(0, 8);
	db.prepare('INSERT INTO pastes (id, content, language, user_id, created_at) VALUES (?, ?, ?, ?, ?) ').run(
		id,
		content,
		language || 'plaintext',
		userId,
		Date.now()
	);

	log(`Inserted paste with id: ${id} from user ${userId || 'anonymous'} from IP: ${clientAddress}`);

	return json({ id });
}
