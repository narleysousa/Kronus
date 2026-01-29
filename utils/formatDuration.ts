export const formatDurationMs = (durationMs: number) => {
  const safeMs = Math.max(0, durationMs);
  const totalSeconds = Math.round(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
};

/** Converte horas decimais em "Xh Ym Zs" (ex.: 13.5 → "13h 30m 00s"). */
export const formatHoursToHms = (hoursDecimal: number): string => {
  const totalSeconds = Math.round(Math.abs(hoursDecimal) * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const sign = hoursDecimal < 0 ? '-' : '';
  return `${sign}${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};
