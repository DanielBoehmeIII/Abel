---
name: project-mobile-sprint
description: Abel mobile sprint — weeks 1-20 implementation log, approach taken, what's done, what remains
metadata:
  type: project
---

Abel is undergoing a 40-week mobile UX sprint (started 2026-05-19).

Weeks 1-10 and 11-20 are complete. Delivered across two sessions.

## What was done (Weeks 1-10)

**Week 1 — Audit**: `docs/MOBILE_AUDIT.md` with full P0/P1/P2/P3 findings at 390×844, 430×932, 768×1024.

**Week 2 — Tokens**: Added to `src/index.css`:
- `--safe-top/bottom/left/right` (env safe-area-inset)
- `--touch-min: 44px`, `--mob-nav-h: 56px`, `--mob-header-h: 52px`
- Mobile spacing overrides (space-6 through space-12)

**Week 3 — Primitives**: Created:
- `src/hooks/useIsMobile.ts` — MediaQuery hook (no in-effect setState)
- `src/components/nav/MobileBottomNav.tsx` + `.css` — 5-tab bottom bar (Home, Chat, Quests, Memory, Settings)

**Week 4 — Stability**: 
- `dvh` fallback for 100vh via `@supports`
- `global-nav` hidden on mobile (`display: none` @max-width 767px)
- `global-nav-btn` raised to 44px touch target
- `global-nav` respects `--safe-bottom`
- `.page-content` gets bottom padding for nav clearance on mobile

**Weeks 5-6 — Mobile nav wired**: 
- `App.tsx`: `useIsMobile()` → renders `MobileBottomNav` on phone
- OrbitalNav still opens on Esc key (keyboard) but is secondary on mobile
- `OrbitalNav.css`: scaled to 50% on mobile via `transform: scale(0.5)`, info panel repositioned below center, hints bar stripped to essentials

**Week 7 — Archive drawer**: 
- `ArchivePage.tsx`: added `mobileSidebarOpen` state, backdrop div, "Open thread list" (◈) button in chat header, auto-closes on thread select
- `ArchivePage.css`: sidebar becomes `position: fixed; transform: translateX(-100%)` drawer that slides in on mobile, backdrop with blur, mobile-only button styles

**Week 8 — Gesture (tap-outside)**: Backdrop click closes drawer — implemented in Week 7.

**Week 9-10 — Onboarding**:
- `OnboardingFlow.css`: deepened mobile breakpoint — panel uses `100dvh`, main area `overflow-y: auto`, steps strip is `overflow-x: auto` with hidden scrollbar, inner text gets `overflow-wrap: break-word`, provider cards get tighter padding, atlas map height reduced

## Page CSS responsive fixes added:
- `MainPage.css` — hero reflows to relative position, header padding collapses, scene becomes fixed background, footer wraps
- `ArchivePage.css` — 2-col → mobile drawer
- `QuestsPage.css` — 3-col → single scrollable column
- `GraphPage.css` — sidebar collapses to horizontal legend strip, canvas takes remaining height
- `SettingsPage.css` — sidebar → horizontal scrollable tab strip, content goes full-width
- `FocusPage.css` — 2-col → single column, reduced padding
- `ExhibitionPage.css` — 3-col → stacked
- `SkillwebPage.css` — padding reduced, hero reflows

## Why:
Desktop-only layout was the root cause. Every page used fixed-pixel column widths with no mobile breakpoints. The approach was CSS-only media queries (@max-width 767px) for all pages except Archive which needed component state for the drawer.

## What was done (Weeks 11-20)

**Week 11 — Mobile keyboard behavior** (`ArchivePage.tsx`):
- `visualViewport` resize/scroll listener sets `--keyboard-h` CSS variable to push layout above virtual keyboard
- `onFocus` on chat textarea triggers `bottomRef.scrollIntoView` so last message stays visible
- `onInput` auto-grows textarea up to 180px

**Week 12 — Onboarding save/resume** (`OnboardingFlow.tsx`):
- `ONBOARDING_STEP_KEY = 'abel_onb_step_v1'` saves current step to localStorage on every advance/back
- `useState` initializer reads saved step on mount (resume after reload)
- `complete()` clears the saved step key

**Week 13 — Archive drawer**: Already complete from weeks 1-10.

**Week 14 — Chat composer polish** (`ArchivePage.css`, `ArchivePage.tsx`):
- `.archive-input-wrap` mobile: `padding-bottom: calc(var(--mob-nav-h) + var(--safe-bottom) + 10px)` clears bottom nav
- Side padding reduced to 12px on mobile
- Provider badge and summarize button hidden on mobile (too wide)
- Auto-grow textarea via `textareaRef` + `handleTextareaInput`

**Week 15 — Mobile message actions** (`ArchivePage.tsx`, `ArchivePage.css`):
- `⋯` button per message: opacity:0 on desktop (hover to show), always visible on mobile
- Actions menu: Copy (clipboard) + → Memory (creates a `document` memory from the message)
- Outside tap/click closes menu via `mousedown`/`touchstart` listener on document
- `data-msg-actions` attribute used to detect inside vs. outside clicks

**Week 16 — Chat scroll reliability** (`ArchivePage.tsx`):
- Textarea `onFocus` triggers scroll to bottom (handles keyboard-open scroll jump)
- Effect clears textarea height when input is emptied

**Week 17 — Memory mobile card stack** (`MemoryPage.tsx`, `MemoryPage.css`):
- `useIsMobile()` + `mobileView: 'list' | 'detail'` state
- `mem-sidebar--mob-hidden` / `mem-main--mob-hidden` classes switch single-panel view
- `openDetail`, `openNew`, `openEdit` → set `mobileView = 'detail'`
- `cancelEdit`, `handleArchive`, `handleDelete` → set `mobileView = 'list'`

**Week 18 — Memory filters mobile** (`MemoryPage.css`):
- Type tabs become `flex-wrap: nowrap; overflow-x: auto` horizontal scroll strip
- `scrollbar-width: none` + webkit hidden scrollbar
- `.mem-list` gets bottom padding for FAB + nav clearance

**Week 19 — Memory editor mobile** (`MemoryPage.css`):
- Detail and form: `padding-bottom: calc(var(--mob-nav-h) + var(--safe-bottom) + 24px)` keyboard-safe
- Form actions stack to full-width column
- Detail header stacks vertically on narrow screens
- Back button (`mem-back-btn`) at top of detail and form views

**Week 20 — Memory quick actions** (`MemoryPage.tsx`, `MemoryPage.css`):
- `mem-fab` FAB: `position: fixed; bottom: calc(var(--mob-nav-h) + var(--safe-bottom) + 16px); right: 20px`
- Only shown when `isMobile && mobileView === 'list'`
- Calls `openNew()` — same as sidebar "+ New" button
- Hidden on desktop via `@media (min-width: 768px) { .mem-fab { display: none; } }`

## Known remaining issues (weeks 21+):
- FEEDBACK widget (`FeedbackWidget.tsx`) still overlaps content at bottom-right on mobile — needs repositioning above bottom nav
- Settings content still slightly clipped by FEEDBACK button
- Graph legend strip on mobile could be more compact
- Quests detail panel is at the bottom of a long scroll — ideally becomes a bottom sheet (Week 23)
- Archive drawer has no close button inside the drawer itself (only backdrop tap)
- Onboarding: step labels still potentially clip at very small widths

## How to apply:
When working on any page CSS, always check for `@media (max-width: 767px)` block presence. If it's missing, the page likely has no mobile layout. The bottom nav (MobileBottomNav) only covers 5 destinations — Graph, Focus, SkillWeb, Exhibition, EggHatch, Trophies need to be reached via OrbitalNav (Esc) or by adding them to the mobile nav.
