import { json, error } from '@sveltejs/kit';
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

	const guestPasteCreationsEnabledSetting = db
		.prepare("SELECT value FROM settings WHERE key = 'guest_paste_creations_enabled'")
		.get();

	let isGuestPasteCreationAllowed;
	if (guestPasteCreationsEnabledSetting) {
		isGuestPasteCreationAllowed = guestPasteCreationsEnabledSetting.value === 'true';
	} else {
		isGuestPasteCreationAllowed = env.ALLOW_ANONYMOUS_UPLOADS === 'true';
	}

	if (!user && !isGuestPasteCreationAllowed) {
		throw error(403, 'Guest paste creation is disabled.');
	}

  const rateLimitResponse = checkRateLimit(clientAddress, user?.id, 'paste_creation');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

	const { content, language, title } = await event.request.json();

	if (content.length > MAX_PASTE_SIZE) {
		log(`Paste content too large for IP: ${clientAddress}`);
		return new Response('Paste content is too large.', { status: 413 });
	}

	const userId = user?.id || null;

	if (userId) {
		const pasteCount = db.prepare('SELECT COUNT(*) as count FROM pastes WHERE user_id = ?').get(userId)
			.count;
		if (pasteCount >= 100) {
			return new Response('You have reached the maximum number of pastes (100).', { status: 429 });
		}
	} else {
		const pasteCount = db.prepare('SELECT COUNT(*) as count FROM pastes WHERE ip = ?').get(clientAddress)
			.count;
		if (pasteCount >= 15) {
			return new Response('You have reached the maximum number of pastes for guests (15).', {
				status: 429
			});
		}
	}

	const id = randomUUID().slice(0, 8);
	db.prepare(
		'INSERT INTO pastes (id, content, language, user_id, ip, created_at, title) VALUES (?, ?, ?, ?, ?, ?, ?) '
	).run(
		id,
		content,
		language || 'plaintext',
		userId,
		clientAddress,
		Math.floor(Date.now() / 1000),
		title
	);

	log(`Inserted paste with id: ${id} from user ${userId || 'anonymous'} from IP: ${clientAddress}`);

	return json({ id });
}
