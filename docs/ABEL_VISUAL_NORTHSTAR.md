# Abel Visual North Star

## Core Vision

Abel is not a normal productivity app.

Abel is an AI memory and self-improvement OS presented as a mystical, cinematic, spatial interface.

It should feel like:

- a living archive
- a museum of consciousness
- a celestial map
- a premium operating system
- an art object
- a personal mythology engine
- a private universe that remembers the user

The visual goal is not "SaaS dashboard with dark mode."

The visual goal is "cinematic digital ritual."

Every screen should feel like a room in one coherent world.

## Visual Language

Abel should use:

- cinematic dark environments
- large glass/crystal/cube/monolith hero objects
- editorial serif typography
- restrained sans-serif micro-labels
- luminous cyan/violet/gold accents
- soft bloom
- volumetric atmosphere
- glass panels
- celestial/orbital graphs
- museum-style labels
- sparse but intentional interaction surfaces

The interface should feel spatial, symbolic, and premium.

## Material Language

Preferred materials:

- smoked glass
- obsidian black
- polished crystal
- translucent violet glass
- faint gold linework
- cyan system light
- soft fog / atmosphere
- dust / star particles
- subtle bloom
- hairline borders

Avoid:

- flat decorative SVGs pretending to be monuments
- loud neon cyberpunk
- generic app cards
- plastic-looking gradients
- random glow without structure

## Typography

Use:

- large elegant serif display titles
- small spaced sans-serif labels
- readable body text
- deliberate hierarchy
- restrained poetic copy

Avoid:

- tiny dim labels
- oversized text that clips
- too many competing type scales
- decorative type that harms readability

## Color

Main palette:

- deep charcoal / black
- cool gray
- violet
- cyan
- occasional gold

Use gold for:

- memory
- exhibition
- artifact
- reward
- ceremony

Use cyan/violet for:

- system
- graph
- focus
- portal
- navigation

Do not turn everything neon.

## Layout / Composition

Every major page should have:

1. one dominant focal object or field
2. one clear editorial title/text area
3. one supporting information area
4. restrained secondary controls
5. strong negative space

Do not fill the screen randomly.

A page should read as a cinematic scene before it reads as a collection of components.

## Hero Objects

Hero objects must be:

- large enough to carry the page
- luminous
- dimensional
- integrated with the scene
- visually meaningful to the page
- supported by non-WebGL fallback rendering

A tiny SVG is not enough.

Preferred hero forms:

- cube / tesseract / portal
- crystal / obelisk / monument
- orbital sphere
- luminous graph core
- egg / cocoon / artifact
- monolith / focus pillar

## Page Fantasies

### MainPage / Portal

Fantasy:

- entering Abel
- private universe
- living system gateway

Needs:

- visible central cube/portal/monument
- strong left editorial identity
- restrained nav
- right status/environment panel
- cinematic depth
- WebGL fallback

Failure state:

- text floating over a dark blurry background

### GraphPage / Core Graph

Fantasy:

- intelligence field
- living knowledge network
- luminous constellation of meaning

Needs:

- professional graph layout
- readable node cards/orbs
- curved luminous edges
- selected node detail panel
- graph interactions that feel meaningful
- central selected node or strong graph core

Failure state:

- scattered small dots on a dark background

### ExhibitionPage / Memory Exhibition

Fantasy:

- museum of consciousness
- curated memory artifact room
- ceremonial archive

Needs:

- huge editorial title on left
- no clipped text
- central crystal monument
- orbiting memory nodes
- gold/celestial linework
- right featured-memory label/card
- strong atmospheric depth

Failure state:

- tiny crystal in empty space
- clipped title
- generic side panels

### FocusPage

Fantasy:

- augmented mind chamber
- focus cockpit
- cognitive instrument

Needs:

- central focus object
- timer/session controls integrated into the scene
- support widgets around the core
- calm but powerful hierarchy

Failure state:

- plain form/session setup page

### EggHatchPage

Fantasy:

- reward ritual
- cocoon becoming artifact
- transformation chamber

Needs:

- dramatic egg/cocoon monument
- clear active egg state
- hatching light/energy
- meaningful reward anticipation

Failure state:

- tiny egg in empty space

### ArchivePage

Fantasy:

- editorial chamber
- living memory archive
- reflective transcript space

Needs:

- readable prose
- subtle chamber object
- markdown rendered or stripped
- input as threshold, not generic chat box

Failure state:

- raw markdown syntax
- chat bubbles
- invisible chamber

### SettingsPage

Fantasy:

- system altar
- quiet configuration room
- Abel control surface

Needs:

- readable controls
- subtle atmospheric structure
- connection to the same visual universe

Failure state:

- unfinished settings form

## Reusable Visual Primitives

### AbelStage

Full-screen atmospheric page wrapper.

Supports variants:

- portal
- graph
- atlas
- exhibition
- focus
- archive
- system

Handles:

- dark background
- vignette
- star/noise overlay
- soft top light
- atmospheric gradients
- page-safe layout bounds

### GlassPanel

Reusable premium panel.

Traits:

- subtle translucent background
- hairline border
- inner highlight
- soft backdrop blur
- readable text
- no heavy SaaS shadows

### EditorialTitle

Reusable title system.

Handles:

- huge serif page titles
- eyebrow labels
- subtitles
- poetic supporting text
- no clipping at current browser sizes

### CinematicHero

Reusable central visual object.

Variants:

- cubePortal
- crystalExhibit
- focusMonolith
- hatchEgg
- trophyArtifact
- graphCore

Must include a non-WebGL CSS/SVG fallback.

### LuminousGraph

Reusable graph layer.

Needs:

- luminous curved links
- semantic node cards/orbs
- selected states
- hover states
- readable labels
- animated trails where appropriate

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

### OrbitalSystem

Reusable radial/orbital system.

For:

- quests
- atlas
- navigation
- skill orbit views
- memory browsing

Needs:

- circular nodes
- orbit lines
- central purpose/core
- selected halo
- clean labels
- keyboard/navigation hints if useful

## Anchor Page Requirements

Do not spread effort evenly across every page.

First rebuild the three anchor pages to define the visual language:

1. MainPage / Portal
2. GraphPage / Knowledge Graph / Core Graph
3. ExhibitionPage / Memory Exhibition

Secondary pages:

1. FocusPage
2. EggHatchPage
3. SkillWebPage
4. ArchivePage
5. SettingsPage

## Anti-Patterns

Avoid:

- generic SaaS cards
- cyberpunk overload
- flat SVG logos pretending to be hero objects
- tiny unreadable labels
- pages that feel empty because the central object is weak
- over-dense dashboards
- default library styling
- random glow without composition
- more panels as a substitute for better composition
- WebGL-only pages with no fallback visual identity

## Legal / Ethical Rule

Do not copy proprietary website code, images, logos, or assets.

It is allowed to reverse-engineer composition:

- layout ratios
- focal hierarchy
- spacing
- panel density
- visual rhythm
- typography scale
- interaction patterns

Use original implementation and permissively licensed assets when needed.

## Final Standard

Abel should not feel like "an app."

It should feel like opening a private universe that remembers you.
