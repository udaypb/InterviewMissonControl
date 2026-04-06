# Interview Mission Control Dashboard

Interview Mission Control is a Vercel-ready Next.js dashboard backed by Google Sheets and a linked Google Drive workspace. Google Drive holds raw working-memory context for ChatGPT, Google Sheets remains the canonical structured store for rendering, and the frontend consumes only internal API routes.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Google Sheets API
- Google Drive API
- Zod validation

## Architecture

```text
Google Drive workspace
    ↓
ChatGPT / manual calibration
    ↓
Google Sheets
    ↓
Sync layer
    ↓
Next.js API routes
    ↓
Dashboard frontend
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template:

   ```bash
   cp .env.example .env.local
   ```

3. Set:

   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_DRIVE_PROJECT_FOLDER_ID`
   - `NEXT_PUBLIC_APP_NAME`

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

## Required Spreadsheet Tabs

- `interviews`
- `rounds`
- `tasks`
- `daily_plan`
- `companies`
- `recruiter_notes`
- `skills`
- `skill_gaps`
- `behavioral_stories`
- `dashboard_summary`
- `sync_log`

The app bootstraps missing tabs, headers, and sample rows when it first connects.

## Working-Memory Drive Folder

The final design uses a dedicated Google Drive folder as raw context for ChatGPT. The dashboard does not render directly from Drive, but the app validates the linked folder and can ensure this subfolder contract exists:

- `brain_dumps`
- `daily_briefs`
- `company_notes`
- `prep_notes`
- `story_drafts`
- `backups`

## API Routes

- `GET /api/dashboard-summary`
- `GET /api/interviews`
- `GET /api/tasks`
- `GET /api/companies`
- `GET /api/skills`
- `POST /api/sync`

## Sync Behavior

`POST /api/sync`:

1. Reads the current spreadsheet state.
2. Treats the `interviews` tab as the source of truth for upcoming interviews and meetings.
3. Ensures the Drive working-memory folder contract exists when access allows.
4. Recomputes compact summary rows.
5. Appends a `sync_log` entry.

The dashboard polls every 45 seconds and refreshes on window focus.

## Deployment Notes

- This project is built to run on Vercel.
- Service-account auth is used for Google Sheets.
- Drive workspace validation uses the same service account.
- Interview scheduling data is read from the `interviews` sheet only.

See:

- [`DATA_SCHEMA.md`](/Users/udaypb/Documents/Playground/interview-mission-control-dashboard/docs/DATA_SCHEMA.md)
- [`OPERATIONS.md`](/Users/udaypb/Documents/Playground/interview-mission-control-dashboard/docs/OPERATIONS.md)
- [`DEPLOYMENT.md`](/Users/udaypb/Documents/Playground/interview-mission-control-dashboard/docs/DEPLOYMENT.md)
