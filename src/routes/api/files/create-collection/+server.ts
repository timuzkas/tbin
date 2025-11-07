import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import { env } from '$env/dynamic/private';
import { log } from '$lib/log';
import { validateAuth } from '$lib/auth';
import { checkRateLimit } from '$lib/rateLimit';

const noRateLimit = env.NO_RATE_LIMIT === 'true';

export async function POST(event) {
	const { request, cookies } = event;
	if (!(env.FILE_SHARING_ENABLED?.toLowerCase() === 'true' || env.FILE_SHARING_ENABLED === '1')) {
		throw error(404, 'Not Found');
	}

	const clientAddress = event.locals.ip;
	const user = validateAuth(cookies);
	const userId = user?.id || null;



	  const { file_ids } = await request.json();
	
	  // Allow file_ids to be empty or missing when creating a collection first
	  // Files will be added to the collection via the /api/files/upload endpoint later
	  if (file_ids && !Array.isArray(file_ids)) {
	    throw error(400, 'file_ids must be an array if provided.');
	  }
	let expires_at;
	if (userId) {
		// 1 week for logged-in users
		expires_at = Date.now() + 7 * 24 * 60 * 60 * 1000;
	} else {
		// 24 hours for anonymous users
		expires_at = Date.now() + 24 * 60 * 60 * 1000;
	}

	const collection_id = randomUUID();

		db.prepare('INSERT INTO file_collections (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?) ').run(

			collection_id,

			userId,

			expires_at,

			Date.now()

		);

	const insertItem = db.prepare(
		'INSERT INTO file_collection_items (collection_id, file_id) VALUES (?, ?)'
	);
	const insertMany = db.transaction((items) => {
		for (const item of items) {
			insertItem.run(item.collection_id, item.file_id);
		}
	});

	  const itemsToInsert = file_ids ? file_ids.map((file_id) => ({ collection_id, file_id })) : [];
	  if (itemsToInsert.length > 0) {
	    insertMany(itemsToInsert);
	  }
	
	  log(`Collection ${collection_id} created by user ${userId || 'anonymous'} from IP ${clientAddress}`);
	
	  return json({ collection_id });}
