import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBRLobbyEvidence } from '@/hooks/useBRLobbies';
import { CheckCircle2, ExternalLink, ImageIcon, ShieldCheck } from 'lucide-react';

interface RoundEvidencePanelProps {
  roundId: string;
  stageId: string;
  groupId: string;
  gameNumber?: number;
  gameId?: string;
  realtimeConnected?: boolean;
}

export const RoundEvidencePanel: React.FC<RoundEvidencePanelProps> = ({
  roundId,
  stageId,
  groupId,
  gameNumber,
  gameId,
  realtimeConnected = false,
}) => {
  const { evidence, isLoading, error, markReviewed, isUpdating } = useBRLobbyEvidence(
    roundId,
    stageId,
    groupId,
    { realtimeConnected, gameNumber, gameId },
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-sm font-semibold text-white">
            Evidence submissions{gameNumber != null ? ` — Game ${gameNumber}` : ''}
          </h5>
          <p className="text-[11px] text-zinc-500">
            Review player screenshots before finalizing game standings.
          </p>
        </div>
        <Badge variant="outline" className="border-white/10 text-zinc-300">
          {evidence.length} submitted
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-24 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200">
          Could not load evidence submissions. Try refreshing this panel.
        </div>
      ) : evidence.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <ImageIcon className="mx-auto mb-2 h-5 w-5 text-zinc-600" />
          <p className="text-sm text-zinc-400">No evidence submitted yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {evidence.map((entry) => (
            <div
              key={`${entry.teamId}-${entry.gameNumber ?? gameNumber ?? 'lobby'}`}
              className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start">
                <button
                  type="button"
                  onClick={() => window.open(entry.imageUrl, '_blank', 'noopener,noreferrer')}
                  className="group relative h-24 w-full overflow-hidden rounded-lg border border-white/10 bg-black/30 md:w-40"
                >
                  <img
                    src={entry.imageUrl}
                    alt={`${entry.teamName} evidence`}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{entry.teamName}</p>
                    {(entry.gameNumber ?? gameNumber) != null && (
                      <Badge variant="outline" className="border-white/10 text-zinc-400">
                        Game {entry.gameNumber ?? gameNumber}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        entry.reviewed
                          ? 'border-emerald-500/30 text-emerald-300'
                          : 'border-amber-500/30 text-amber-300'
                      }
                    >
                      {entry.reviewed ? 'Reviewed' : 'Pending review'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span>Placement: <span className="text-zinc-200">#{entry.placement ?? '—'}</span></span>
                    <span>Kills: <span className="text-zinc-200">{entry.kills ?? '—'}</span></span>
                    <span>
                      Submitted:{' '}
                      <span className="text-zinc-200">
                        {new Date(entry.submittedAt).toLocaleString()}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button"
                      type="button"
                      size="sm"
                      onClick={() => window.open(entry.imageUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Open
                    </button>

                    {!entry.reviewed && (
                      <button type="button"
                        type="button"
                        size="sm"
                        onClick={() => markReviewed({
                          entityId: entry.teamId,
                          reviewed: true,
                          gameNumber: entry.gameNumber ?? gameNumber,
                        })}
                        disabled={isUpdating}
                        className="bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/20"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Mark reviewed
                      </button>
                    )}

                    {entry.reviewed && (
                      <button type="button"
                        type="button"
                        size="sm"
                        onClick={() => markReviewed({
                          entityId: entry.teamId,
                          reviewed: false,
                          gameNumber: entry.gameNumber ?? gameNumber,
                        })}
                        disabled={isUpdating}
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        Re-open
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
