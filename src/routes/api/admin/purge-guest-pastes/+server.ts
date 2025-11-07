import { json } from '@sveltejs/kit';
import db from '$lib/db';
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
    const { password } = await request.json();

    if (password !== env.ADMIN_PASSWORD) {
        return json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = db.prepare('DELETE FROM pastes WHERE user_id IS NULL').run();
        const deletedCount = result.changes;

        if (deletedCount === 0) {
            return json({ message: 'No guest pastes to purge.' });
        }

        return json({ message: `Successfully purged ${deletedCount} guest pastes.` });
    } catch (error) {
        console.error('Error purging guest pastes:', error);
        return json({ message: 'Internal server error during guest paste purge.' }, { status: 500 });
    }
}
