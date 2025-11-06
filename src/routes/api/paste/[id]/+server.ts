import db from '$lib/db';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
  console.log('Loading paste for id:', params.id);
  const paste = db.prepare('SELECT id, content, language FROM pastes WHERE id = ?').get(params.id);
  console.log('Query result:', paste);
  if (!paste) {
    console.log('Paste not found in DB');
    throw error(404, 'Paste not found');
  }
  return { paste };
};
