import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOADS_DIR = 'uploads';

export async function POST({ request }) {
  if (env.FILE_SHARING_ENABLED !== 'TRUE') {
    throw error(404, 'Not Found');
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    throw error(400, 'No file uploaded.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw error(413, 'File is too large.');
  }

  const id = randomUUID();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = path.join(UPLOADS_DIR, `${id}-${sanitizedFilename}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

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

  db.prepare(
    'INSERT INTO files (id, name, type, size, user_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, sanitizedFilename, file.type, file.size, user_id, expires_at);

  return json({ id });
}
