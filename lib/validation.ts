export function sanitizeText(value?: string | null) {
  if (!value) return "";
  return value.trim().replace(/\s+/g, " ");
}

export function clampInt(raw: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
