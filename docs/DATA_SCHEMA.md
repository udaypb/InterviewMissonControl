# Data Schema

## Spreadsheet

Primary spreadsheet title: `Interview Mission Control`

Required tabs:

1. `interviews`
2. `rounds`
3. `tasks`
4. `daily_plan`
5. `companies`
6. `recruiter_notes`
7. `skills`
8. `skill_gaps`
9. `behavioral_stories`
10. `dashboard_summary`
11. `sync_log`

## Source of Truth

- Google Calendar is the source of truth for scheduled interview events.
- Google Sheets is the source of truth for dashboard state, tasks, company notes, skills, and derived summary rows.
- Google Drive is the working-memory source for raw brain dumps, backups, drafts, and evolving context that ChatGPT can review before updating Sheets.
- The frontend consumes only internal API routes. It never reads Google APIs directly.

## Key Behaviors

- Missing tabs are added automatically.
- Missing or incorrect headers are normalized automatically.
- Empty tabs are bootstrapped with realistic sample rows.
- Calendar sync upserts interview rows and deduplicates them by a stable interview fingerprint.
- Manual notes in `interviews.notes` are preserved when calendar events are resynced.
- The dashboard never renders directly from Drive files.
- Drive context is intended for LLM/manual workflows that calibrate Sheets on command.

## Working-Memory Drive Folder Contract

Expected subfolders under the linked project folder:

- `brain_dumps`
- `daily_briefs`
- `company_notes`
- `prep_notes`
- `story_drafts`
- `backups`

## Derived Summary Keys

`dashboard_summary` stores selected compact values:

- `last_sync_at`
- `last_sync_status`
- `sync_message`
- `next_interview`
- `active_pipelines`
- `top_priority`
- `top_priority_1`
- `top_priority_2`
- `top_priority_3`
- `weakest_skill`
- `config_health`
- `battle_plan_headline`
