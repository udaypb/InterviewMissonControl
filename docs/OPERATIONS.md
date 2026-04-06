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

1. Read upcoming Google Calendar events in a rolling window.
2. Detect likely interview events using title and description heuristics.
3. Normalize event data into `interviews` rows.
4. Preserve manual notes while reconciling matching interviews.
5. Deduplicate interviews using a stable interview fingerprint.
6. Ensure the Drive working-memory folder structure exists when access allows.
7. Recompute dashboard summary values.
8. Write summary rows to `dashboard_summary`.
9. Append a log entry to `sync_log`.

## Failure Handling

- Missing env vars returns a clean API error and the dashboard shows a fallback message.
- Missing sheets or malformed rows degrade to empty sections rather than crashing the page.
- Missing Drive workspace linkage does not block dashboard rendering; it is surfaced as config attention.
- Calendar sync failures are recorded in `sync_log`.

## Manual Recovery

- Fix env vars in Vercel or `.env.local`.
- Ensure the spreadsheet exists and the service account can access it.
- Ensure the calendar is shared with the service account or domain-wide delegation is configured.
- Ensure the dedicated Drive project folder is shared with the service account and its ID is set in `GOOGLE_DRIVE_PROJECT_FOLDER_ID`.
- Trigger `POST /api/sync` again.
