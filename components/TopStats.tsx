import type { SummaryStat } from "@/lib/datastore/types";

interface TopStatsProps {
  stats: SummaryStat[];
}

export function TopStats({ stats }: TopStatsProps) {
  return (
    <section className="hidden gap-5 border-b border-border/80 pb-6 md:grid lg:grid-cols-3 lg:gap-8">
      {stats.length === 0 ? (
        <article className="panel p-5 lg:col-span-3">
          <p className="text-sm text-text">No dashboard stats available yet.</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Run a sync or seed the spreadsheet tabs to populate the control surface.
          </p>
        </article>
      ) : null}
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="border-border/70 lg:border-r lg:pr-8 [&:last-child]:lg:border-r-0 [&:last-child]:lg:pr-0"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">{stat.label}</p>
          <p className="mt-4 text-[2rem] font-semibold tracking-[-0.05em] md:text-[2.3rem]">{stat.value}</p>
          <p className="mt-2 max-w-[18rem] text-[1.05rem] leading-7 text-muted">{stat.detail}</p>
        </article>
      ))}
    </section>
  );
}
