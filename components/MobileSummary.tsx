import type { DashboardPayload } from "@/lib/datastore/types";

interface MobileSummaryProps {
  dashboard: DashboardPayload;
}

export function MobileSummary({ dashboard }: MobileSummaryProps) {
  return (
    <section className="grid gap-4 md:hidden">
      <article className="panel overflow-hidden p-0">
        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-muted">Mission Snapshot</p>
              <p className="mt-3 text-[1.55rem] font-semibold tracking-[-0.04em]">
                {dashboard.topStats[0]?.value || "No interview set"}
              </p>
            </div>
            <span className="rounded-full border border-[#e7d1b0]/25 bg-[#f5e7d0] px-3 py-1.5 text-xs font-semibold text-[#6d5232]">
              {dashboard.activePipelines} pipelines
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            {dashboard.topStats[0]?.detail || dashboard.syncMessage}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/80">
          <div className="bg-panel px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Weakest Skill</p>
            <p className="mt-2 text-sm leading-6">{dashboard.weakestArea}</p>
          </div>
          <div className="bg-panel px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Sync State</p>
            <p className="mt-2 text-sm leading-6">{dashboard.lastSyncStatus}</p>
          </div>
        </div>
      </article>
      <article className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Top 3 Priorities</p>
          <span className="text-xs text-muted">Today</span>
        </div>
        <div className="mt-4 space-y-3">
          {dashboard.priorities.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-border bg-black/10 p-4 text-sm text-muted">
              No priorities ranked yet.
            </div>
          ) : null}
          {dashboard.priorities.slice(0, 3).map((priority, index) => (
            <div key={priority.id} className="flex items-start gap-3 rounded-[18px] border border-border/70 bg-black/10 px-4 py-4">
              <span className="mt-0.5 text-sm font-semibold text-[#d5a15f]">0{index + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-6">{priority.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{priority.company}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
      <article className="panel p-5">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Battle Plan</p>
        <div className="mt-4 space-y-0">
          {dashboard.battlePlan.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-border bg-black/10 p-4 text-sm text-muted">
              No daily plan items available.
            </div>
          ) : null}
          {dashboard.battlePlan.slice(0, 3).map((item, index) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 py-4 ${index < Math.min(dashboard.battlePlan.length, 3) - 1 ? "border-b border-border/70" : ""}`}
            >
              <span className="mt-[0.55rem] h-3.5 w-3.5 rounded-full bg-[#d3b58b]" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-[#d5a15f]">{item.slot}</span>
                  <span className="text-sm leading-6 text-text">{item.title}</span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{item.company}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
      <article className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Progress Snapshot</p>
          <span className="text-xs text-muted">Week view</span>
        </div>
        <div className="mt-4 space-y-4">
          {dashboard.weeklyProgress.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-border bg-black/10 p-4 text-sm text-muted">
              Progress metrics will appear after skills and tasks are seeded.
            </div>
          ) : null}
          {dashboard.weeklyProgress.map((metric) => (
            <div key={metric.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-xs uppercase tracking-[0.22em] text-muted">{metric.percent}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-[color:var(--track)]">
                <div className="h-2.5 rounded-full bg-[#d8d0c4]" style={{ width: `${metric.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
