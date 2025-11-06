<!-- src/routes/[id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import hljs from 'highlight.js';
  export let data;
  $: paste = data?.paste;
  $: language = paste?.language || 'plaintext';
  $: renderedContent = dedent(paste?.content?.trim() || '');

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
    return lines.map(line => line.slice(minIndent)).join('\n');
  }

  onMount(() => {
    if (paste) hljs.highlightAll();
  });
  function copyURL() {
    navigator.clipboard.writeText(window.location.href);
  }
</script>
<svelte:head>
  <title>{paste?.id || 'paste'}</title>
</svelte:head>
<main class="p-6 max-w-2xl mx-auto space-y-6">
  {#if paste}
    <div class="flex justify-between items-center">
      <a href="/" class="text-3xl text-accent hover:cursor-pointer hover:underline text-md">> {paste.id}</a>
      <button on:click={copyURL} class="px-4 py-2 underline hover:text-accent">copy URL</button>
    </div>
    <pre class="mt-4 overflow-x-auto bg-transparent border border-text p-4 rounded-lg">
      <code class="language-{language}">{renderedContent}</code>
    </pre>
  {:else}
    <p class="text-text">
      Paste not found.
      <a href="/" class="text-accent underline hover:text-white">Home</a>
    </p>
  {/if}
</main>
