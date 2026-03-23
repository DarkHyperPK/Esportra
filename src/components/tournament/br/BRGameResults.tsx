import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Save, ChevronUp, ChevronDown, Copy, Key } from 'lucide-react';
import type { BRScoringPreset, BRTeamResult } from '@/types/battleRoyale';

interface BRGameResultsProps {
  gameNumber: number;
  teams: { id: string; name: string; logo?: string }[];
  scoringPreset: BRScoringPreset;
  killCap: number | null;
  existingResults?: BRTeamResult[];
  onSave: (results: BRTeamResult[], lobbyCode?: string) => void;
  isSaving?: boolean;
  lobbyCode?: string;
  isOrganizer?: boolean;
}

const BRGameResults: React.FC<BRGameResultsProps> = ({
  gameNumber,
  teams,
  scoringPreset,
  killCap,
  existingResults,
  onSave,
  isSaving,
  lobbyCode: initialLobbyCode,
  isOrganizer,
}) => {
  const { toast } = useToast();
  const [currentLobbyCode, setCurrentLobbyCode] = useState(initialLobbyCode || '');

  const [results, setResults] = useState<{ teamId: string; placement: number; kills: number }[]>(() => {
    if (existingResults?.length) {
      return existingResults.map(r => ({ teamId: r.teamId, placement: r.placement, kills: r.kills }));
    }
    return teams.map((t, i) => ({ teamId: t.id, placement: i + 1, kills: 0 }));
  });

  const moveTeam = (index: number, direction: 'up' | 'down') => {
    const newResults = [...results];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newResults.length) return;

    // Swap placements
    const tempPlacement = newResults[index].placement;
    newResults[index].placement = newResults[swapIndex].placement;
    newResults[swapIndex].placement = tempPlacement;

    // Swap positions in array
    [newResults[index], newResults[swapIndex]] = [newResults[swapIndex], newResults[index]];
    setResults(newResults);
  };

  const updateKills = (index: number, kills: number) => {
    const capped = killCap ? Math.min(kills, killCap) : kills;
    const newResults = [...results];
    newResults[index] = { ...newResults[index], kills: Math.max(0, capped) };
    setResults(newResults);
  };

  const calculatePoints = (placement: number, kills: number): { placementPts: number; killPts: number; total: number } => {
    const placementPts = placement <= scoringPreset.placements.length
      ? scoringPreset.placements[placement - 1]
      : 0;
    const effectiveKills = killCap ? Math.min(kills, killCap) : kills;
    const killPts = effectiveKills * scoringPreset.killPoints;
    return { placementPts, killPts, total: placementPts + killPts };
  };

  const handleSave = () => {
    const placements = results.map(r => r.placement);
    const uniquePlacements = new Set(placements);
    if (uniquePlacements.size !== placements.length) {
      toast({ title: 'Duplicate Placements', description: 'Each team must have a unique placement.', variant: 'destructive' });
      return;
    }

    const fullResults: BRTeamResult[] = results.map(r => {
      const pts = calculatePoints(r.placement, r.kills);
      return {
        teamId: r.teamId,
        teamName: teams.find(t => t.id === r.teamId)?.name,
        placement: r.placement,
        kills: r.kills,
        placementPoints: pts.placementPts,
        killPoints: pts.killPts,
        totalPoints: pts.total,
      };
    });

    onSave(fullResults, currentLobbyCode || undefined);
  };

  // Sort by placement for display
  const sortedResults = [...results].sort((a, b) => a.placement - b.placement);

  return (
    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-white">Game {gameNumber} Results</CardTitle>
          <Badge variant="outline" className="text-xs">
            {teams.length} teams
          </Badge>
        </div>
        {/* Lobby Code */}
        <div className="flex items-center gap-2 mt-3">
          <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {isOrganizer ? (
            <Input
              placeholder="Enter lobby code for players..."
              value={currentLobbyCode}
              onChange={(e) => setCurrentLobbyCode(e.target.value)}
              className="h-8 text-sm flex-1 max-w-xs font-mono"
            />
          ) : currentLobbyCode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                {currentLobbyCode}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentLobbyCode);
                  toast({ title: 'Lobby code copied!' });
                }}
                className="text-gray-400 hover:text-white p-1"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-500 italic">No lobby code set yet</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_80px_60px_60px_60px] gap-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <div>#</div>
            <div>Team</div>
            <div className="text-center">Kills</div>
            <div className="text-center">Place</div>
            <div className="text-center">Kill</div>
            <div className="text-center">Total</div>
          </div>

          {/* Results rows */}
          {sortedResults.map((result, displayIndex) => {
            const realIndex = results.findIndex(r => r.teamId === result.teamId);
            const team = teams.find(t => t.id === result.teamId);
            const pts = calculatePoints(result.placement, result.kills);

            return (
              <div
                key={result.teamId}
                className={cn(
                  "grid grid-cols-[40px_1fr_80px_60px_60px_60px] gap-2 items-center px-2 py-2 rounded-lg transition-colors",
                  result.placement === 1 ? "bg-amber-500/5 border border-amber-500/20" :
                  result.placement <= 3 ? "bg-white/[0.02] border border-white/5" :
                  "bg-white/[0.01]"
                )}
              >
                {/* Placement with reorder buttons */}
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-sm font-bold w-6 text-center",
                    result.placement === 1 ? "text-amber-400" :
                    result.placement === 2 ? "text-gray-300" :
                    result.placement === 3 ? "text-amber-600" : "text-gray-500"
                  )}>
                    {result.placement}
                  </span>
                  <div className="flex flex-col -space-y-1">
                    <button
                      type="button"
                      onClick={() => moveTeam(realIndex, 'up')}
                      disabled={result.placement === 1}
                      className="text-gray-500 hover:text-white disabled:opacity-20 p-0"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTeam(realIndex, 'down')}
                      disabled={result.placement === teams.length}
                      className="text-gray-500 hover:text-white disabled:opacity-20 p-0"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Team name */}
                <div className="flex items-center gap-2 min-w-0">
                  {team?.logo && (
                    <img src={team.logo} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                  )}
                  <span className="text-sm text-white truncate">{team?.name || 'Unknown'}</span>
                </div>

                {/* Kills input */}
                <div>
                  <Input
                    type="number"
                    min={0}
                    max={killCap || 99}
                    value={result.kills}
                    onChange={(e) => updateKills(realIndex, parseInt(e.target.value) || 0)}
                    className="h-7 text-center text-sm [color-scheme:dark]"
                  />
                </div>

                {/* Points breakdown */}
                <div className="text-center text-xs text-emerald-400 font-bold">{pts.placementPts}</div>
                <div className="text-center text-xs text-rose-400 font-bold">{pts.killPts}</div>
                <div className="text-center text-sm text-white font-bold">{pts.total}</div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Results'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BRGameResults;
