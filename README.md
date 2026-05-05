# Abel

Abel is a gamified self-improvement dashboard built with React, TypeScript, and Vite. The app presents personal growth systems as a futuristic command interface: a central orbit menu opens modules for focus, habits, planning, skill progression, archetypes, trophies, journaling, sleep, fitness, and learning.

The project is currently a client-only prototype. All state is either static fixture data in `src/data.ts` or browser `localStorage` state managed through `src/storage.ts`. There is no backend, authentication layer, database, or API integration.

## What The App Does

The main screen is a controller-style orbit menu branded as `ABEL`. Users can move through modules with the keyboard or mouse:

- Left and right arrow keys rotate the selected menu module.
- Enter opens the selected module.
- A double click on a module node also opens it.
- Escape returns from a module page to the main menu.

The visual style is a neon sci-fi interface with glass panels, grid backgrounds, compact command hints, symbolic icons, and full-screen module layouts.

## Main Features

### Orbit Main Menu

`src/components/MainMenu.tsx` renders the app's landing experience. It uses `NAV_TABS` from `src/data.ts` to place ten module buttons around an elliptical orbit. The selected tab drives the central info panel, and keyboard listeners handle selection and confirmation.

Available modules:

- Focus
- Habit
- Planner
- Skill Tree
- Archetypes
- Trophies
- Journal
- Sleep
- Fitness
- Learning

### Skill Tree

`src/pages/SkillTreePage.tsx` renders a node-based skill matrix. The tree starts at `Self Mastery` and branches into Focus, Habit, Learning, and Fitness. Each branch has child skills with task lists, XP values, descriptions, icons, and a state:

- `completed`
- `unlocked`
- `locked`

Unlocked nodes can be marked complete. Completed node IDs are saved in `localStorage` under:

```text
abel_skills_completed
```

The skill tree data lives in `SKILL_NODES` inside `src/data.ts`.

### Focus Module

`FocusPage` in `src/pages/ModuleGrid.tsx` provides a focus-session interface with selectable session tiles, a timer, progress bar, start/pause/reset controls, and a small static list of today's sessions.

Current focus tile options include:

- 25 Min Session
- 50 Min Session
- No Phone Block
- Flow State
- Review Session

Timer state is kept in React state only. It is not persisted.

### Habit Module

`HabitPage` in `src/pages/ModuleGrid.tsx` displays a daily ritual checklist and a static 12-day streak summary. Toggle state is persisted in `localStorage` under:

```text
abel_habits
```

Current habits include water, morning routine, note review, sleep before midnight, and cleanup.

### Planner Module

`PlannerPage` in `src/pages/ModuleGrid.tsx` manages today's quest list. Users can toggle tasks complete and add new tasks through an input field. Planner state is persisted in `localStorage` under:

```text
abel_planner
```

The default tasks are defined in the `DEFAULT_TASKS` constant.

### Sleep Module

`SleepPage` in `src/pages/ModuleGrid.tsx` presents a simple recovery log with bedtime, wake time, and quality controls. The form uses time inputs and a range slider. Saved sleep state is persisted under:

```text
abel_sleep
```

### Fitness Module

`FitnessPage` in `src/pages/ModuleGrid.tsx` provides a small movement checklist for mobility, strength, walking, and stretching. Toggle state is persisted under:

```text
abel_fitness
```

### Learning Module

`LearningPage` in `src/pages/ModuleGrid.tsx` provides a knowledge checklist for lessons, notes, active recall, practice problems, and mini projects. Toggle state is persisted under:

```text
abel_learning
```

### Archetypes

`src/pages/ArchetypesPage.tsx` shows identity progression stages based on XP thresholds. The current hardcoded profile is `Apprentice` at `12,450 XP`, with progress toward `Adept`.

Configured archetypes:

- Novice
- Apprentice
- Adept
- Master
- Legend

This page is currently static. XP and the current archetype are hardcoded in the component.

### Trophies

`src/pages/TrophyPage.tsx` renders an animated trophy inspection screen. Users can select from a list of trophies, including locked and unlocked achievements. The central trophy uses a CSS-styled cube with animated symbols driven by `requestAnimationFrame`.

Trophy definitions live in `TROPHIES` inside `src/data.ts`.

### Journal

`src/pages/JournalPage.tsx` presents a file-browser-style journal UI. It includes a profile panel, a list of static journal folders/files, and an inline preview for file entries that include preview data.

Journal definitions live in `JOURNAL_ENTRIES` inside `src/data.ts`. The current page is a static prototype and does not read from the filesystem.

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
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components/
│   │   ├── MainMenu.css
│   │   ├── MainMenu.tsx
│   │   ├── PageShell.css
│   │   └── PageShell.tsx
│   ├── pages/
│   │   ├── ArchetypesPage.css
│   │   ├── ArchetypesPage.tsx
│   │   ├── JournalPage.css
│   │   ├── JournalPage.tsx
│   │   ├── ModuleGrid.css
│   │   ├── ModuleGrid.tsx
│   │   ├── SkillTreePage.css
│   │   ├── SkillTreePage.tsx
│   │   ├── TrophyPage.css
│   │   └── TrophyPage.tsx
│   ├── App.css
│   ├── App.tsx
│   ├── data.ts
│   ├── index.css
│   ├── main.tsx
│   ├── storage.ts
│   └── types.ts
├── dist/
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Key Files

### `src/main.tsx`

React entry point. It mounts `<App />` into the `#root` element from `index.html` and wraps the app in `StrictMode`.

### `src/App.tsx`

Top-level router-like component. It tracks the current `PageId`, opens selected pages, returns to the menu, and installs the global Escape-key back behavior.

This project does not use `react-router`. Page selection is handled with local React state.

### `src/data.ts`

Static application data:

- `NAV_TABS`: menu definitions and orbit positions
- `SKILL_NODES`: skill tree node definitions
- `TROPHIES`: trophy definitions
- `JOURNAL_ENTRIES`: fake journal directory/file entries

### `src/types.ts`

Shared TypeScript types for page IDs, nav tabs, skill nodes, trophies, and journal entries.

### `src/storage.ts`

Tiny wrapper around browser `localStorage`:

- `get<T>(key, fallback)` parses stored JSON and returns a fallback if the value is missing or invalid.
- `set<T>(key, value)` stringifies and stores a value.

### `src/index.css`

Global styles, theme variables, utility classes, typography, scrollbar styling, glass panels, neon text helpers, shared button styles, controller-key hints, and animation keyframes.

### `src/pages/ModuleGrid.tsx`

Contains the smaller operational modules in one file:

- `FocusPage`
- `HabitPage`
- `PlannerPage`
- `SleepPage`
- `FitnessPage`
- `LearningPage`

It also defines shared module layout helpers such as `ModuleShell` and `TileGrid`.

## Data And State

Most content is static. Persistent state uses `localStorage` so browser refreshes keep selected checklist/task progress.

Current persistent keys:

```text
abel_skills_completed
abel_habits
abel_planner
abel_sleep
abel_fitness
abel_learning
```

Because persistence is local to the browser, data does not sync across devices or users.

## Styling Approach

The app uses plain CSS files imported by each component/page. There is no CSS module setup, no Tailwind, and no component library. Shared design tokens and utilities are centralized in `src/index.css`.

Important global style primitives:

- CSS variables for colors and panel styling
- `.glass` and `.glass2` panel treatments
- `.grid-bg` background grid
- `.neon-purple`, `.neon-cyan`, `.neon-blue`, `.neon-green`
- `.btn`
- `.ctrl-hints`, `.ctrl-hint`, `.ctrl-key`
- Shared animation keyframes such as `fadeIn`, `pulse-glow`, `float`, and `spin-slow`

Page-specific layout and visual behavior live beside the matching page component.

## Reference Images

The `reference-img/` directory contains design references for major screens:

- `main.png`
- `tree.png`
- `journal.png`
- `trophy.png`

These files are not imported by the React app. They are useful as visual references for future UI work.

## Built Output

The `dist/` directory contains a production build generated by Vite. Source development should happen in `src/`; `dist/` can be regenerated with:

```bash
npm run build
```

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

## Dependencies

Runtime dependencies:

- React
- React DOM
- lucide-react

Development dependencies:

- Vite
- TypeScript
- ESLint
- typescript-eslint
- React Hooks ESLint plugin
- React Refresh ESLint plugin
- Vite React plugin

`lucide-react` is installed but the current UI primarily uses text symbols for icons.

## Current Limitations

- No backend or remote persistence.
- No authentication or user profiles beyond static UI labels.
- Journal entries are static fixture data, not real files.
- Trophy and archetype progress is mostly static.
- Skill unlock rules are not enforced dynamically; node states come from fixture data plus locally completed IDs.
- Focus session history is static and timer progress is not stored.
- Tests are not currently configured.

## Extension Points

Good next places to extend the app:

- Move static XP/profile values into persisted app state.
- Add real unlock rules for skill tree progression.
- Persist focus session history.
- Turn journal fixture data into editable entries.
- Add import/export for local progress.
- Split `ModuleGrid.tsx` into separate page files as the modules grow.
- Replace symbolic icons with the installed `lucide-react` icon set if a more conventional UI language is desired.
- Add tests for storage behavior, checklist state, planner updates, and skill completion.

