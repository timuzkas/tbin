import { json, error } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';
import fs from 'fs';
import path from 'path';

export async function DELETE(event) {
  const { params, request } = event;
  const { id } = params;

  validateAdmin(request);

  const file = db.prepare('SELECT id FROM files WHERE id = ?').get(id);
  if (file) {
    const filePath = path.join('uploads', file.id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
    db.prepare('DELETE FROM file_collection_items WHERE file_id = ?').run(file.id);
  } else {
    throw error(404, 'File not found');
  }

  return json({ message: 'File deleted successfully' });
}
