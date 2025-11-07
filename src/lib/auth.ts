import { env } from '$env/dynamic/private';
import db from '$lib/db';
import type { Cookies } from '@sveltejs/kit';

export interface AuthUser {
	id: string;
	username: string;
	token: string;
}

export function validateAuth(cookies: Cookies): AuthUser | null {
	const LOGIN_ENABLED = env.LOGIN_ENABLED?.toLowerCase() === 'true';
	if (!LOGIN_ENABLED) {
		return null;
	}
	const token = cookies.get('auth_token');

	if (!token) {
		return null;
	}

	const user = db.prepare('SELECT id, username, token FROM users WHERE token = ?').get(token) as
		| AuthUser
		| undefined;

	return user || null;
}

export function requireAuth(cookies: Cookies): AuthUser {
	const user = validateAuth(cookies);

	if (!user) {
		throw new Response('Unauthorized', { status: 401 });
	}

	return user;
}

export function clearAuth(cookies: Cookies): void {
	cookies.delete('auth_token', { path: '/' });
}
