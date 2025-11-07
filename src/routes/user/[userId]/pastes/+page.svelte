<script lang="ts">
	export let data;
	const { pastes, username } = data;

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleString();
	}
</script>

<svelte:head>
	<title>{username}'s Pastes</title>
</svelte:head>

<main class="mx-auto max-w-4xl space-y-6 p-6">
	<a class="mb-4 block text-3xl text-accent hover:cursor-pointer hover:underline" href="/">
		> {username}'s Pastes
	</a>

	{#if pastes.length > 0}
		<ul class="space-y-2">
			{#each pastes as paste}
				<li class="flex items-center justify-between rounded-lg border border-text p-4">
					<a href={`/${paste.id}`} class="text-lg hover:underline">
						{paste.id} ({paste.language})
					</a>
					<span class="text-sm text-neutral-400">
						{formatDate(paste.created_at)}
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-text">No pastes found.</p>
	{/if}
</main>
