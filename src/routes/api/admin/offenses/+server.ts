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
        const result = db.prepare('DELETE FROM offenses WHERE ip = ?').run(ip);

        if (result.changes === 0) {
            return json({ message: 'No offenses found for this IP.' }, { status: 404 });
        }

        return json({ message: `Offenses for IP ${ip} cleared successfully.` });
    } catch (e: any) {
        throw error(500, `Failed to clear offenses: ${e.message}`);
    }
}

export async function GET({ request, url, cookies }) {
    validateAdmin(request);

    const ip = url.searchParams.get('ip');

    if (!ip) {
        throw error(400, 'IP address is required.');
    }

    try {
        const offenses = db.prepare('SELECT COUNT(*) as count FROM offenses WHERE ip = ?').get(ip);
        return json({ ip, count: offenses.count });
    } catch (e: any) {
        throw error(500, `Failed to fetch offense count: ${e.message}`);
    }
}
