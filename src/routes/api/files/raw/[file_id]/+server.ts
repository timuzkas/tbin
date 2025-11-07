import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import db from '$lib/db';
import fs from 'fs/promises';
import path from 'path';
import { validateAuth } from '$lib/auth';

const UPLOADS_DIR = 'uploads';

export async function GET({ params }) {
  if (!(env.FILE_SHARING_ENABLED?.toLowerCase() === 'true' || env.FILE_SHARING_ENABLED === '1')) {
    throw error(404, 'Not Found');
  }

  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(params.file_id);

  if (!file) {
    throw error(404, 'File not found');
  }

  const filePath = path.join(UPLOADS_DIR, `${file.id}-${file.name}`);

  try {
    const fileBuffer = await fs.readFile(filePath);
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': file.type,
        'Content-Length': file.size.toString(),
      },
    });
  } catch (e) {
    throw error(404, 'File not found');
  }
}

export const DELETE = async ({ params, cookies }) => {
  const user = validateAuth(cookies);

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  const file = db.prepare('SELECT user_id, name, collection_id FROM files WHERE id = ?').get(params.file_id);

  if (!file) {
    throw error(404, 'File not found');
  }

  // Check ownership: either file is directly owned by user, or belongs to a collection owned by user
  let isOwned = false;
  if (file.user_id === user.id) {
    isOwned = true;
  } else if (file.collection_id) {
    const collection = db.prepare('SELECT user_id FROM file_collections WHERE id = ?').get(file.collection_id);
    if (collection && collection.user_id === user.id) {
      isOwned = true;
    }
  }

  if (!isOwned) {
    throw error(403, 'Forbidden');
  }

  const filePath = path.join(UPLOADS_DIR, `${params.file_id}-${file.name}`);

  try {
    await fs.unlink(filePath);
  } catch (e) {
    // Log error but proceed with database deletion if file not found on disk
    console.error(`Failed to delete physical file ${filePath}: ${e.message}`);
  }

  db.prepare('DELETE FROM files WHERE id = ?').run(params.file_id);
  db.prepare('DELETE FROM file_collection_items WHERE file_id = ?').run(params.file_id);

  return new Response(null, { status: 204 });
};
