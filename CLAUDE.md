# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file static web app: `index.html` contains all HTML, CSS, and JS for a 3D "word map" workshop tool. Users type words (or paste a sentence), they appear as floating draggable labels inside a 3D coordinate-box backdrop, can be connected with lines via double-click, and the result can be exported as a PNG screenshot. There is no build step, no package.json, and no test suite — it's meant to be dropped directly onto GitHub Pages as-is.

## Running locally

ES module imports require an HTTP origin (won't work over `file://`). Serve the directory and open it in a browser:

```bash
python3 -m http.server 8765
# then open http://localhost:8765/index.html
```

There are no lint/build/test commands — verification is manual/visual (or via a Playwright script driving a headless browser against the local server, if doing automated checks).

## Architecture

Everything lives in `index.html` in one inline `<script type="module">` IIFE. Key pieces:

- **Dual renderer setup**: a `THREE.WebGLRenderer` (`#webgl-container`) draws the 3D backdrop grid and the connection lines; a `CSS3DRenderer` (`#css3d-container`) renders word labels as real DOM elements (`CSS3DObject`) positioned in the same 3D space. Both share one `THREE.Scene` and `THREE.PerspectiveCamera` and are rendered together every frame in `animate()`. Keeping labels as DOM nodes (rather than sprites/textures) is what makes them crisp and lets native pointer events drive drag/double-click.
- **No bundler**: three.js is loaded via an `importmap` pointing `"three"` and `"three/addons/"` at unpkg ES module URLs (r0.160.0). Always import from `three/addons/jsm/...`, never the legacy `examples/js/*` UMD scripts — those are blocked/removed in modern three.js versions and will fail to load.
- **`pointer-events` layering is load-bearing**: `#css3d-container` has `pointer-events: none` so clicks pass through to the WebGL canvas underneath for camera orbiting; only `.word-label` elements opt back in with `pointer-events: auto`. `OrbitControls` is bound to `renderer.domElement` (the WebGL canvas), not the CSS3D renderer's element — binding it to the wrong element silently breaks orbit/zoom.
- **Coordinate-box backdrop** (`buildBackdrop()`): a floor + two wall grids plus a wireframe box, all built from a single `BOX_SIZE` constant and positioned so `(0,0,0)` is the corner where the floor and both walls meet — the visible space is the positive octant only (all word coordinates are positive). `boxCenter` (`BOX_SIZE/2` on each axis) is what the camera and `OrbitControls.target` orbit around. X/Y/Z text labels are CSS3DObjects placed just beyond the box's own edges, not in the center of the walls.
- **Word/connection model**: `words` is an array of `{ id, text, position (THREE.Vector3), cssObject, div }`. `connections` is an array of `{ a, b, line }` where `line` is a `THREE.Line` whose vertex positions are re-synced from `a.position`/`b.position` every frame in `updateConnections()` — this is what makes connection lines follow words as they're dragged or as the camera moves.
- **Dragging** (`onWordPointerDown`/`onDragMove`/`onDragEnd`): on pointerdown on a word, `OrbitControls` is disabled and a plane is built facing the camera through the word's current position; pointermove raycasts the mouse against that plane to get a new 3D position. This is why dragged words move smoothly across the screen-facing plane rather than along a fixed world axis.
- **Multi-word input**: the Enter handler on `#word-input` splits on whitespace, strips leading/trailing non-letter/non-number characters per token with a Unicode-aware regex, and calls `createWord()` once per surviving token — so pasting a full sentence creates one floating word per token, not one giant label.
- **Screenshot export**: `html2canvas(stage, { backgroundColor: ... })` rasterizes the shared `#stage` div (both the WebGL canvas and the CSS3D DOM overlay) into one PNG. The `WebGLRenderer` **must** keep `preserveDrawingBuffer: true` — without it, the WebGL drawing buffer is cleared before html2canvas can read it, so connection lines silently vanish from exported screenshots while word labels (DOM-based) still show up.

## Editing notes specific to this file

- `BOX_SIZE` and `boxCenter` are the single source of truth for backdrop geometry, camera/`controls.target` positioning, and `randomPosition()`'s spawn range — changing the box size means checking all three stay consistent.
- `randomPosition()` keeps a `margin` inset from `BOX_SIZE` so new words spawn visibly inside the box rather than flush against its walls.
- When testing camera orbit/zoom changes, make sure to interact with genuinely empty canvas space — a mouse position that happens to land on a word label will be intercepted by that label's `pointer-events: auto` handler instead of reaching `OrbitControls`.
