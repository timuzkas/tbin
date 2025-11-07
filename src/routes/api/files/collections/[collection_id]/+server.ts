import { error } from '@sveltejs/kit';
import { validateAuth } from '$lib/auth';
import db from '$lib/db';
import fs from 'fs/promises';
import path from 'path';
import { log } from '$lib/log';

const UPLOADS_DIR = 'uploads';

export const DELETE = async ({ params, cookies }) => {
  const user = validateAuth(cookies);

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  const collection = db.prepare('SELECT user_id FROM file_collections WHERE id = ?').get(params.collection_id);

  if (!collection) {
    throw error(404, 'Collection not found');
  }

  if (collection.user_id !== user.id) {
    throw error(403, 'Forbidden');
  }

  // Get all files associated with the collection
  const filesToDelete = db.prepare('SELECT id, name FROM files WHERE collection_id = ?').all(params.collection_id);

  for (const file of filesToDelete) {
    const filePath = path.join(UPLOADS_DIR, `${file.id}-${file.name}`);
    try {
      await fs.unlink(filePath);
      log(`Deleted physical file: ${filePath}`);
    } catch (e) {
      log(`Failed to delete physical file ${filePath}: ${e.message}`);
    }
  }

  // Delete file entries from the database
  db.prepare('DELETE FROM files WHERE collection_id = ?').run(params.collection_id);
  // Delete file_collection_items entries
  db.prepare('DELETE FROM file_collection_items WHERE collection_id = ?').run(params.collection_id);
  // Delete the collection itself
  db.prepare('DELETE FROM file_collections WHERE id = ?').run(params.collection_id);

  log(`Collection ${params.collection_id} and its associated files deleted by user ${user.id}`);

  return new Response(null, { status: 204 });
};