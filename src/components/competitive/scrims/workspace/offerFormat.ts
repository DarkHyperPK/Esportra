/** "Mon Nov 2 · 8:00 PM", or a plain note when no time was proposed. */
export function formatProposedSlot(iso: string | null | undefined): string {
  if (!iso) return 'No time proposed';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No time proposed';
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} ${date} · ${time}`;
}
