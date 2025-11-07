import { json, error } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function GET(event) {
  const { params, request } = event;
  const { id } = params;

  validateAdmin(request);

  const files = db.prepare(`
    SELECT f.id, f.name, f.size, f.created_at
    FROM files f
    JOIN file_collection_items fci ON f.id = fci.file_id
    WHERE fci.collection_id = ?
  `).all(id);

  return json(files);
}
