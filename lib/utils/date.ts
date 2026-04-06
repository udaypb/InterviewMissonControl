export function getNow(): Date {
  return new Date();
}

const APP_TIMEZONE = "America/Los_Angeles";

export function getTodayIsoDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(getNow());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : getNow().toISOString().slice(0, 10);
}

export function getRollingWindow(daysAhead = 21): { timeMin: string; timeMax: string } {
  const now = getNow();
  const max = new Date(now);
  max.setDate(max.getDate() + daysAhead);
  return {
    timeMin: now.toISOString(),
    timeMax: max.toISOString()
  };
}

export function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

export function formatDateTimeLabel(date: string, time: string): string {
  const dateLabel = formatDateLabel(date);
  return time ? `${dateLabel} · ${time}` : dateLabel;
}

export function formatTimeLabel(value: string): string {
  if (!value) {
    return "TBD";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

export function isoDateFromDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

export function humanNowLine(): string {
  const now = getNow();
  const dateLine = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "long"
  }).format(now);
  return `${dateLine} • Bay Area • Focus mode`;
}

export function compareIsoDates(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

export function relativeUrgency(date: string): string {
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) {
    return "Soon";
  }

  const diffDays = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
  if (diffDays <= 0) {
    return "Now";
  }
  if (diffDays <= 2) {
    return "AM";
  }
  if (diffDays <= 5) {
    return "PM";
  }
  return "Eve";
}
