import db from '$lib/db';
import { error } from '@sveltejs/kit';

export const GET = async ({ params }) => {
  const paste = db.prepare('SELECT content FROM pastes WHERE id = ?').get(params.id);
  if (!paste) {
    throw error(404, 'Paste not found');
  }
  return new Response(String(paste.content), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
