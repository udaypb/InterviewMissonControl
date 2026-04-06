import { dashboardConfig } from "@/config/dashboard";
import type {
  CompanyRow,
  CompaniesPayload,
  ConfigStatus,
  DashboardPayload,
  DataStore,
  InterviewRow,
  InterviewsPayload,
  SkillsPayload,
  StorageSnapshot,
  SyncResult,
  TaskRow,
  TasksPayload
} from "@/lib/datastore/types";
import { assembleDashboardPayload, buildSummaryRows } from "@/lib/datastore/dashboardAssembler";
import { ensureDriveWorkspaceStructure, getDriveWorkspaceStatus } from "@/lib/google/drive";
import { appendSyncLogRow, ensureSpreadsheetStructure, readSheets, writeDashboardSummaryRows } from "@/lib/google/sheets";
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

function inferCompanyFromTaskTitle(title: string) {
  const stopWords = new Set([
    "prep",
    "prepare",
    "complete",
    "finish",
    "review",
    "practice",
    "submit",
    "send",
    "draft",
    "refresh",
    "rehearse",
    "follow",
    "up",
    "with",
    "for"
  ]);

  const tokens = title.match(/[A-Za-z0-9+.#-]+/g) ?? [];
  const companyTokens = tokens.filter((token) => {
    const normalized = token.toLowerCase();
    return !stopWords.has(normalized) && /^[A-Z]/.test(token);
  });

  return companyTokens[0] || "";
}

function enrichTasks(tasks: TaskRow[], companies: CompanyRow[], interviews: InterviewRow[]) {
  const knownCompanies = [...new Set([
    ...companies.map((company) => company.company).filter(Boolean),
    ...interviews.map((interview) => interview.company).filter(Boolean)
  ])];

  return tasks.map((task) => {
    if (task.company.trim()) {
      return task;
    }

    const matchedCompany = knownCompanies.find((company) =>
      task.task.toLowerCase().includes(company.toLowerCase())
    );

    return {
      ...task,
      company: matchedCompany || inferCompanyFromTaskTitle(task.task)
    };
  });
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
        detail: "Connect Google Sheets and populate the interviews tab to hydrate this board."
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
    pastItems: [],
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

  const {
    interviews,
    rounds,
    tasks,
    daily_plan: dailyPlan,
    companies,
    recruiter_notes: recruiterNotes,
    skills,
    skill_gaps: skillGaps,
    behavioral_stories: behavioralStories,
    dashboard_summary: summaryRows,
    sync_log: syncLog
  } = await readSheets([
    "interviews",
    "rounds",
    "tasks",
    "daily_plan",
    "companies",
    "recruiter_notes",
    "skills",
    "skill_gaps",
    "behavioral_stories",
    "dashboard_summary",
    "sync_log"
  ]);

  const parsedInterviews = parseRows(interviews, interviewRowSchema);
  const parsedCompanies = parseRows(companies, companyRowSchema);
  const parsedTasks = enrichTasks(parseRows(tasks, taskRowSchema), parsedCompanies, parsedInterviews);

  return {
    interviews: parsedInterviews,
    rounds: parseRows(rounds, roundRowSchema),
    tasks: parsedTasks,
    dailyPlan: parseRows(dailyPlan, dailyPlanRowSchema),
    companies: parsedCompanies,
    recruiterNotes: parseRows(recruiterNotes, recruiterNoteRowSchema),
    skills: parseRows(skills, skillRowSchema),
    skillGaps: parseRows(skillGaps, skillGapRowSchema),
    behavioralStories: parseRows(behavioralStories, behavioralStoryRowSchema),
    summaryRows: parseRows(summaryRows, dashboardSummaryRowSchema),
    syncLog: parseRows(syncLog, syncLogRowSchema).reverse()
  };
}

async function getCachedSnapshot() {
  return getOrSetCache("storage-snapshot", dashboardConfig.cacheTtlMs, readSnapshot);
}

export class SheetsDataStore implements DataStore {
  async getDashboardSummary(): Promise<DashboardPayload> {
    return getOrSetCache("dashboard-summary", dashboardConfig.cacheTtlMs, async () => {
      const snapshot = await getCachedSnapshot();
      return assembleDashboardPayload(snapshot, await getSystemConfigurationStatus());
    });
  }

  async getInterviews(): Promise<InterviewsPayload> {
    return getOrSetCache("interviews", dashboardConfig.cacheTtlMs, async () => {
      const snapshot = await getCachedSnapshot();
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
      const snapshot = await getCachedSnapshot();
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
      const snapshot = await getCachedSnapshot();
      const dashboard = assembleDashboardPayload(snapshot, await getSystemConfigurationStatus());
      return {
        companies: dashboard.companyIntel,
        recruiterNotes: snapshot.recruiterNotes
      };
    });
  }

  async getSkills(): Promise<SkillsPayload> {
    return getOrSetCache("skills", dashboardConfig.cacheTtlMs, async () => {
      const snapshot = await getCachedSnapshot();
      const dashboard = assembleDashboardPayload(snapshot, await getSystemConfigurationStatus());
      return {
        skills: dashboard.skillMap,
        skillGaps: snapshot.skillGaps,
        weakestArea: dashboard.weakestArea
      };
    });
  }

  async syncDashboard(): Promise<SyncResult> {
    try {
      await ensureDriveWorkspaceStructure().catch(() => undefined);
      const snapshot = await getCachedSnapshot();
      const dashboard = assembleDashboardPayload(snapshot, await getSystemConfigurationStatus());
      const syncedAt = new Date().toISOString();
      dashboard.lastSyncedAt = syncedAt;
      dashboard.lastSyncStatus = "success";
      dashboard.syncMessage = `Dashboard refreshed from Google Sheets. ${snapshot.interviews.length} interview rows available.`;

      await writeDashboardSummaryRows(buildSummaryRows(dashboard));
      await appendSyncLogRow({
        timestamp: syncedAt,
        sync_type: "sheets_refresh",
        status: "success",
        details: `Dashboard summary rebuilt from Google Sheets. ${snapshot.interviews.length} interview rows read.`
      });

      invalidateCache();

      return {
        status: "success",
        message: dashboard.syncMessage,
        syncedCount: snapshot.interviews.length,
        lastSyncedAt: syncedAt,
        dashboard
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync failure";
      logError("Sheets refresh failed", { message });
      const fallback = await this.getDashboardSummary().catch(() => buildFallbackDashboardPayload(message));

      await appendSyncLogRow({
        timestamp: new Date().toISOString(),
        sync_type: "sheets_refresh",
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
