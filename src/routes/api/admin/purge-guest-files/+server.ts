import { json } from '@sveltejs/kit';
import db from '$lib/db';
import { ADMIN_PASSWORD } from '$env/static/private';
import fs from 'fs/promises';
import path from 'path';

export async function POST({ request }) {
    const { password } = await request.json();

    if (password !== ADMIN_PASSWORD) {
        return json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get all guest files
        const guestFiles = db.prepare('SELECT id FROM files WHERE user_id IS NULL').all() as { id: string }[];

        if (guestFiles.length === 0) {
            return json({ message: 'No guest files to purge.' });
        }

        let deletedCount = 0;
        for (const file of guestFiles) {
            const filePath = path.join('uploads', file.id);
            try {
                await fs.unlink(filePath);
                db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
                // Also delete from file_collection_items if they exist (though guest files shouldn't be in collections)
                db.prepare('DELETE FROM file_collection_items WHERE file_id = ?').run(file.id);
                deletedCount++;
            } catch (error: any) {
                console.error(`Failed to delete file ${file.id} from filesystem or DB:`, error);
                // Continue to try deleting other files even if one fails
            }
        }

        return json({ message: `Successfully purged ${deletedCount} guest files.` });
    } catch (error) {
        console.error('Error purging guest files:', error);
        return json({ message: 'Internal server error during guest file purge.' }, { status: 500 });
    }
}
