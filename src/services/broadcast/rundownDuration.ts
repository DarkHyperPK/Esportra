export function parseRundownDuration(value?: string | null): number | null {
  if (!value?.trim()) return null;
  const parts = value.trim().split(":");
  if (
    parts.length < 2 ||
    parts.length > 3 ||
    parts.some((part) => !/^\d{1,3}$/.test(part))
  )
    throw new Error("Use MM:SS or HH:MM:SS for duration.");
  const values = parts.map(Number);
  if (values[values.length - 1] > 59 || (values.length === 3 && values[1] > 59))
    throw new Error("Minutes and seconds must be below 60.");
  const seconds =
    values.length === 3
      ? values[0] * 3600 + values[1] * 60 + values[2]
      : values[0] * 60 + values[1];
  if (seconds > 86400)
    throw new Error("A segment duration cannot exceed 24 hours.");
  return seconds;
}

export function formatRundownDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60),
    remainder = seconds % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  return hours ? `${String(hours).padStart(2, "0")}:${clock}` : clock;
}
