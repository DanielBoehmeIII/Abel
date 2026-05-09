# Neural Atlas — Organized Code Export

This ZIP contains a cleaned, runnable Vite/React version of the Base44 Neural Atlas code you pasted.

## What is included

- `src/pages/Atlas.jsx` — main Atlas page.
- `src/components/atlas/SkillTreeCanvas.jsx` — measured SVG canvas with pan/zoom, starfield, spine, decorative filaments, and data-defined nodes/edges.
- `src/components/atlas/TreeWires.jsx` — dynamic SVG wires, root hairs, flow particles, and wire stars.
- `src/components/atlas/SkillNode.jsx` — circular celestial node rendering, rim lights, inner specks, labels, and selection ring.
- `src/components/atlas/Sidebar.jsx` — left nav.
- `src/components/atlas/HudOverlay.jsx` — right-side drift and quote cards.
- `src/components/atlas/NodeDetailPanel.jsx` — selected node detail panel.
- `raw/Pasted text.txt` — the original pasted code, preserved untouched for reference.

I intentionally removed the Base44 auth/router boilerplate from the runnable version so the visual Atlas can run standalone.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Notes

The tree data currently lives in `src/components/atlas/SkillTreeCanvas.jsx` as `RAW_NODES` and `EDGES`. That is the main place to edit the tree structure.
