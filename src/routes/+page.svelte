<!-- src/routes/+page.svelte (updated link) -->
<script lang="ts">
  import { onMount } from 'svelte';
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
</script>

<svelte:head>
  <title>tbin</title>
</svelte:head>

<main class="p-6 max-w-2xl mx-auto space-y-6">
  <h1 class="text-3xl text-accent mb-4">> pastebin / <a href="/" class="hover:underline hover:cursor-pointer">[tbin]</a></h1>
  <div class="space-y-4 border border-text p-4 rounded-lg">
    <textarea
      bind:value={content}
      placeholder="enter your text..."
      class="w-full h-48 p-2 resize-none focus:outline-none"
    ></textarea>
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={language}
        placeholder="language (e.g. js, py, html)"
        class="p-2 flex-1"
      />
      <button on:click={createPaste} disabled={loading} class="px-4 py-2">
        {loading ? '...' : 'upload'}
      </button>
    </div>
    {#if id}
      <p>> id: <span class="text-accent">{id}</span></p>
      <div class="flex gap-2">
        <a href={`/${id}`} class="underline hover:text-accent">view</a>
        <button on:click={copyURL} class="underline hover:text-accent">copy URL</button>
      </div>
    {/if}
  </div>
  <a hred="https://timuzkas.xyz/" class="hover:underline hover:cursor-pointer">made by timuzkas</a>
</main>
