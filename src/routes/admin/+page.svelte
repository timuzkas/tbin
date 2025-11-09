<script lang="ts">
	export let data;
	const { password } = data;
	let usernameToPurge = '';
	let message = '';
	let loading = false;

	let usernameToView = '';
	let viewLoading = false;
	let viewMessage = '';
	let userData = null;
	let banReason = '';
	let viewUserSuggestions = [];
	let showViewSuggestions = false;

	let notificationMessage = '';
	let notificationUserId = '';
	let notificationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 16);
	let userSuggestions = [];
	let showSuggestions = false;

	async function fetchUserSuggestions(query: string) {
		if (query.length < 2) {
			userSuggestions = [];
			showSuggestions = false;
			return;
		}
		const res = await fetch(`/api/admin/user/search?query=${query}`, {
			headers: {
				Authorization: `Bearer ${password}`
			}
		});
		if (res.ok) {
			userSuggestions = await res.json();
			showSuggestions = userSuggestions.length > 0;
		} else {
			userSuggestions = [];
			showSuggestions = false;
		}
	}

	function selectUser(user) {
		notificationUserId = user.id;
		showSuggestions = false;
	}

	async function fetchViewUserSuggestions(query: string) {
		if (query.length < 2) {
			viewUserSuggestions = [];
			showViewSuggestions = false;
			return;
		}
		const res = await fetch(`/api/admin/user/search?query=${query}`, {
			headers: {
				Authorization: `Bearer ${password}`
			}
		});
		if (res.ok) {
			viewUserSuggestions = await res.json();
			showViewSuggestions = viewUserSuggestions.length > 0;
		} else {
			viewUserSuggestions = [];
			showViewSuggestions = false;
		}
	}

	function selectViewUser(user) {
		usernameToView = user.username;
		showViewSuggestions = false;
	}

	$: if (notificationUserId && notificationUserId.length >= 2) {
		fetchUserSuggestions(notificationUserId);
	} else {
		userSuggestions = [];
		showSuggestions = false;
	}

	$: if (usernameToView && usernameToView.length >= 2) {
		fetchViewUserSuggestions(usernameToView);
	} else {
		viewUserSuggestions = [];
		showViewSuggestions = false;
	}
	let notifications = [];

	let { advancedAdmin } = data;

	async function fetchNotifications() {
		const res = await fetch('/api/admin/notifications', {
			headers: {
				Authorization: `Bearer ${password}`
			}
		});

		if (res.ok) {
			notifications = await res.json();
		} else {
			const errorText = await res.text();
			alert(`Error fetching notifications: ${errorText}`);
		}
	}

	async function createNotification() {
		const res = await fetch('/api/admin/notifications', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${password}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				message: notificationMessage,
				userId: notificationUserId,
				expiresAt: new Date(notificationExpiresAt).getTime() / 1000
			})
		});

		if (res.ok) {
			fetchNotifications();
			notificationMessage = '';
			notificationUserId = '';
			notificationExpiresAt = '';
		} else {
			const errorText = await res.text();
			alert(`Error creating notification: ${errorText}`);
		}
	}

	async function deleteNotification(id: number) {
		if (!confirm('Are you sure you want to delete this notification?')) return;

		const res = await fetch(
			`/api/admin/notifications/${id}`,

			{
				method: 'DELETE',

				headers: {
					Authorization: `Bearer ${password}`
				}
			}
		);

		if (res.ok) {
			fetchNotifications();
		} else {
			const errorText = await res.text();

			alert(`Error: ${errorText}`);
		}
	}

	let rateLimitAction = '';
	let rateLimitUserType = '';
	let rateLimitType = '';
	let rateLimitValue: number | null = null;
	let rateLimitTimeWindow: number | null = null;
	let rateLimitBanThreshold: number | null = 10;
	let editingRateLimit: { action: string; user_type: string } | null = null;

	let rateLimits = [];

	function startEditing(limit) {
		editingRateLimit = { action: limit.action, user_type: limit.user_type };
		rateLimitAction = limit.action;
		rateLimitUserType = limit.user_type;
		rateLimitType = limit.type;
		rateLimitValue = limit.limit_value;
		rateLimitTimeWindow = limit.time_window_seconds;
		rateLimitBanThreshold = limit.ban_threshold;
	}

	function cancelEditing() {
		editingRateLimit = null;
		rateLimitAction = '';
		rateLimitUserType = '';
		rateLimitType = '';
		rateLimitValue = null;
		rateLimitTimeWindow = null;
		rateLimitBanThreshold = 10;
	}

	let guestFileUploadsEnabled = false;
	let guestPasteCreationsEnabled = false;

	let ipToUnban = '';
	let ipUnbanMessage = '';

	let ipToManageOffenses = '';
	let offenseCount: number | null = null;
	let offenseMessage = '';

	async function fetchSettings() {
		const res = await fetch('/api/admin/settings', {
			headers: {
				Authorization: `Bearer ${password}`
			}
		});

		if (res.ok) {
			const settings = await res.json();
			guestFileUploadsEnabled = settings.guest_file_uploads_enabled === 'true';
			guestPasteCreationsEnabled = settings.guest_paste_creations_enabled === 'true';
		} else {
			const errorText = await res.text();
			alert(`Error fetching settings: ${errorText}`);
		}
	}

	async function saveSetting(key: string, value: boolean) {
		const res = await fetch('/api/admin/settings', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${password}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ key, value: value.toString() })
		});

		if (!res.ok) {
			const errorText = await res.text();
			alert(`Error saving setting: ${errorText}`);
		}
	}

	const rateLimitActions = [
		'paste_creation',
		'collection_creation',
		'login_attempt',
		'otp_generation',
		'api_request'
	];

	const rateLimitUserTypes = [
		{ label: 'Guests', value: '__GUEST__' },
		{ label: 'Authorized Users', value: '__AUTH__' }
	];

	async function fetchRateLimits() {
		const res = await fetch('/api/admin/rate-limits', {
			headers: {
				Authorization: `Bearer ${password}`
			}
		});

		if (res.ok) {
			rateLimits = await res.json();
		} else {
			const errorText = await res.text();

			alert(`Error fetching rate limits: ${errorText}`);
		}
	}

	async function saveRateLimit() {
		if (!rateLimitAction || !rateLimitUserType || !rateLimitType || rateLimitValue === null) {
			alert('Action, User Type, Type and Limit Value are required.');
			return;
		}

		const res = await fetch('/api/admin/rate-limits', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${password}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				action: rateLimitAction,
				user_type: rateLimitUserType,
				type: rateLimitType,
				limit_value: rateLimitValue,
				time_window_seconds: rateLimitType === 'limit' ? rateLimitTimeWindow : null,
				ban_threshold: rateLimitBanThreshold,
				is_editing: editingRateLimit !== null,
				original_action: editingRateLimit?.action,
				original_user_type: editingRateLimit?.user_type
			})
		});

		if (res.ok) {
			fetchRateLimits();
			cancelEditing();
		} else {
			const errorText = await res.text();
			alert(`Error saving rate limit: ${errorText}`);
		}
	}

	async function deleteRateLimit(action: string, user_type: string) {
		if (!confirm('Are you sure you want to delete this rate limit?')) return;

		const res = await fetch('/api/admin/rate-limits', {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${password}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ action, user_type })
		});

		if (res.ok) {
			fetchRateLimits();
		} else {
			const errorText = await res.text();
			alert(`Error deleting rate limit: ${errorText}`);
		}
	}

	import { onMount } from 'svelte';

	// ... (rest of the script)

	if (advancedAdmin) {
		onMount(() => {
			fetchNotifications();
			fetchRateLimits();
			fetchSettings();
		});
	}

	async function banUser(username: string) {
		if (!confirm(`Are you sure you want to ban ${username}?`)) return;

		const res = await fetch(`/api/admin/user/${username}/ban`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${password}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ reason: banReason })
		});

		if (res.ok) {
			viewUser();
		} else {
			const errorText = await res.text();
			alert(`Error: ${errorText}`);
		}
	}

	async function unbanUser(username: string) {
		if (!confirm(`Are you sure you want to unban ${username}?`)) return;

		const res = await fetch(`/api/admin/user/${username}/unban`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${password}`
			}
		});

		if (res.ok) {
			viewUser();
		} else {
			const errorText = await res.text();
			alert(`Error: ${errorText}`);
		}
	}

	async function purgeFiles(purgeAll: boolean, username?: string) {
		loading = true;
		message = '';

		const body: { password: string; username?: string } = { password };
		if (!purgeAll) {
			if (!username) {
				alert('Please enter a username to purge specific user files.');
				loading = false;
				return;
			}
			body.username = username;
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

	async function purgePastes(purgeAll: boolean, username?: string) {
		loading = true;
		message = '';

		const body: { password: string; username?: string } = { password };
		if (!purgeAll) {
			if (!username) {
				alert('Please enter a username to purge specific user pastes.');
				loading = false;
				return;
			}
			body.username = username;
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

	async function purgeGuestFiles() {
		loading = true;
		message = '';

		if (!confirm('Are you sure you want to purge ALL guest files? This action cannot be undone.')) {
			loading = false;
			return;
		}

		const res = await fetch('/api/admin/purge-guest-files', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${password}`
			},
			body: JSON.stringify({ password })
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

	async function purgeGuestPastes() {
		loading = true;
		message = '';

		if (
			!confirm('Are you sure you want to purge ALL guest pastes? This action cannot be undone.')
		) {
			loading = false;
			return;
		}

		const res = await fetch('/api/admin/purge-guest-pastes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${password}`
			},
			body: JSON.stringify({ password })
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

	async function viewUser() {
		viewLoading = true;
		viewMessage = '';
		userData = null;

		if (!usernameToView) {
			alert('Please enter a username to view.');
			viewLoading = false;
		}
		return;
	}

	async function deletePaste(id: string) {
		if (!confirm('Are you sure you want to delete this paste?')) return;

		const res = await fetch(`/api/admin/pastes/${id}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${password}`
			}
		});

		if (res.ok) {
			viewUser();
		} else {
			const errorText = await res.text();
			alert(`Error: ${errorText}`);
		}
	}

	async function deleteCollection(id: string) {
		if (!confirm('Are you sure you want to delete this collection?')) return;

		const res = await fetch(`/api/admin/collections/${id}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${password}`
			}
		});

		if (res.ok) {
			viewUser();
		} else {
			const errorText = await res.text();
			alert(`Error: ${errorText}`);
		}
	}

	async function deleteFile(id: string) {
		if (!confirm('Are you sure you want to delete this file?')) return;

		const res = await fetch(`/api/admin/files/${id}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${password}`
			}
		});

		if (res.ok) {
			viewUser();
		} else {
			const errorText = await res.text();
			alert(`Error: ${errorText}`);
		}
	}

	async function unbanIp() {
		ipUnbanMessage = '';
		if (!ipToUnban) {
			ipUnbanMessage = 'Please enter an IP address.';
			return;
		}

		const res = await fetch('/api/admin/ip/ban', {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${password}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ ip: ipToUnban })
		});

		if (res.ok) {
			ipUnbanMessage = `IP ${ipToUnban} unbanned successfully.`;
			ipToUnban = '';
		} else {
			const errorText = await res.text();
			ipUnbanMessage = `Error unbanning IP: ${errorText}`;
		}
	}

	async function fetchOffenseCount() {
		offenseMessage = '';
		offenseCount = null;
		if (!ipToManageOffenses) {
			offenseMessage = 'Please enter an IP address.';
			return;
		}

		const res = await fetch(`/api/admin/offenses?ip=${ipToManageOffenses}`, {
			headers: {
				Authorization: `Bearer ${password}`
			}
		});

		if (res.ok) {
			const data = await res.json();
			offenseCount = data.count;
			offenseMessage = `Offense count for ${ipToManageOffenses}: ${data.count}`;
		} else {
			const errorText = await res.text();
			offenseMessage = `Error fetching offense count: ${errorText}`;
		}
	}

	async function clearOffenses() {
		offenseMessage = '';
		if (!ipToManageOffenses) {
			offenseMessage = 'Please enter an IP address.';
			return;
		}

		if (!confirm(`Are you sure you want to clear all offenses for IP ${ipToManageOffenses}?`)) {
			return;
		}

		const res = await fetch('/api/admin/offenses', {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${password}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ ip: ipToManageOffenses })
		});

		if (res.ok) {
			offenseMessage = `Offenses for IP ${ipToManageOffenses} cleared successfully.`;
			offenseCount = 0; // Reset count after clearing
		} else {
			const errorText = await res.text();
			offenseMessage = `Error clearing offenses: ${errorText}`;
		}
	}
</script>

<svelte:head>
	<title>Admin Panel</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-6 p-6">
	<a
		on:click={() => (location.href = '/')}
		class="mb-4 block text-3xl text-accent hover:cursor-pointer hover:underline"
	>
		> Admin panel
	</a>

	<div class="space-y-4 rounded-lg border border-text p-4">
		<p>Note: The admin panel's access is restricted by a password in the URL.</p>

		<h2 class="mt-4 text-2xl">File Purging</h2>
		<div class="flex gap-2">
			<button
				on:click={() => purgeFiles(true)}
				disabled={loading}
				class="bg-red-500 px-4 py-2 hover:bg-red-600"
			>
				{loading ? 'Purging All...' : 'Purge All Files'}
			</button>
			<button
				on:click={purgeGuestFiles}
				disabled={loading}
				class="bg-red-500 px-4 py-2 hover:bg-red-600"
			>
				{loading ? 'Purging Guest...' : 'Purge Guest Files'}
			</button>
		</div>

		<h2 class="mt-4 text-2xl">Paste Purging</h2>
		<div class="flex gap-2">
			<button
				on:click={() => purgePastes(true)}
				disabled={loading}
				class="bg-red-500 px-4 py-2 hover:bg-red-600"
			>
				{loading && !usernameToPurge ? 'Purging All...' : 'Purge All Pastes'}
			</button>
			<button
				on:click={purgeGuestPastes}
				disabled={loading}
				class="bg-red-500 px-4 py-2 hover:bg-red-600"
			>
				{loading ? 'Purging Guest...' : 'Purge Guest Pastes'}
			</button>
		</div>

		{#if message}
			<p class="text-accent">{message}</p>
		{/if}
	</div>

	<div class="space-y-4 rounded-lg border border-text p-4">
		<h2 class="text-2xl">View User Data</h2>
		<div class="flex flex-col gap-2">
			<label for="usernameToView">Username to View:</label>
			<div class="relative">
				<input
					type="text"
					id="usernameToView"
					bind:value={usernameToView}
					placeholder="Enter username"
					class="w-full"
				/>
				{#if showViewSuggestions}
					<ul class="absolute z-10 w-full border border-gray-300 bg-white shadow-lg">
						{#each viewUserSuggestions as user}
							<button
								type="button"
								class="w-full cursor-pointer border-1 border-accent bg-bg p-2 text-left hover:bg-bg/90"
								on:click={() => selectViewUser(user)}
							>
								{user.username} ({user.id})
							</button>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
		<button on:click={viewUser} disabled={viewLoading} class="px-4 py-2">
			{viewLoading ? 'Loading...' : 'View User Data'}
		</button>

		{#if viewMessage}
			<p class="text-accent">{viewMessage}</p>
		{/if}

		{#if userData}
			<div>
				<div class="mt-4">
					<hr class="my-4 border-t border-neutral-900" />
					<h3 class="text-xl">User Details</h3>
					<p>ID: {userData.user.id}</p>
					<p>Username: {userData.user.username}</p>
					<p>Banned: {userData.user.banned ? 'Yes' : 'No'}</p>
					{#if advancedAdmin}
						<div class="mt-2 flex items-center gap-2">
							<input type="text" bind:value={banReason} placeholder="Ban reason" />
							{#if !userData.user.banned}
								<button
									on:click={() => banUser(userData.user.username)}
									class="bg-red-500 px-4 hover:bg-red-600">Ban</button
								>
							{:else}
								<button on:click={() => unbanUser(userData.user.username)} class="px-4 py-2"
									>Unban</button
								>
							{/if}
						</div>
						<hr class="my-4 border-t border-neutral-900" />
						<div class="mt-4">
							<h3 class="text-xl">User Purge Actions</h3>
							<div class="mt-2 flex gap-2">
								<button
									on:click={() => purgeFiles(false, userData.user.username)}
									disabled={loading}
									class="px-4 py-2"
								>
									{loading ? 'Purging...' : 'Purge User Files'}
								</button>
								<button
									on:click={() => purgePastes(false, userData.user.username)}
									disabled={loading}
									class="px-4 py-2"
								>
									{loading ? 'Purging...' : 'Purge User Pastes'}
								</button>
							</div>
						</div>
					{/if}
					<hr class="my-4 border-t border-neutral-900" />
					<h3 class="my-2 text-xl">Pastes</h3>
					{#if userData.pastes.length > 0}
						<ul class="list-disc pl-5">
							{#each userData.pastes as paste}
								<li>
									<a href="/{paste.id}" target="_blank" class="text-blue-500 hover:underline"
										>{paste.id}</a
									>
									({paste.language}) - {new Date(paste.created_at).toLocaleString()}
									<button
										on:click={() => deletePaste(paste.id)}
										class="ml-2 text-red-500 hover:underline">Delete</button
									>
								</li>
							{/each}
						</ul>
					{:else}
						<p>No pastes found.</p>
					{/if}
				</div>

				<hr class="my-4 border-t border-neutral-900" />

				<div class="mt-4">
					<h3 class="text-xl">File Collections</h3>
					{#if userData.collections.length > 0}
						<ul class="list-disc pl-5">
							{#each userData.collections as collection}
								<li>
									<a
										href="/files/{collection.id}"
										target="_blank"
										class="text-blue-500 hover:underline">{collection.id}</a
									>
									- {new Date(collection.created_at).toLocaleString()}
									<button
										on:click={() => deleteCollection(collection.id)}
										class="ml-2 border-0 text-red-500 hover:cursor-pointer hover:underline"
										>Delete</button
									>
								</li>
							{/each}
						</ul>
					{:else}
						<p>No file collections found.</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</main>

{#if advancedAdmin}
	<main class="mx-auto max-w-2xl space-y-6 p-6">
		<div class="space-y-4 rounded-lg border border-text p-4">
			<h2 class="text-2xl">Advanced Admin</h2>

			<div class="mt-4">
				<h3 class="text-xl">Notifications</h3>
				<div class="flex flex-col gap-2">
					<textarea bind:value={notificationMessage} placeholder="Notification message"></textarea>
					<div class="relative">
						<input
							type="text"
							class="w-full"
							bind:value={notificationUserId}
							placeholder="User ID (optional)"
						/>
						{#if showSuggestions}
							<ul class="absolute z-10 w-full border border-gray-300 bg-white shadow-lg">
								{#each userSuggestions as user}
									<button
										type="button"
										class="w-full cursor-pointer border-1 border-accent bg-bg p-2 text-left hover:bg-bg/90"
										on:click={() => selectUser(user)}
									>
										{user.username} ({user.id})
									</button>
								{/each}
							</ul>
						{/if}
					</div>
					<input type="datetime-local" bind:value={notificationExpiresAt} />
					<button on:click={createNotification} class="px-4 py-2">Create Notification</button>
				</div>

				<ul class="mt-4 list-disc pl-5">
					{#each notifications as notification}
						<li>
							{notification.message} ({notification.user_id || 'All users'}) - Expires: {new Date(
								notification.expires_at * 1000
							).toLocaleString()}
							<button
								on:click={() => deleteNotification(notification.id)}
								class="ml-2 border-0 text-red-500 hover:underline">Delete</button
							>
						</li>
					{/each}
				</ul>
			</div>

			<hr class="my-4 border-t border-neutral-900" />

			<div class="mt-4">
				<h3 class="text-xl">Rate Limits</h3>
				<div class="flex flex-col gap-2">
					<select bind:value={rateLimitAction}>
						<option value="">Select Action</option>
						{#each rateLimitActions as action}
							<option value={action}>{action}</option>
						{/each}
					</select>
					<select bind:value={rateLimitUserType}>
						<option value="">Select User Type</option>
						{#each rateLimitUserTypes as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
					<select bind:value={rateLimitType}>
						<option value="">Select Type</option>
						<option value="cooldown">Cooldown</option>
						<option value="limit">Limit</option>
					</select>
					<input type="number" bind:value={rateLimitValue} placeholder="Limit Value" />
					{#if rateLimitType === 'limit'}
						<input
							type="number"
							bind:value={rateLimitTimeWindow}
							placeholder="Time Window (seconds)"
						/>
					{/if}
					<input
						type="number"
						bind:value={rateLimitBanThreshold}
						placeholder="Ban Threshold (e.g., 10)"
					/>
					<button on:click={saveRateLimit} class="px-4 py-2"
						>{#if editingRateLimit}Update Rate Limit{:else}Save Rate Limit{/if}</button
					>
					{#if editingRateLimit}
						<button on:click={cancelEditing} class="px-4 py-2">Cancel</button>
					{/if}
				</div>

				<ul class="mt-4 list-disc pl-5">
					{#each rateLimits as limit}
						<li>
							{limit.action} ({limit.user_type}) - {limit.type}: {limit.limit_value}
							{#if limit.type === 'limit'}
								per {limit.time_window_seconds}s
							{/if}
							(Ban at {limit.ban_threshold})
							<button
								on:click={() => startEditing(limit)}
								class="ml-2 border-0 text-blue-500 hover:underline">Edit</button
							>
							<button
								on:click={() => deleteRateLimit(limit.action, limit.user_type)}
								class="ml-2 border-0 text-red-500 hover:underline">Delete</button
							>
						</li>
					{/each}
				</ul>
			</div>

			<hr class="my-4 border-t border-neutral-900" />

			<div class="mt-4">
				<h3 class="text-xl">Guest Features</h3>
				<div class="flex flex-col gap-2">
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={guestFileUploadsEnabled}
							on:change={() => saveSetting('guest_file_uploads_enabled', guestFileUploadsEnabled)}
						/>
						Enable Guest File Uploads
					</label>
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={guestPasteCreationsEnabled}
							on:change={() =>
								saveSetting('guest_paste_creations_enabled', guestPasteCreationsEnabled)}
						/>
						Enable Guest Paste Creations
					</label>
				</div>
			</div>

			<hr class="my-4 border-t border-neutral-900" />

			<div class="mt-4">
				<h3 class="text-xl">IP Ban Management</h3>
				<div class="flex flex-col gap-2">
					<input type="text" bind:value={ipToUnban} placeholder="IP Address to Unban" />
					<button on:click={unbanIp} class="px-4 py-2">Unban IP</button>
				</div>
				{#if ipUnbanMessage}
					<p class="text-accent">{ipUnbanMessage}</p>
				{/if}
			</div>

			<hr class="my-4 border-t border-neutral-900" />

			<div class="mt-4">
				<h3 class="text-xl">Offense Management</h3>
				<div class="flex flex-col gap-2">
					<input
						type="text"
						bind:value={ipToManageOffenses}
						placeholder="IP Address to Manage Offenses"
					/>
					<div class="flex gap-2">
						<button on:click={fetchOffenseCount} class="px-4 py-2">Fetch Offense Count</button>
						<button on:click={clearOffenses} class="bg-red-500 px-4 py-2 hover:bg-red-600"
							>Clear Offenses</button
						>
					</div>
				</div>
				{#if offenseCount !== null}
					<p>Current Offenses for {ipToManageOffenses}: {offenseCount}</p>
				{/if}
				{#if offenseMessage}
					<p class="text-accent">{offenseMessage}</p>
				{/if}
			</div>
		</div>
	</main>
{/if}
