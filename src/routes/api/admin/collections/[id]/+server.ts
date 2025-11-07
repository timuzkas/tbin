import { json, error } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';
import fs from 'fs';
import path from 'path';

export async function DELETE(event) {
  const { params, request } = event;
  const { id } = params;

  validateAdmin(request);

  const fileIds = db.prepare('SELECT file_id FROM file_collection_items WHERE collection_id = ?').all(id);

  for (const fileId of fileIds) {
    const file = db.prepare('SELECT id FROM files WHERE id = ?').get(fileId.file_id);
    if (file) {
      const filePath = path.join('uploads', file.id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
    }
  }

  db.prepare('DELETE FROM file_collection_items WHERE collection_id = ?').run(id);
  const result = db.prepare('DELETE FROM file_collections WHERE id = ?').run(id);

  if (result.changes === 0) {
    throw error(404, 'Collection not found');
  }

  return json({ message: 'Collection deleted successfully' });
}
