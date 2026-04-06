# Deployment

## Target

This project is designed for Vercel.

## Required Environment Variables

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_DRIVE_PROJECT_FOLDER_ID`
- `NEXT_PUBLIC_APP_NAME`

Optional:

- `GOOGLE_CALENDAR_IMPERSONATE_USER`

## Google Setup

You need one Google Cloud project with:

- Google Sheets API enabled
- Google Calendar API enabled
- Google Drive API enabled
- one service account for server-side access

### Sheets

1. Create or choose a Google Cloud project.
2. Enable the Google Sheets API.
3. Create a service account.
4. Share the `Interview Mission Control` spreadsheet with the service account email.
5. Put the spreadsheet ID into `GOOGLE_SHEETS_SPREADSHEET_ID`.
6. The app will bootstrap missing tabs, headers, and sample rows on first successful connection.

### Calendar

Service-account access to calendars works in one of two modes:

1. Share a specific calendar with the service account and set `GOOGLE_CALENDAR_ID` to that calendar ID.
2. If you need a real user's `primary` calendar, configure domain-wide delegation and set `GOOGLE_CALENDAR_IMPERSONATE_USER`.

Important:

- Personal Gmail accounts do not support Workspace domain-wide delegation.
- That means a personal Gmail `primary` calendar is not a clean fit for this service-account-only implementation.
- For personal Gmail, use a dedicated calendar that is explicitly shared with the service account and set `GOOGLE_CALENDAR_ID` to that calendar's ID.
- If `GOOGLE_CALENDAR_ID=primary` is used without impersonation, the app reports sync limitations in the dashboard.

### Drive Workspace

1. Create a dedicated Drive folder for the project, for example `InterviewMissionControl`.
2. Share that folder with the same service account used by the app.
3. Put the folder ID into `GOOGLE_DRIVE_PROJECT_FOLDER_ID`.
4. On sync, the app can ensure these subfolders exist:
   - `brain_dumps`
   - `daily_briefs`
   - `company_notes`
   - `prep_notes`
   - `story_drafts`
   - `backups`

This Drive folder is for ChatGPT working memory and raw context. The dashboard still renders from Sheets only.

## Vercel Environment Variable Notes

### `GOOGLE_PRIVATE_KEY`

In Vercel, paste the private key exactly as the PEM value from the service-account JSON.

If your deployment environment escapes newlines, the app converts `\\n` back into real newlines at runtime.

### `NEXT_PUBLIC_APP_NAME`

This only affects the client-facing app label. It is safe to expose publicly.

## Vercel Steps

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Set the required environment variables in the Vercel project settings.
4. Deploy.
5. Open `/dashboard`.
6. Use `Sync Now` after deployment to populate `interviews`, refresh `dashboard_summary`, and validate the Drive workspace contract.

## Post-Deploy Verification

After deployment:

1. Open `/api/dashboard-summary`.
2. Confirm you receive JSON instead of a config error.
3. Trigger `POST /api/sync`.
4. Confirm the `sync_log` tab gets a new row.
5. Confirm the `dashboard_summary` tab updates keys such as:
   - `next_interview`
   - `active_pipelines`
   - `weakest_skill`
   - `top_priority_1`
   - `top_priority_2`
   - `top_priority_3`
6. Confirm the dashboard status bar reports the Drive workspace as linked or clearly explains what is missing.

## Operational Notes

- The dashboard polls every 45 seconds and refreshes on window focus.
- The frontend never talks directly to Google APIs.
- All Google reads and sync logic run server-side through Next.js route handlers.
- The sync flow preserves manual interview notes when a matching event is reconciled.
- The intended operating model is: Drive for raw working memory, Sheets for canonical render state.

## Manual Sync

Trigger sync via:

- the `Sync Now` button in the dashboard
- or `POST /api/sync`

Example:

```bash
curl -X POST https://your-deployment.vercel.app/api/sync
```
