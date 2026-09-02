export function parseWeightKg(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return Number.NaN;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return Number.NaN;

  return Math.abs(parsed) < 1000 ? parsed * 1000 : parsed;
}

export function normalizeWeightInput(value: string) {
  const parsedKg = parseWeightKg(value);
  return Number.isFinite(parsedKg) ? String(Math.round(parsedKg)) : value;
}

export function formatKg(value: number, fallback = "------") {
  return Number.isFinite(value) ? String(Math.round(value)) : fallback;
}
