# Operations

## Runtime Flow

1. API route hits the server-side data store.
2. The data store ensures spreadsheet tabs and headers exist.
3. The Sheets store reads the required tabs.
4. The app checks the linked Drive workspace status and surfaces it through dashboard config health.
5. `DashboardAssembler` normalizes rows into the frontend payload.
6. Responses are cached briefly in memory to reduce repeated Sheets reads.

## Sync Flow

`POST /api/sync`

1. Read the current spreadsheet tabs.
2. Treat the `interviews` tab as the source of truth for upcoming interviews and meeting schedules.
3. Ensure the Drive working-memory folder structure exists when access allows.
4. Recompute dashboard summary values.
5. Write summary rows to `dashboard_summary`.
6. Append a log entry to `sync_log`.

## Failure Handling

- Missing env vars returns a clean API error and the dashboard shows a fallback message.
- Missing sheets or malformed rows degrade to empty sections rather than crashing the page.
- Missing Drive workspace linkage does not block dashboard rendering; it is surfaced as config attention.
- Sheet refresh failures are recorded in `sync_log`.

## Manual Recovery

- Fix env vars in Vercel or `.env.local`.
- Ensure the spreadsheet exists and the service account can access it.
- Ensure the dedicated Drive project folder is shared with the service account and its ID is set in `GOOGLE_DRIVE_PROJECT_FOLDER_ID`.
- Trigger `POST /api/sync` again.
