# Deployment

Abel is a static Vite app. The current beta target is Vercel static hosting, but
the build output can be hosted anywhere that serves `dist/`.

## Vercel

Project settings:

- Framework preset: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

Optional environment variables:

```env
VITE_ABEL_APP_ENV=production
VITE_ABEL_RELEASE=$VERCEL_GIT_COMMIT_SHA
VITE_ABEL_BETA_ENABLED=true
VITE_ABEL_INVITE_CODES=code-one,code-two
VITE_ABEL_ANALYTICS_ENABLED=false
VITE_ABEL_FEEDBACK_ENABLED=true
VITE_ABEL_HEALTH_VERSION=1
```

`VITE_ABEL_INVITE_CODES` is bundled into the client. It is suitable only for a
controlled beta gate, not for high-security authentication.

## Health Check

Static health check:

```text
/health.json
```

Expected response includes:

```json
{ "status": "ok", "app": "abel" }
```

## Release Verification

Run before deploy:

```bash
npm install
npm run build
npm run smoke
```

`npm run lint` is still blocked by pre-existing lint debt outside the beta
readiness changes. Do not treat that as a deployment blocker until those files
are cleaned or excluded.

## Rollback

Because Abel is static and local-first, rollback is a hosting concern. Redeploy
the previous Vercel deployment if a release breaks app loading. User data remains
in each browser's IndexedDB unless the user clears it.
