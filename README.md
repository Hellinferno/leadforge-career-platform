# Leadforge — independent personal hosting

Read [START_HERE.md](./START_HERE.md) for the complete Windows-friendly setup and deployment walkthrough.

This is an independent Cloudflare Workers + D1 edition of Ravi's private career app. It includes company/public-PDF research, source-backed professional contact discovery, LinkedIn/Instagram/X archive imports, reviewed profile linking, a career contact list, opportunities, a referral pipeline, editable outreach drafts and a manual activity journal.

## Runtime

- Vinext + React, Cloudflare Vite plugin, Workers, D1, Drizzle migrations.
- Node 24+ and pnpm 11.25.0 for local tooling.
- `worker.ts` delegates to Vinext, forces HTTPS outside local development, strips obsolete identity headers and supplies the trusted request origin.
- `app/auth.ts` validates signed session cookies. Client-supplied identity headers never establish a user.
- One personal owner, stable ID `owner:primary`. No public signup or automatic import of the old hosting database.
- Salted PBKDF2-SHA256 password hashes (100,000 iterations, within the Workers Web Crypto cap), HMAC-signed seven-day sessions and credential-version invalidation on reset. Login permits ten attempts per hashed IP key per 15-minute bucket, reserved atomically in D1. Production cookies use `__Host-`, Secure, HttpOnly and SameSite=Strict. Login/logout require exact same-origin POSTs.
- `SESSION_SECRET` and `OWNER_PASSWORD_HASH` are secret bindings configured by `pnpm password:set`, never committed or sent to the browser.

## Commands

`pnpm configure` records your existing D1 UUID and Worker name. `pnpm deploy` builds, applies migrations, then deploys. `pnpm password:set` configures or rotates the password and session key after the first deployment. `pnpm setup:local` initializes local-only secrets and tables; `pnpm dev` starts local development.

## Data and feature limits

Every application query remains owner-scoped. All existing seven schema migrations are preserved, with one additive migration for login-attempt limits. Source documents and social exports are not stored as raw uploads; normalized contacts and reviewed relationship fields persist in D1.

The public crawler checks DNS, redirects, robots rules, page sizes and run budgets. It reads accessible HTML and PDF text, and does not bypass authentication or social-site restrictions. Published company inboxes and office phones are kept separate from named-person contacts. Missing social profile matches require review. Archive imports are snapshots, not live social-account sync. No guessed emails, hidden/private contact access, automatic messages or guarantee of deliverability is included.

The current hosting's contacts can be exported/imported as CSV. A full database migration of network relationships, drafts and history requires separate work and identity mapping.

## Verification

Run `pnpm test`, `python tests/migrations.py`, `pnpm typecheck` and `pnpm build`. A Cloudflare-account deployment must be verified after you run the guide's commands. A local build or package does not claim that remote resources or a new live URL have already been created.
