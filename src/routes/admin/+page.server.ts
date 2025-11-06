import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { hashPassword } from '$lib/utils';

export function load({ url }) {
  if (env.ADMIN_PASSWORD === undefined) {
    throw error(500, 'ADMIN_PASSWORD environment variable is not set.');
  }
  if (env.ADMIN_PASSWORD_SALT === undefined) {
    throw error(500, 'ADMIN_PASSWORD_SALT environment variable is not set.');
  }

  const password = url.searchParams.get('password');

  if (!password) {
    throw error(401, 'Password required');
  }

  const hashedPassword = hashPassword(password, env.ADMIN_PASSWORD_SALT);

  if (hashedPassword !== env.ADMIN_PASSWORD) {
    throw error(401, 'Unauthorized');
  }

  return {};
}
