# Abel Component System

## Purpose

This doc defines reusable visual primitives for Abel.

Use these primitives to prevent one-off styling, repeated CSS, and pages that feel unrelated.

## Core Rule

A component is worth extracting only if it improves consistency or reduces repeated visual logic.

Do not over-abstract.

## Preferred Primitives

### AbelStage

A full-screen atmospheric page wrapper.

Variants:

- portal
- graph
- atlas
- exhibition
- focus
- archive
- system
- reward

Responsibilities:

- page background
- vignette
- star/noise overlay
- atmospheric gradients
- page-safe layout bounds
- optional orbital/nebula layers
- consistent dark environment

Should not:

- own page-specific data
- force every page into the same layout
- make pages visually identical

### GlassPanel

Reusable premium panel.

Traits:

- subtle translucent background
- hairline border
- inner highlight
- soft backdrop blur
- readable text
- restrained glow
- no heavy SaaS shadow

Variants:

- default
- instrument
- museumLabel
- ghost
- elevated

### EditorialTitle

Reusable title system.

Handles:

- huge serif page titles
- eyebrow labels
- subtitles
- poetic supporting text
- responsive clamp sizing
- no clipping

Should support:

- left aligned titles
- overlay titles
- ghosted background titles
- page identity blocks

### CinematicHero

Reusable hero object system.

Variants:

- cubePortal
- crystalExhibit
- focusMonolith
- hatchEgg
- trophyArtifact
- graphCore
- orbitalSphere

Rules:

- must be large enough to carry the page
- must support non-WebGL fallback
- should accept page data through props when useful
- should not call global state directly unless there is a strong reason

### LuminousGraph

Reusable graph visualization layer.

Needs:

- custom nodes
- custom edges
- luminous curved links
- selected states
- hover states
- readable labels
- animated trails where appropriate
- semantic node color/type language

Avoid default graph-library styling.

### OrbitalNavigation

A first-class Abel visual primitive.

Used for:

- main navigation
- page identity systems
- quest atlas
- skill orbit systems
- memory/exhibition nodes
- reference-style spatial menus

Traits:

- central anchor or hero object
- orbiting nodes
- readable labels
- restrained motion
- luminous but not neon
- strong selected state
- works as navigation and composition, not decoration

Reference graph finding:

- In the default reference graph, Orbital Navigation was the highest-connected visual node.
- Treat it as a core Abel pattern, not a one-off component.

### OrbitalSystem

Reusable radial/orbital system.

For:

- quests
- atlas
- navigation
- skill orbit views
- memory browsing
- trophy/artifact browsing

Needs:

- circular nodes
- orbit lines
- central purpose/core
- selected halo
- clean labels
- responsive radius control

### MicroLabel

Small functional label component.

Traits:

- uppercase or small caps
- letter-spaced
- readable contrast
- restrained opacity
- consistent sizing

Used for:

- metadata
- status
- node labels
- panel labels
- page coordinates

### InstrumentPanel

A specialized GlassPanel for system/status information.

Used for:

- MainPage status panel
- Graph selected node details
- Focus session stats
- Exhibition memory labels
- Settings provider details

Should feel like a premium control surface, not a generic card.

## Extraction Rule

Extract a primitive when:

- the same visual pattern appears on two or more pages
- a page would be clearer with a semantic component
- the styling is central to Abel's identity
- future pages are likely to reuse it

Do not extract when:

- the component is only used once
- the abstraction makes props confusing
- it hides page-specific composition
- it makes all pages look the same

## Current Priority

Use these primitives first for:

1. MainPage / Portal
2. GraphPage / Core Graph
3. ExhibitionPage / Memory Exhibition
4. Orbital navigation systems
