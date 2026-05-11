import type { SeasonQualificationRecord, SeasonQualificationType } from '@/types/season';

interface Props {
  qualifications: SeasonQualificationRecord[];
  canManage: boolean;
  destinationOptions: { id: string; name: string }[];
  pendingRecordId: string | null;
  onManage: (payload: {
    recordId: string;
    status?: string;
    qualificationType?: string;
    destinationNodeId?: string;
    notes?: string;
  }) => void;
}

const STATUS_BADGE: Record<string, string> = {
  earned: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  confirmed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  accepted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  invited: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  revoked: 'border-red-500/30 bg-red-500/10 text-red-400',
  declined: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
};

const SeasonQualificationsPanel = ({
  qualifications,
  canManage,
  destinationOptions,
  pendingRecordId,
  onManage,
}: Props) => {
  if (qualifications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] py-14 text-center">
        <p className="text-sm text-zinc-500">No qualification records yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Records are created automatically when points rules fire during recalculation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {qualifications.map((record) => {
        const isBusy = pendingRecordId === record.id;
        const badgeClass =
          STATUS_BADGE[record.status] ?? 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400';

        return (
          <div
            key={record.id}
            className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0a0a0c] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">
                  {record.displayName ?? record.teamId ?? record.userId ?? record.id}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                >
                  {record.status}
                </span>
                {record.qualificationType && (
                  <span className="rounded border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-[10px] capitalize text-zinc-400">
                    {record.qualificationType}
                  </span>
                )}
              </div>
              {record.sourceNodeName && (
                <p className="mt-0.5 text-xs text-zinc-500">From: {record.sourceNodeName}</p>
              )}
              {record.notes && (
                <p className="mt-0.5 text-xs italic text-zinc-600">"{record.notes}"</p>
              )}
            </div>

            {canManage && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {destinationOptions.length > 0 && !record.destinationNodeId && (
                  <select
                    className="h-8 rounded-lg border border-white/[0.08] bg-black/30 px-2 text-xs text-zinc-300 focus:outline-none"
                    disabled={isBusy}
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      onManage({ recordId: record.id, destinationNodeId: e.target.value });
                    }}
                  >
                    <option value="">Route to…</option>
                    {destinationOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                )}
                {record.status === 'earned' && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      onManage({
                        recordId: record.id,
                        status: 'confirmed',
                        qualificationType: record.qualificationType as SeasonQualificationType | undefined,
                      })
                    }
                    className="h-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    {isBusy ? 'Saving…' : 'Confirm'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SeasonQualificationsPanel;
