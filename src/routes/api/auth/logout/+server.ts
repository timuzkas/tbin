import { json } from '@sveltejs/kit';
import { clearAuth } from '$lib/auth';

export async function POST({ cookies }) {
	clearAuth(cookies);
	return json({ success: true });
}
