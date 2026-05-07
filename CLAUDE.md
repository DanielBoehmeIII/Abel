# CLAUDE.md

## Operating Rules

- Read existing files before editing. Do not guess APIs, versions, flags, package names, or project structure.
- Preserve existing routing, state, and functionality unless explicitly asked to change them.
- Prefer reusable components over one-off CSS.
- Run build/typecheck/lint when available after meaningful code changes.
- Be direct in summaries: files changed, what improved, what remains weak.

## Abel Product Rule

Abel is a cinematic AI memory/self-improvement OS, not a SaaS dashboard.

The target is a private visual universe:

- mystical operating system
- museum of consciousness
- celestial map
- living archive
- art object OS

For UI work, optimize for:

- cinematic spatial composition
- large crystal/cube/monolith hero objects
- editorial serif typography
- restrained sans micro-labels
- premium glass panels
- luminous cyan/violet/gold accents
- readable labels
- non-WebGL fallback monuments
- reusable visual primitives

Avoid:

- generic SaaS cards
- weak empty centers
- tiny dim text
- random glow without composition
- cyberpunk overload
- default library styling
- pages that depend entirely on WebGL to look complete

## Canonical Docs

- Visual direction: `docs/ABEL_VISUAL_NORTHSTAR.md`
- Current gaps and review targets: `docs/ABEL_VISUAL_GAPS.md`
- Reusable visual primitives should be aligned with the North Star before implementation.

## Priority Pages

Do not spread effort evenly across all pages.

Anchor pages:

1. MainPage / Portal
2. GraphPage / Core Graph
3. ExhibitionPage / Memory Exhibition

Secondary:

1. FocusPage
2. EggHatchPage
3. SkillWebPage
4. ArchivePage
5. SettingsPage

## Graphify Usage

Use existing Graphify reports for orientation only:

- Code/docs graph: `graphify-out-code/GRAPH_REPORT.md`
- Default reference graph: `graphify-out-default-references/GRAPH_REPORT.md`

For codebase questions, read the code/docs graph before broad searches when it exists.

For visual reference work, read the default reference graph when it exists.

Use raw source files for exact implementation details before editing.

Do not run `/graphify`, `graphify update`, `graphify extract`, or graphify visual assets unless explicitly requested.

## Graphify Safety

Do not run `/graphify` unless explicitly requested.

Do not graphify images, screenshots, videos, `reference-img/`, or visual assets unless explicitly requested.

Use existing Graphify reports only:

- `graphify-out-code/GRAPH_REPORT.md`
- `graphify-out-default-references/GRAPH_REPORT.md`

Do not rebuild, update, or expand Graphify scope without confirmation.

For visual reference work, read `graphify-out-default-references/GRAPH_REPORT.md` if it exists. Do not re-extract images.
