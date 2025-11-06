import { json } from '@sveltejs/kit';                                  
import { randomUUID } from 'crypto'; 
import db from '$lib/db';

export async function POST({ request }) {
  const { content, language } = await request.json();
  const id = randomUUID().slice(0, 8);
  db.prepare('INSERT INTO pastes (id, content, language) VALUES (?, ?, ?)').run(id, content, language || 'plaintext');
  console.log('Inserted paste with id:', id);
  return json({ id });
}
