import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import db from '$lib/db';
import { validateAuth } from '$lib/auth';

export function load({ params, cookies }) {
  if (!(env.FILE_SHARING_ENABLED?.toLowerCase() === 'true' || env.FILE_SHARING_ENABLED === '1')) {
    throw error(404, 'Not Found');
  }

	const collection = db
		.prepare('SELECT * FROM file_collections WHERE id = ?')
		.get(params.collection_id);

	if (!collection) {
		throw error(404, 'Collection not found');
	}

	const files = db
		.prepare(
			`
      SELECT f.id, f.name, f.type, f.size
      FROM files f
      JOIN file_collection_items fci ON f.id = fci.file_id
      WHERE fci.collection_id = ?
    `
		)
		.all(params.collection_id);

	const user = validateAuth(cookies);

	return {
		collection,
		files,
		isOwner: collection.user_id === user?.id,
		loginEnabled: env.LOGIN_ENABLED !== 'false'
	};
}
