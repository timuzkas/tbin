import db from '$lib/db';
import { error } from '@sveltejs/kit';
import { validateAuth } from '$lib/auth';

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

export const DELETE = async ({ params, cookies }) => {
  const user = validateAuth(cookies);

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  const paste = db.prepare('SELECT user_id FROM pastes WHERE id = ?').get(params.id);

  if (!paste) {
    throw error(404, 'Paste not found');
  }

  if (paste.user_id !== user.id) {
    throw error(403, 'Forbidden');
  }

  db.prepare('DELETE FROM pastes WHERE id = ?').run(params.id);

  return new Response(null, { status: 204 });
};

export const PATCH = async ({ params, request, cookies }) => {
  const user = validateAuth(cookies);

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  const paste = db.prepare('SELECT user_id FROM pastes WHERE id = ?').get(params.id);

  if (!paste) {
    throw error(404, 'Paste not found');
  }

  if (paste.user_id !== user.id) {
    throw error(403, 'Forbidden');
  }

  const { content, language } = await request.json();

  if (content === undefined && language === undefined) { // Check for undefined, not just falsy
    throw error(400, 'No content or language provided for update.');
  }

  let updateFields = [];
  let updateValues = [];

  if (content !== undefined) {
    updateFields.push('content = ?');
    updateValues.push(content);
  }
  if (language !== undefined) {
    updateFields.push('language = ?');
    updateValues.push(language);
  }

  const query = `UPDATE pastes SET ${updateFields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...updateValues, params.id);

  return new Response(null, { status: 200 });
};
