import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBRGames, useUpdateBRGame } from '@/hooks/useBRGames';
import { useBRLobbyResults } from '@/hooks/useBRLobbies';
import { RoundResultsGrid } from '@/components/organizer/br/RoundResultsGrid';
import type { BRGroupTeam } from '@/types/brGroups';
import type { BRMapConfig, BRMapCatalogItem } from '@/types/battleRoyale';
import { BRMapOptionList } from '@/components/organizer/br/BRMapOptionList';
import { resolveMapForRound } from '@/utils/brConfigResolve';
import { Play, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface ScoringPreset {
  placements: number[];
  killPoints: number;
  killCap: number | null;
}

interface BRGameRunListProps {
  lobbyId: string;
  stageId: string;
  groupId: string;
  teams: BRGroupTeam[];
  scoringPreset: ScoringPreset;
  mapConfig: BRMapConfig;
  mapCatalogItems?: BRMapCatalogItem[];
}

export const BRGameRunList: React.FC<BRGameRunListProps> = ({
  lobbyId,
  stageId,
  groupId,
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
        No games materialized yet. Save the stage or create a lobby to generate games.
      </p>
    );
  }

  return (
    <div className="space-y-2 border-t border-white/5 pt-3 mt-3">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide px-1">Games in this lobby</p>
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

const BRGameRunRow: React.FC<{
  game: { id: string; game_number: number; map: string | null; status: string; scheduled_at: string | null };
  lobbyId: string;
  stageId: string;
  groupId: string;
  teams: BRGroupTeam[];
  scoringPreset: ScoringPreset;
  mapConfig: BRMapConfig;
  mapCatalogItems: BRMapCatalogItem[];
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
  const [mapInput, setMapInput] = useState(game.map ?? resolveMapForRound(mapConfig, game.game_number) ?? '');

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
        <Badge variant="outline" className={`ml-auto text-[10px] ${statusClass}`}>{game.status}</Badge>
        {game.scheduled_at && (
          <span className="text-[10px] text-zinc-500">
            {new Date(game.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5">
          {mapConfig.mode !== 'none' && (
            <BRMapOptionList
              value={mapInput}
              onChange={setMapInput}
              items={mapCatalogItems}
              label="Map"
            />
          )}
          <div className="flex flex-wrap gap-2">
            {game.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-300"
                disabled={isUpdating}
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
        </div>
      )}
    </div>
  );
};
