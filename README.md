# Abel

Abel is a local-first personal operating system built with React, TypeScript,
Vite, Dexie, and IndexedDB. It combines memory capture, chat, graph/atlas views,
background sync jobs, onboarding, privacy controls, and beta admin basics.

## Local Setup

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. No environment variables are required
for local development.

## Production Setup

```bash
npm install
npm run build
npm run preview
```

For Vercel, use:

- Build command: `npm run build`
- Output directory: `dist`
- Health check: `/health.json`

Deployment details live in `docs/DEPLOYMENT.md`.

## Required Env Vars

None are required for local development.

Optional beta variables:

```env
VITE_ABEL_APP_ENV=production
VITE_ABEL_RELEASE=local
VITE_ABEL_BETA_ENABLED=false
VITE_ABEL_INVITE_CODES=
VITE_ABEL_ANALYTICS_ENABLED=false
VITE_ABEL_FEEDBACK_ENABLED=true
VITE_ABEL_HEALTH_VERSION=1
```

If `VITE_ABEL_BETA_ENABLED=true` in production, `VITE_ABEL_INVITE_CODES` must be
set to a comma-separated list. This is a client-side controlled-beta gate, not a
replacement for server authentication.

## Database Setup

Abel uses IndexedDB via Dexie. The demo user is seeded on first load with:

```text
DEMO_USER_ID = demo
```

Schema and migrations:

- `src/db/schema.ts`
- `src/db/db.ts`
- `src/db/seed.ts`
- `docs/DATABASE.md`

The current Dexie migration chain creates the core tables, adds sync job indexes,
then adds audit logs and memory visibility.

## Test Commands

```bash
npm run build   # TypeScript and production bundle
npm run smoke   # Static smoke test against dist/
npm test        # Alias for smoke
npm run verify  # Build + smoke
npm run lint    # Repository lint; currently has known legacy failures
```

## Health Check

The static health check is served from:

```text
/health.json
```

Expected fields include `status: "ok"` and `app: "abel"`.

## Beta Features

- First-run onboarding
- Optional invite gate
- Global error boundary and global error capture
- Local analytics event queue when enabled
- Local feedback capture
- User data export/delete
- Memory visibility: private, project-only, system
- Audit log for sensitive actions
- Admin dashboard with counts and redacted errors
- Local sync jobs and worker runner

## Backup And Export

Before destructive beta testing, use:

```text
Settings -> Data & Privacy -> Export My Data
```

Exports are browser-local JSON snapshots. Abel does not currently sync backups
to cloud storage.

## Known Limitations

- No server authentication; beta invite codes are bundled client-side.
- No cloud sync; data is local to the browser profile.
- Analytics and feedback are local capture hooks unless a future backend is
  connected.
- Admin views are local beta diagnostics, not multi-tenant production admin.
- Lint has pre-existing failures in legacy/reference files.
- Real AI provider keys should not be shipped directly to the browser; use a
  server proxy before enabling paid providers in production.
