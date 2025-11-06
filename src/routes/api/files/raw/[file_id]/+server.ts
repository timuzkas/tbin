import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import db from '$lib/db';
import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = 'uploads';

export async function GET({ params }) {
  if (env.FILE_SHARING_ENABLED !== 'TRUE') {
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
