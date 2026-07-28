/**
 * Word Map Tool — submission receiver.
 *
 * Receives a base64 PNG + participant name from index.html's "Done" button
 * and saves it into a Google Drive folder in the deploying user's own Drive.
 *
 * SETUP (one-time, done at script.google.com — not part of the deployed site):
 * 1. In Google Drive, create a folder for submissions (e.g. "Word Cloud
 *    Workshop Submissions"). Open it and copy the folder ID out of its URL:
 *    https://drive.google.com/drive/folders/<FOLDER_ID_IS_HERE>
 * 2. Go to https://script.google.com, create a new project, and replace the
 *    default Code.gs contents with this file. Paste your folder ID into
 *    DRIVE_FOLDER_ID below.
 * 3. Deploy → New deployment → select type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Deploy, then copy the generated URL ending in /exec.
 * 4. Paste that URL into the APPS_SCRIPT_URL constant in index.html.
 */

const DRIVE_FOLDER_ID = 'TODO_PASTE_YOUR_DRIVE_FOLDER_ID_HERE';

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const name = sanitizeForFilename(payload.name || 'anonymous');
  const timestamp = sanitizeForFilename(payload.timestamp || new Date().toISOString());

  const base64Data = payload.image.replace(/^data:image\/png;base64,/, '');
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, 'image/png', `${name}-${timestamp}.png`);

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  folder.createFile(blob);

  return ContentService.createTextOutput('OK');
}

function sanitizeForFilename(text) {
  return String(text).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
}
