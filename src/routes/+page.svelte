<!-- src/routes/+page.svelte (updated link) -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation'; // SvelteKit
	export let data;

	let content = '';
	let language = 'plaintext';
	let id = '';
	let loading = false;

	let username = '';
	let otp = '';
	let token = '';
	let qrCodeDataUrl = '';
	let showOtpInput = false;
	let showLogin = false;

	onMount(() => {
		token = localStorage.getItem('token') || '';
		username = localStorage.getItem('username') || '';
	});

	async function generateOtp() {
		const res = await fetch('/api/auth/otp/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username })
		});
		if (res.ok) {
			const data = await res.json();
			qrCodeDataUrl = data.qrCodeDataUrl;
			showOtpInput = true;
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
			token = data.token;
			localStorage.setItem('token', token);
			localStorage.setItem('username', username);
			showOtpInput = false;
			qrCodeDataUrl = '';
			showLogin = false;
			alert('Logged in successfully!');
		} else {
			const error = await res.text();
			alert(error);
		}
	}

	function logout() {
		token = '';
		username = '';
		localStorage.removeItem('token');
		localStorage.removeItem('username');
		alert('Logged out successfully!');
	}

	async function createPaste() {
		loading = true;
		const headers = { 'Content-Type': 'application/json' };
		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}
		const res = await fetch('/api/paste', {
			method: 'POST',
			headers,
			body: JSON.stringify({ content, language })
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

	{#if data.fileSharingEnabled}
		<div class="flex items-center gap-x-2">
			<p class="text-neutral-400">or</p>
			<a href="/files/upload" class="text-accent hover:text-white hover:underline">Upload Files</a>
		</div>
	{/if}

	{#if !data.noLogin}
		<div class="auth-section">
			<hr class="my-4 border-t border-neutral-900" />

			{#if token}
				<p>
					Welcome, {username}!
					<button class="border-0 hover:cursor-pointer hover:underline" on:click={logout}
						>{'> Logout'}</button
					>
				</p>
			{:else}
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
						<input type="text" bind:value={otp} placeholder="OTP" />
						<button on:click={verifyOtp}>Verify</button>
					{/if}
				{/if}
			{/if}
		</div>
	{/if}
</main>
