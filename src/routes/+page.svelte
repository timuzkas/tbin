<!-- src/routes/+page.svelte (updated link) -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation'; // SvelteKit
	let content = '';
	let language = 'plaintext';
	let id = '';
	let loading = false;
	async function createPaste() {
		loading = true;
		const res = await fetch('/api/paste', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content, language })
		});
		const data = await res.json();
		id = data.id;
		loading = false;
	}
	function copyURL() {
		navigator.clipboard.writeText(`${window.location.origin}/${id}`);
	}
	const handleClick = () => goto(`/${id}`);
</script>

<svelte:head>
	<title>tbin</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-6 p-6">
	<h1 class="mb-4 text-3xl text-accent">
		> pastebin / <a href="/" class="hover:cursor-pointer">[tbin]</a>
	</h1>
	<div class="space-y-4 rounded-lg border border-text p-4">
		<textarea
			bind:value={content}
			placeholder="enter your text..."
			class="h-48 w-full resize-none p-2 focus:outline-none"
		></textarea>
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={language}
				placeholder="language (e.g. js, py, html)"
				class="flex-1 p-2"
			/>
			<button on:click={createPaste} disabled={loading} class="px-4 py-2">
				{loading ? '...' : 'upload'}
			</button>
		</div>
		{#if id}
			<p>> id: <span class="text-accent">{id}</span></p>
			<div class="flex gap-5">
				<button
					on:click={handleClick}
					class="bg-accent px-4 py-2 text-black hover:cursor-pointer hover:bg-accent/70"
				>
					view
				</button>
				<button
					on:click={copyURL}
					class="px-4 py-2 hover:cursor-pointer hover:text-accent hover:underline">copy URL</button
				>
			</div>
		{/if}
	</div>
	<a hred="https://timuzkas.xyz/" class="hover:cursor-pointer hover:underline">made by timuzkas</a>
</main>
