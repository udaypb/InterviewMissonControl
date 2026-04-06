export function coerceNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clampPercent(value: string | number): number {
  const numeric = typeof value === "number" ? value : coerceNumber(value);
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function compactText(value: string, fallback: string): string {
  return value.trim() || fallback;
}

export function formatCountLabel(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}
