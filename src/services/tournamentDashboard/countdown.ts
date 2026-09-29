/** Short countdown label: "2h 5m", "4m 12s", "9s". Seconds are dropped when `withSeconds` is false. */
export function formatCountdown(ms: number, withSeconds = true): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return withSeconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  return withSeconds ? `${seconds}s` : '<1m';
}
