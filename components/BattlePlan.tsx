import type { BattlePlanItem } from "@/lib/datastore/types";

interface BattlePlanProps {
  items: BattlePlanItem[];
}

const toneMap: Record<string, string> = {
  high: "bg-[#f06b4d]",
  medium: "bg-[#f2cc47]",
  low: "bg-[#41b649]",
  derived: "bg-[#8f45f2]"
};

export function BattlePlan({ items }: BattlePlanProps) {
  return (
    <section className="panel p-6 md:p-7">
      <h2 className="text-[1.9rem] font-semibold tracking-[-0.045em]">Today&apos;s Battle Plan</h2>
      <div className="mt-6">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-black/10 p-5">
            <p className="text-sm text-text">No battle plan yet.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add rows in `daily_plan` or run a sync so the dashboard can derive the next sequence.
            </p>
          </div>
        ) : null}
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`grid gap-3 py-4 first:pt-0 last:pb-0 ${index < items.length - 1 ? "border-b border-border/70" : ""}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-[0.55rem] h-4 w-4 shrink-0 rounded-full ${toneMap[item.urgency] || "bg-[#8f45f2]"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[1.1rem] font-semibold tracking-[-0.02em] text-[#d5a15f]">
                    {item.slot}
                  </span>
                  <h3 className="text-[1.18rem] font-medium tracking-[-0.03em] text-text">{item.title}</h3>
                  {item.company ? (
                    <span className="text-sm font-medium text-muted">{item.company}</span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-[34rem] text-[1.05rem] leading-8 text-muted">{item.notes}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
