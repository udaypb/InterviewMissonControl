import type { ProgressMetric } from "@/lib/datastore/types";

interface ProgressPanelProps {
  metrics: ProgressMetric[];
  onOpenSkillMap?: () => void;
}

export function ProgressPanel({ metrics, onOpenSkillMap }: ProgressPanelProps) {
  return (
    <section className="panel p-6 md:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Weekly Prep Progress</p>
          <h2 className="mt-2 text-[1.85rem] font-semibold tracking-[-0.045em]">Readiness by signal area</h2>
        </div>
        {onOpenSkillMap ? (
          <button
            type="button"
            onClick={onOpenSkillMap}
            className="rounded-full border border-border bg-black/10 px-4 py-2 text-sm text-muted transition hover:border-[#505050] hover:text-text"
          >
            Open Skill Map
          </button>
        ) : null}
      </div>
      <div className="mt-6 space-y-5">
        {metrics.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-black/10 p-5">
            <p className="text-sm text-text">No progress metrics available.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Seed `skills`, `tasks`, and `behavioral_stories` to light up weekly progress.
            </p>
          </div>
        ) : null}
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[18px] border border-border/70 bg-black/10 px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{metric.label}</span>
              <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted">{metric.percent}%</span>
            </div>
            <div className="h-3 rounded-full bg-[color:var(--track)]">
              <div className="h-3 rounded-full bg-[#d8d0c4]" style={{ width: `${metric.percent}%` }} />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{metric.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
