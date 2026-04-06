export const dashboardConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Interview Mission Control",
  ownerLabel: "Uday's Interview Mission Control",
  statusLabels: {
    pipelines: "active pipelines",
    grind: "grind day"
  },
  cacheTtlMs: 30_000
} as const;

export const dashboardTabs = [
  "Dashboard",
  "Todo",
  "Interview Calendar",
  "Past",
  "Skill Map",
  "Coding Tracker",
  "Resources"
] as const;
