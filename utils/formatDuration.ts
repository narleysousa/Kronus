export const formatDurationMs = (durationMs: number) => {
  const safeMs = Math.max(0, durationMs);
  const totalSeconds = Math.round(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
};
