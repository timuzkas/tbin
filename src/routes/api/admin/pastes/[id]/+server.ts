import { json, error } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function DELETE(event) {
  const { params, request } = event;
  const { id } = params;

  validateAdmin(request);

  const result = db.prepare('DELETE FROM pastes WHERE id = ?').run(id);

  if (result.changes === 0) {
    throw error(404, 'Paste not found');
  }

  return json({ message: 'Paste deleted successfully' });
}
