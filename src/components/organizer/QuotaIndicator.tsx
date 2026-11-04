interface QuotaIndicatorProps {
  used: number;
  limit: number;
  resetsAt: string; // ISO 8601
}

function formatResetDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameYear) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Displays the organizer's monthly event quota.
 * Organizer Pro is licensed per tournament and does not lift the monthly
 * free-event limit (the backend trigger counts every new event), so the
 * indicator shows for every organizer.
 * Shows an amber warning band when the monthly limit is reached.
 */
export function QuotaIndicator({ used, limit, resetsAt }: QuotaIndicatorProps) {
  const atLimit = used >= limit;
  const formattedDate = formatResetDate(resetsAt);

  if (atLimit) {
    return (
      <div
        className="flex items-center gap-2 border border-amber-400/20 bg-amber-400/[0.05] px-4 py-2 text-[12px]"
        role="status"
        aria-label={`Monthly event quota: ${used} of ${limit} used. Monthly limit reached.`}
      >
        <span className="font-mono font-semibold text-amber-300">
          {used} of {limit}
        </span>
        <span className="text-amber-200">Monthly limit reached</span>
        {formattedDate && (
          <>
            <span className="text-zinc-700" aria-hidden>·</span>
            <span className="text-zinc-500">Resets {formattedDate}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-[12px] text-zinc-500"
      role="status"
      aria-label={`Monthly event quota: ${used} of ${limit} used`}
    >
      <span className="font-mono font-semibold text-zinc-300">
        {used} of {limit}
      </span>
      <span>events used this month</span>
      {formattedDate && (
        <>
          <span className="text-zinc-700" aria-hidden>·</span>
          <span>Resets {formattedDate}</span>
        </>
      )}
    </div>
  );
}
