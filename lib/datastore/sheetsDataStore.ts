import { dashboardConfig } from "@/config/dashboard";
import type {
  CompaniesPayload,
  ConfigStatus,
  DashboardPayload,
  DataStore,
  InterviewRow,
  InterviewsPayload,
  SkillsPayload,
  StorageSnapshot,
  SyncResult,
  TasksPayload
} from "@/lib/datastore/types";
import { assembleDashboardPayload, buildSummaryRows } from "@/lib/datastore/dashboardAssembler";
import { CalendarSyncService } from "@/lib/datastore/calendarSyncService";
import { ensureDriveWorkspaceStructure, getDriveWorkspaceStatus } from "@/lib/google/drive";
import { appendSyncLogRow, ensureSpreadsheetStructure, readSheet, writeDashboardSummaryRows, writeSheet } from "@/lib/google/sheets";
import { getOrSetCache, invalidateCache } from "@/lib/utils/cache";
import { logError } from "@/lib/utils/logging";
import {
  behavioralStoryRowSchema,
  companyRowSchema,
  dashboardSummaryRowSchema,
  dailyPlanRowSchema,
  interviewRowSchema,
  parseRows,
  recruiterNoteRowSchema,
  roundRowSchema,
  skillGapRowSchema,
  skillRowSchema,
  syncLogRowSchema,
  taskRowSchema,
  getConfigurationHealth
} from "@/lib/utils/validation";

function buildInterviewIdentity(row: InterviewRow) {
  const fingerprint = [
    row.company.trim().toLowerCase(),
    row.date.trim(),
    row.start_time.trim().toLowerCase(),
    row.round_type.trim().toLowerCase(),
    row.interviewer.trim().toLowerCase()
  ].join("|");

  const hasMeaningfulFingerprint = fingerprint.replace(/\|/g, "").length > 0;
  return hasMeaningfulFingerprint ? fingerprint : row.event_id;
}

function mergeInterviewRows(base: InterviewRow | undefined, next: InterviewRow) {
  return {
    ...base,
    ...next,
    notes: base?.notes?.trim() || next.notes,
    role: base?.role?.trim() || next.role
  };
}

function dedupeInterviews(rows: InterviewRow[]) {
  const deduped = new Map<string, InterviewRow>();

  for (const row of rows) {
    const key = buildInterviewIdentity(row);
    deduped.set(key, mergeInterviewRows(deduped.get(key), row));
  }

  return [...deduped.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function buildFallbackDashboardPayload(message: string): DashboardPayload {
  const configStatus = getConfigurationHealth();
  return {
    generatedAt: new Date().toISOString(),
    lastSyncedAt: "Never",
    lastSyncStatus: configStatus.healthy ? "sync required" : "config attention",
    syncMessage: message,
    activePipelines: 0,
    topStats: [
      {
        label: "Next Interview",
        value: "Sync required",
        detail: "Connect Sheets and Calendar to hydrate this board."
      },
      {
        label: "This Week",
        value: "0 loops",
        detail: "No upcoming interview events available."
      },
      {
        label: "Urgent Item",
        value: "Configuration",
        detail: message
      }
    ],
    battlePlan: [],
    mentorFocus: [
      {
        variant: "purple",
        title: "Data Unavailable",
        body: message
      },
      {
        variant: "green",
        title: "Recovery Path",
        body: configStatus.detail
      },
      {
        variant: "yellow",
        title: "Next Move",
        body: "Finish configuration, then run Sync Now to seed interviews and summary rows."
      }
    ],
    companyIntel: [],
    weeklyProgress: [],
    priorities: [],
    interviewCalendar: [],
    skillMap: [],
    codingTracker: [],
    resources: [],
    weakestArea: "Unknown",
    configStatus
  };
}

async function getSystemConfigurationStatus(): Promise<ConfigStatus> {
  const base = getConfigurationHealth();

  if (!base.healthy) {
    return base;
  }

  const driveStatus = await getDriveWorkspaceStatus();

  if (!driveStatus.configured) {
    return {
      healthy: true,
      label: "Sheets live",
      message: "Dashboard storage is healthy, but Drive working memory is not linked yet.",
      detail: driveStatus.detail
    };
  }

  if (!driveStatus.accessible) {
    return {
      healthy: true,
      label: "Drive attention",
      message: "Sheets are live, but the Drive working-memory folder is not accessible.",
      detail: driveStatus.detail
    };
  }

  return {
    healthy: true,
    label: driveStatus.label,
    message: driveStatus.message,
    detail: driveStatus.detail
  };
}

async function readSnapshot(): Promise<StorageSnapshot> {
  await ensureSpreadsheetStructure();

  const [
    interviews,
    rounds,
    tasks,
    dailyPlan,
    companies,
    recruiterNotes,
    skills,
    skillGaps,
    behavioralStories,
    summaryRows,
    syncLog
  ] = await Promise.all([
    readSheet("interviews"),
    readSheet("rounds"),
    readSheet("tasks"),
    readSheet("daily_plan"),
    readSheet("companies"),
    readSheet("recruiter_notes"),
    readSheet("skills"),
    readSheet("skill_gaps"),
    readSheet("behavioral_stories"),
    readSheet("dashboard_summary"),
    readSheet("sync_log")
  ]);

  return {
    interviews: parseRows(interviews, interviewRowSchema),
    rounds: parseRows(rounds, roundRowSchema),
    tasks: parseRows(tasks, taskRowSchema),
    dailyPlan: parseRows(dailyPlan, dailyPlanRowSchema),
    companies: parseRows(companies, companyRowSchema),
    recruiterNotes: parseRows(recruiterNotes, recruiterNoteRowSchema),
    skills: parseRows(skills, skillRowSchema),
    skillGaps: parseRows(skillGaps, skillGapRowSchema),
    behavioralStories: parseRows(behavioralStories, behavioralStoryRowSchema),
    summaryRows: parseRows(summaryRows, dashboardSummaryRowSchema),
    syncLog: parseRows(syncLog, syncLogRowSchema).reverse()
  };
}

export class SheetsDataStore implements DataStore {
  private calendarSyncService = new CalendarSyncService();

  async getDashboardSummary(): Promise<DashboardPayload> {
    return getOrSetCache("dashboard-summary", dashboardConfig.cacheTtlMs, async () => {
      const snapshot = await readSnapshot();
      return assembleDashboardPayload(snapshot, await getSystemConfigurationStatus());
    });
  }

  async getInterviews(): Promise<InterviewsPayload> {
    return getOrSetCache("interviews", dashboardConfig.cacheTtlMs, async () => {
      const snapshot = await readSnapshot();
      const dashboard = assembleDashboardPayload(snapshot, await getSystemConfigurationStatus());
      return {
        interviews: dashboard.interviewCalendar,
        rounds: snapshot.rounds,
        lastSyncedAt: dashboard.lastSyncedAt
      };
    });
  }

  async getTasks(): Promise<TasksPayload> {
    return getOrSetCache("tasks", dashboardConfig.cacheTtlMs, async () => {
      const snapshot = await readSnapshot();
      const dashboard = assembleDashboardPayload(snapshot, await getSystemConfigurationStatus());
      return {
        tasks: snapshot.tasks,
        dailyPlan: dashboard.battlePlan,
        priorities: dashboard.priorities
      };
    });
  }

  async getCompanies(): Promise<CompaniesPayload> {
    return getOrSetCache("companies", dashboardConfig.cacheTtlMs, async () => {
      const snapshot = await readSnapshot();
      const dashboard = assembleDashboardPayload(snapshot, await getSystemConfigurationStatus());
      return {
        companies: dashboard.companyIntel,
        recruiterNotes: snapshot.recruiterNotes
      };
    });
  }

  async getSkills(): Promise<SkillsPayload> {
    return getOrSetCache("skills", dashboardConfig.cacheTtlMs, async () => {
      const snapshot = await readSnapshot();
      const dashboard = assembleDashboardPayload(snapshot, await getSystemConfigurationStatus());
      return {
        skills: dashboard.skillMap,
        skillGaps: snapshot.skillGaps,
        weakestArea: dashboard.weakestArea
      };
    });
  }

  async syncFromCalendar(): Promise<SyncResult> {
    try {
      await ensureDriveWorkspaceStructure().catch(() => undefined);
      const snapshot = await readSnapshot();
      const syncedInterviewRows = await this.calendarSyncService.syncInterviewEvents(
        snapshot.interviews,
        snapshot.companies,
        process.env.GOOGLE_CALENDAR_ID || "primary"
      );

      const mergedInterviews = dedupeInterviews([
        ...snapshot.interviews,
        ...syncedInterviewRows
      ]);

      await writeSheet("interviews", mergedInterviews);

      const nextSnapshot: StorageSnapshot = {
        ...snapshot,
        interviews: mergedInterviews
      };
      const dashboard = assembleDashboardPayload(nextSnapshot, await getSystemConfigurationStatus());
      const syncedAt = new Date().toISOString();
      dashboard.lastSyncedAt = syncedAt;
      dashboard.lastSyncStatus = "success";
      dashboard.syncMessage = `${syncedInterviewRows.length} calendar events reconciled.`;

      await writeDashboardSummaryRows(buildSummaryRows(dashboard));
      await appendSyncLogRow({
        timestamp: syncedAt,
        sync_type: "calendar_pull",
        status: "success",
        details: `${syncedInterviewRows.length} interview events upserted from Google Calendar.`
      });

      invalidateCache();

      return {
        status: "success",
        message: dashboard.syncMessage,
        syncedCount: syncedInterviewRows.length,
        lastSyncedAt: syncedAt,
        dashboard
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync failure";
      logError("Calendar sync failed", { message });
      const fallback = await this.getDashboardSummary().catch(() => buildFallbackDashboardPayload(message));

      await appendSyncLogRow({
        timestamp: new Date().toISOString(),
        sync_type: "calendar_pull",
        status: "error",
        details: message
      }).catch(() => undefined);

      return {
        status: "error",
        message,
        syncedCount: 0,
        lastSyncedAt: new Date().toISOString(),
        dashboard: fallback
      };
    }
  }
}

let dataStore: SheetsDataStore | null = null;

export function getDataStore() {
  if (!dataStore) {
    dataStore = new SheetsDataStore();
  }

  return dataStore;
}
