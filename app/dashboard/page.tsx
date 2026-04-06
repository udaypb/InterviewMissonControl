"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { BattlePlan } from "@/components/BattlePlan";
import { CompanyIntel } from "@/components/CompanyIntel";
import { Header } from "@/components/Header";
import { MentorFocus } from "@/components/MentorFocus";
import { MobileSummary } from "@/components/MobileSummary";
import { ProgressPanel } from "@/components/ProgressPanel";
import { StatusBar } from "@/components/StatusBar";
import { Tabs, type DashboardTab } from "@/components/Tabs";
import { TopStats } from "@/components/TopStats";
import type {
  DashboardPayload,
  SyncResult,
} from "@/lib/datastore/types";

const emptyDashboard: DashboardPayload = {
  generatedAt: new Date().toISOString(),
  lastSyncedAt: "Never",
  lastSyncStatus: "sync required",
  syncMessage: "Connect Google Sheets credentials and refresh the dashboard.",
  activePipelines: 0,
  topStats: [],
  battlePlan: [],
  mentorFocus: [],
  companyIntel: [],
  weeklyProgress: [],
  priorities: [],
  interviewCalendar: [],
  interviewBoard: [],
  skillMap: [],
  codingTracker: [],
  resources: [],
  pastItems: [],
  weakestArea: "Unknown",
  configStatus: {
    healthy: false,
    label: "Config missing",
    message: "Configuration incomplete.",
    detail: "Set Google environment variables and redeploy."
  }
};

function getSyncTimestamp(value: string) {
  if (!value || value === "Never") {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeDashboardState(current: DashboardPayload, next: DashboardPayload): DashboardPayload {
  const currentSyncTs = getSyncTimestamp(current.lastSyncedAt);
  const nextSyncTs = getSyncTimestamp(next.lastSyncedAt);

  if (nextSyncTs >= currentSyncTs) {
    return next;
  }

  return {
    ...next,
    lastSyncedAt: current.lastSyncedAt,
    lastSyncStatus: current.lastSyncStatus,
    syncMessage: current.syncMessage
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

function DashboardContent({
  dashboard,
  activeTab,
  onOpenSkillMap
}: {
  dashboard: DashboardPayload;
  activeTab: DashboardTab;
  onOpenSkillMap: () => void;
}) {
  if (activeTab === "Dashboard") {
    return (
      <>
        <TopStats stats={dashboard.topStats} />
        <div className="hidden lg:block">
          <div className="grid gap-5 xl:grid-cols-2">
            <BattlePlan items={dashboard.battlePlan} />
            <MentorFocus cards={dashboard.mentorFocus} />
            <CompanyIntel companies={dashboard.companyIntel} />
            <ProgressPanel metrics={dashboard.weeklyProgress} onOpenSkillMap={onOpenSkillMap} />
          </div>
        </div>
        <div className="grid gap-5 lg:hidden">
          <BattlePlan items={dashboard.battlePlan} />
          <MentorFocus cards={dashboard.mentorFocus} />
          <CompanyIntel companies={dashboard.companyIntel} />
          <ProgressPanel metrics={dashboard.weeklyProgress} onOpenSkillMap={onOpenSkillMap} />
        </div>
      </>
    );
  }

  if (activeTab === "Interview Calendar") {
    const lanes = [
      {
        key: "needs_action",
        label: "Needs Action",
        tone: "border-[#d67658]/40 bg-[#241514]"
      },
      {
        key: "upcoming",
        label: "Upcoming",
        tone: "border-[#6c8fbe]/35 bg-[#111925]"
      },
      {
        key: "watching",
        label: "Watching",
        tone: "border-[#8c7b54]/35 bg-[#1d1911]"
      },
      {
        key: "closed",
        label: "Closed",
        tone: "border-[#4f4f4f]/45 bg-[#191919]"
      }
    ] as const;

    return (
      <section className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Interview Calendar</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Kanban by pipeline momentum</h2>
          </div>
          <span className="text-sm text-muted">{dashboard.interviewBoard.length} pipelines</span>
        </div>
        <div className="mt-6">
          {dashboard.interviewBoard.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-black/10 p-5">
              <p className="text-sm text-text">No interview events found.</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Add rows to the `interviews` tab, then refresh the dashboard summary.
              </p>
            </div>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-4">
            {lanes.map((lane) => {
              const cards = dashboard.interviewBoard.filter((card) => card.lane === lane.key);
              return (
                <div key={lane.key} className={`rounded-[28px] border p-4 ${lane.tone}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted">{lane.label}</p>
                      <p className="mt-1 text-sm text-muted">{cards.length} cards</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {cards.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/70 bg-black/10 p-4 text-sm text-muted">
                        No pipelines in this lane.
                      </div>
                    ) : null}
                    {cards.map((card) => (
                      <article key={`${card.company}-${card.lastEventDate}-${card.nextEventDate}`} className="rounded-[24px] border border-border/80 bg-[#0f0f0f]/70 p-4 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-medium">{card.company}</h3>
                            <p className="mt-1 text-sm text-muted">{card.headline}</p>
                          </div>
                          <span className="rounded-full border border-border/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                            {card.status}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border/70 bg-black/10 p-3">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Last Event Date</p>
                            <p className="mt-2 text-sm font-medium text-text">{card.lastEventDateLabel}</p>
                            <p className="mt-1 text-sm text-muted">{card.lastEventLabel}</p>
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-black/10 p-3">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Next Date To Note</p>
                            <p className="mt-2 text-sm font-medium text-text">{card.nextEventDateLabel}</p>
                            <p className="mt-1 text-sm text-muted">{card.nextEventLabel}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
                          <span>{card.eventCount} events</span>
                          <span>{card.interviewer}</span>
                          {card.meetingLink ? (
                            <a
                              href={card.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#d8d0c4] underline-offset-4 hover:underline"
                            >
                              Open link
                            </a>
                          ) : null}
                        </div>
                        <p className="mt-4 text-sm leading-6 text-muted">{card.notes}</p>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (activeTab === "Past") {
    return (
      <section className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Past</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Past interviews, rounds, and expired tasks</h2>
          </div>
          <span className="text-sm text-muted">{dashboard.pastItems.length} items</span>
        </div>
        <div className="mt-6 space-y-3">
          {dashboard.pastItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-black/10 p-5">
              <p className="text-sm text-text">No past-dated items found.</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Once dates in the sheet fall behind today, they will appear here automatically.
              </p>
            </div>
          ) : null}
          {dashboard.pastItems.map((item) => (
            <article key={item.id} className="rounded-3xl border border-border/80 bg-black/10 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">{item.kind}</p>
                  <h3 className="mt-1 text-lg font-medium">{item.title}</h3>
                  <p className="text-sm text-muted">{item.company} · {item.status || "logged"}</p>
                </div>
                <div className="text-sm text-muted">{item.dateLabel}</div>
              </div>
              <p className="mt-3 text-sm text-muted">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (activeTab === "Skill Map") {
    const items = dashboard.skillMap;
    return (
      <section className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Skill Map</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Weakest area: {dashboard.weakestArea}</h2>
          </div>
        </div>
        <div className="mt-6 space-y-5">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-black/10 p-5">
              <p className="text-sm text-text">No skill data available.</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Add rows in `skills` and `skill_gaps` to unlock readiness and weakest-area insights.
              </p>
            </div>
          ) : null}
          {items.map((item) => (
            <div key={item.skill}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">{item.skill}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">{item.category}</p>
                </div>
                <span className="text-sm text-muted">{item.progressPercent}% / {item.targetPercent}%</span>
              </div>
              <div className="h-3 rounded-full bg-[color:var(--track)]">
                <div className="h-3 rounded-full bg-text" style={{ width: `${item.progressPercent}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted">{item.weakestForCompany ? `Most acute for ${item.weakestForCompany}` : "No company-specific gap logged."}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (activeTab === "Coding Tracker") {
    const codingItems = dashboard.codingTracker;

    return (
      <section className="panel p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Coding Tracker</p>
        <div className="mt-5 space-y-3">
          {codingItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-black/10 p-5">
              <p className="text-sm text-text">No coding tasks in the queue.</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Tag technical tasks with `coding`, `technical`, or `algorithm` in the `tasks` tab.
              </p>
            </div>
          ) : null}
          {codingItems.map((task) => (
            <article key={task.task_id} className="rounded-3xl border border-border/80 bg-black/10 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-medium">{task.task}</h3>
                  <p className="text-sm text-muted">{task.company} · {task.priority} priority · {task.status}</p>
                </div>
                <div className="text-sm text-muted">{task.due_date}</div>
              </div>
              <p className="mt-3 text-sm text-muted">{task.notes}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="panel p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-muted">Resources</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {dashboard.resources.length === 0 ? (
          <article className="rounded-3xl border border-dashed border-border bg-black/10 p-5 md:col-span-3">
            <p className="text-sm text-text">No resource cues yet.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Company notes and recruiter context will surface here once the sheets are populated.
            </p>
          </article>
        ) : null}
        {dashboard.resources.map((resource) => (
          <article key={resource.title} className="rounded-3xl border border-border/80 bg-black/10 p-4">
            <p className="text-sm font-medium">{resource.title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted">{resource.subtitle}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{resource.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("Dashboard");
  const [dashboard, setDashboard] = useState<DashboardPayload>(emptyDashboard);
  const [error, setError] = useState<string>("");
  const [warning, setWarning] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [, startTransition] = useTransition();

  const refreshAll = useCallback(async () => {
    try {
      const dashboardPayload = await fetchJson<DashboardPayload>("/api/dashboard-summary");

      startTransition(() => {
        setDashboard((current) => mergeDashboardState(current, dashboardPayload));
        setError("");
        setWarning("");
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load dashboard data.");
    }
  }, [startTransition]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await fetchJson<SyncResult>("/api/sync", { method: "POST" });
      startTransition(() => {
        setDashboard((current) => mergeDashboardState(current, result.dashboard));
        setError("");
        setWarning(result.status === "error" ? result.message : "");
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  }, [startTransition]);

  const subtitle = useMemo(() => dashboard.configStatus.message, [dashboard.configStatus.message]);
  const lastUpdated = useMemo(
    () =>
      dashboard.lastSyncedAt === "Never"
        ? "Never synced"
        : new Date(dashboard.lastSyncedAt).toLocaleString(),
    [dashboard.lastSyncedAt]
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-5 px-4 py-5 md:gap-6 md:px-8 md:py-8 xl:px-12">
      <Header
        title="Uday's Interview Mission Control"
        subtitle={subtitle}
        activePipelines={dashboard.activePipelines}
      />
      <Tabs activeTab={activeTab} onChange={setActiveTab} />
      <StatusBar
        lastUpdated={lastUpdated}
        syncStatus={dashboard.lastSyncStatus}
        syncMessage={error || warning || dashboard.syncMessage}
        configLabel={dashboard.configStatus.label}
        configDetail={dashboard.configStatus.detail}
        configHealthy={dashboard.configStatus.healthy}
        isSyncing={isSyncing}
        onSync={() => void syncNow()}
      />
      <MobileSummary dashboard={dashboard} />
      {error ? (
        <section className="panel p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Data unavailable</p>
          <p className="mt-3 text-sm leading-6 text-muted">{error}</p>
        </section>
      ) : (
        <DashboardContent
          dashboard={dashboard}
          activeTab={activeTab}
          onOpenSkillMap={() => setActiveTab("Skill Map")}
        />
      )}
    </main>
  );
}
