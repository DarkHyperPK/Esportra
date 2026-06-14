import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { OutlineButton, SuccessButton } from '@/components/ui/app-buttons';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBRGames, useUpdateBRGame } from '@/hooks/useBRGames';
import { useBRLobbyResults } from '@/hooks/useBRLobbies';
import { RoundResultsGrid } from '@/components/organizer/br/RoundResultsGrid';
import { RoundEvidencePanel } from '@/components/organizer/br/RoundEvidencePanel';
import type { BRGroupTeam } from '@/types/brGroups';
import type { BRGame } from '@/types/brLobbies';
import type { BRMapConfig, BRMapCatalogItem } from '@/types/battleRoyale';
import { resolveMapFromConfig } from '@/hooks/useBRStageConfig';
import { BR_FEATURE_FLAGS } from '@/config/brFeatureFlags';
import { validateLiveActionInTournamentWindow } from '@/utils/tournamentScheduleValidation';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Play, CheckCircle, ChevronDown, ChevronRight, Clock, AlertTriangle, Undo2 } from 'lucide-react';

interface ScoringPreset {
  placements: number[];
  killPoints: number;
  killCap: number | null;
}

interface BRGameRunListProps {
  lobbyId: string;
  stageId: string;
  groupId: string;
  lobbyStatus: string;
  lobbyCode: string | null;
  teams: BRGroupTeam[];
  scoringPreset: ScoringPreset;
  mapConfig: BRMapConfig;
  mapCatalogItems?: BRMapCatalogItem[];
  tournamentStartDate?: string | null;
  tournamentEndDate?: string | null;
  realtimeConnected?: boolean;
}

export const BRGameRunList: React.FC<BRGameRunListProps> = ({
  lobbyId,
  stageId,
  groupId,
  lobbyStatus,
  lobbyCode,
  teams,
  scoringPreset,
  mapConfig,
  mapCatalogItems = [],
  tournamentStartDate,
  tournamentEndDate,
  realtimeConnected = false,
}) => {
  const { toast } = useToast();
  const { data: games = [], isLoading } = useBRGames(lobbyId);
  const updateGame = useUpdateBRGame(stageId, groupId, lobbyId);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  const activeGameId = games.find((g) => g.status === 'active')?.id ?? null;

  useEffect(() => {
    if (!activeGameId) return;
    setExpandedGameId((current) => current ?? activeGameId);
  }, [activeGameId]);

  if (isLoading) {
    return <div className="h-16 rounded-lg bg-white/5 animate-pulse" />;
  }

  if (games.length === 0) {
    return (
      <p className="text-xs text-zinc-500 px-2 py-3">
        No games yet. Create group lobbies from the Schedule tab to generate games.
      </p>
    );
  }

  const lobbyIsLive = lobbyStatus === 'active' && Boolean(lobbyCode?.trim());
  const sortedGames = [...games].sort((a, b) => a.game_number - b.game_number);
  const liveWindowError = validateLiveActionInTournamentWindow(
    tournamentStartDate,
    tournamentEndDate,
    'Starting a game',
  );

  const canStartGame = (gameNumber: number, status: string) => {
    if (!lobbyIsLive || status !== 'pending') return false;
    if (liveWindowError) return false;
    if (gameNumber <= 1) return true;
    const previous = sortedGames.find((g) => g.game_number === gameNumber - 1);
    return previous?.status === 'completed';
  };

  const handleStartGame = async (
    gameId: string,
    gameNumber: number,
    map: string | null,
    queueTimerMinutes: number | null,
  ) => {
    if (liveWindowError) {
      toast({
        title: 'Outside tournament window',
        description: liveWindowError,
        variant: 'destructive',
      });
      return;
    }
    if (!canStartGame(gameNumber, 'pending')) {
      toast({
        title: 'Complete the previous game first',
        description: `Game ${gameNumber} can only start after Game ${gameNumber - 1} is completed.`,
        variant: 'destructive',
      });
      return;
    }
    if (
      BR_FEATURE_FLAGS.mapsEnabled
      && mapConfig.mode === 'per_round'
      && supportsPerGameMaps(mapConfig, mapCatalogItems)
      && !map?.trim()
    ) {
      toast({
        title: 'Map required',
        description: `Select a map for Game ${gameNumber} before starting it.`,
        variant: 'destructive',
      });
      return;
    }
    await updateGame.mutateAsync({
      gameId,
      status: 'active',
      map,
      queueTimerMinutes,
    });
  };

  const handleReopenGame = async (gameId: string) => {
    await updateGame.mutateAsync({ gameId, status: 'active' });
    toast({
      title: 'Game re-opened',
      description: 'You can approve evidence and edit results again.',
    });
  };

  return (
    <div className="space-y-2 border-t border-white/5 pt-3 mt-3">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide px-1">Games in this lobby</p>
      {!lobbyIsLive && (
        <p className="text-[10px] text-amber-300/90 px-1 leading-relaxed">
          Start the group lobby with a lobby code above before starting individual games.
        </p>
      )}
      {lobbyIsLive && liveWindowError && (
        <p className="text-[10px] text-amber-300/90 px-1 leading-relaxed">{liveWindowError}</p>
      )}
      {sortedGames.map((game) => (
        <BRGameRunRow
          key={game.id}
          game={game}
          lobbyId={lobbyId}
          stageId={stageId}
          groupId={groupId}
          lobbyStatus={lobbyStatus}
          teams={teams}
          scoringPreset={scoringPreset}
          mapConfig={mapConfig}
          mapCatalogItems={mapCatalogItems}
          canStartGame={canStartGame(game.game_number, game.status)}
          isExpanded={expandedGameId === game.id}
          onToggle={() => setExpandedGameId((id) => (id === game.id ? null : game.id))}
          onStartGame={(map, queueTimerMinutes) => handleStartGame(game.id, game.game_number, map, queueTimerMinutes)}
          onCompleteGame={(map) => updateGame.mutateAsync({ gameId: game.id, status: 'completed', map })}
          onReopenGame={() => handleReopenGame(game.id)}
          onMapUpdate={(map) => updateGame.mutateAsync({ gameId: game.id, map })}
          onQueueSave={(queueTimerMinutes) => updateGame.mutateAsync({ gameId: game.id, queueTimerMinutes })}
          isUpdating={updateGame.isPending}
          realtimeConnected={realtimeConnected}
        />
      ))}
    </div>
  );
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-zinc-500/30 text-zinc-400',
  active: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  completed: 'border-emerald-500/30 text-emerald-400',
};

function gameMapPool(mapConfig: BRMapConfig, mapCatalogItems: BRMapCatalogItem[]): string[] {
  if (mapCatalogItems.length > 0) return mapCatalogItems.map((item) => item.name);
  return mapConfig.pool ?? [];
}

function supportsPerGameMaps(mapConfig: BRMapConfig, mapCatalogItems: BRMapCatalogItem[]): boolean {
  if (!BR_FEATURE_FLAGS.mapsEnabled) return false;
  return gameMapPool(mapConfig, mapCatalogItems).length > 0;
}

const BRGameRunRow: React.FC<{
  game: BRGame;
  lobbyId: string;
  stageId: string;
  groupId: string;
  lobbyStatus: string;
  teams: BRGroupTeam[];
  scoringPreset: ScoringPreset;
  mapConfig: BRMapConfig;
  mapCatalogItems: BRMapCatalogItem[];
  canStartGame: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onStartGame: (map: string | null, queueTimerMinutes: number | null) => Promise<unknown>;
  onCompleteGame: (map: string | null) => Promise<unknown>;
  onReopenGame: () => Promise<unknown>;
  onMapUpdate: (map: string | null) => Promise<unknown>;
  onQueueSave: (queueTimerMinutes: number | null) => Promise<unknown>;
  isUpdating: boolean;
  realtimeConnected?: boolean;
}> = ({
  game,
  lobbyId,
  stageId,
  groupId,
  lobbyStatus,
  teams,
  scoringPreset,
  mapConfig,
  mapCatalogItems,
  canStartGame,
  isExpanded,
  onToggle,
  onStartGame,
  onCompleteGame,
  onReopenGame,
  onMapUpdate,
  onQueueSave,
  isUpdating,
  realtimeConnected = false,
}) => {
  const { results, isLoading: resultsLoading, submitResults } = useBRLobbyResults(
    isExpanded ? lobbyId : null,
    stageId,
    groupId,
    { gameNumber: game.game_number },
  );
  const [mapInput, setMapInput] = useState(
    game.map ?? resolveMapFromConfig(mapConfig, game.game_number) ?? '',
  );
  const [queueTimerInput, setQueueTimerInput] = useState(
    game.queue_timer_minutes != null ? String(game.queue_timer_minutes) : '5',
  );

  const showMapPicker = supportsPerGameMaps(mapConfig, mapCatalogItems);
  const mapPool = gameMapPool(mapConfig, mapCatalogItems);

  useEffect(() => {
    setMapInput(game.map ?? resolveMapFromConfig(mapConfig, game.game_number) ?? '');
  }, [game.id, game.map, game.game_number, mapConfig]);

  useEffect(() => {
    if (game.queue_timer_minutes != null) {
      setQueueTimerInput(String(game.queue_timer_minutes));
    }
  }, [game.id, game.queue_timer_minutes]);

  const handleMapChange = async (mapName: string) => {
    const next = mapName.trim();
    setMapInput(next);
    if (game.status === 'completed') return;
    if ((game.map ?? '') === next) return;
    await onMapUpdate(next || null);
  };

  const parseQueueTimerMinutes = (): number | null => {
    const trimmed = queueTimerInput.trim();
    if (trimmed === '') return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const queueDirty = game.status === 'pending'
    && parseQueueTimerMinutes() !== (game.queue_timer_minutes ?? null)
    && queueTimerInput.trim() !== '';

  const statusClass = STATUS_COLORS[game.status] ?? STATUS_COLORS.pending;

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.03]"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
        <span className="text-sm font-medium text-white">Game {game.game_number}</span>
        {mapInput && showMapPicker && (
          <span className="text-[10px] text-zinc-500 truncate max-w-[8rem]">{mapInput}</span>
        )}
        {game.queue_timer_minutes ? (
          <span className="text-[10px] text-zinc-500">Queue {game.queue_timer_minutes}m</span>
        ) : null}
        {(game.evidence_count ?? 0) > 0 && (
          <span className="text-[10px] text-amber-300/90">
            {game.evidence_count} evidence
          </span>
        )}
        <Badge variant="outline" className={`ml-auto text-[10px] ${statusClass}`}>{game.status}</Badge>
        {game.scheduled_at && (
          <span className="text-[10px] text-zinc-500">
            {new Date(game.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5">
          {showMapPicker && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Map
              </p>
              <Select
                value={mapInput || undefined}
                onValueChange={(value) => { void handleMapChange(value); }}
                disabled={game.status === 'completed'}
              >
                <SelectTrigger className="h-9 text-sm max-w-xs bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select map" />
                </SelectTrigger>
                <SelectContent>
                  {mapPool.map((mapName) => (
                    <SelectItem key={mapName} value={mapName}>{mapName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {game.status === 'pending' && (
            <div className="space-y-2">
              {queueDirty && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-100/90 leading-relaxed">
                    Queue timer not saved yet — tab away from the field or start the game to apply.
                  </p>
                </div>
              )}
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Queue timer (minutes)
              </p>
              <Input
                type="number"
                min={0}
                max={180}
                value={queueTimerInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setQueueTimerInput('');
                    return;
                  }
                  const clamped = Math.max(0, Math.min(180, Number.parseInt(raw, 10) || 0));
                  setQueueTimerInput(String(clamped));
                }}
                onBlur={() => {
                  const next = parseQueueTimerMinutes();
                  if (next === (game.queue_timer_minutes ?? null)) return;
                  void onQueueSave(next);
                }}
                placeholder="e.g. 5"
                className="h-9 text-sm max-w-[8rem] bg-white/5 border-white/10 text-white"
              />
              <p className="text-[10px] text-zinc-600 leading-relaxed">
                Countdown appears in Match Room when you start this game. Use 0 to skip the queue window.
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {game.status === 'pending' && (
              <button
                type="button"
                disabled={isUpdating || !canStartGame}
                onClick={() => void onStartGame(mapInput || null, parseQueueTimerMinutes())}
                className="inline-flex h-8 items-center justify-center gap-2 rounded-none border border-amber-500/30 bg-transparent px-3 font-mono text-xs font-bold uppercase tracking-wider text-amber-300 transition-colors hover:border-amber-500/50 hover:bg-amber-500/10 disabled:pointer-events-none disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" /> Start game
              </button>
            )}
            {game.status === 'active' && (
              <SuccessButton
                size="sm"
                disabled={isUpdating}
                onClick={() => onCompleteGame(mapInput || null)}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete game
              </SuccessButton>
            )}
            {game.status === 'completed' && (
              <OutlineButton
                size="sm"
                disabled={isUpdating}
                onClick={() => { void onReopenGame(); }}
              >
                <Undo2 className="w-3.5 h-3.5 mr-1" /> Re-open game
              </OutlineButton>
            )}
          </div>
          {game.status === 'completed' && (game.evidence_count ?? 0) > 0 && (
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              This game is completed. Re-open it to approve pending evidence or edit results.
            </p>
          )}
          {resultsLoading ? (
            <div className="h-8 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <RoundResultsGrid
              roundId={lobbyId}
              teams={teams}
              existingResults={results}
              scoringPreset={scoringPreset}
              onSave={async (inputs) => {
                await submitResults.mutateAsync({
                  lobbyId,
                  gameNumber: game.game_number,
                  results: inputs,
                });
              }}
              isSaving={submitResults.isPending}
              isLocked={game.status === 'completed'}
            />
          )}
          <RoundEvidencePanel
            roundId={lobbyId}
            stageId={stageId}
            groupId={groupId}
            gameNumber={game.game_number}
            gameId={game.id}
            gameStatus={game.status}
            lobbyStatus={lobbyStatus}
            onReopenGame={onReopenGame}
            realtimeConnected={realtimeConnected}
          />
        </div>
      )}
    </div>
  );
};
