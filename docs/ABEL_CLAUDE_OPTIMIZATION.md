# Abel Claude Optimization Notes

## Goal

Keep Claude useful, focused, and cheap enough to use repeatedly.

## Key Principles

### 1. Fewer better skills

Do not install large marketplace skill packs.

Use a small curated set of Abel-specific skills:

- `abel-visual-redesign`
- `abel-screenshot-audit`
- `abel-doc-maintenance`

Add more only when a repeated workflow clearly appears.

### 2. Point, do not dump

Do not place long art direction or workflow instructions in `CLAUDE.md`.

Use:

- `CLAUDE.md` for short always-loaded rules
- `docs/ABEL_VISUAL_NORTHSTAR.md` for visual canon
- `docs/ABEL_VISUAL_GAPS.md` for current problems
- `docs/ABEL_COMPONENT_SYSTEM.md` for reusable primitives
- `.claude/skills/*/SKILL.md` for repeatable workflows
- Graphify reports for existing graph knowledge

### 3. Skills are SOPs

A skill should include:

- a specific YAML description
- a short process
- references to docs
- clear output format
- clear avoid list

A skill should not contain the entire project bible.

### 4. Use Graphify carefully

Graphify is useful for existing code/docs and existing default reference graph reports.

Do not run Graphify extraction unless explicitly requested.

Never graphify images through Claude Code unless the user explicitly accepts the token cost.

### 5. Branch sessions by task

Prefer focused Claude sessions:

- MainPage redesign
- GraphPage redesign
- ExhibitionPage redesign
- screenshot audit
- component refactor
- doc cleanup

Avoid one giant rolling thread for everything.

### 6. Keep summaries structured

After implementation, Claude should summarize:

- changed files
- visual improvements
- validation run
- remaining gaps
- manual review targets

## Current Abel Workflow

1. Use existing Graphify reports for orientation.
2. Use docs for design canon.
3. Use skills for repeatable workflows.
4. Read raw files before editing.
5. Preserve functionality.
6. Run validation.
7. Update docs only when the project direction actually changes.
