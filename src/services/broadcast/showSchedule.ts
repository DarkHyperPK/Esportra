/** HTML datetime-local values use the operator's browser timezone. */
export function scheduleToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function scheduleInputToIso(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value))
    throw new Error("Choose a valid local date and time.");
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    scheduleToLocalInput(date.toISOString()) !==
      (value.length === 16 ? `${value}:00` : value)
  ) {
    throw new Error(
      "This local date or time does not exist. Choose another time.",
    );
  }
  return date.toISOString();
}
