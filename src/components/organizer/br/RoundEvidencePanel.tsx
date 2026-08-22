import React from 'react';
import { Badge } from '@/components/ui/badge';
import { OutlineButton, SuccessButton } from '@/components/ui/app-buttons';
import { useBRLobbyEvidence } from '@/hooks/useBRLobbies';
import { getApiErrorMessage } from '@/lib/apiClient';
import {
  canApproveEvidenceEntry,
  getBREvidenceRowKey,
} from '@/utils/brEvidenceNormalize';
import { CheckCircle2, ExternalLink, ImageIcon, RefreshCw, Undo2 } from 'lucide-react';

interface RoundEvidencePanelProps {
  roundId: string;
  stageId: string;
  groupId: string;
  gameNumber?: number;
  gameId?: string;
  gameStatus?: 'pending' | 'active' | 'completed';
  lobbyStatus?: string;
  realtimeConnected?: boolean;
  locked?: boolean;
}

export const RoundEvidencePanel: React.FC<RoundEvidencePanelProps> = ({
  roundId,
  stageId,
  groupId,
  gameNumber,
  gameId,
  gameStatus,
  lobbyStatus,
  realtimeConnected = false,
  locked = false,
}) => {
  const {
    evidence,
    isLoading,
    error,
    isError,
    refetch,
    approveEvidence,
    reopenEvidence,
    isUpdating,
  } = useBRLobbyEvidence(
    roundId,
    stageId,
    groupId,
    { realtimeConnected, gameNumber, gameId },
  );

  const hasPendingEvidence = evidence.some((entry) => !entry.reviewed);
  const gameBlocksApproval = gameStatus === 'completed';
  const lobbyBlocksApproval = lobbyStatus === 'completed';

  return (
    <div className="space-y-3">
      {(gameBlocksApproval || lobbyBlocksApproval) && hasPendingEvidence && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-amber-100">
            {lobbyBlocksApproval
              ? 'The lobby is completed. Re-open the lobby before approving evidence.'
              : 'This game is completed. Use Re-open game above to approve pending evidence.'}
          </p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-sm font-semibold text-white">
            Evidence submissions{gameNumber != null ? ` — Game ${gameNumber}` : ''}
          </h5>
          <p className="text-[11px] text-zinc-500">
            Approve screenshots to apply reported placement and kills to standings.
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
      ) : isError ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 space-y-2">
          <p className="text-sm text-rose-200">
            {getApiErrorMessage(error, { context: 'brEvidence' })}
          </p>
          <OutlineButton
            type="button"
            size="sm"
            onClick={() => { void refetch(); }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </OutlineButton>
        </div>
      ) : evidence.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <ImageIcon className="mx-auto mb-2 h-5 w-5 text-zinc-600" />
          <p className="text-sm text-zinc-400">No evidence submitted yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {evidence.map((entry) => {
            const resolvedGameNumber = entry.gameNumber ?? gameNumber;
            const approvable = canApproveEvidenceEntry(entry, gameNumber);
            const approved = entry.reviewed === true;

            return (
              <div
                key={getBREvidenceRowKey(entry, gameNumber)}
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
                          approved
                            ? 'border-emerald-500/30 text-emerald-300'
                            : 'border-amber-500/30 text-amber-300'
                        }
                      >
                        {approved ? 'Approved' : 'Pending approval'}
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

                    {!approved && !approvable && (
                      <p className="text-[11px] text-amber-300/80">
                        {resolvedGameNumber == null
                          ? 'Missing game number for this submission. Refresh and try again.'
                          : 'Player did not report placement and kills. Ask them to resubmit before approving.'}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <OutlineButton
                        type="button"
                        size="sm"
                        onClick={() => window.open(entry.imageUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Open
                      </OutlineButton>

                      {!approved && (
                        <SuccessButton
                          type="button"
                          size="sm"
                          onClick={() => approveEvidence({
                            entityId: entry.teamId,
                            gameNumber: resolvedGameNumber,
                          })}
                          disabled={locked || isUpdating || !approvable || gameBlocksApproval || lobbyBlocksApproval}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Approve result
                        </SuccessButton>
                      )}

                      {approved && (
                        <OutlineButton
                          type="button"
                          size="sm"
                          onClick={() => reopenEvidence({
                            entityId: entry.teamId,
                            gameNumber: resolvedGameNumber,
                          })}
                          disabled={locked || isUpdating}
                        >
                          <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                          Reopen
                        </OutlineButton>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
