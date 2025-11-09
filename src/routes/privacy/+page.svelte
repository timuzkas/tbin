<svelte:head>
	<title>Privacy Policy</title>
</svelte:head>



<main class="mx-auto max-w-2xl space-y-6 p-6">
	<h1 class="text-3xl text-accent">Privacy Policy</h1>

	<div class="mx-auto max-w-2xl p-4 mb-4 text-red-700 border border-red-700 rounded-lg" role="alert">
		This website processes personal data only when <strong class="text-red-700">necessary for its legitimate interests</strong>, such as maintaining security, preventing abuse, and providing core services, in compliance with <strong class="text-red-700">Article 6(1)(f) of the GDPR</strong>.
	</div>

	<p class="text-neutral-400">Effective: November 9, 2025</p>

	<p>
		This policy applies to data processed by this tbin instance. <strong
			>This is open-source software;</strong
		>
		if you're self-hosting, you are the data controller.
	</p>

	<h2 class="text-2xl">Data Controller</h2>
	<p>
		Operator of this instance. Contact via
		<a href="https://github.com/timuzkas/tbin/issues" class="text-accent hover:underline"
			>GitHub Issues</a
		>
	</p>

	<h2 class="text-2xl">What We Collect</h2>
	<ul class="list-disc space-y-1 pl-5">
		<li><strong>Account Data:</strong> Username, TOTP secret (encrypted at rest)</li>
		<li><strong>IP Addresses:</strong> Raw IPs for abuse prevention</li>
		<li><strong>Pastes:</strong> Content, language, timestamps</li>
		<li><strong>Logs:</strong> Basic access metadata</li>
	</ul>

	<h2 class="text-2xl">Why & Legal Basis</h2>
	<ul class="list-disc space-y-1 pl-5">
		<li>
			<strong>Legitimate Interest (Art. 6(1)(f) GDPR):</strong> IP logging for security and rate limiting
		</li>
		<li><strong>Contract (Art. 6(1)(b) GDPR):</strong> Account data to provide authentication</li>
	</ul>

	<h2 class="text-2xl">Retention Periods</h2>
	<ul class="list-disc space-y-1 pl-5">
		<li><strong>Regular IP offense data:</strong> 7 days. IP bans are permanent unless requested for removal.</li>
		<li><strong>Banned IPs:</strong> 1 year (reviewed annually)</li>
		<li><strong>Accounts:</strong> Until deletion or 2 years of inactivity (associated pastes are retained).</li>
		<li><strong>Pastes:</strong> Until user deletion or automated cleanup</li>
		<li><strong>File Uploads:</strong> Retention varies based on file size and user type (guest/authenticated), subject to automated cleanup.</li>
		<li><strong>TOTP Secrets:</strong> Deleted immediately when 2FA is disabled</li>
	</ul>

	<h2 class="text-2xl">Your Rights</h2>
	<p>
		GDPR grants you rights to access, rectify, erase, port your data, and lodge complaints with your
		supervisory authority. Exercise via GitHub Issues. You can request account deletion through the same channel.
	</p>

	<h2 class="text-2xl">Third Parties & Transfers</h2>
	<p>No data sharing. No analytics. No international transfers. Source code is public for audit.</p>

	<h2 class="text-2xl">Security</h2>
	<p>
		TOTP secrets encrypted. IPs stored as-is (IPv4 hashing is ineffective). No system is 100%
		secure.
	</p>

	<h2 class="text-2xl">Changes</h2>
	<p>Updates posted here. Continued use constitutes acceptance.</p>
</main>
