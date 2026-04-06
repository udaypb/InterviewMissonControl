interface StatusBarProps {
  lastUpdated: string;
  syncStatus: string;
  syncMessage: string;
  configLabel: string;
  configDetail: string;
  configHealthy: boolean;
  isSyncing: boolean;
  onSync: () => void;
}

export function StatusBar({
  lastUpdated,
  syncStatus,
  syncMessage,
  configLabel,
  configDetail,
  configHealthy,
  isSyncing,
  onSync
}: StatusBarProps) {
  return (
    <section className="panel grid gap-3 p-4 md:grid-cols-[1.25fr_1fr_auto] md:items-center">
      <div className="soft-panel px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Last synced</p>
        <p className="mt-2 text-sm font-medium text-text">{lastUpdated}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{syncMessage}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="soft-panel px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Sync state</p>
          <span className="mt-2 inline-flex rounded-full border border-border bg-[#2e2e2e] px-3 py-2 text-xs uppercase tracking-[0.2em] text-text">
            {syncStatus}
          </span>
        </div>
        <div className="soft-panel px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Config health</p>
          <span
            className={`mt-2 inline-flex rounded-full border px-3 py-2 text-xs uppercase tracking-[0.2em] ${
              configHealthy
                ? "border-[#6bb58a]/50 bg-[#102017] text-[#9ad5b3]"
                : "border-[#d0a765]/40 bg-[#261d0f] text-[#f0c77d]"
            }`}
          >
            {configLabel}
          </span>
          <p className="mt-2 text-xs leading-5 text-muted">{configDetail}</p>
        </div>
      </div>
      <div className="flex justify-start md:justify-end">
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="rounded-full border border-border bg-[#2d2d2d] px-5 py-3 text-sm font-medium text-text transition hover:border-text/30 hover:bg-[#323232] disabled:opacity-50"
        >
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
    </section>
  );
}
