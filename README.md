# Abel

Abel is a client-only, gamified self-improvement dashboard built with React,
TypeScript, and Vite. It presents personal systems as a command-style interface
with modules for focus, habits, planning, skill progression, archetypes,
trophies, journaling, memory import, knowledge graphing, sleep, fitness, and
learning.

The app has no backend, authentication, database, or remote API integration.
Runtime state is managed in React through `src/AppContext.tsx` and persisted to
browser `localStorage`.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run ESLint:

```bash
npm run lint
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Plain CSS
- lucide-react
- ESLint

## App Flow

`src/main.tsx` mounts `<App />` into `index.html`. `src/App.tsx` wraps the UI in
`AppProvider`, keeps the active page in local React state, and switches between
the main menu and module pages.

The project does not use `react-router`. Navigation is handled by `PageId`
values from `src/types.ts`.

Main menu controls:

- Left and right arrow keys rotate the selected module.
- Enter opens the selected module.
- Double click opens a module node.
- Escape returns to the main menu from module pages.

## Modules

### Main Menu

`src/components/MainMenu.tsx` renders the orbit-style ABEL menu. The menu uses
`NAV_TABS` from `src/data.ts` to position module buttons around an elliptical
orbit and display the selected module description.

Current modules:

- Focus
- Habit
- Planner
- Skill Tree
- Archetypes
- Trophies
- Journal
- Memory
- Graph
- Sleep
- Fitness
- Learning

### Focus

`FocusPage` in `src/pages/ModuleGrid.tsx` provides timed focus sessions. Users
can choose a session type, start or pause the timer, reset it, and complete the
session. Completed sessions award XP and are shown in today's session list.

Current session types:

- 25 Min Session
- 50 Min Session
- No Phone Block
- Flow State
- Review Session

### Habit

`HabitPage` manages daily habits. Users can toggle today's completion, add
custom habits with icons, delete habits, and view best streak and done-today
counts.

### Planner

`PlannerPage` manages today's quest list. Users can add, edit, complete, and
delete tasks. Completing a task awards XP.

### Skill Tree

`src/pages/SkillTreePage.tsx` renders a tree of skills from `SKILL_NODES` in
`src/data.ts`. Completing an unlocked skill awards XP and unlocks its children.

The tree starts from `Self Mastery` and branches into:

- Focus
- Habit
- Learning
- Fitness

### Archetypes

`src/pages/ArchetypesPage.tsx` displays XP-based identity stages. Archetype
progress is derived from the persisted XP value in app state.

Configured archetypes:

- Novice
- Apprentice
- Adept
- Master
- Legend

### Trophies

`src/pages/TrophyPage.tsx` renders an interactive trophy inspection screen.
Trophy definitions live in `TROPHIES` inside `src/data.ts`, while unlock status
is derived in `computeUnlockedTrophyIds` in `src/AppContext.tsx`.

Current trophy unlock checks include total completed focus time, habit streaks,
early wake logs, and completed flow sessions.

### Journal

`src/pages/JournalPage.tsx` provides editable journal entries with search and
tag filtering. New entries award XP. Entries can be edited or deleted and are
persisted with the rest of app state.

### Memory

`src/pages/MemoryPage.tsx` imports plain text, Markdown, or JSON into memory
items. It can preview parsed entries, detect linked skills using keyword
matching, and generate suggested quests from imported material.

### Graph

`src/pages/GraphPage.tsx` visualizes relationships between skills, imported
memories, journal entries, habits, and planner quests. The graph supports node
highlighting, panning, and zooming.

### Sleep

`SleepPage` logs bedtime, wake time, duration, and sleep quality. Saved logs
award XP and contribute to trophy unlock checks.

### Fitness

`FitnessPage` tracks daily movement checklist items for mobility, strength,
walking, and stretching. New completions award XP.

### Learning

`LearningPage` tracks daily knowledge-work checklist items for lessons, notes,
active recall, practice problems, and mini projects. New completions award XP.

## State And Persistence

Global application state lives in `src/AppContext.tsx` as a reducer-backed
context. The persisted shape is defined by `AppState` in `src/types.ts`.

Persisted data includes:

- XP
- Focus sessions
- Habits
- Planner tasks
- Sleep logs
- Fitness history
- Learning history
- Journal entries
- Completed skill IDs
- Imported memories

All app state is stored under one browser `localStorage` key:

```text
abel_v2
```

Because persistence is browser-local, data does not sync across devices,
browsers, or users.

## Project Structure

```text
.
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── reference-img/
│   ├── journal.png
│   ├── main.png
│   ├── tree.png
│   └── trophy.png
├── src/
│   ├── components/
│   │   ├── MainMenu.tsx
│   │   └── PageShell.tsx
│   ├── pages/
│   │   ├── ArchetypesPage.tsx
│   │   ├── GraphPage.tsx
│   │   ├── JournalPage.tsx
│   │   ├── MemoryPage.tsx
│   │   ├── ModuleGrid.tsx
│   │   ├── SkillTreePage.tsx
│   │   └── TrophyPage.tsx
│   ├── App.tsx
│   ├── AppContext.tsx
│   ├── data.ts
│   ├── main.tsx
│   ├── storage.ts
│   └── types.ts
├── dist/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Key Files

- `src/App.tsx`: top-level page switcher and Escape-key back handling.
- `src/AppContext.tsx`: default state, reducer actions, persistence, XP logic,
  archetype derivation, streak calculation, and trophy unlock checks.
- `src/data.ts`: static navigation, skill, and trophy definitions.
- `src/types.ts`: shared TypeScript types.
- `src/storage.ts`: small JSON wrapper around `localStorage`.
- `src/pages/ModuleGrid.tsx`: Focus, Habit, Planner, Sleep, Fitness, and
  Learning modules plus shared module layout helpers.
- `src/index.css`: global theme variables, utility classes, shared button
  styles, panel styling, and animation keyframes.

## Styling

The app uses plain CSS imported beside components and pages. There are no CSS
modules, Tailwind classes, or UI component libraries. Shared visual primitives
live in `src/index.css`; page-specific layout and effects live beside the page
component.

The current visual language is a neon sci-fi interface with glass panels, grid
backgrounds, symbolic icons, compact command hints, and full-screen module
layouts.

## Reference Images

`reference-img/` contains design references for major screens:

- `main.png`
- `tree.png`
- `journal.png`
- `trophy.png`

These files are not imported by the React app.

## Built Output

`dist/` contains a generated production build. Source development should happen
in `src/`; regenerate `dist/` with:

```bash
npm run build
```

## Current Limitations

- No backend, account system, or remote sync.
- Journal entries and imported memories are local to one browser.
- Memory skill linking uses simple keyword matching, not semantic search or AI.
- The graph layout is deterministic and hand-built rather than force-directed.
- Skill completion is manually marked by the user.
- Focus timer progress is not restored after a page refresh.
- Tests are not currently configured.

## Extension Points

Good next areas to extend:

- Add import/export for the `abel_v2` state payload.
- Add tests for reducer actions, storage behavior, streaks, and trophy unlocks.
- Persist in-progress focus timers or session drafts.
- Split `ModuleGrid.tsx` as operational modules grow.
- Add richer journal and memory editing workflows.
- Replace keyword-based memory linking with embeddings or a local search index.
- Add user profiles or a backend persistence layer.
