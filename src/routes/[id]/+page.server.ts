import db from '$lib/db';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const { id } = params;
  const stmt = db.prepare('SELECT * FROM pastes WHERE id = ?');
  const paste = stmt.get(id);

  if (!paste) {
    throw error(404, 'Paste not found');
  }

  return {
    paste,
  };
}
