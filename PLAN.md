# Auto-upload finished word clouds to Google Drive via a "Done" button

## Context
This workshop tool (already rebuilt as a 2D drag-and-drop board — see git history) currently ends with a "Download Screenshot" button that saves a local PNG and opens a `mailto:` draft with a placeholder address, requiring the participant to manually attach and send the file. For live workshops with many participants, the facilitator wants a single "Done" click per participant that silently uploads their finished word-cloud image to one place (a Google Drive folder) so all submissions can be pulled up and compared side by side afterward — no manual download/email/upload steps for participants, and no server for the facilitator to run or maintain.

**Chosen approach**: Google Apps Script deployed as a Web App acts as a free, always-on upload endpoint. The page POSTs a base64 PNG (captured via the existing `html2canvas` call) plus the participant's name straight to that endpoint, which saves it into a Drive folder. Google's infrastructure is the only thing that needs to "stay up" — nothing for the facilitator to host or babysit during the workshop.

## Clarified decisions
1. **Single button**: "Download Screenshot" is replaced by a "Done" button. No local file download, no `mailto:` — one click uploads directly to Drive.
2. **Participant naming**: the welcome overlay gains a required name/nickname text field before the "Enter" button is usable. That name is sanitized and used in the uploaded filename (e.g. `Jordan-2026-07-28T14-30-12.png`) so submissions are identifiable in Drive.
3. **Post-submit UX**: clicking "Done" shows a brief "Submitted — thank you!" confirmation overlay, then after a few seconds automatically calls the existing `resetAll()` and re-shows the welcome overlay (with the name field cleared) so the same device is ready for the next participant.

## Implementation plan

### Google Apps Script backend (new file, not part of the deployed site)
- Add `google-apps-script/Code.gs` to the repo as reference/setup source (Apps Script isn't hosted from GitHub Pages — the user pastes this into script.google.com and deploys it separately). Contents:
  - `doPost(e)`: parse `JSON.parse(e.postData.contents)` → `{ name, image, timestamp }`, decode the base64 PNG (`Utilities.base64Decode`, strip the `data:image/png;base64,` prefix), build a `Blob`, and save it into a specific Drive folder (folder ID as a constant at the top of the script) with filename `${sanitizedName}-${timestamp}.png`.
  - No `doGet` needed.
- Add a short comment block at the top of `Code.gs` with the manual deployment steps: create/choose a Drive folder and copy its ID into the script, paste the script into a new Apps Script project, "Deploy → New deployment → Web app", execute as "Me", access "Anyone", copy the resulting `/exec` URL.

### `index.html` changes
- **Welcome overlay** (~line 209-217): add a required `<input id="participant-name-input">` above the Enter button. `welcomeEnterBtn` stays disabled (or shows a validation message) until the field is non-empty; the trimmed value is stored in a `participantName` variable used later for the filename.
- **Sidebar button** (~line 238): rename `#download-btn` to `#done-btn`, label "Done".
- **New confirmation overlay**: a small `#submitted-overlay` (hidden by default, same overlay pattern as `#welcome-overlay`) with a "Submitted — thank you!" message, shown after upload and auto-hidden.
- **Script** (~line 244 on):
  - Remove `EMAIL_TO` constant and the `mailto:` construction.
  - Add `const APPS_SCRIPT_URL = 'TODO_PASTE_DEPLOYED_WEB_APP_URL_HERE';` as a clearly-marked placeholder constant for the facilitator to fill in after deploying `Code.gs`.
  - Replace the `downloadBtn` click handler with a `doneBtn` handler that:
    1. Runs `html2canvas(board, { backgroundColor: '#0c0f14' })` as today, but instead of triggering a file download, takes `canvas.toDataURL('image/png')`.
    2. Builds a sanitized filename-safe timestamp and `POST`s `JSON.stringify({ name: participantName, image: dataUrl, timestamp })` to `APPS_SCRIPT_URL` via `fetch(..., { method: 'POST', mode: 'no-cors', body })` — `no-cors` is required because Apps Script Web Apps don't return CORS headers for cross-origin callers, and the page doesn't need to read the response, just fire the upload.
    3. On the fetch promise settling (or immediately, since `no-cors` gives an opaque response with no readable status), shows `#submitted-overlay`.
    4. After ~4 seconds: hides `#submitted-overlay`, calls the existing `resetAll()`, clears the name input, and re-shows `#welcome-overlay` for the next participant.
  - Reuse existing helpers (`resetAll`, `board`, the existing `html2canvas` CDN script tag) — no new dependencies needed.

### CSS
- Add minimal styling for `#participant-name-input` (matches existing dark theme input/box styling already used elsewhere) and `#submitted-overlay` (reuse `#welcome-overlay`'s full-screen overlay pattern/classes rather than duplicating rules).

## Files
- `index.html` — welcome overlay name field, Done button + upload logic, confirmation overlay, CSS additions.
- `google-apps-script/Code.gs` — new reference file with the Apps Script source and deployment instructions in comments.
- `PLAN.md` — refresh with this plan's content after implementation, per standing practice.

## Verification
- Serve locally (`python3 -m http.server 8765`), load the page: confirm Enter is disabled/blocked until a name is typed, then dismisses the welcome overlay.
- Place a few words and connect two with a double-click as before (unchanged behavior).
- Click "Done": confirm a POST fires to `APPS_SCRIPT_URL` (visible in the Network tab even though the response is opaque under `no-cors`), the confirmation overlay appears, and after the delay the board resets and the welcome overlay reappears with the name field empty.
- Since `APPS_SCRIPT_URL` is a placeholder until the facilitator deploys their own script, verification of the actual Drive upload can't be done against a real deployment in this pass — note this plainly rather than faking success. If the user wants, a temporary test deployment can be created together in a follow-up to confirm an end-to-end file lands in Drive.
- Playwright pass covering: name-gate on welcome overlay, Done button triggers a network request to the configured URL, confirmation overlay shows/hides, and board/bank state fully resets afterward — with zero console errors.
