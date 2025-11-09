<!-- src/routes/[id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import hljs from 'highlight.js';
	import { goto } from '$app/navigation';
	export let data;
	$: paste = data?.paste;
	$: language = paste?.language || 'plaintext';
	$: renderedContent = dedent(paste?.content || '').trim();
	$: isOwner = data?.isOwner;
	$: loginEnabled = data?.loginEnabled;

	let isEditing = false;
	let editedContent = paste?.content || '';
	let editedLanguage = paste?.language || 'plaintext';

	$: {
		if (paste) {
			editedContent = paste.content;
			editedLanguage = paste.language || 'plaintext';
		}
	}

	function dedent(code: string): string {
		const lines = code.split('\n');
		if (lines.length === 0) return code;
		let minIndent = Infinity;
		for (const line of lines) {
			if (line.trim() === '') continue;
			const match = line.match(/^\s*/);
			const indent = match ? match[0].length : 0;
			if (indent < minIndent) minIndent = indent;
		}
		if (minIndent === 0) return code;
		return lines.map((line) => line.slice(minIndent)).join('\n');
	}

	onMount(() => {
		if (paste) hljs.highlightAll();
	});
	function copyContent() {
		navigator.clipboard.writeText(renderedContent);
	}
	function copyRawURL() {
		navigator.clipboard.writeText(`${window.location.origin}/api/paste/${paste.id}`);
	}

	async function deletePaste() {
		if (!confirm('Are you sure you want to delete this paste?')) {
			return;
		}
		const response = await fetch(`/api/paste/${paste.id}`, {
			method: 'DELETE'
		});
		if (response.ok) {
			alert('Paste deleted successfully!');
			goto('/');
		} else {
			alert('Failed to delete paste.');
		}
	}

	async function editPaste() {
		const response = await fetch(`/api/paste/${paste.id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ content: editedContent, language: editedLanguage })
		});

		if (response.ok) {
			alert('Paste updated successfully!');
			paste.content = editedContent;
			paste.language = editedLanguage;
			isEditing = false;
		} else {
			alert('Failed to update paste.');
		}
	}
</script>

<svelte:head>
	<title>{paste?.title || paste?.id || 'paste'}</title>
</svelte:head>
<main class="mx-auto max-w-full space-y-6 p-6 md:max-w-[70%]">
	{#if paste}
		<div class="sticky top-0 z-10 flex items-center justify-between bg-bg py-4">
			<a
				href="/"
				class="text-md text-3xl text-accent hover:cursor-pointer hover:underline">> {paste.title || paste.id}</a
			>
			<div class="flex items-center space-x-2">
				{#if isOwner && loginEnabled}
					<button
						on:click={() => (isEditing = !isEditing)}
						class="px-4 py-2 hover:cursor-pointer hover:text-accent hover:underline"
					>
						{isEditing ? 'cancel' : 'edit'}
					</button>
					<button
						on:click={deletePaste}
						class="px-4 py-2 text-red-500 hover:cursor-pointer hover:underline">delete</button
					>
				{/if}
				<button
					on:click={copyContent}
					class="px-4 py-2 hover:cursor-pointer hover:text-accent hover:underline"
					>copy content</button
				>
				<button
					on:click={copyRawURL}
					class="px-4 py-2 hover:cursor-pointer hover:text-accent hover:underline"
					>copy raw URL</button
				>
			</div>
		</div>

		{#if isEditing}
			<form on:submit|preventDefault={editPaste} class="space-y-4">
				<textarea
					bind:value={editedContent}
					class="w-full rounded-lg border border-text bg-transparent p-4 font-mono text-sm"
					rows="15"
				></textarea>
				<input
					bind:value={editedLanguage}
					type="text"
					placeholder="Language (e.g., plaintext, javascript)"
					class="w-full rounded-lg border border-text bg-transparent p-2"
				/>
				<button
					type="submit"
					class="hover:bg-accent-dark bg-accent px-4 py-2 text-sm text-black hover:cursor-pointer hover:bg-accent/70"
					>Save Changes</button
				>
			</form>
		{:else}
			<pre class="mt-4 overflow-x-auto rounded-lg border border-text bg-transparent p-4">
<code class="language-{language} whitespace-pre">{renderedContent}</code>
</pre>
		{/if}
	{:else}
		<p class="text-text">
			Paste not found.
			<a href="/" class="text-accent underline hover:text-white">Home</a>
		</p>
	{/if}
</main>
