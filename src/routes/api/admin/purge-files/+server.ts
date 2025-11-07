import { json, error } from '@sveltejs/kit';
import db from '$lib/db';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import { log } from '$lib/log';
import { hashPassword } from '$lib/utils';

const UPLOADS_DIR = 'uploads';

export async function POST(event) {
  const { request } = event;
  const clientAddress = event.locals.ip;

  if (clientAddress !== '127.0.0.1' && clientAddress !== '::1') {
    log(`Unauthorized attempt to access purge-files endpoint from ${clientAddress}`);
    throw error(401, 'Unauthorized');
  }

  const { password, username } = await request.json();

  if (env.ADMIN_PASSWORD === undefined) {
    throw error(500, 'ADMIN_PASSWORD environment variable is not set.');
  }
  if (env.ADMIN_PASSWORD_SALT === undefined) {
    throw error(500, 'ADMIN_PASSWORD_SALT environment variable is not set.');
  }

  const hashedPassword = hashPassword(password, env.ADMIN_PASSWORD_SALT);

  console.log('DEBUG: Received password (first 5 chars):', password.substring(0, 5));
  console.log('DEBUG: ADMIN_PASSWORD_SALT:', env.ADMIN_PASSWORD_SALT);
  console.log('DEBUG: Generated hashedPassword:', hashedPassword);
  console.log('DEBUG: Expected ADMIN_PASSWORD:', env.ADMIN_PASSWORD);

  if (hashedPassword !== env.ADMIN_PASSWORD) {
    log(`Unauthorized attempt to access purge-files endpoint with incorrect password from ${clientAddress}`);
    throw error(401, 'Incorrect password');
  }

  let deletedCount = 0;
  let message = '';

  if (username) {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!user) {
      throw error(404, 'User not found');
    }

    const filesToDelete = db.prepare('SELECT id, name FROM files WHERE user_id = ?').all(user.id);

    for (const file of filesToDelete) {
      const filePath = path.join(UPLOADS_DIR, `${file.id}-${file.name}`);
      try {
        await fs.unlink(filePath);
        db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
        deletedCount++;
      } catch (e) {
        log(`Failed to delete physical file ${filePath}: ${e.message}`);
      }
    }
    message = `Purged ${deletedCount} files for user ${username}.`;
    log(message);
  } else {
    // Purge all files
    const allFiles = db.prepare('SELECT id, name FROM files').all();

    for (const file of allFiles) {
      const filePath = path.join(UPLOADS_DIR, `${file.id}-${file.name}`);
      try {
        await fs.unlink(filePath);
        db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
        deletedCount++;
      } catch (e) {
        log(`Failed to delete physical file ${filePath}: ${e.message}`);
      }
    }
    db.prepare('DELETE FROM file_collection_items').run();
    db.prepare('DELETE FROM file_collections').run();
    message = `Purged ${deletedCount} files and all collections.`;
    log(message);
  }

  return json({ message });
}
