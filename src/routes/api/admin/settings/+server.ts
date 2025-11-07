import { json, error } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function GET({ request }) {
  validateAdmin(request);

  const settings = db.prepare('SELECT key, value FROM settings').all();
  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  return json(settingsMap);
}

export async function POST({ request }) {
  validateAdmin(request);

  const { key, value } = await request.json();

  if (!key || value === undefined) {
    throw error(400, 'Key and value are required');
  }

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value.toString());

  return json({ message: 'Setting updated successfully' });
}