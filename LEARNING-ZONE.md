# Crazy Learning Zone

Private study space for Grace: https://alethia.cc/crazy-learning-zone . No portfolio navigation link.

## Hosting and deployment

The actual hosting provider is **Cloudflare Pages**, project `display-website`, connected to `m-preinsberger/display-website`, production branch `main`. A Git push triggers Cloudflare's GitHub integration; there is no GitHub Actions workflow. The old `netlify.toml` is not used by this deployment.

Cloudflare's existing build command is `npm run build`, repository root, output `dist`. The root build installs frontend dependencies, builds Vue, creates a self-contained `_worker.js`, and copies the output to root `dist`. `_routes.json` sends only `/api/learning/*` to the Worker; the portfolio remains static. No Node compatibility flag is needed.

## One-time Cloudflare configuration

In Workers & Pages → display-website → Settings → Production:

1. Create a D1 database named `grace-learning`, preferably with EU jurisdiction, and bind it as **LEARNING_DB**. The Worker creates its tables automatically. Do not bind production storage to preview deployments or the separate `private-planner` project.
2. Add two encrypted secrets: **LEARNING_PASSWORD_HASH** and **LEARNING_SESSION_SECRET**. Generate them using `node alethia-web/scripts/learning-secrets.mjs` (hidden terminal prompt), or run `node alethia-web/scripts/login-setup-server.mjs` and open http://127.0.0.1:4178/ . The browser helper runs entirely locally and does not transmit the chosen password. Copy the generated settings into Cloudflare's Import .env form, mark both Secret, and save. Neither secret belongs in Git or chat.
3. Push the completed code to `main` to deploy. Changes to secrets/bindings also require a new deployment. No missing configuration allows private data access.
4. Smoke-test login, create/edit a set, reload, practice, logout, and anonymous data denial. The API endpoints are `/api/learning/auth` and `/api/learning/data`.

Only share the private password and direct learning URL with Grace. A password manager is recommended. To reset access, generate both settings again and redeploy; changing the session secret invalidates all outstanding sessions.

## Design and features

Warm ivory and sage, German copy, responsive layout, and no competitive streaks. Sets are organized by training year. The MVP includes an editor, tab-separated import, search, flashcards, typed practice, reversed direction, randomized sessions, spaced reviews, progress and JSON backup/restore. The library starts empty so Grace can use course-approved terminology.

Alternative answers use `|`. Answers ignore case and whitespace, preserve spelling and accents, and allow self-correction. Successful reviews advance through 1, 3, 7, 14, 30 and 60 days. Misses reset to 10 minutes. Three consecutive successes count as “mindestens 3× gewusst”, not medical competence. Future scope: subject notes, source attachments, exam preparation and a calendar.

## Mobile use and examples

Phone layouts use 48px touch controls, 16px inputs to avoid focus zoom, stacked card editing, safe-area padding and sticky review controls. Written practice does not open the keyboard automatically. Small-phone (320px), phone (390px), tablet (768px) and desktop layouts are checked with disposable local data. An internet connection is still required for synchronization; failed saves remain available for retry.

Each card can include a 500-character optional example term or sentence. Examples are shown only after revealing/checking an answer in either practice mode. They are included in backups and can be imported as an optional third tab-separated column. Existing cards and two-column imports remain supported. Editing an example alone preserves review progress.

## Security and persistence

The login shell is public; all learning data requires a server-verified session. Passwords use salted PBKDF2-SHA256 with 100,000 iterations (Web Crypto compatible). Use a unique password of at least 14 characters. Cookies are Secure, HttpOnly, host-only and SameSite=Strict, and expire after 12 hours. Mutations require a matching Origin. Login attempts are counted atomically in D1 and limited to ten per IP per minute. Stored IP identifiers are hashed with the session secret and time window; expired counters are deleted. Logout clears the cookie; global session revocation requires signing-secret rotation.

D1 holds the workspace and review progress. Primary-session reads and conditional revision writes prevent stale reads and silent overwrites between devices. Conflicts preserve the local unsaved state for backup before reloading. No private data is placed in localStorage. Backups contain private learning data. Each learner has an isolated workspace, with no public sign-up or patient-record workflow.

## Checks

- `node --test alethia-web/tests/learning.test.mjs`: crypto, authentication, rate limiting, validation, persistence and concurrent updates using real SQLite statements. Node 22+ required.
- `npm --prefix alethia-web run build`: TypeScript, production frontend and Cloudflare Worker packaging.
- Plain Vite previews the UI but cannot authenticate without the Worker; there is no login bypass.

References: [Cloudflare Pages advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/), [D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases), [Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/).


## Managed accounts

Login now uses a username and password. Grace uses `grace` and her existing password; her existing workspace remains under the same ID. The first API request creates her account from LEARNING_PASSWORD_HASH without overwriting existing accounts. Old shared-password sessions require login again.

To enable administration, run `node alethia-web/scripts/learning-secrets.mjs --admin` locally, choose a separate password, and add its output as the encrypted Cloudflare secret **LEARNING_ADMIN_PASSWORD_HASH**. Keep the existing LEARNING_PASSWORD_HASH and LEARNING_SESSION_SECRET. Redeploy, then sign in at `/crazy-learning-zone` as `admin`. This opens account management directly, also on mobile. No email or registration service is needed.

Admin can create learners, change usernames/display names, reset passwords, and disable/re-enable accounts. Passwords cannot be retrieved. Names personalize greetings, the brand initial, and the page title. Each new learner starts with an empty collection. Disabling keeps all learning data. Every learner edit revokes that learner's existing sessions. Admin cannot access learner data through the data API. To reset the admin password, replace the admin hash and rotate LEARNING_SESSION_SECRET to revoke outstanding sessions, then redeploy. Grace's password is managed in the panel after migration; changing the original seed secret does not reset an existing account.

The additional `/api/learning/users` endpoint requires admin authentication. Account sessions carry signed user IDs and versions and are checked against account status on every request. Workspace writes also check the browser's account ID to prevent unsaved work being written to a different account after another tab signs in.
