# Database And Migrations

Abel is local-first. Browser data lives in IndexedDB through Dexie, with a small
React/localStorage shell for app state.

## Schema Location

- Types: `src/db/schema.ts`
- Dexie versions: `src/db/db.ts`
- First-run seed: `src/db/seed.ts`
- Services and authorization checks: `src/db/services/`

## Migration Rules

1. Add new record fields to `src/db/schema.ts`.
2. Add a new `this.version(n).stores(...)` block in `src/db/db.ts`.
3. Preserve all existing table indexes unless intentionally changing them.
4. Use `.upgrade(...)` for default values on existing local records.
5. Keep user isolation in services, not only UI components.
6. Run `npm run build` and `npm run smoke`.

## Current Versions

- `1`: initial AbelDB tables.
- `2`: added `updatedAt` index for sync jobs.
- `3`: added `auditLogs` and memory `visibility`.

## Demo User

The local beta uses `DEMO_USER_ID = "demo"` in `src/db/services/userService.ts`.
On first load, `seedDatabaseFromState()` creates the demo user and seed data if
no demo user exists.

To reset from the app, use Settings -> Data & Privacy -> Reset to Demo Data.
For destructive beta testing, use Settings -> Data & Privacy -> Delete My Data.

## Backup And Export

Use Settings -> Data & Privacy -> Export My Data before destructive testing.
The export includes user-owned IndexedDB tables and audit records for that user.
Admin views intentionally show counts and redacted errors only, not private
memory or chat content.
