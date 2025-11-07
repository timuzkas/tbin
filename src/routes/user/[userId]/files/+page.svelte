<script lang="ts">
	export let data;
	const { collections, username } = data;

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleString();
	}
</script>

<svelte:head>
	<title>{username}'s File Collections</title>
</svelte:head>

<main class="mx-auto max-w-4xl space-y-6 p-6">
	<a
		class="mb-4 block text-3xl text-accent hover:cursor-pointer hover:underline"
		on:click={() => (location.href = '/')}
	>
		> {username}'s File collections
	</a>

	{#if collections.length > 0}
		<ul class="space-y-2">
			{#each collections as collection}
				<li class="flex items-center justify-between rounded-lg border border-text p-4">
					<a href={`/files/${collection.id}`} class="text-lg hover:underline">
						Collection {collection.id}
					</a>
					<span class="text-sm text-neutral-400">
						{formatDate(collection.created_at)}
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-text">No file collections found.</p>
	{/if}
</main>
