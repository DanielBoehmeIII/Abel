---
name: project-mobile-sprint
description: Abel mobile sprint — weeks 1-10 implementation log, approach taken, what's done, what remains
metadata:
  type: project
---

Abel is undergoing a 40-week mobile UX sprint (started 2026-05-19).

Weeks 1-10 are complete. Implementation delivered in one session.

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

## Known remaining issues (weeks 11+):
- FEEDBACK widget (`FeedbackWidget.tsx`) still overlaps content at bottom-right on mobile — needs repositioning above bottom nav
- Settings content still slightly clipped by FEEDBACK button
- Graph legend strip on mobile could be more compact
- Quests detail panel is at the bottom of a long scroll — ideally becomes a bottom sheet (Week 23)
- Archive drawer has no close button inside the drawer itself (only backdrop tap)
- Onboarding: step labels still potentially clip at very small widths

## How to apply:
When working on any page CSS, always check for `@media (max-width: 767px)` block presence. If it's missing, the page likely has no mobile layout. The bottom nav (MobileBottomNav) only covers 5 destinations — Graph, Focus, SkillWeb, Exhibition, EggHatch, Trophies need to be reached via OrbitalNav (Esc) or by adding them to the mobile nav.
