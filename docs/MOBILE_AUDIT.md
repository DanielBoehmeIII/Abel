# Abel Mobile Audit — Week 1

Audit date: 2026-05-19  
Viewports tested: 390×844, 430×932, 768×1024  
Pages audited: Home, Archive, Quests, Memory, Graph, Settings, Focus, Exhibition, SkillWeb, EggHatch, Onboarding, OrbitalNav

---

## Summary

Abel has zero mobile-specific layout work. Every page uses a fixed-column desktop grid that collapses catastrophically below ~700px. Navigation is inaccessible on mobile (orbital container is hard-coded at 700×700px). Core flows — onboarding, chat, quest management — are unusable on a phone.

768px (tablet) mostly holds the desktop design correctly. Phone widths (390–430px) are the crisis tier.

---

## Severity Legend

- **P0 — Catastrophic**: Core flow broken, page unusable
- **P1 — Broken**: Page reachable but key actions unavailable
- **P2 — Degraded**: Usable with effort, bad UX
- **P3 — Cosmetic**: Minor visual issues

---

## P0 — Catastrophic (fix immediately)

### 1. OrbitalNav — primary navigation unreachable on mobile
**File**: `src/components/nav/OrbitalNav.css`  
**Root cause**: `.orbital-container { width: 700px; height: 700px }`, `.orbital-svg { width: 680px; height: 680px }`. At 390px viewport the container overflows right by 310px. Nav nodes on the right half of the orbit (QUESTS, FOCUS, GRAPH, EXHIBITION) are entirely off-screen and untappable. The `.orbital-info { right: -296px }` panel is completely invisible. The bottom hints bar clips to ~40% of its intended width.  
**Impact**: Users on phones cannot navigate to most pages.

### 2. Archive/Chat — 2-column grid unusable at phone width
**File**: `src/pages/ArchivePage.css`  
**Root cause**: `.archive-page { grid-template-columns: 210px 1fr }`. At 390px the sidebar leaves only ~180px for the chat area. Message text, thread titles, and the composer all clip or overlap. Chat is the primary daily-use page.

### 3. Main/Home — hero overflows, nav strip clips
**File**: `src/pages/MainPage.css`  
**Root cause**: `.main-header { padding: 26px 52px }` (104px total horizontal padding = 27% of 390px viewport). `.main-hero { left: 56px; max-width: 430px }` overflows the viewport. The `.main-nav-strip` items (CHAT, MEMORY, GRAPH, SETTINGS) overflow right and several are tappable but unreadable. Status cards (absolutely positioned) overlay the hero text at narrow widths.

---

## P1 — Broken

### 4. QuestsPage — 3-column grid at phone width
**File**: `src/pages/QuestsPage.css`  
**Root cause**: `.quests-page { grid-template-columns: 280px 1fr 310px }`. Minimum width needed is ~600px+. At 390px the three columns crush each other into 130px each. Quest detail panel (right column) is unreadable. All three columns partly clip off-screen.

### 5. GraphPage — legend sidebar eats half the viewport
**File**: `src/pages/GraphPage.css`  
**Root cause**: `.gp-page { grid-template-columns: 216px 1fr }`. At 390px the legend sidebar takes 55% of the viewport, leaving ~174px for the actual graph canvas — too narrow to interact with nodes.

### 6. SettingsPage — 2-column sidebar squishes forms
**File**: `src/pages/SettingsPage.css`  
**Root cause**: 2-column layout. At 390px the section nav sidebar leaves ~210px for content. Form fields (API key inputs, email) are unreadably narrow. Radio button option labels clip on the right.

### 7. SkillwebPage — canvas unusable, eyebrow clips
**File**: `src/pages/SkillwebPage.css`  
**Root cause**: `.sw-hero { padding: 26px 48px }` (96px total horizontal padding = 25% of 390px). The 2-column split shows an empty canvas left and "CONNEC..." clipped on right.

### 8. FocusPage — right detail panel clips
**File**: `src/pages/FocusPage.css`  
**Root cause**: 2-column layout. Left control panel occupies ~55% of viewport; right "LINK QUEST" and "RECENT SESSIONS" panel clips off-screen.

### 9. ExhibitionPage — both columns too narrow to read
**File**: `src/pages/ExhibitionPage.css`  
**Root cause**: 2-column layout. Featured exhibit panel on right shows only ~40% of content width.

---

## P2 — Degraded

### 10. OnboardingFlow — paragraph text clips, tab strip overflows
**File**: `src/components/onboarding/OnboardingFlow.css`  
**Note**: A `max-width: 760px` breakpoint already exists and converts the panel to single-column. However, paragraph text still clips horizontally due to missing `overflow-wrap` on inner elements. The horizontal tab strip allows overflow-x scroll but the last tab ("Memory") is clipped without obvious affordance.

### 11. Global NAV button — too small, wrong position for mobile
**File**: `src/index.css`  
**Root cause**: `.global-nav-btn { width: 38px; height: 38px }` — below the 44px iOS touch target minimum. Bottom-right position conflicts with the iOS Safari tab bar and the FEEDBACK widget. Both overlap at phone width.

### 12. MemoryPage — functional but dense; filter chips tight
**File**: `src/pages/MemoryPage.css`  
At 390px the filter chip row wraps correctly and the memory list is readable. Main issue: the FEEDBACK button overlays the bottom of the last visible item, obscuring content.

### 13. Typography — micro-labels too small on mobile
**File**: `src/index.css`  
`.eyebrow { font-size: 0.65rem }` = ~10px on mobile. `.label { font-size: 0.72rem }` = ~11.5px. Both below a readable threshold for mobile screens.

---

## P3 — Cosmetic

### 14. FEEDBACK widget — overlaps content and NAV button
**File**: `src/components/system/FeedbackWidget.tsx`  
Fixed bottom-right position conflicts with the global-nav button on all pages. On mobile this creates a two-element pileup at ~bottom-right: 32px.

### 15. Empty state large gaps — Memory and SkillWeb
On mobile, the empty state area on Memory page below the filter chips is very tall (roughly half the viewport is unused dead space). Minor.

---

## Non-Issues (passes on mobile)

- **EggHatch**: Single-column layout, centered hero crystal, readable text. Works well at all tested widths.
- **MemoryPage list**: Core memory list + search renders functionally at 390px.
- **768px (tablet)**: Most pages render close to the desktop design. Archive 2-col works at tablet width. Only minor density issues.

---

## Root Cause Pattern

All broken pages share the same structural problem: fixed-pixel column widths in CSS Grid with no responsive breakpoints. The app was built desktop-first and never tested below ~900px. There are no `@media (max-width: …)` rules in any page CSS file except OnboardingFlow (partial), and no mobile-specific tokens in `src/index.css`.

---

## Priority Fix Order

| Week | Target | Impact |
|------|--------|--------|
| 2 | CSS mobile tokens, safe-area, overflow prevention | Foundation |
| 3 | MobileBottomNav + useIsMobile hook | Navigation |
| 4 | Global 100vh/dvh fix, 44px touch targets, hide global-nav mobile | Stability |
| 5 | Wire MobileBottomNav into App.tsx, OrbitalNav mobile scale | Navigation |
| 6 | Bottom nav polish, active states, safe-area inset | Polish |
| 7 | Archive sidebar → mobile drawer (most critical page) | Core flow |
| 8 | Tap-outside-to-close for Archive drawer | Gesture |
| 9 | Onboarding overflow fix, tab strip, paragraph text | First run |
| 10 | Provider card mobile polish, API key input safety | First run |
| 11+ | Quests, Graph, Settings, Focus, Exhibition responsive layouts | All pages |
