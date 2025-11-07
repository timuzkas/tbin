~<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	  let { children, data } = $props();
  let { notifications } = data;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if notifications.length > 0}
  <div class="notification-banner bg-accent text-background p-2 text-center">
    {#each notifications as notification}
      <p>{notification.message}</p>
    {/each}
  </div>
{/if}

{@render children()}
