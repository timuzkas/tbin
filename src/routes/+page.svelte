<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	export let data;

	let content = '';
	let language = 'plaintext';
	let title = '';
	let id = '';
	let loading = false;

	let username = '';
	let otp = '';
	let qrCodeDataUrl = '';
	let showOtpInput = false;
	let showLogin = false;
	let isLoggedIn = false;
	let currentUsername = '';

	onMount(() => {
		// Check if user is logged in via server-side data
		isLoggedIn = data.isLoggedIn || false;
		currentUsername = data.username || '';
	});

	async function generateOtp() {
		qrCodeDataUrl = '';
		showOtpInput = false;

		const res = await fetch('/api/auth/otp/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username })
		});

		if (res.ok) {
			const data = await res.json();
			if (data.registered) {
				// User is already registered, prompt for OTP directly
				showOtpInput = true;
				alert('Please enter your OTP to log in.');
			} else {
				// New user, display QR code
				qrCodeDataUrl = data.qrCodeDataUrl;
				showOtpInput = true;
				alert('Scan the QR code with your authenticator app and enter the OTP.');
			}
		} else {
			const error = await res.text();
			alert(error);
		}
	}

	async function verifyOtp() {
		const res = await fetch('/api/auth/otp/verify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, otp })
		});

		if (res.ok) {
			const data = await res.json();
			isLoggedIn = true;
			currentUsername = data.username;
			showOtpInput = false;
			qrCodeDataUrl = '';
			showLogin = false;
			otp = '';
			alert('Logged in successfully!');
			// Reload to get updated server data
			window.location.reload();
		} else {
			const error = await res.text();
			alert(error);
			otp = ''; // Clear OTP input on failure
		}
	}

	async function logout() {
		const res = await fetch('/api/auth/logout', {
			method: 'POST'
		});

		if (res.ok) {
			isLoggedIn = false;
			currentUsername = '';
			username = '';
			alert('Logged out successfully!');
			// Reload to clear server-side session
			window.location.reload();
		}
	}

	async function createPaste() {
		loading = true;
		console.log('creating paste');
		const headers = { 'Content-Type': 'application/json' };

		const res = await fetch('/api/paste', {
			method: 'POST',
			headers,
			body: JSON.stringify({ content, language, title })
		});

		if (res.ok) {
			const data = await res.json();
			id = data.id;
		} else {
			const error = await res.text();
			alert(error);
		}
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
	{#if data.notifications && data.notifications.length > 0}
		<div class="notification-banner border border-blue-500 p-3 text-white">
			{#each data.notifications as notification, i (notification.id)}
				<p class:text-yellow-400={notification.isUserSpecific}>
					{#if notification.isUserSpecific}
						(Personal)
					{/if}
					{notification.message}
				</p>
				{#if i < data.notifications.length - 1}
					<hr class="my-4 border-t border-neutral-900" />
				{/if}
			{/each}
		</div>
	{/if}

	{#if data.banned}
		<div class="banned-message">
			<p>You have been permanently banned from creating new pastes for abuse.</p>
		</div>
	{/if}

	<h1 class="mb-4 text-3xl text-accent">
		pastebin /
		<a href="https://github.com/timuzkas/tbin" class="hover:cursor-pointer hover:underline"
			>[tbin]</a
		>
		{#if data.showCredits}
			/
			<a
				href="https://timuzkas.xyz/"
				class="text-lg text-neutral-500 hover:cursor-pointer hover:underline">made by timuzkas</a
			>
		{/if}
	</h1>

	<div class="space-y-4 rounded-lg border border-text p-4">
		<input
			type="text"
			bind:value={title}
			placeholder="optional title..."
			class="w-full border-0 border-neutral-800 bg-transparent text-sm text-neutral-300 focus:border-accent focus:outline-none"
		/>
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
			<button
				on:click={createPaste}
				disabled={loading}
				class="px-4 py-2 hover:cursor-pointer hover:underline"
			>
				{loading ? '...' : 'create'}
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

	{#if data.fileSharingEnabled}
		<div class="flex items-center gap-x-2">
			<p class="text-neutral-400">or</p>
			<a href="/files/upload" class="text-accent hover:text-white hover:underline">Upload Files</a>
		</div>
	{/if}

	{#if !data.noLogin}
		<div class="auth-section">
			<hr class="my-4 border-t border-neutral-900" />

			<div class="flex items-center justify-between">
				{#if isLoggedIn}
					<p>
						Welcome, {currentUsername}!
						<button class="border-0 hover:cursor-pointer hover:underline" on:click={logout}
							>{'> Logout'}</button
						>
						{#if data.userId && !data.noLogin}
							<a
								href={`/user/${data.userId}/pastes`}
								class="border-0 hover:cursor-pointer hover:underline"
							>
								{'/ my_pastes'}
							</a>
							{#if data.fileSharingEnabled}
								<a
									href={`/user/${data.userId}/files`}
									class="border-0 hover:cursor-pointer hover:underline"
								>
									{' / my_files'}
								</a>
							{/if}
						{/if}
					</p>
				{:else}
					<div>
						<button
							on:click={() => (showLogin = !showLogin)}
							class="border-0 hover:cursor-pointer hover:underline"
							>{showLogin ? '< Cancel' : '> Login'}</button
						>
						{#if showLogin}
							<input type="text" bind:value={username} placeholder="Username" />
							<button on:click={generateOtp}>Login with Google Authenticator</button>
							{#if qrCodeDataUrl}
								<div>
									<p>Scan this QR code with your Google Authenticator app:</p>
									<img src={qrCodeDataUrl} alt="QR Code" />
								</div>
							{/if}
							{#if showOtpInput}
								<input type="text" bind:value={otp} placeholder="OTP" maxlength="6" />
								<button style="" on:click={verifyOtp}>Verify</button>
							{/if}
						{/if}
					</div>
				{/if}
				<a href="/privacy" class="text-neutral-500 hover:text-white hover:underline"
					>Privacy Policy</a
				>
			</div>
		</div>
	{/if}
</main>
