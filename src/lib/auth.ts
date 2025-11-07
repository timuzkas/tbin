import { env } from '$env/dynamic/private';
import db from '$lib/db';
import type { Cookies } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { hashPassword } from '$lib/utils';

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

export function validateAdmin(request: Request): void {
	const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
	const ADMIN_PASSWORD_SALT = env.ADMIN_PASSWORD_SALT;

	if (!ADMIN_PASSWORD || !ADMIN_PASSWORD_SALT) {
		throw error(500, 'Admin password environment variables are not set.');
	}

	const authHeader = request.headers.get('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw error(401, 'Unauthorized: Missing or invalid Authorization header.');
	}

	const password = authHeader.substring(7);
	const hashedPassword = hashPassword(password, ADMIN_PASSWORD_SALT);

	if (hashedPassword !== ADMIN_PASSWORD) {
		throw error(401, 'Unauthorized: Invalid admin password.');
	}
}
