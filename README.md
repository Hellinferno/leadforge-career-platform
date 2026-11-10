# Leadforge — AI-Powered Career Platform, ATS Resume Builder & Referral Hub

Leadforge is an independent, high-performance career acceleration platform built on **Cloudflare Workers, D1 SQLite, Vinext (Next.js on Vite), and React 19**.

Repository: [https://github.com/Hellinferno/leadforge-career-platform](https://github.com/Hellinferno/leadforge-career-platform)

---

## Key Features

1. **Multi-User SaaS Architecture & Isolated Workspaces**:
   - Secure multi-user authentication with salt-hashed PBKDF2 (100,000 iterations) and HMAC-signed session cookies.
   - Built-in public registration (`/login?tab=register`) with per-user `userId` database isolation in Cloudflare D1 SQLite.
   - Backward-compatible single-owner fallback mode for local development.

2. **Interactive ATS Resume Builder**:
   - Live paper preview with multiple ATS-optimized styling templates (Modern, Classic, Minimal, Technical).
   - ATS Keyword & Fit Analyzer comparing resume bullets against target job descriptions.
   - Export to PDF (`@media print`) and JSON import/export.

3. **Career Profile with 1-Click Resume Sync**:
   - Select any built ATS resume to automatically autofill target role, education, technical skills, project evidence, and portfolio links.
   - File dropzone supporting `.pdf`, `.json`, `.txt`, and `.md` with automated entity extraction using `unpdf`.

4. **Live Job Board Scraper & Referral Matcher**:
   - Crawls public tech company job boards (Greenhouse, Lever) for active internships and full-time roles.
   - Cross-references listings with your network to flag employees who can refer you.

5. **Network Tools & Contact Discovery**:
   - Import connections from LinkedIn CSV, Instagram JSON exports, and X archives.
   - Web crawler for published company inboxes and team directories with DNS/SSRF protection and strict robots.txt adherence.
   - Contextual outreach draft generator for connection notes, referral requests, and follow-ups.

---

## Runtime & Stack

- **Framework**: Vinext + React 19, Cloudflare Vite plugin, Cloudflare Workers, Cloudflare D1 SQLite, Drizzle ORM.
- **Node**: Node 24+ and pnpm for local tooling.
- **Authentication**: Salted PBKDF2-SHA256 password hashing (100,000 iterations), HMAC-signed 7-day session cookies, and credential-version invalidation on reset.

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup local database & secrets
pnpm setup:local
pnpm db:local

# Run tests
pnpm test
python tests/migrations.py

# Run local preview server
pnpm build
pnpm preview
```

Open `http://127.0.0.1:4173/` in your browser.
