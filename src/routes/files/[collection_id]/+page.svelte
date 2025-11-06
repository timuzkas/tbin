<script lang="ts">
	export let data;

	const { collection, files } = data;

	function isImage(file) {
		return file.type.startsWith('image/');
	}

	const images = files.filter(isImage);
	const otherFiles = files.filter((file) => !isImage(file));
</script>

<svelte:head>
	<title>File Collection</title>
</svelte:head>

<main class="mx-auto max-w-4xl space-y-6 p-6">
	<a href="/" class="mb-4 text-3xl text-accent hover:cursor-pointer hover:underline"
		>> File Collection
	</a>

	{#if images.length > 0}
		<h2 class="text-2xl">Gallery</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each images as image}
				<div class="overflow-hidden rounded-lg border border-text">
					<a href={`/api/files/raw/${image.id}`} target="_blank">
						<img
							src={`/api/files/raw/${image.id}`}
							alt={image.name}
							class="h-full w-full object-cover"
						/>
					</a>
				</div>
			{/each}
		</div>
	{/if}

	{#if otherFiles.length > 0}
		<h2 class="text-2xl">Files</h2>
		<ul class="list-disc pl-5">
			{#each otherFiles as file}
				<li>
					<a href={`/api/files/raw/${file.id}`} target="_blank" class="hover:underline">
						{file.name}
					</a>
					({(file.size / 1024).toFixed(2)} KB)
				</li>
			{/each}
		</ul>
	{/if}
</main>
