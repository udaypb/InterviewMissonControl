export const dashboardConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Interview Mission Control",
  ownerLabel: "Uday's Interview Mission Control",
  statusLabels: {
    pipelines: "active pipelines",
    grind: "grind day"
  },
  pollingIntervalMs: 45_000,
  cacheTtlMs: 30_000
} as const;

export const dashboardTabs = [
  "Dashboard",
  "Interview Calendar",
  "Past",
  "Skill Map",
  "Coding Tracker",
  "Resources"
] as const;
