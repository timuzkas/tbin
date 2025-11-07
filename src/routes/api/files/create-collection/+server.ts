import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import { env } from '$env/dynamic/private';
import { validateAuth } from '$lib/auth';

const COLLECTION_CREATION_RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_ANONYMOUS_COLLECTION_CREATION_REQUESTS_PER_WINDOW = 1;
const MAX_AUTHENTICATED_COLLECTION_CREATION_REQUESTS_PER_WINDOW = 5;
const OFFENSE_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const MAX_OFFENSES = 10;
const noRateLimit = env.NO_RATE_LIMIT === 'true';

export async function POST({ request, cookies, getClientAddress }) {
  if (env.FILE_SHARING_ENABLED !== 'TRUE') {
    throw error(404, 'Not Found');
  }

  const clientAddress = getClientAddress();
  const user = validateAuth(cookies);
  const userId = user?.id || null;

  if (!noRateLimit) {
    const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);
    if (ban) {
      throw error(403, 'You have been permanently banned for abuse.');
    }

    let maxRequests = MAX_ANONYMOUS_COLLECTION_CREATION_REQUESTS_PER_WINDOW;
    if (userId) {
      maxRequests = MAX_AUTHENTICATED_COLLECTION_CREATION_REQUESTS_PER_WINDOW;
    }

    const offenses = db
      .prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
      .all(clientAddress, Date.now() - COLLECTION_CREATION_RATE_LIMIT_WINDOW_MS);

    if (offenses.length >= maxRequests) {
      db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(
        clientAddress,
        Date.now()
      );

      const allOffenses = db
        .prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
        .all(clientAddress, Date.now() - OFFENSE_EXPIRATION_MS);

      if (allOffenses.length > MAX_OFFENSES) {
        db.prepare('INSERT OR IGNORE INTO bans (ip) VALUES (?)').run(clientAddress);
      }

      throw error(429, 'Rate limit exceeded. Please wait before creating another collection.');
    }

    db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(clientAddress, Date.now());
  }

  const { file_ids } = await request.json();

  if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
    throw error(400, 'file_ids is required and must be a non-empty array.');
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

  db.prepare('INSERT INTO file_collections (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    collection_id,
    userId,
    expires_at
  );

  const insertItem = db.prepare(
    'INSERT INTO file_collection_items (collection_id, file_id) VALUES (?, ?)'
  );
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insertItem.run(item.collection_id, item.file_id);
    }
  });

  const itemsToInsert = file_ids.map((file_id) => ({ collection_id, file_id }));
  insertMany(itemsToInsert);

  return json({ collection_id });
}
