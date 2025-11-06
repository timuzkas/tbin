## > TBIN

a simple bin with optional abuse and auth support.

---

built using sveltekit and better-sqlite.
auth: Username + Google Authenticator TOTP
abuse blocking and purifying (isomorphic-dompurify).

### Features:
- **File Size Limit:** Pastes are limited to 1MB.
- **Rate Limiting:** Users are rate-limited to 1 paste per 10 seconds.
- **Permanent IP Bans:** IPs that repeatedly exceed the rate limit (5 offenses within 24 hours) are permanently banned.
- **XSS Sanitization:** All paste content is sanitized using `isomorphic-dompurify` to prevent XSS attacks.
- **Logging:** Important events (paste creation, rate limits, XSS attempts, bans) are logged to `log/pastebin.log`.
- **Authentication:** Optional username-based authentication using Google Authenticator TOTP.
- **Paste Expiration:**
  - Authenticated users' pastes do not expire.
  - Anonymous pastes expire based on size: < 0.5 MB after 1 month, >= 0.5 MB after 1 week.
- **Admin Purge and Ban:** An API endpoint (`/api/admin/purge-and-ban`) allows for purging all pastes of a user and permanently banning their last known IP address. This endpoint is restricted to local access only.
- **File Sharing (Experimental):**
  - Upload and share files, with optional gallery view for images.
  - Anonymous files expire after 24 hours, logged-in user files expire after 1 week.
  - Files are stored in the `uploads/` directory (which is gitignored).
- **Admin Panel (Local-only):**
  - A password-protected interface (`/admin`) to manage uploaded files, including purging all files or files by a specific user.

---
## > Configuration

- `MAX_PASTE_SIZE`: Maximum size of a paste (default: 1MB).
- `RATE_LIMIT_WINDOW_MS`: Time window for rate limiting (default: 10 seconds).
- `MAX_REQUESTS_PER_WINDOW`: Maximum requests allowed within the rate limit window (default: 1).
- `OFFENSE_EXPIRATION_MS`: Duration after which an offense expires (default: 1 day).
- `MAX_OFFENSES`: Number of offenses before an IP is permanently banned (default: 5).
- `LOGIN_ENABLED`: Set to `false` to hide the login UI on the frontend.
- `RATE_LIMIT_ENABLED`: Set to `false` to disable all rate limiting and banning.
- `SHOW_CREDITS`: Set to `TRUE` to display the "made by timuzkas" credit on the frontend.
- `FILE_SHARING_ENABLED`: Set to `TRUE` to enable the experimental file sharing feature.
- `ADMIN_PASSWORD`: Set this to the **SHA-256 hash** of your admin password combined with the `ADMIN_PASSWORD_SALT`.
- `ADMIN_PASSWORD_SALT`: A **random, secret string** used to salt the admin password hash. This prevents rainbow table attacks. You can generate a random string using `openssl rand -hex 32`.

---
## > Development server

Once you've cloned the project and installed dependencies with `bun install` (or `npm install` or `pnpm install`),
start a development server:

```bash
# with bun
bun run dev

# To disable login and rate limiting during development:
LOGIN_ENABLED=false RATE_LIMIT_ENABLED=false bun run dev

# To enable file sharing during development:
FILE_SHARING_ENABLED=TRUE bun run dev

# To access the admin panel during development:
# 1. Generate a random salt: openssl rand -hex 32
# 2. Choose your admin password (e.g., 'mysecretpassword')
# 3. Calculate the hash: echo -n "mysecretpassword<your_salt>" | sha256sum
# 4. Set the environment variables:
ADMIN_PASSWORD_SALT=your_salt ADMIN_PASSWORD=your_calculated_hash bun run dev

# or start the server and open the app in a new browser tab
bun run dev --open
```

---
## > Building

To build your app for production:

```bash
bun run build
```

You can preview the production build with `bun run preview`.

---
## > Running the cron job

To delete expired pastes, run the following command:

```bash
node cron/delete-expired-pastes.js
```

You can schedule this script to run periodically using your operating system's cron scheduler.
