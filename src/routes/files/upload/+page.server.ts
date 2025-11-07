import { env } from '$env/dynamic/private';
import { validateAuth } from '$lib/auth';

// Collection Limits (should match those in +server.ts)
const ANONYMOUS_MAX_COLLECTION_FILES = 10;
const ANONYMOUS_MAX_COLLECTION_SIZE_MB = 20;
const AUTHENTICATED_MAX_COLLECTION_FILES = 50;
const AUTHENTICATED_MAX_COLLECTION_SIZE_MB = 100;

export async function load({ cookies }) {
	const user = validateAuth(cookies);
	const isAuthenticated = !!user;

	const allowAnonymousUploads = env.ALLOW_ANONYMOUS_UPLOADS?.toLowerCase() === 'true';

	let maxCollectionFiles;
	let maxCollectionSizeMB;

	if (isAuthenticated) {
		maxCollectionFiles = AUTHENTICATED_MAX_COLLECTION_FILES;
		maxCollectionSizeMB = AUTHENTICATED_MAX_COLLECTION_SIZE_MB;
	} else {
		maxCollectionFiles = ANONYMOUS_MAX_COLLECTION_FILES;
		maxCollectionSizeMB = ANONYMOUS_MAX_COLLECTION_SIZE_MB;
	}

	return {
		fileSharingEnabled: env.FILE_SHARING_ENABLED?.toLowerCase() === 'true',
		isAuthenticated,
		maxCollectionFiles,
		maxCollectionSizeMB,
		allowAnonymousUploads
	};
}
