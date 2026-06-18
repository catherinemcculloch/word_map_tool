# Backdrop cleanup — Workshop Word-Map Tool

## Context
The coordinate-system backdrop was just added, but the user wants it cleaned up and re-grounded: drop the redundant center axis lines and numeric tick labels, relabel the box's own edges as X/Y/Z, make the box noticeably bigger (larger than a 13" laptop screen), reposition the geometry so the origin `(0,0,0)` is the actual corner where the floor and two walls meet (currently the origin is the box's *center*, with the visible corner sitting off at `(-axisExtent, -axisExtent, -axisExtent)`), and start with a completely empty scene (no seeded "idea" word). Putting the origin at the corner means the visible coordinate space is the positive octant only — all x/y/z values in the box are ≥ 0.

## Changes (all in the `buildBackdrop` IIFE and nearby code in `index.html`)
1. **Reposition geometry to the positive octant**: replace the current symmetric `[-axisExtent, axisExtent]` placement with `[0, boxSize]` placement, where `boxSize = 1040` (double the old full edge length of 520·2=1040... i.e. same "twice as large" sizing as before, just relocated):
   - Floor (XZ plane) moves from `y = -axisExtent` to `y = 0`, and its grid/panel center shifts to `(boxSize/2, 0, boxSize/2)` so it spans `x:[0,boxSize], z:[0,boxSize]`
   - Back wall (XY plane) moves from `z = -axisExtent` to `z = 0`, center shifts to `(boxSize/2, boxSize/2, 0)`, spanning `x:[0,boxSize], y:[0,boxSize]`
   - Left wall (YZ plane) moves from `x = -axisExtent` to `x = 0`, center shifts to `(0, boxSize/2, boxSize/2)`, spanning `y:[0,boxSize], z:[0,boxSize]`
   - Box-edge wireframe ([index.html:241-242](index.html#L241-L242)): build from a `BoxGeometry(boxSize, boxSize, boxSize)` positioned at `(boxSize/2, boxSize/2, boxSize/2)` instead of centered at the origin
2. **Reposition the camera to match**: the camera/`OrbitControls` currently orbit around `(0,0,0)` (old box center). Since the box center moves to `(boxSize/2, boxSize/2, boxSize/2)`, set `controls.target` to that point and shift the camera's initial position by the same offset (old camera was `(0,0,600)` relative to target `(0,0,0)`; new camera position is `target + (0,0,600)`) so the initial framing looks the same as today, just anchored to the new corner-origin box.
3. **Remove center axis lines**: delete the `axisLine()` helper and its three `backdrop.add(axisLine(...))` calls ([index.html:244-252](index.html#L244-L252)) — no more floating lines through the origin.
4. **Remove numeric tick labels**: delete the `[-200, -100, 100, 200].forEach(...)` block ([index.html:263-267](index.html#L263-L267)) entirely. Keep the `addLabel` helper since it's still used for the X/Y/Z letters.
5. **Relabel box edges as X/Y/Z** ([index.html:268-270](index.html#L268-L270)), positioned just beyond the far end of the box's own edges (matching the matplotlib reference's corner-of-a-box look), now in positive-octant coordinates:
   - `Z` near the top of the vertical edge where the back wall and left wall meet (`x=0, z=0`, just above `y=boxSize`)
   - `X` beyond the far end of the bottom edge of the left wall (`x=0, y=0`, just beyond `z=boxSize`)
   - `Y` beyond the far end of the bottom edge of the back wall (`z=0, y=0`, just beyond `x=boxSize`)
6. **Spawn words inside the positive-octant box**: rewrite `randomPosition()` ([index.html:283-289](index.html#L283-L289)) to return random coordinates within `[margin, boxSize - margin]` for x, y, and z (e.g. `margin ≈ 60`) instead of the old symmetric `±` range — so words land inside the visible box instead of around the old centered origin.
7. **Remove the seeded starting word**: delete `createWord('idea', new THREE.Vector3(0, 0, 0));` ([index.html:345](index.html#L345)) so the scene starts with just the backdrop and no words. (Note: `(0,0,0)` is now the box's corner, not its center, so this position would no longer make sense as a "centered" seed anyway.)

## Files
- `index.html` — all changes are localized to the `buildBackdrop` IIFE, the camera/`controls.target` setup just above it, `randomPosition()`, and the seed-word call at the bottom of the script

## Verification
- Reload the page: confirm no "idea" word appears on load, only the empty grid backdrop, framed the same way it is today (just re-anchored)
- Confirm the box visibly extends beyond the viewport on a normal laptop-sized window
- Confirm only three small letters (X, Y, Z) appear at the box edges, no floating center lines, no numeric tick labels
- Type a few words and confirm they all spawn inside the visible box (positive coordinates), spread across a good portion of it
- Re-run the existing Playwright smoke checks (orbit, zoom, drag, connect, multi-word input, screenshot download) to confirm no regressions

---

# Fix orbit/zoom and support multi-word input — Workshop Word-Map Tool

## Context
The workshop tool (`index.html`) was previously built and verified, but the user found two issues while using it:
1. Dragging empty space doesn't orbit the camera, and scrolling doesn't zoom.
2. The text input only accepts a single word at a time; the user wants to paste/type a word cluster or full sentence and have it parsed into separate floating words.

## Fix 1: Orbit/zoom not working
Root cause (confirmed by reading the current code): `OrbitControls` is bound to `cssRenderer.domElement` ([index.html:167](index.html#L167)). That element lives inside `#css3d-container`, which has `pointer-events: none` in CSS ([index.html:32-34](index.html#L32-L34)) so that only `.word-label` children (explicitly `pointer-events: auto`) capture clicks, letting clicks on empty space fall through to the WebGL canvas below. Because `pointer-events: none` is inherited, the CSS3D renderer's own root element never receives pointerdown/wheel events at all, so `OrbitControls` — listening on that element — never sees the drag or scroll gestures.

**Fix**: construct `OrbitControls` against `renderer.domElement` (the WebGL canvas, which has no `pointer-events: none`) instead of `cssRenderer.domElement`. Clicks on a word label will still be intercepted first (labels are above in z-order and have `pointer-events: auto`, plus `onWordPointerDown` already calls `stopPropagation`), so word-dragging continues to take priority over orbiting.

## Fix 2: Multi-word / sentence input
Currently the Enter handler ([index.html:306-314](index.html#L306-L314)) takes the whole input value as one word. Change it to split the input text into individual word tokens (split on whitespace, strip surrounding punctuation per token, filter empty results) and call the existing `createWord(text, randomPosition())` once per token — so typing "blue sky thinking" or a full sentence creates one floating word node per word, each independently placed via the existing `randomPosition()` helper (no new clustering logic needed).

## Files
- `index.html` — both fixes are localized: the `OrbitControls` constructor call and the Enter-key handler

## Verification
- Reload the page, confirm dragging on empty space now orbits the camera and scroll wheel zooms in/out, while dragging directly on a word still moves just that word (not the camera)
- Type a multi-word phrase or sentence into the input and press Enter; confirm each word appears as its own separate floating label (not one label containing the whole sentence)
- Re-run the existing Playwright-based smoke check (drag word, orbit, zoom, connect two words, download screenshot) to confirm no regressions

---

# (Original) Workshop Word-Map Tool — single-file 3D word board

## Context
The user wants a standalone workshop tool: a single HTML file deployable to GitHub Pages (no build step, no server) where participants type words that float in a 3D scene, drag them around, double-click two words to draw a connecting line between them, and export a screenshot of the resulting word map. The repo (`word_map_tool`) is currently empty, so this is a greenfield build.

## Approach
Single `index.html` file using **Three.js** (loaded via CDN, no bundler) for the 3D scene, with **CSS3DRenderer** to render word labels as real DOM elements positioned in 3D space (crisp text, easy hit-testing for drag/double-click via native DOM events). Connection lines are drawn in a separate WebGL layer (`THREE.Line`) that tracks the 3D positions of the connected word objects every frame. `OrbitControls` (also from the Three.js examples CDN) provides camera orbit/zoom/pan, distinguished from word-dragging by checking whether the mouse-down target is a word label vs. empty canvas.

Screenshots: since the visible result is a composite of a WebGL `<canvas>` (lines) and an HTML/CSS3D overlay (words), use **html2canvas** (CDN) to rasterize the whole container div into one image for download — this avoids losing the text labels that a plain `canvas.toDataURL()` would miss.

## Structure of index.html
- `<head>`: title, minimal CSS (full-viewport canvas container, styled `.word-label` divs, fixed-position input bar, download button)
- CDN script tags: `three.module.js` (or three.min.js UMD build), `CSS3DRenderer.js`, `OrbitControls.js`, `html2canvas.min.js`
- `<body>`:
  - Fixed top/bottom bar: text `<input>` + "Add word" affordance (Enter to submit)
  - A "Download Screenshot" button
  - Two stacked full-screen containers: one holding the WebGL renderer's canvas (for lines), one holding the CSS3DRenderer's DOM output (for word labels) — same camera, same render loop, so they stay perfectly aligned
- `<script type="module">` (or plain script) containing:
  1. **Scene setup**: `THREE.Scene`, `PerspectiveCamera`, `WebGLRenderer` (transparent background) for lines, `CSS3DRenderer` for labels, `OrbitControls` bound to the camera
  2. **Word model**: array of `{ id, text, position: THREE.Vector3, cssObject (CSS3DObject wrapping a div) }`
  3. **Add word**: on Enter in the input, create a new word at a random position near the camera's focus point, create its `CSS3DObject`, add to scene + word list
  4. **Drag word**: pointerdown on a `.word-label` div starts a drag mode that disables `OrbitControls` for that gesture; pointermove projects mouse to a plane facing the camera (or uses raycasting against an invisible plane) to update the word's `THREE.Vector3`; pointerup ends drag and re-enables OrbitControls
  5. **Connect words**: dblclick on a `.word-label` selects it as "pending connection source" (visual highlight); dblclick on a second, different word creates a `THREE.Line` (or `Line2` for thicker lines) between the two words' positions, stored in a `connections` array as `{ a: wordId, b: wordId, line: THREE.Line }`
  6. **Render loop**: `requestAnimationFrame` — update each connection line's vertex positions from its two words' current `position`, render both the WebGL scene and the CSS3D scene
  7. **Screenshot/export**: button click runs `html2canvas` on the shared parent container, then triggers a download via a temporary `<a>` with the resulting data URL (`download="word-map.png"`)

## Files
- `index.html` — everything (markup, styles, script) in one file, per the user's deployment requirement

## Verification
- Open `index.html` directly in a browser (no server needed, or use a quick `python3 -m http.server` for CDN/module loading if `file://` CORS issues arise)
- Manually test: type several words and confirm they appear floating in 3D; drag a word and confirm it moves and stays moved; orbit/zoom/pan the camera on empty space; double-click two different words and confirm a line is drawn and follows both endpoints when either word is dragged or the camera moves; click "Download Screenshot" and confirm a PNG downloads showing both the words and the connecting lines
- Confirm the page works when served as a GitHub Pages static site (just push `index.html` to the repo root or `/docs`, no build artifacts needed)
