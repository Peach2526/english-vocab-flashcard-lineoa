# english-vocab-flashcard-lineoa

Standalone English vocabulary flashcard sender for a new LINE Official Account.

This project is separate from the Friday News Alert / OSINT / news monitoring project. It uses its own repository, LINE OA, LINE channel token, vocabulary database, logs, output folder, and state file.

## Daily Schedule

The production schedule sends 3 flashcards per run:

- Economics Vocabulary
- Politics Vocabulary
- Military Vocabulary

Runs:

- `08:00 Asia/Bangkok`, using cron `0,5 1 * * *`
- `12:00 Asia/Bangkok`, using cron `0,5 5 * * *`

GitHub scheduled workflows can be delayed or dropped during high-load periods. The extra minute-5 run is a backup. It uses the same production window key, so duplicate protection prevents a second send if the minute-0 run already completed.

Production window keys are always:

- `YYYY-MM-DDT08:00+07:00`
- `YYYY-MM-DDT12:00+07:00`

## Local Setup

Install dependencies:

```bash
npm install
npx playwright install chromium
```

Create `.env` in the project root:

```bash
LINE_CHANNEL_ACCESS_TOKEN=your_new_line_channel_access_token
LINE_TARGET_ID=your_line_user_or_group_id
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

`.env` is ignored by Git and must never be committed.

## Local Commands

Preview selected vocabulary without rendering, uploading, sending, or changing state:

```bash
npm run dry-run
```

Render 3 test PNG cards into `output/`:

```bash
npm run render:test
```

Upload and send a real test batch to LINE without marking words used and without completing a schedule window:

```bash
npm run send:test
```

Send a real test batch to LINE while advancing a separate test-only state file:

```bash
npm run send:test-next
```

`send:test-next` writes only to `storage/test-state.json`, which is ignored by Git. It never updates production `storage/state.json`.

Run the real production schedule locally:

```bash
npm run schedule:run -- --slot 08:00
npm run schedule:run -- --slot 12:00
```

## Duplicate Protection

Production sends use `storage/state.json`.

Before sending, the app checks `sentWindows` for the current window key. If the window already succeeded, the app skips sending and logs the completed window key.

The app marks a window complete only after:

1. all 3 cards are rendered
2. all 3 cards are uploaded to Cloudinary
3. the LINE text message is sent
4. the 3 LINE image messages are sent

If upload or LINE sending fails, the app does not mark the window complete and does not mark vocabulary as used.

## Used Vocabulary Tracking

The app selects one unused item from each category:

- `economics`
- `politics`
- `military`

After a successful production send, the selected IDs are added to `usedIds` in `storage/state.json`.

Because the 08:00 run commits state before the 12:00 run, the 12:00 run selects the next unused words and does not reuse the same words on the same day.

When a category runs out of unused words, that category resets and starts again from the beginning. The reset is applied only after a successful production send.

## Test Mode Selection

The default test commands are intentionally non-destructive:

- `npm run dry-run` does not mark words used.
- `npm run render:test` does not mark words used.
- `npm run send:test` does not mark words used and does not complete a schedule window.

Because these commands do not update production state, they repeatedly select the first currently available production words. With a clean `storage/state.json`, that means:

- economics: `inflation`
- politics: `election`
- military: `deployment`

To safely test different cards without touching production state, use:

```bash
npm run send:test-next
```

This command uses separate test state in `storage/test-state.json`. Delete that file whenever you want test cycling to start over.

## Output, Logs, And State

- `output/` contains generated PNG/HTML files for local runs and is ignored by Git except `.gitkeep`.
- `logs/` contains local JSON logs and is ignored by Git except `.gitkeep`.
- `node_modules/`, `.npm-cache/`, and `.env` are ignored.
- `storage/state.json` is tracked because GitHub Actions uses it to persist duplicate protection and used-word history.
- `storage/test-state.json` is ignored because it is only for local test cycling.

## GitHub Repository Setup

Create a new GitHub repository named:

```text
english-vocab-flashcard-lineoa
```

Push this project:

```bash
git add .env.example .github .gitignore README.md data logs output package.json package-lock.json src storage templates
git commit -m "Initial English vocabulary flashcard LINE OA sender"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/english-vocab-flashcard-lineoa.git
git push -u origin main
```

Do not add `.env`, `node_modules/`, `output/*.png`, `output/*.html`, or `logs/*.log`.

## GitHub Secrets

Add these repository secrets:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_TARGET_ID`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The app logs only whether each required secret exists. It never prints secret values.

## GitHub Actions

Workflow file:

```text
.github/workflows/send-flashcards.yml
```

It supports:

- scheduled 08:00 Thailand run
- scheduled 12:00 Thailand run
- manual `workflow_dispatch`

Manual options:

- `08:00`: manual test-next send for the 08:00 slot; does not update `storage/state.json`
- `12:00`: manual test-next send for the 12:00 slot; does not update `storage/state.json`
- `test`: basic test send that does not update `storage/state.json`

Only scheduled runs update production `storage/state.json`. This prevents a manual test from marking a real 08:00 or 12:00 production window as completed before the actual schedule time.

After a successful production send, GitHub Actions commits and pushes only:

```text
storage/state.json
```

The workflow refuses to continue if unexpected files changed or if `.env` appears in the GitHub Actions workspace.

The workflow must show these steps before sending:

- `Install dependencies`
- `Install Playwright Chromium`
- `Verify Playwright browser install`
- `Send flashcards`

`Install Playwright Chromium` runs `npx playwright install --with-deps chromium` with `PLAYWRIGHT_BROWSERS_PATH=0`, matching the project-local browser path used by the renderer.

## Flashcard Rendering

Cards are rendered from:

- `templates/flashcard.html`
- `templates/flashcard.css`
- `data/vocabulary.json`

Playwright captures only the `.flashcard` container and writes fresh PNG files to `output/`.

The renderer does not use unrelated sample photos, screenshots, or AI-generated text images.
