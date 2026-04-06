"use client";

import { dashboardTabs } from "@/config/dashboard";

export type DashboardTab = (typeof dashboardTabs)[number];

interface TabsProps {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

export function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border/80 pb-4">
      {dashboardTabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded-[16px] border px-5 py-[0.9rem] text-lg font-medium tracking-[-0.02em] transition ${
            activeTab === tab
              ? "border-[#585858] bg-[#2b2b2b] text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              : "border-border/90 bg-transparent text-text/92 hover:border-[#4d4d4d] hover:bg-[#292929]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
