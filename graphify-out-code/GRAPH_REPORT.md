# Graph Report - .  (2026-05-07)

## Corpus Check
- Corpus is ~24,936 words - fits in a single context window. You may not need a graph.

## Summary
- 289 nodes · 467 edges · 34 communities (17 shown, 17 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 4,000 input · 2,520 output

## Community Hubs (Navigation)
- [[_COMMUNITY_LLM & Data Layer|LLM & Data Layer]]
- [[_COMMUNITY_Page Components Hub|Page Components Hub]]
- [[_COMMUNITY_Progression Engine|Progression Engine]]
- [[_COMMUNITY_Design Direction & Gaps|Design Direction & Gaps]]
- [[_COMMUNITY_3D Visual Engine|3D Visual Engine]]
- [[_COMMUNITY_Graph Visualization|Graph Visualization]]
- [[_COMMUNITY_App Infrastructure|App Infrastructure]]
- [[_COMMUNITY_Focus & Glass UI|Focus & Glass UI]]
- [[_COMMUNITY_Exhibition Components|Exhibition Components]]
- [[_COMMUNITY_Icon System|Icon System]]
- [[_COMMUNITY_Visual Identity Assets|Visual Identity Assets]]
- [[_COMMUNITY_Brand Color System|Brand Color System]]
- [[_COMMUNITY_Orbital Navigation|Orbital Navigation]]
- [[_COMMUNITY_Glass Panel Component|Glass Panel Component]]
- [[_COMMUNITY_Orbital System|Orbital System]]
- [[_COMMUNITY_Stage Component|Stage Component]]
- [[_COMMUNITY_Octahedron 3D Scene|Octahedron 3D Scene]]
- [[_COMMUNITY_Artifact 3D Scene|Artifact 3D Scene]]
- [[_COMMUNITY_Atmosphere Background|Atmosphere Background]]
- [[_COMMUNITY_Editorial Typography|Editorial Typography]]
- [[_COMMUNITY_React Framework|React Framework]]
- [[_COMMUNITY_Vite Build Tool|Vite Build Tool]]
- [[_COMMUNITY_Operating Rules|Operating Rules]]
- [[_COMMUNITY_Graphify Rules|Graphify Rules]]
- [[_COMMUNITY_Abel App Root|Abel App Root]]
- [[_COMMUNITY_Habit Module|Habit Module]]
- [[_COMMUNITY_Planner Module|Planner Module]]
- [[_COMMUNITY_Journal Module|Journal Module]]
- [[_COMMUNITY_Sleep Module|Sleep Module]]
- [[_COMMUNITY_Fitness Module|Fitness Module]]
- [[_COMMUNITY_Learning Module|Learning Module]]
- [[_COMMUNITY_Module Grid Page|Module Grid Page]]

## God Nodes (most connected - your core abstractions)
1. `useAbel()` - 21 edges
2. `PageId` - 14 edges
3. `Abel Visual North Star` - 9 edges
4. `Abel Visual Gaps` - 9 edges
5. `iso()` - 7 edges
6. `completeQuest()` - 7 edges
7. `increaseSkillMastery()` - 7 edges
8. `abelReducer()` - 7 edges
9. `Quest` - 6 edges
10. `MemoryItem` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Core Vision (Cinematic AI OS)` --semantically_similar_to--> `Abel Product Rule`  [INFERRED] [semantically similar]
  docs/ABEL_VISUAL_NORTHSTAR.md → CLAUDE.md
- `Anchor Page Requirements` --semantically_similar_to--> `Priority Pages`  [INFERRED] [semantically similar]
  docs/ABEL_VISUAL_NORTHSTAR.md → CLAUDE.md
- `Reusable Visual Primitives` --semantically_similar_to--> `index.css Global Theme`  [INFERRED] [semantically similar]
  docs/ABEL_VISUAL_NORTHSTAR.md → README.md
- `Isometric Rounded Monolith / Slab Shape` --rationale_for--> `Abel Visual North Star Document`  [INFERRED]
  src/assets/hero.png → docs/ABEL_VISUAL_NORTHSTAR.md
- `Glass / Crystal Panel Aesthetic` --rationale_for--> `Abel Visual North Star Document`  [INFERRED]
  src/assets/hero.png → docs/ABEL_VISUAL_NORTHSTAR.md

## Hyperedges (group relationships)
- **Abel Visual Identity System** — northstar_visual_direction, claudemd_abel_product_rule, gaps_visual_gaps [INFERRED 0.95]
- **State and Persistence Stack** — readme_appcontext, readme_storagets, readme_localstorage, readme_typests [INFERRED 0.95]
- **Anchor Pages Gap-to-Requirement Pipeline** — claudemd_priority_pages, northstar_anchor_requirements, gaps_mainpage, gaps_graphpage, gaps_exhibitionpage [INFERRED 0.85]

## Communities (34 total, 17 thin omitted)

### Community 0 - "LLM & Data Layer"
Cohesion: 0.06
Nodes (43): getMockAbelResponse(), LLM_PROVIDERS, LLMProviderConfig, mockGenerateQuests(), SEED_ACTIVITY, SEED_ARCHETYPE, SEED_ARCHIVE_THREADS, SEED_EGGS (+35 more)

### Community 1 - "Page Components Hub"
Cohesion: 0.07
Nodes (27): EGG_COLORS, EggHatchPage(), Props, MainPage(), Props, Props, QuestsPage(), TYPE_ICONS (+19 more)

### Community 2 - "Progression Engine"
Cohesion: 0.23
Nodes (21): addGraphNodeFromQuest(), completeQuest(), createEggIfMilestoneReached(), createMemoryFromFocusSession(), eggTypeForSkill(), hatchEgg(), increaseSkillMastery(), iso() (+13 more)

### Community 3 - "Design Direction & Gaps"
Cohesion: 0.11
Nodes (23): Abel Product Rule, Priority Pages, ArchivePage Gap: Editorial Chamber Style, EggHatchPage Gap: Dramatic Egg Object, ExhibitionPage Gap: Crystal Centerpiece, FocusPage Gap: Augmented-Mind Dashboard, Global UI Problems, GraphPage Gap: Intelligence Field (+15 more)

### Community 4 - "3D Visual Engine"
Cohesion: 0.1
Nodes (7): CAMERA_MAP, EBState, FALLBACK_MAP, HeroVariant, Props, SCENE_MAP, WebGLErrorBoundary

### Community 5 - "Graph Visualization"
Cohesion: 0.11
Nodes (12): EDGE_TYPES, InnerProps, NODE_COLORS, NODE_TYPES, Props, FILTER_TYPES, GraphPage(), NODE_COLORS (+4 more)

### Community 6 - "App Infrastructure"
Cohesion: 0.16
Nodes (14): Google Fonts (Cormorant Garamond, Inter, JetBrains Mono), index.html Root Entry, Typography System (Serif + Sans Micro-Labels), AppContext (State & Persistence), App.tsx Entry Point, ArchetypesPage Module, data.ts Static Definitions, localStorage abel_v2 Key (+6 more)

### Community 7 - "Focus & Glass UI"
Cohesion: 0.17
Nodes (9): glowClass, Props, radClass, DURATIONS, FocusPage(), MODES, Props, SOUNDS (+1 more)

### Community 8 - "Exhibition Components"
Cohesion: 0.2
Nodes (6): Props, ExhibitionPage(), Props, SUBTYPE_COLORS, SUBTYPE_ICONS, MemorySubtype

### Community 9 - "Icon System"
Cohesion: 0.44
Nodes (9): Dark Fill Color (#08060d), Violet Accent Color (#aa3bff), Bluesky Social Icon, Discord Icon, Documentation Icon, GitHub Icon, Social / User Profile Icon, icons.svg SVG Icon Sprite (+1 more)

### Community 10 - "Visual Identity Assets"
Cohesion: 0.43
Nodes (7): Abel Visual North Star Document, Glass / Crystal Panel Aesthetic, Layered Two-Slab Isometric Composition, Isometric Rounded Monolith / Slab Shape, Hero Image Asset, Violet / Purple Luminous Accent, MainPage Component

### Community 11 - "Brand Color System"
Cohesion: 0.38
Nodes (7): Abel Application, Cyan Accent Color (#47bfff), Lavender/Light Purple Highlight Color (#ede6ff), Purple/Violet Brand Color (#863bff / #7e14ff), Gaussian Blur Glow / Light Ray Effect, Lightning Bolt / Z-shape Icon Path, Abel App Favicon SVG

### Community 12 - "Orbital Navigation"
Cohesion: 0.33
Nodes (3): NAV_NODES, NavNode, Props

### Community 13 - "Glass Panel Component"
Cohesion: 0.4
Nodes (3): GlowColor, PanelVariant, Props

### Community 14 - "Orbital System"
Cohesion: 0.4
Nodes (3): OrbitalNode, Props, RING_RADII

## Knowledge Gaps
- **102 isolated node(s):** `QuestStatus`, `GraphEdgeType`, `EggState`, `MemorySource`, `ActivityType` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAbel()` connect `Page Components Hub` to `Exhibition Components`, `LLM & Data Layer`, `Graph Visualization`, `Focus & Glass UI`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `PageId` connect `Page Components Hub` to `LLM & Data Layer`, `Graph Visualization`, `Focus & Glass UI`, `Exhibition Components`, `Orbital Navigation`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `QuestStatus`, `GraphEdgeType`, `EggState` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LLM & Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Page Components Hub` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Design Direction & Gaps` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `3D Visual Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._