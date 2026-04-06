interface HeaderProps {
  title: string;
  subtitle: string;
  activePipelines: number;
}

export function Header({ title, subtitle, activePipelines }: HeaderProps) {
  return (
    <header className="relative border-b border-border/80 pb-5 md:pb-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.045em] md:text-[2.75rem]">{title}</h1>
          <p className="mt-2 text-sm text-muted md:text-[1.02rem]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <span className="rounded-full border border-[#e7d1b0]/25 bg-[#f5e7d0] px-4 py-2 text-sm font-semibold text-[#6d5232]">
            {activePipelines} active pipelines
          </span>
          <span className="rounded-full border border-[#cfe4d5]/30 bg-[#e4f2e8] px-4 py-2 text-sm font-semibold text-[#436653]">
            Grind day 1
          </span>
        </div>
      </div>
    </header>
  );
}
