# Abel Graphify Notes

## Existing Graphs

### Code / Docs Graph

Path:

- `graphify-out-code/GRAPH_REPORT.md`
- `graphify-out-code/graph.json`
- `graphify-out-code/graph.html`

Purpose:

- Repo navigation
- Code/docs architecture
- Relationship tracing
- Avoiding broad file searches

Known useful findings:

- `useAbel()` is the main god node and cross-page state bridge.
- `PageId` is a major routing/page identity connector.
- `ABEL_VISUAL_NORTHSTAR.md` and `CLAUDE.md` duplicate some intent.
- Visual docs are connected to implementation concepts.
- This graph should be used for orientation only. Raw files still need to be read before edits.

### Default Reference Image Graph

Path:

- `graphify-out-default-references/GRAPH_REPORT.md`
- `graphify-out-default-references/graph.json`
- `graphify-out-default-references/graph.html`

Scope:

- Only `reference-img/new/default/`
- 11 images:
  - `archive.png`
  - `egg-hatch.png`
  - `exhibition.png`
  - `focus.png`
  - `knowledge-graph.png`
  - `main.png`
  - `nav.png`
  - `quests.png`
  - `settings.png`
  - `skillweb.png`
  - `trophy.png`

Known useful findings:

- Orbital Navigation is the strongest repeated visual primitive across the default references.
- Each reference image is mostly a self-contained visual system.
- The references emphasize page-specific hero scenes rather than generic reusable panels.
- Orbital systems, central hero objects, and page-specific spatial composition should drive the next redesign pass.

## Safety Rules

Do not run `/graphify` unless explicitly requested.

Do not graphify images, screenshots, videos, `reference-img/`, or visual assets unless explicitly requested.

Do not rebuild the reference graph unless explicitly requested.

Use existing reports first.
