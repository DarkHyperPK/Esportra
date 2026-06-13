import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { BRMapConfig, BRMapCatalogItem } from '@/types/battleRoyale';
import { BRMapOptionList, BRMapBadge } from '@/components/organizer/br/BRMapOptionList';
import { resolveMapForRound } from '@/utils/brConfigResolve';
import { BR_FEATURE_FLAGS } from '@/config/brFeatureFlags';
import { MapPin, Play, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

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
}) => {
  const { data: games = [], isLoading } = useBRGames(lobbyId);
  const updateGame = useUpdateBRGame(stageId, groupId, lobbyId);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

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
  const canStartGames = lobbyIsLive;

  return (
    <div className="space-y-2 border-t border-white/5 pt-3 mt-3">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide px-1">Games in this lobby</p>
      {!canStartGames && (
        <p className="text-[10px] text-amber-300/90 px-1 leading-relaxed">
          Start the group lobby with a lobby code above before starting individual games.
        </p>
      )}
      {games.map((game) => (
        <BRGameRunRow
          key={game.id}
          game={game}
          lobbyId={lobbyId}
          stageId={stageId}
          groupId={groupId}
          teams={teams}
          scoringPreset={scoringPreset}
          mapConfig={mapConfig}
          mapCatalogItems={mapCatalogItems}
          canStartGame={canStartGames}
          isExpanded={expandedGameId === game.id}
          onToggle={() => setExpandedGameId((id) => (id === game.id ? null : game.id))}
          onUpdateGame={updateGame.mutateAsync}
          isUpdating={updateGame.isPending}
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
  game: { id: string; game_number: number; map: string | null; status: string; scheduled_at: string | null };
  lobbyId: string;
  stageId: string;
  groupId: string;
  teams: BRGroupTeam[];
  scoringPreset: ScoringPreset;
  mapConfig: BRMapConfig;
  mapCatalogItems: BRMapCatalogItem[];
  canStartGame: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateGame: (params: { gameId: string; map?: string | null; status?: 'pending' | 'active' | 'completed' }) => Promise<unknown>;
  isUpdating: boolean;
}> = ({
  game,
  lobbyId,
  stageId,
  groupId,
  teams,
  scoringPreset,
  mapConfig,
  mapCatalogItems,
  canStartGame,
  isExpanded,
  onToggle,
  onUpdateGame,
  isUpdating,
}) => {
  const { results, isLoading: resultsLoading, submitResults } = useBRLobbyResults(
    isExpanded ? lobbyId : null,
    stageId,
    groupId,
    { gameNumber: game.game_number },
  );
  const [mapInput, setMapInput] = useState(
    game.map ?? resolveMapForRound(mapConfig, game.game_number) ?? '',
  );

  const showMapPicker = supportsPerGameMaps(mapConfig, mapCatalogItems);
  const mapPool = gameMapPool(mapConfig, mapCatalogItems);
  const selectedMapItem = mapCatalogItems.find((item) => item.name === mapInput);

  useEffect(() => {
    setMapInput(game.map ?? resolveMapForRound(mapConfig, game.game_number) ?? '');
  }, [game.id, game.map, game.game_number, mapConfig]);

  const handleMapChange = async (mapName: string) => {
    const next = mapName.trim();
    setMapInput(next);
    if (game.status === 'completed') return;
    if ((game.map ?? '') === next) return;
    await onUpdateGame({ gameId: game.id, map: next || null });
  };

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
              {mapCatalogItems.length > 0 ? (
                <BRMapOptionList
                  items={mapCatalogItems}
                  selected={mapInput ? [mapInput] : []}
                  selectable={game.status !== 'completed'}
                  onToggle={(mapName, checked) => {
                    void handleMapChange(checked ? mapName : '');
                  }}
                  columns={2}
                />
              ) : (
                <Select
                  value={mapInput || undefined}
                  onValueChange={(value) => { void handleMapChange(value); }}
                  disabled={game.status === 'completed'}
                >
                  <SelectTrigger className="h-9 text-sm max-w-xs bg-white/5 border-white/10">
                    <SelectValue placeholder="Select map" />
                  </SelectTrigger>
                  <SelectContent>
                    {mapPool.map((mapName) => (
                      <SelectItem key={mapName} value={mapName}>{mapName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedMapItem && game.status === 'completed' && (
                <BRMapBadge mapName={selectedMapItem.name} imageUrl={selectedMapItem.imageUrl} />
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {game.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-300"
                disabled={isUpdating || !canStartGame}
                onClick={() => onUpdateGame({ gameId: game.id, status: 'active', map: mapInput || null })}
              >
                <Play className="w-3.5 h-3.5 mr-1" /> Start game
              </Button>
            )}
            {game.status === 'active' && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500"
                disabled={isUpdating}
                onClick={() => onUpdateGame({ gameId: game.id, status: 'completed', map: mapInput || null })}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete game
              </Button>
            )}
          </div>
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
          />
        </div>
      )}
    </div>
  );
};
