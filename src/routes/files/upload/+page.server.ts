import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function load() {
  if (env.FILE_SHARING_ENABLED !== 'TRUE') {
    throw error(404, 'Not Found');
  }
}
