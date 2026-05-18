# Environment Variables

Abel is a client-side Vite app. All data is stored locally in IndexedDB (Dexie).
No backend or environment variables are required for local development.

## Current Variables

None required. Run `npm run dev` and Abel works out of the box.

## Future Variables (for backend / AI integration)

These will be needed when real AI providers and server-side sync are added.
Prefix all Vite client-side variables with `VITE_` so they are bundled into the build.

```env
# AI provider keys (client-side — use a proxy in production to keep these secret)
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...

# Backend API (future — when Abel gets a server)
VITE_API_URL=https://api.abel.app

# Feature flags
VITE_ENABLE_VECTOR_SEARCH=false
VITE_ENABLE_CLOUD_SYNC=false

# Analytics (optional)
VITE_POSTHOG_KEY=phc_...
```

## Local Setup

```bash
cp docs/ENV.md .env.local   # not needed yet; here for reference
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Database

Abel uses IndexedDB via Dexie. On first load it seeds demo data automatically.
To reset: open Settings → Data & Privacy → Reset to Demo Data.

Schema is defined in `src/db/schema.ts`.
Services are in `src/db/services/`.
