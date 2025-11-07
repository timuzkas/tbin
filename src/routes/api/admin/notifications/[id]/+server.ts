import { error, json } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function DELETE({ request, params }) {
  validateAdmin(request);

  const { id } = params;

  db.prepare('DELETE FROM notifications WHERE id = ?').run(id);

  return json({ message: `Notification ${id} has been deleted.` });
}