# Rebuild as a flat 2D word-cloud board — Workshop Word-Map Tool

## Context
User testing showed the true-3D Three.js scene (orbit/zoom camera, drag-on-a-camera-facing-plane) is too complicated for the tool's general-population audience. The user wants a full rework, captured in `changes7_20_26.md`, that replaces the 3D interaction model with a simple flat 2D drag-and-drop board (styled with a perspective-floor backdrop for visual depth only, no real 3D math), backed by a fixed/preset word bank instead of free-text entry, with a welcome overlay, a redesigned right-hand directions sidebar, a reset control, duplicate-prevention, and an updated screenshot action that also opens a pre-filled email draft. This is effectively a rewrite of `index.html`; nothing else in the repo changes.

## Clarified decisions (from user)
1. **Remove Three.js/CSS3D/OrbitControls entirely.** Rebuild the board as plain HTML/CSS with SVG for connector lines. No WebGL, no camera, no 3D drag-plane raycasting.
2. **Visual style**: keep a stylized "floor grid receding into the distance" backdrop — a flat CSS-drawn perspective floor (gradient/converging lines), evoking the old coordinate-box aesthetic — sitting behind the flat 2D word board.
3. **Word bank**: fixed placeholder list of sample words (clearly marked as a single array constant near the top of the script for the user to swap later), rendered as a vertical column on the left. Words drag from the bank onto the board.
4. **Duplicates**: handled two ways — (a) the placeholder source array itself contains no duplicate entries, and (b) once a word is dragged from the bank onto the board it is removed from the bank (visually and from the draggable pool), so it can only be placed once. Reset returns all placed words back to the bank in their original order.
5. **Input box removed.** No free-text word entry anymore.
6. **Directions sidebar**: moves to the right side of the screen, in a simple bordered box, containing the item-9 directions text verbatim, plus an added line clarifying: "You can double click on each word to create a line between them. This line represents the sentence you are making."
7. **Reset button**: sits directly under the directions box on the right side. Clears the board (removes all placed words and all connections) and repopulates the left-hand bank with the full original word list.
8. **Welcome overlay**: full-screen overlay shown on load with a purpose message drafted from the item-9 directions text, and an "Enter" button that dismisses it (adds a `hidden`/removed state, doesn't reappear until page reload).
9. **Double-click-to-connect** behavior is preserved, adapted to 2D: double-click one placed word, then double-click a second, draws an SVG line between their board positions; positions update live as either word is dragged.
10. **Screenshot button**: still captures the board via `html2canvas` and triggers the PNG download (as today), and additionally opens a `mailto:` link with a placeholder recipient address (clearly marked as a `TO_DO` constant), a pre-filled subject/body reminding the user to attach the just-downloaded PNG. True automatic email-with-attachment isn't possible from a static page without a backend/service, so this is the documented stand-in.

## Implementation plan (all in `index.html`)

### Structure
- Delete the Three.js `<script type="importmap">` and the `three`/`CSS3DRenderer`/`OrbitControls` imports/usage entirely. Keep `html2canvas` (still needed for the screenshot).
- Replace `#stage` / `#webgl-container` / `#css3d-container` with a simpler layout:
  - `#welcome-overlay` — full-screen overlay, purpose text + "Enter" button (top z-index, removed/hidden on click).
  - `#app` — flex/grid layout: `#word-bank` (left vertical column), `#board` (center, flex-grow, houses the perspective-floor backdrop + placed word chips + an absolutely-positioned `<svg>` overlay for connector lines), `#sidebar` (right column: directions box + reset button).
- Word chips become plain `<div class="word-chip">` elements positioned with `left`/`top` (px, relative to `#board`) instead of `THREE.Vector3` + `CSS3DObject`.

### Word bank & placement
- `const WORD_BANK = [...]` — placeholder list (deduped) defined once near the top of the script.
- Render each bank word as a draggable `.word-chip` in `#word-bank`.
- Use native HTML5 drag-and-drop (`draggable="true"`, `dragstart`/`dragover`/`drop` on `#board`) or pointer-based drag (consistent with the existing pointer-event drag code the user already has patterns for) — reuse the existing `onWordPointerDown`/`onDragMove`/`onDragEnd` pointer-event approach from the current implementation, adapted to operate on 2D `left/top` CSS coordinates instead of a 3D raycast plane, since that pattern is already proven for smooth chip dragging in this codebase.
- On drop onto `#board`, remove the word's entry from `WORD_BANK`'s live/remaining list (re-render `#word-bank` without it) and create a placed word chip on the board at the drop position.
- Track state as `placedWords` (analogous to today's `words` array: `{ id, text, x, y, div }`) and `remainingBank` (words not yet placed).

### Connections
- Reuse the existing double-click selection logic (`onWordDoubleClick`/`selectedWord`) unchanged in spirit; instead of a `THREE.Line`, draw/update an SVG `<line>` inside the board's overlay `<svg>`, with `x1/y1/x2/y2` set from each connected word's current `x/y` and refreshed on drag (no more per-frame `animate()` loop needed — update the line directly in the drag handler instead of a render loop, since there's no continuous camera to redraw).
- `connections` array becomes `{ a, b, lineEl }`.

### Reset
- Reset button (under the directions box): clears `placedWords` and `connections` (remove their DOM/SVG elements), restores `remainingBank` to the full deduped `WORD_BANK`, re-renders `#word-bank`.

### Directions sidebar & welcome overlay
- Directions box: bordered container with the exact text from item 9, plus the added double-click/sentence-line clarification sentence appended.
- Welcome overlay: headline + short purpose paragraph adapted from the same item-9 text, "Enter" button removes/hides the overlay.

### Screenshot / email
- Keep `html2canvas(board-or-app, {...}).then(...)` to produce and download the PNG as today.
- Immediately after triggering the download, also set `window.location.href` (or open) a `mailto:PLACEHOLDER_EMAIL@example.com?subject=...&body=...` link — `PLACEHOLDER_EMAIL` defined as a clearly-named constant near the top of the script for the user to fill in later.

### CSS
- New `.word-chip` styling reused/adapted from today's `.word-label`.
- New perspective-floor backdrop: CSS gradient + repeating linear-gradient "grid" lines with a `perspective`/`transform: rotateX(...)` on a floor `<div>` behind the board, purely visual (no interaction tied to it).
- `#sidebar` directions box: simple border, padding, matches existing dark theme palette (`#1a1f2b`/`#3a4356`/etc. already used).
- Remove now-unused `.axis-label` CSS (no more 3D axis labels) and any WebGL/CSS3D-container-specific rules (`pointer-events: none` layering trick no longer needed since there's no separate WebGL canvas underneath).

## Files
- `index.html` — entire rewrite of the script/markup/CSS as described above. `CLAUDE.md` and `PLAN.md` will need a follow-up update after implementation to describe the new 2D architecture instead of the retired Three.js one (not done as part of this pass unless requested).
- All files created or modified for this task (including any verification screenshots saved for review) go in `/Users/catherine/Documents/GitHub/word_map_tool/`, not in `/tmp` or the scratchpad — this repo folder is the single source of truth for this project.

## Verification
- Serve locally (`python3 -m http.server 8765`) and load the page: confirm the welcome overlay appears first, "Enter" dismisses it, and the board/bank/sidebar are visible underneath.
- Confirm the word bank shows the placeholder list in a left column, directions text + reset button appear in a bordered right sidebar, and no text input box exists anywhere.
- Drag several words from the bank onto the board; confirm each disappears from the bank once placed and appears on the board at the drop location.
- Confirm a word already placed cannot be dragged again (it's gone from the bank).
- Double-click two placed words; confirm an SVG line is drawn between them and follows both words when either is dragged.
- Click Reset; confirm the board and connections clear and all words return to the bank.
- Click the screenshot button; confirm a PNG downloads (showing chips + connector lines) and a `mailto:` compose window/link is triggered with the placeholder address.
- Re-check no console errors via a Playwright pass (page load, welcome dismiss, drag-to-board, connect, reset, screenshot) since this is a full rewrite with no existing automated tests.
