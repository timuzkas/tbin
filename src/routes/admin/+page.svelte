<script lang="ts">
	let password = ''; // This will be bound to the input field
	let usernameToPurge = '';
	let message = '';
	let loading = false;

	async function purgeFiles(purgeAll: boolean) {
		loading = true;
		message = '';

		const body: { password: string; username?: string } = { password };
		if (!purgeAll) {
			if (!usernameToPurge) {
				alert('Please enter a username to purge specific user files.');
				loading = false;
				return;
			}
			body.username = usernameToPurge;
		}

		// Ensure password is provided
		if (!body.password) {
			alert('Please enter the admin password.');
			loading = false;
			return;
		}

		const res = await fetch('/api/admin/purge-files', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		if (res.ok) {
			const data = await res.json();
			message = data.message;
		} else {
			const errorText = await res.text();
			message = `Error: ${errorText}`;
		}

		loading = false;
	}

	async function purgePastes(purgeAll: boolean) {
		loading = true;
		message = '';

		const body: { password: string; username?: string } = { password };
		if (!purgeAll) {
			if (!usernameToPurge) {
				alert('Please enter a username to purge specific user pastes.');
				loading = false;
				return;
			}
			body.username = usernameToPurge;
		}

		// Ensure password is provided
		if (!body.password) {
			alert('Please enter the admin password.');
			loading = false;
			return;
		}

		const res = await fetch('/api/admin/purge-pastes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		if (res.ok) {
			const data = await res.json();
			message = data.message;
		} else {
			const errorText = await res.text();
			message = `Error: ${errorText}`;
		}

		loading = false;
	}
</script>

<svelte:head>
	<title>Admin Panel</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-6 p-6">
	<h1 class="mb-4 text-3xl text-accent">> Admin Panel</h1>

	<div class="space-y-4 rounded-lg border border-text p-4">
		<p>Note: The admin panel's access is restricted by a password in the URL (for page access) and also requires the password for actions.</p>
		
		<div class="flex flex-col gap-2">
			<label for="adminPassword">Admin Password:</label>
			<input
				type="password"
				id="adminPassword"
				bind:value={password}
				placeholder="Enter admin password"
			/>
		</div>

		<div class="flex flex-col gap-2">
			<label for="usernameToPurge">Username to Purge (optional):</label>
			<input
				type="text"
				id="usernameToPurge"
				bind:value={usernameToPurge}
				placeholder="Enter username"
			/>
		</div>

		<h2 class="text-2xl mt-4">File Purging</h2>
		<div class="flex gap-2">
			<button on:click={() => purgeFiles(false)} disabled={loading} class="px-4 py-2">
				{loading && !usernameToPurge ? 'Purging...' : 'Purge User Files'}
			</button>
			<button
				on:click={() => purgeFiles(true)}
				disabled={loading}
				class="bg-red-500 px-4 py-2 hover:bg-red-600"
			>
				{loading && !usernameToPurge ? 'Purging All...' : 'Purge All Files'}
			</button>
		</div>

		<h2 class="text-2xl mt-4">Paste Purging</h2>
		<div class="flex gap-2">
			<button on:click={() => purgePastes(false)} disabled={loading} class="px-4 py-2">
				{loading && !usernameToPurge ? 'Purging...' : 'Purge User Pastes'}
			</button>
			<button
				on:click={() => purgePastes(true)}
				disabled={loading}
				class="bg-red-500 px-4 py-2 hover:bg-red-600"
			>
				{loading && !usernameToPurge ? 'Purging All...' : 'Purge All Pastes'}
			</button>
		</div>

		{#if message}
			<p class="text-accent">{message}</p>
		{/if}
	</div>
</main>
