# Environment Variables

Abel works locally without environment variables. All Vite-exposed variables must
use the `VITE_` prefix because they are bundled into the client.

## Supported Variables

```env
# deployment identity
VITE_ABEL_APP_ENV=development          # development | preview | production
VITE_ABEL_RELEASE=local                # commit SHA or release label

# controlled beta gate
VITE_ABEL_BETA_ENABLED=false           # true | false
VITE_ABEL_INVITE_CODES=                # comma-separated invite codes

# local hooks
VITE_ABEL_ANALYTICS_ENABLED=false      # true | false
VITE_ABEL_FEEDBACK_ENABLED=true        # true | false

# static health metadata
VITE_ABEL_HEALTH_VERSION=1
```

## Validation Rules

- Boolean variables must be exactly `true` or `false`.
- `VITE_ABEL_APP_ENV` must be `development`, `preview`, or `production`.
- In production, `VITE_ABEL_BETA_ENABLED=true` requires
  `VITE_ABEL_INVITE_CODES`.

## Security Notes

All `VITE_` values are visible to users in the built JavaScript. Do not put
private provider API keys in these variables for production. Add a server proxy
before using real paid AI providers.

## Local Setup

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run smoke
```
