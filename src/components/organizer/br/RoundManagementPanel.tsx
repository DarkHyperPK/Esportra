import React, { useState, useEffect } from 'react';
import { useBRRounds, useBRRoundResults } from '@/hooks/useBRRounds';
import { RoundResultsGrid } from './RoundResultsGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Play,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Key,
  RefreshCw,
  Undo2,
  Clock,
} from 'lucide-react';
import type { BRGroupTeam } from '@/types/brGroups';
import type { BRRound, BRResultInput } from '@/types/brRounds';

interface ScoringPreset {
  placements: number[];
  killPoints: number;
  killCap: number | null;
}

interface RoundManagementPanelProps {
  stageId: string;
  groupId: string;
  groupName: string;
  teams: BRGroupTeam[];
  scoringPreset: ScoringPreset;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'border-zinc-500/30 text-zinc-400' },
  active: { label: 'Live', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
  completed: { label: 'Completed', color: 'border-emerald-500/30 text-emerald-400' },
};

export const RoundManagementPanel: React.FC<RoundManagementPanelProps> = ({
  stageId,
  groupId,
  groupName,
  teams,
  scoringPreset,
}) => {
  const { rounds, isLoading, error, refetch, createRound, updateRound } = useBRRounds(stageId, groupId);
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null);
  // Reset expansion if the expanded round was deleted
  useEffect(() => {
    if (expandedRoundId && !rounds.some(r => r.id === expandedRoundId)) {
      setExpandedRoundId(null);
    }
  }, [rounds, expandedRoundId]);
  const [confirmAction, setConfirmAction] = useState<{ roundId: string; action: 'start' | 'complete' | 'reopen' } | null>(null);

  const handleCreateRound = async () => {
    try {
      await createRound.mutateAsync({});
    } catch {
      /* toast handled by hook */
    }
  };

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    const { roundId, action } = confirmAction;
    const statusMap = { start: 'active', complete: 'completed', reopen: 'active' } as const;
    try {
      await updateRound.mutateAsync({ roundId, status: statusMap[action] });
    } catch {
      /* toast handled by hook */
    } finally {
      setConfirmAction(null);
    }
  };

  const handleLobbyCodeUpdate = async (roundId: string, lobbyCode: string) => {
    try {
      await updateRound.mutateAsync({ roundId, lobbyCode: lobbyCode || null });
    } catch {
      /* toast handled by hook */
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3">
        <span>Failed to load rounds</span>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-6 text-xs text-red-300">
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">{groupName} — Rounds</h4>
        <Button
          onClick={handleCreateRound}
          disabled={createRound.isPending}
          size="sm"
          className="h-7 text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10"
        >
          <Plus className="w-3 h-3 mr-1" />
          {createRound.isPending ? 'Creating...' : 'New Round'}
        </Button>
      </div>

      {/* Round List */}
      {rounds.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-6">
          No rounds yet. Click "New Round" to create the first round.
        </p>
      ) : (
        <div className="space-y-2">
          {rounds.map((round) => (
            <RoundRow
              key={round.id}
              round={round}
              stageId={stageId}
              groupId={groupId}
              teams={teams}
              scoringPreset={scoringPreset}
              isExpanded={expandedRoundId === round.id}
              onToggle={() => setExpandedRoundId(expandedRoundId === round.id ? null : round.id)}
              onStatusAction={(action) => setConfirmAction({ roundId: round.id, action })}
              onLobbyCodeUpdate={(code) => handleLobbyCodeUpdate(round.id, code)}
              isUpdating={updateRound.isPending}
            />
          ))}
        </div>
      )}

      {/* Status Change Confirmation */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="bg-[#121214] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirmAction?.action === 'start' && 'Start Round?'}
              {confirmAction?.action === 'complete' && 'Complete Round?'}
              {confirmAction?.action === 'reopen' && 'Re-open Round?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {confirmAction?.action === 'start' && 'This will set the round to active. Teams will be notified.'}
              {confirmAction?.action === 'complete' && 'This will lock the round results. You can re-open later if needed.'}
              {confirmAction?.action === 'reopen' && 'This will unlock the round for result editing. Any leaderboard standings calculated from this round may change if results are modified.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              className={
                confirmAction?.action === 'start'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : confirmAction?.action === 'complete'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }
            >
              {confirmAction?.action === 'start' && 'Start Round'}
              {confirmAction?.action === 'complete' && 'Complete Round'}
              {confirmAction?.action === 'reopen' && 'Re-open'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── RoundRow (internal) ─────────────────────────────────────────────────────

interface RoundRowProps {
  round: BRRound;
  stageId: string;
  groupId: string;
  teams: BRGroupTeam[];
  scoringPreset: ScoringPreset;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusAction: (action: 'start' | 'complete' | 'reopen') => void;
  onLobbyCodeUpdate: (code: string) => void;
  isUpdating: boolean;
}

const RoundRow: React.FC<RoundRowProps> = ({
  round,
  stageId,
  groupId,
  teams,
  scoringPreset,
  isExpanded,
  onToggle,
  onStatusAction,
  onLobbyCodeUpdate,
  isUpdating,
}) => {
  const { results, isLoading: resultsLoading, submitResults } = useBRRoundResults(
    isExpanded ? round.id : null,
    stageId,
    groupId
  );
  const [lobbyCode, setLobbyCode] = useState(round.lobby_code ?? '');
  const [lobbyDirty, setLobbyDirty] = useState(false);
  const statusCfg = STATUS_CONFIG[round.status] ?? STATUS_CONFIG.pending;

  const handleLobbySave = () => {
    if (!lobbyDirty) return;
    onLobbyCodeUpdate(lobbyCode);
    setLobbyDirty(false);
  };

  const handleResultSave = async (resultInputs: BRResultInput[]) => {
    await submitResults.mutateAsync({ roundId: round.id, results: resultInputs });
  };

  return (
    <div className="bg-[#0a0a0c] border border-white/5 rounded-xl overflow-hidden">
      {/* Round Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-white">Round {round.round_number}</span>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
          {statusCfg.label}
        </Badge>
        {round.result_count > 0 && (
          <span className="text-[10px] text-zinc-600">
            {round.result_count} results
          </span>
        )}
        <span className="ml-auto flex items-center gap-3 text-[10px] text-zinc-600">
          {round.scheduled_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(round.scheduled_at).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
            </span>
          )}
          {round.lobby_code ? `${round.lobby_code}` : 'No lobby code'}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/5 px-4 py-4 space-y-4">
          {/* Lobby Code + Actions Row */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Key className="w-3 h-3" /> Lobby Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={lobbyCode}
                  onChange={(e) => { setLobbyCode(e.target.value); setLobbyDirty(true); }}
                  placeholder="Enter lobby code..."
                  disabled={round.status === 'completed'}
                  className="h-8 text-xs bg-white/5 border-white/10 text-white"
                />
                {lobbyDirty && (
                  <Button
                    size="sm"
                    onClick={handleLobbySave}
                    disabled={isUpdating}
                    className="h-8 text-xs bg-white/10 hover:bg-white/15 text-white"
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>

            {/* Status Actions */}
            <div className="flex gap-2">
              {round.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => onStatusAction('start')}
                  disabled={isUpdating}
                  className="h-8 text-xs bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/20"
                >
                  <Play className="w-3 h-3 mr-1" /> Start
                </Button>
              )}
              {round.status === 'active' && (
                <Button
                  size="sm"
                  onClick={() => onStatusAction('complete')}
                  disabled={isUpdating}
                  className="h-8 text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20"
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Complete
                </Button>
              )}
              {round.status === 'completed' && (
                <Button
                  size="sm"
                  onClick={() => onStatusAction('reopen')}
                  disabled={isUpdating}
                  className="h-8 text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/20"
                >
                  <Undo2 className="w-3 h-3 mr-1" /> Re-open
                </Button>
              )}
            </div>
          </div>

          {/* Results Grid */}
          {resultsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <RoundResultsGrid
              roundId={round.id}
              teams={teams}
              existingResults={results}
              scoringPreset={scoringPreset}
              onSave={handleResultSave}
              isSaving={submitResults.isPending}
              isLocked={round.status === 'completed'}
            />
          )}
        </div>
      )}
    </div>
  );
};
