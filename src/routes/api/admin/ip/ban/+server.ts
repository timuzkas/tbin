import { json, error } from '@sveltejs/kit';
import db from '$lib/db';
import { validateAdmin } from '$lib/auth';

export async function DELETE({ request, cookies }) {
    validateAdmin(request);

    const { ip } = await request.json();

    if (!ip) {
        throw error(400, 'IP address is required.');
    }

    try {
        const result = db.prepare('DELETE FROM bans WHERE ip = ?').run(ip);

        if (result.changes === 0) {
            return json({ message: 'IP not found in ban list or already unbanned.' }, { status: 404 });
        }

        return json({ message: `IP ${ip} unbanned successfully.` });
    } catch (e: any) {
        throw error(500, `Failed to unban IP: ${e.message}`);
    }
}
