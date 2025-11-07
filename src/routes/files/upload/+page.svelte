<script lang="ts">
	import { goto } from '$app/navigation';
	export let data;
	const { isAuthenticated, allowAnonymousUploads } = data;

	let fileInput: HTMLInputElement;
	let uploadedCollectionId: string | null = null;
	let loading = false;
	let errorMessage = '';
	const MAX_SINGLE_FILE_SIZE_MB = 10;

	async function uploadFiles() {
		errorMessage = '';
		const files = fileInput.files;
		if (!files || files.length === 0) {
			errorMessage = 'Please select files to upload.';
			return;
		}
		loading = true;

		for (const file of Array.from(files)) {
			if (file.size > MAX_SINGLE_FILE_SIZE_MB * 1024 * 1024) {
				errorMessage = `File "${file.name}" is too large. Max ${MAX_SINGLE_FILE_SIZE_MB}MB.`;
				loading = false;
				return;
			}
		}

		let collectionRes;
		try {
			collectionRes = await fetch('/api/files/create-collection', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ file_ids: [] })
			});
		} catch (e: any) {
			errorMessage = `Network error creating collection: ${e.message}`;
			loading = false;
			return;
		}
		if (!collectionRes.ok) {
			const err = await collectionRes.text();
			errorMessage = `Failed to create collection: ${err}`;
			loading = false;
			return;
		}
		const { collection_id } = await collectionRes.json();
		uploadedCollectionId = collection_id;

		const results: string[] = [];
		for (const file of Array.from(files)) {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('collection_id', collection_id);
			const res = await fetch('/api/files/upload', {
				method: 'POST',
				credentials: 'include',
				body: formData
			});
			if (res.ok) {
				const { id } = await res.json();
				results.push(id);
			} else {
				const err = await res.text();
				errorMessage = `Upload failed for "${file.name}": ${err}`;
			}
		}
		if (results.length === 0) errorMessage = 'No files uploaded.';
		loading = false;
	}

	function copyCollectionURL() {
		if (uploadedCollectionId)
			navigator.clipboard.writeText(`${location.origin}/files/${uploadedCollectionId}`);
	}
	const viewCollection = () => uploadedCollectionId && goto(`/files/${uploadedCollectionId}`);
</script>

<svelte:head><title>Upload File</title></svelte:head>

<main class="mx-auto max-w-2xl space-y-6 p-6">
	<a href="/" class="mb-4 block text-3xl text-accent hover:cursor-pointer hover:underline"
		>> Upload File</a
	>
	<div class="space-y-4 rounded-lg border border-text p-4">
		{#if !isAuthenticated && !allowAnonymousUploads}
			<p class="text-red-500">Anonymous uploads are disabled. Please log in to upload files.</p>
		{:else}
			<p class="text-neutral-400">
				Limits for {isAuthenticated ? 'authenticated' : 'anonymous'} users: Max {data.maxCollectionFiles}
				files, {data.maxCollectionSizeMB}MB total. (Single file: {MAX_SINGLE_FILE_SIZE_MB}MB)
			</p>
			<input
				bind:this={fileInput}
				type="file"
				multiple
				class="hover:cursor-pointer hover:text-neutral-200"
				disabled={loading}
			/>
			<button
				on:click={uploadFiles}
				disabled={loading}
				class="px-4 py-2 hover:cursor-pointer hover:underline"
			>
				{loading ? 'Uploading...' : 'Upload Files'}
			</button>
			{#if errorMessage}<p class="text-red-500">{errorMessage}</p>{/if}
		{/if}
	</div>
	{#if uploadedCollectionId}
		<p>Files uploaded!</p>
		<p>Collection ID: <span class="text-accent">{uploadedCollectionId}</span></p>
		<div class="flex gap-5">
			<button
				on:click={viewCollection}
				class="bg-accent px-4 py-2 text-black hover:cursor-pointer hover:bg-accent/70">view</button
			>
			<button
				on:click={copyCollectionURL}
				class="px-4 py-2 hover:cursor-pointer hover:text-accent hover:underline">copy URL</button
			>
		</div>
	{/if}
</main>
