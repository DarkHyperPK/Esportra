export const SETUP_STEPS = [
  "Connect desktop app",
  "Choose a match",
  "Preview the HUD",
  "Choose broadcast screens",
  "Add sponsors",
  "Assign talent",
  "Assign crew",
  "Review broadcast setup",
];
const eligible = new Set(["pending", "scheduled", "in_progress"]);
/** Unknown states are not eligible. The server remains authoritative. */
export function isBroadcastEligible(status: string | undefined) {
  return !!status && eligible.has(status);
}
export function matchTime(time: string | null | undefined) {
  if (!time) return "Time not scheduled";
  const date = new Date(time);
  return Number.isNaN(date.getTime())
    ? "Time not scheduled"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }) +
        " · " +
        Intl.DateTimeFormat().resolvedOptions().timeZone;
}
