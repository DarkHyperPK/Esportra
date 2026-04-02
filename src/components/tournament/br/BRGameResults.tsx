import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Save, Copy, Key, Play, Lock, CheckCircle, Radio, ImageIcon, RotateCcw, Edit3, Eye, EyeOff, X } from 'lucide-react';
import type { BRScoringPreset, BRTeamResult, BREvidence } from '@/types/battleRoyale';
import type { BRGameStatus } from '@/hooks/useBRGameResults';

interface BRGameResultsProps {
  gameNumber: number;
  teams: { id: string; name: string; logo?: string }[];
  scoringPreset: BRScoringPreset;
  killCap: number | null;
  existingResults?: BRTeamResult[];
  onSave: (results: BRTeamResult[], lobbyCode?: string) => void;
  onStartGame?: (lobbyCode: string) => void;
  onResetGame?: () => void;
  onUpdateLobbyCode?: (code: string) => void;
  onMarkEvidenceReviewed?: (teamId: string) => void;
  isSaving?: boolean;
  lobbyCode?: string;
  isOrganizer?: boolean;
  gameStatus: BRGameStatus;
  isLocked?: boolean;
  evidence?: BREvidence[];
}

const BRGameResults: React.FC<BRGameResultsProps> = ({
  gameNumber,
  teams,
  scoringPreset,
  killCap,
  existingResults,
  onSave,
  onStartGame,
  onResetGame,
  onUpdateLobbyCode,
  onMarkEvidenceReviewed,
  isSaving,
  lobbyCode: initialLobbyCode,
  isOrganizer,
  gameStatus,
  isLocked = false,
  evidence = [],
}) => {
  const { toast } = useToast();
  const [currentLobbyCode, setCurrentLobbyCode] = useState(initialLobbyCode || '');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [startLobbyCode, setStartLobbyCode] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Sync lobby code when prop updates (e.g., after optimistic update or refetch)
  useEffect(() => {
    if (initialLobbyCode) setCurrentLobbyCode(initialLobbyCode);
  }, [initialLobbyCode]);

  const [results, setResults] = useState<{ teamId: string; placement: number; kills: number }[]>(() => {
    if (existingResults?.length) {
      return existingResults.map(r => ({ teamId: r.teamId, placement: r.placement, kills: r.kills }));
    }
    return teams.map((t, i) => ({ teamId: t.id, placement: i + 1, kills: 0 }));
  });

  const updateKills = (index: number, kills: number) => {
    const capped = killCap ? Math.min(kills, killCap) : kills;
    const newResults = [...results];
    newResults[index] = { ...newResults[index], kills: Math.max(0, capped) };
    setResults(newResults);
  };

  const updatePlacement = (index: number, placement: number) => {
    const clamped = Math.max(1, Math.min(placement, 999));
    const newResults = [...results];
    newResults[index] = { ...newResults[index], placement: clamped };
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

  const statusBadge = gameStatus === 'completed' ? (
    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
      <CheckCircle className="w-3 h-3 mr-1" /> Completed
    </Badge>
  ) : gameStatus === 'active' ? (
    <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs animate-pulse">
      <Radio className="w-3 h-3 mr-1" /> Live
    </Badge>
  ) : isLocked ? (
    <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-xs">
      <Lock className="w-3 h-3 mr-1" /> Locked
    </Badge>
  ) : (
    <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">
      Pending
    </Badge>
  );

  // PENDING STATE — show "Start Game" button for organizer
  if (gameStatus === 'pending' && isOrganizer && !isLocked) {
    return (
      <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-white">Game {gameNumber}</CardTitle>
            {statusBadge}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col items-center gap-4 py-6">
            <Play className="w-10 h-10 text-zinc-600" />
            <p className="text-sm text-zinc-400 text-center">Ready to start. Enter a lobby code and start the game.</p>
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Key className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <Input
                placeholder="Lobby / party code..."
                value={startLobbyCode}
                onChange={(e) => setStartLobbyCode(e.target.value)}
                className="h-9 text-sm font-mono flex-1"
              />
            </div>
            <Button
              onClick={() => {
                if (!startLobbyCode.trim()) {
                  toast({ title: 'Lobby code required', description: 'Enter a lobby code so players can join.', variant: 'destructive' });
                  return;
                }
                onStartGame?.(startLobbyCode.trim());
              }}
              disabled={isSaving}
              className="bg-rose-600 hover:bg-rose-700 text-white px-6"
            >
              <Play className="w-4 h-4 mr-2" />
              {isSaving ? 'Starting...' : 'Start Game'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // LOCKED PENDING STATE — show locked message for organizer and players
  if (gameStatus === 'pending' && isLocked) {
    return (
      <Card className="bg-black/20 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden opacity-60">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-zinc-500">Game {gameNumber}</CardTitle>
            {statusBadge}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col items-center gap-2 py-4">
            <Lock className="w-8 h-8 text-zinc-700" />
            <p className="text-xs text-zinc-600 text-center">Complete the previous game to unlock</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PENDING STATE — player view (no start button)
  if (gameStatus === 'pending' && !isOrganizer) {
    return (
      <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-white">Game {gameNumber}</CardTitle>
            {statusBadge}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-sm text-zinc-400 text-center">Waiting for organizer to start this game</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ACTIVE or COMPLETED STATE — show full results interface
  return (
    <Card className={cn(
      "bg-black/20 backdrop-blur-md border rounded-2xl overflow-hidden",
      gameStatus === 'active' ? "border-rose-500/30" : "border-white/10"
    )}>
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-white">Game {gameNumber} Results</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {teams.length} teams
            </Badge>
            {statusBadge}
          </div>
        </div>
        {/* Lobby Code */}
        <div className="flex items-center gap-2 mt-3">
          <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {isOrganizer && gameStatus === 'active' ? (
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
            <span className="text-xs text-gray-500 italic">No lobby code set</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_60px_60px_50px_50px_50px] gap-2 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <div className="text-center">#</div>
            <div>Team</div>
            <div className="text-center">Place</div>
            <div className="text-center">Kills</div>
            <div className="text-center">Pts</div>
            <div className="text-center">Kill</div>
            <div className="text-center">Total</div>
          </div>

          {/* Results rows — read-only standings */}
          {sortedResults.map((result, displayIndex) => {
            const team = teams.find(t => t.id === result.teamId);
            const pts = calculatePoints(result.placement, result.kills);

            return (
              <div
                key={result.teamId}
                className={cn(
                  "grid grid-cols-[40px_1fr_60px_60px_50px_50px_50px] gap-2 items-center px-2 py-2 rounded-lg transition-colors",
                  result.placement === 1 ? "bg-amber-500/5 border border-amber-500/20" :
                  result.placement <= 3 ? "bg-white/[0.02] border border-white/5" :
                  "bg-white/[0.01]"
                )}
              >
                <div className="text-center">
                  <span className={cn(
                    "text-sm font-bold",
                    result.placement === 1 ? "text-amber-400" :
                    result.placement === 2 ? "text-gray-300" :
                    result.placement === 3 ? "text-amber-600" : "text-gray-500"
                  )}>
                    {displayIndex + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  {team?.logo && (
                    <img src={team.logo} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                  )}
                  <span className="text-sm text-white truncate">{team?.name || 'Unknown'}</span>
                </div>
                <div className="text-center text-sm text-zinc-300 font-medium">#{result.placement}</div>
                <div className="text-center text-sm text-zinc-300 font-medium">{result.kills}</div>
                <div className="text-center text-xs text-emerald-400 font-bold">{pts.placementPts}</div>
                <div className="text-center text-xs text-rose-400 font-bold">{pts.killPts}</div>
                <div className="text-center text-sm text-white font-bold">{pts.total}</div>
              </div>
            );
          })}
        </div>

        {/* Player Evidence Submissions */}
        {isOrganizer && evidence.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                Player Evidence ({evidence.length})
              </span>
              {evidence.filter(e => !e.reviewed).length > 0 && (
                <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center">
                  {evidence.filter(e => !e.reviewed).length} new
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {evidence.map((ev) => {
                let teamResultIndex = results.findIndex(r => r.teamId === ev.teamId);
                // Auto-add team to results if they submitted evidence but aren't tracked yet
                if (teamResultIndex < 0 && isOrganizer) {
                  const newResults = [...results, {
                    teamId: ev.teamId,
                    placement: ev.placement ?? results.length + 1,
                    kills: ev.kills ?? 0,
                  }];
                  setResults(newResults);
                  teamResultIndex = newResults.length - 1;
                }
                const teamResult = teamResultIndex >= 0 ? results[teamResultIndex] : null;
                const pts = teamResult ? calculatePoints(teamResult.placement, teamResult.kills) : null;

                return (
                <div
                  key={ev.teamId}
                  className={cn(
                    "rounded-lg border transition-colors overflow-hidden",
                    ev.reviewed
                      ? "bg-white/[0.02] border-white/5"
                      : "bg-rose-500/5 border-rose-500/20"
                  )}
                >
                  <div className="flex items-center gap-3 px-3 py-2">
                    {/* Review status indicator */}
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      ev.reviewed ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                    )} />

                    {/* Team name */}
                    <span className="text-sm text-white font-medium truncate flex-1 min-w-0">
                      {ev.teamName}
                    </span>

                    {/* Self-reported stats */}
                    <div className="flex items-center gap-2 text-xs flex-shrink-0">
                      {ev.placement != null && <span className="text-zinc-500">Claims #{ev.placement}</span>}
                      {ev.kills != null && <span className="text-zinc-500">{ev.kills}K</span>}
                    </div>

                    {/* View Evidence button — opens lightbox */}
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxUrl(ev.imageUrl);
                        if (!ev.reviewed && onMarkEvidenceReviewed) {
                          onMarkEvidenceReviewed(ev.teamId);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex-shrink-0",
                        ev.reviewed
                          ? "text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10"
                          : "text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20"
                      )}
                    >
                      {ev.reviewed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {ev.reviewed ? 'Viewed' : 'View'}
                    </button>
                  </div>

                  {/* Scoring inputs row — show for organizers whenever evidence exists */}
                  {isOrganizer && teamResultIndex >= 0 && (
                    <div className="flex items-center gap-3 px-3 py-2 border-t border-white/5 bg-black/20">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">Place</span>
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={teamResult?.placement ?? 1}
                          onChange={(e) => updatePlacement(teamResultIndex, parseInt(e.target.value) || 1)}
                          className="h-7 w-16 text-center text-xs [color-scheme:dark]"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">Kills</span>
                        <Input
                          type="number"
                          min={0}
                          max={killCap || 99}
                          value={teamResult?.kills ?? 0}
                          onChange={(e) => updateKills(teamResultIndex, parseInt(e.target.value) || 0)}
                          className="h-7 w-16 text-center text-xs [color-scheme:dark]"
                        />
                      </div>
                      {pts && (
                        <div className="flex items-center gap-2 ml-auto text-xs">
                          <span className="text-emerald-400 font-bold">{pts.placementPts}</span>
                          <span className="text-zinc-600">+</span>
                          <span className="text-rose-400 font-bold">{pts.killPts}</span>
                          <span className="text-zinc-600">=</span>
                          <span className="text-white font-bold">{pts.total}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Organizer Tools */}
        {isOrganizer && (gameStatus === 'active' || gameStatus === 'completed') && (
          <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
            {/* Save & Complete */}
            {gameStatus === 'active' && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Results & Complete Game'}
                </Button>
              </div>
            )}

            {/* Update Lobby Code (active games) */}
            {gameStatus === 'active' && onUpdateLobbyCode && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New lobby code..."
                  value={currentLobbyCode}
                  onChange={(e) => setCurrentLobbyCode(e.target.value)}
                  className="h-8 text-sm font-mono flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!currentLobbyCode.trim()) return;
                    onUpdateLobbyCode(currentLobbyCode.trim());
                    toast({ title: 'Lobby code updated' });
                  }}
                  disabled={isSaving}
                  className="text-xs"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  Update Code
                </Button>
              </div>
            )}

            {/* Reset Game */}
            {onResetGame && (
              showResetConfirm ? (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-xs text-red-400 flex-1">
                    This will clear all results, evidence, and lobby code for this game.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetConfirm(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onResetGame();
                      setShowResetConfirm(false);
                    }}
                    disabled={isSaving}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-zinc-500 hover:text-red-400 text-xs w-full justify-start"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Game {gameNumber}
                </Button>
              )
            )}
          </div>
        )}
      </CardContent>

      {/* Evidence Lightbox — rendered at top level to avoid overflow clipping */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 z-[110] bg-zinc-800 hover:bg-zinc-700 text-white rounded-full p-3 border border-white/10 shadow-lg transition-colors"
            aria-label="Close evidence"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Evidence screenshot"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Card>
  );
};

export default BRGameResults;
