# Host Leadforge in your own Cloudflare account

This is the **independent personal-hosting edition**. It runs in your Cloudflare account, uses your D1 database and has its own owner-password login. You do not need ChatGPT to sign in. Your existing Sites deployment is separate and is not modified by this package.

## 1. Get ready

1. Create or sign in to your account at https://dash.cloudflare.com/.
2. Install Node.js 24 LTS from https://nodejs.org/.
3. Extract this ZIP. Open the extracted `leadforge-independent` folder in VS Code.
4. Open VS Code's Terminal (PowerShell is fine on Windows).
5. Install the pinned package manager, then the application dependencies:

```powershell
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
```

Run all commands below inside the extracted project folder. Do not upload this ZIP to Cloudflare Pages as a static website: it contains backend routes and needs Workers plus D1.

## 2. Connect your Cloudflare account

```powershell
pnpm login:cloudflare
```

A browser opens. Sign in to your own Cloudflare account and approve Wrangler. Do not paste your Cloudflare password, API token or app password into ChatGPT. If you belong to more than one Cloudflare account, use the intended account when Wrangler asks.

## 3. Create your database

```powershell
pnpm exec wrangler d1 create leadforge-personal-db --update-config=false
```

Copy the database UUID printed by the command. It looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. Keep the database name as `leadforge-personal-db` unless you deliberately choose a different one.

Then run:

```powershell
pnpm configure
```

Answer its prompts:

- Worker name: press Enter for `leadforge-personal`, or choose your own lowercase name.
- D1 database name: press Enter for `leadforge-personal-db` if you used that name above.
- D1 database ID: paste the UUID printed by Cloudflare.
- Display name: Ravi, or your preferred name.
- Cloudflare Account ID: optional if you have one account; enter the 32-character Account ID from your Cloudflare dashboard if you have multiple accounts so every command uses the same account.

This saves your account's resource configuration to `wrangler.jsonc`. The database ID is configuration, not a password. No account credentials are embedded in the source.

## 4. Deploy the app

```powershell
pnpm deploy
```

The script builds the application, applies the eight database migrations to **your configured remote database**, and deploys it. Confirm the named database if Wrangler asks. If a step fails, the script stops; it does not continue with a partial build.

Wrangler prints the actual live URL, normally under `workers.dev`. Use the URL it prints; your account's subdomain is determined by Cloudflare.

The initial deployment deliberately stays locked until you configure its owner password. A `setup_required` health status before the next step is expected.

## 5. Set your private owner password

After the first deployment:

```powershell
pnpm password:set
```

Choose a unique password of **16–256 characters**, then repeat it. Input is masked. The script hashes the password locally, generates a separate random session key and passes both to Cloudflare through Wrangler's standard input. It does not print or write them into the source tree.

This command requires the Worker from step 4 to exist. It uploads secrets and updates the running Worker using your authenticated Cloudflare account. Re-run it to change your password; doing so signs out existing sessions without deleting your data.

Open the live URL and sign in with that password. No ChatGPT login, public registration or social account password is used.

## 6. Check the deployment

- Open `/login` and sign in.
- Open `/api/health`; it should return `{"status":"ready"}`.
- Create a small test career contact, reload, and confirm that it persists.
- Sign out using Account → Sign out. The workspace should redirect to `/login`, and its private API routes should reject unauthenticated access.
- Run a public-source research request and review its source outcomes. External websites may still block the crawler or return no usable information.

If login says setup is unavailable, verify the eight migrations were applied and that Cloudflare lists both `SESSION_SECRET` and `OWNER_PASSWORD_HASH` under the Worker's secret settings. Do not expose secret values in screenshots or logs.

## 7. Add your own domain (optional)

The Cloudflare-provided URL works without purchasing a domain. If you already have a domain in your Cloudflare account, open the Worker's Settings → Domains & Routes → Add → Custom Domain and follow Cloudflare's instructions. Your registrar/DNS setup and domain availability determine the remaining steps. Verify sign-in on the new HTTPS domain; cookies are host-only, so sign in again there.

## Updating later

Edit the source or have your coding assistant edit it. From the same configured folder, run `pnpm deploy` again. Existing Cloudflare secrets are kept; you do not need to reset the password for every update. Keep the same D1 configuration to retain your data. Do not edit previously applied migrations; append a new migration when the schema changes.

## Your existing data

This package contains source code and schema, **not** the database from the existing Sites app. The independent deployment starts with an empty database. Export career contacts as CSV from the current app and import them into the independent app after signing in. An exact migration of networks, saved drafts and journal history requires a separate data export/import or owner-ID migration; it is not performed automatically here.

The independent app uses the stable owner ID `owner:primary`. Changing its password keeps that ID, so saved data stays available. This is a personal deployment with one owner, not a multi-user SaaS signup system.

## Run locally first (optional)

```powershell
pnpm setup:local
pnpm dev
```

The setup command asks for a separate local test password, writes ignored `.dev.vars` secrets and initializes local D1 tables. Open the exact local URL printed by Vite. The local database and password are separate from your Cloudflare deployment.

Keep `.dev.vars`, `.env*`, `.wrangler/`, `node_modules/` and `dist/` out of Git and shared ZIPs. They are already ignored. Use a password manager for your production password.

## Useful checks

```powershell
pnpm test
python tests/migrations.py
pnpm typecheck
pnpm build
```

Python 3 is needed only for the SQLite migration test. You can use `py tests/migrations.py` on Windows if `python` is not on your PATH.

The deployment commands use the versions pinned in `package.json` and `pnpm-lock.yaml`. Cloudflare account login, remote resource creation, remote secret upload, actual deployment and custom-domain DNS require your account and have not been executed on your behalf here.

References: https://developers.cloudflare.com/d1/get-started/ · https://developers.cloudflare.com/workers/wrangler/commands/d1/ · https://developers.cloudflare.com/workers/configuration/secrets/ · https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
