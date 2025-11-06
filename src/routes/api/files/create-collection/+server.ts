import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
  if (env.FILE_SHARING_ENABLED !== 'TRUE') {
    throw error(404, 'Not Found');
  }

  const { file_ids } = await request.json();

  if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
    throw error(400, 'file_ids is required and must be a non-empty array.');
  }

  let user_id = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    const user = db.prepare('SELECT id FROM users WHERE token = ?').get(token);
    if (user) {
      user_id = user.id;
    }
  }

  let expires_at;
  if (user_id) {
    // 1 week for logged-in users
    expires_at = Date.now() + 7 * 24 * 60 * 60 * 1000;
  } else {
    // 24 hours for anonymous users
    expires_at = Date.now() + 24 * 60 * 60 * 1000;
  }

  const collection_id = randomUUID();

  db.prepare('INSERT INTO file_collections (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    collection_id,
    user_id,
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
