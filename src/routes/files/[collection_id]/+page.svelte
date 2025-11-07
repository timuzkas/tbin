<script lang="ts">
	import { goto } from '$app/navigation';
	export let data;

	const { collection, files, isOwner, loginEnabled } = data;

	let currentFiles = files;

	let fileToUpload: FileList | null = null;
	let loading = false;
	let errorMessage = '';

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		fileToUpload = input.files;
		console.log('Files selected:', fileToUpload);
	}

	function isImage(file) {
		return file.type.startsWith('image/');
	}

	$: images = currentFiles.filter(isImage);
	$: otherFiles = currentFiles.filter((file) => !isImage(file));

	async function deleteCollection() {
		if (!confirm('Are you sure you want to delete this collection and all its files?')) {
			return;
		}
		const response = await fetch(`/api/files/collections/${collection.id}`, {
			method: 'DELETE'
		});
		if (response.ok) {
			alert('Collection deleted successfully!');
			goto('/files/upload');
		} else {
			alert('Failed to delete collection.');
		}
	}

	async function deleteFile(fileId: string) {
		if (!confirm('Are you sure you want to delete this file?')) {
			return;
		}
		const response = await fetch(`/api/files/raw/${fileId}`, {
			method: 'DELETE'
		});
		if (response.ok) {
			alert('File deleted successfully!');
			currentFiles = currentFiles.filter((file) => file.id !== fileId);
		} else {
			alert('Failed to delete file.');
		}
	}

	async function uploadFileToCollection() {
		errorMessage = '';
		if (!fileToUpload || fileToUpload.length === 0) {
			errorMessage = 'Please select files to upload.';
			return;
		}

		loading = true;
		const newFiles = [];

		for (const file of Array.from(fileToUpload)) {
			console.log('File to upload:', file);
			console.log('File name:', file.name);
			console.log('File size:', file.size);

			const formData = new FormData();
			formData.append('file', file, file.name);
			formData.append('collection_id', collection.id);

			const response = await fetch('/api/files/upload', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				const result = await response.json();
				newFiles.push({
					id: result.id,
					name: file.name,
					type: file.type,
					size: file.size
				});
			} else {
				const errorData = await response.json();
				errorMessage = `Failed to upload file ${file.name}: ${errorData.message || response.statusText}`;
				loading = false;
				return; // Stop on first error
			}
		}

		alert('Files uploaded successfully!');
		currentFiles = [...currentFiles, ...newFiles];
		fileToUpload = null;
		loading = false;
	}
</script>

<svelte:head>
	<title>File Collection</title>
</svelte:head>

<main class="mx-auto max-w-4xl space-y-6 p-6">
	<div class="flex items-center justify-between">
		<a on:click={() => (location.href = '/')}class="text-3xl text-accent hover:cursor-pointer hover:underline">
			> File Collection
		</a>
		{#if isOwner && loginEnabled}
			<button on:click={deleteCollection} class="px-4 py-2 text-red-500 hover:underline">
				Delete Collection
			</button>
		{/if}
	</div>

	{#if isOwner && loginEnabled}
		<div class="mt-6 border-t border-text pt-6">
			<h2 class="text-2xl">Upload to Collection</h2>
			<form on:submit|preventDefault={uploadFileToCollection} class="mt-4 space-y-4">
				<input
					type="file"
					multiple
					on:change={handleFileChange}
					class=" file:bg-accent/0 file:px-4 file:py-2 file:text-white file:hover:underline"
					disabled={loading}
				/>

				<button
					type="submit"
					class="bg-accent px-4 py-2 text-black hover:cursor-pointer hover:bg-accent/90 hover:underline"
					disabled={loading}
				>
					{loading ? 'Uploading...' : 'Upload Files'}
				</button>
				{#if errorMessage}<p class="text-red-500">{errorMessage}</p>{/if}
			</form>
		</div>
		<hr class=" border-t border-neutral-900" />
	{/if}

	{#if images.length > 0}
		<h2 class="text-2xl">Gallery</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each images as image}
				<div class="relative overflow-hidden border border-text">
					<a href={`/api/files/raw/${image.id}`} target="_blank">
						<img
							src={`/api/files/raw/${image.id}`}
							alt={image.name}
							class="h-full w-full object-cover"
						/>
					</a>
					{#if isOwner && loginEnabled}
						<button
							on:click={() => deleteFile(image.id)}
							class="absolute top-2 right-2 h-7 w-6 bg-red-900 p-0 text-white hover:cursor-pointer hover:bg-red-800"
						>
							&times;
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if otherFiles.length > 0}
		<h2 class="text-2xl">Files</h2>
		<ul class="list-disc pl-5">
			{#each otherFiles as file}
				<li class="flex items-center justify-between">
					<span>
						<a href={`/api/files/raw/${file.id}`} target="_blank" class="hover:underline">
							{file.name}
						</a>
						({(file.size / 1024).toFixed(2)} KB)
					</span>
					{#if isOwner && loginEnabled}
						<button
							on:click={() => deleteFile(file.id)}
							class="border-0 text-red-500 hover:cursor-pointer hover:underline"
						>
							Delete
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</main>
