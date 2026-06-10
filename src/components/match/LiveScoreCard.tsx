import React, { useState, useCallback } from 'react';
import { Activity, Swords } from 'lucide-react';
import {
  useMatchRealtime,
  type MatchScorePayload,
  type GoingLivePayload,
  type MapResultPayload,
} from '@/hooks/useMatchRealtime';

export interface LiveScoreState {
  currentMap: number;
  mapScores: Record<number, { t1: number; t2: number; status: string; winner?: string }>;
  seriesScore: { t1: number; t2: number };
  isLive: boolean;
  hasData: boolean;
  handleGoingLive: (payload: GoingLivePayload) => void;
  handleScoreUpdated: (payload: MatchScorePayload) => void;
  handleMapResult: (payload: MapResultPayload) => void;
}

/** Stateful handlers for MatchZy live events — wire via useMatchRoomRealtime on match pages. */
export function useLiveScoreState(): LiveScoreState {
  const [currentMap, setCurrentMap] = useState(0);
  const [mapScores, setMapScores] = useState<Record<number, { t1: number; t2: number; status: string; winner?: string }>>({});
  const [seriesScore, setSeriesScore] = useState({ t1: 0, t2: 0 });
  const [isLive, setIsLive] = useState(false);

  const handleGoingLive = useCallback((payload: GoingLivePayload) => {
    setCurrentMap(payload.gameNumber);
    setIsLive(true);
    setMapScores((prev) => ({
      ...prev,
      [payload.gameNumber]: prev[payload.gameNumber] || { t1: 0, t2: 0, status: 'live' },
    }));
  }, []);

  const handleScoreUpdated = useCallback((payload: MatchScorePayload) => {
    setIsLive(true);
    setMapScores((prev) => ({
      ...prev,
      [payload.gameNumber]: { t1: payload.team1Score, t2: payload.team2Score, status: 'live' },
    }));
    setSeriesScore({ t1: payload.team1SeriesScore, t2: payload.team2SeriesScore });
  }, []);

  const handleMapResult = useCallback((payload: MapResultPayload) => {
    setMapScores((prev) => ({
      ...prev,
      [payload.gameNumber]: {
        t1: payload.team1Score,
        t2: payload.team2Score,
        status: 'completed',
        winner: payload.winner ?? undefined,
      },
    }));
  }, []);

  const hasData = isLive || Object.keys(mapScores).length > 0;

  return {
    currentMap,
    mapScores,
    seriesScore,
    isLive,
    hasData,
    handleGoingLive,
    handleScoreUpdated,
    handleMapResult,
  };
}

interface LiveScoreCardViewProps {
  liveScore: LiveScoreState;
  team1Name?: string;
  team2Name?: string;
  bestOf: number;
}

/** Presentational live score panel — use with useLiveScoreState + useMatchRoomRealtime on match pages. */
export const LiveScoreCardView: React.FC<LiveScoreCardViewProps> = ({
  liveScore,
  team1Name = 'Team 1',
  team2Name = 'Team 2',
  bestOf,
}) => {
  if (!liveScore.hasData) return null;

  const mapEntries = Object.entries(liveScore.mapScores)
    .sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-semibold text-white">Live Score</h3>
        </div>
        {liveScore.isLive && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-500/10 text-rose-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {bestOf > 1 && (
        <div className="flex items-center justify-center gap-6 py-3">
          <div className="text-right flex-1">
            <p className="text-xs text-zinc-400 truncate">{team1Name}</p>
            <p className={`text-2xl font-bold ${liveScore.seriesScore.t1 > liveScore.seriesScore.t2 ? 'text-emerald-400' : 'text-white'}`}>
              {liveScore.seriesScore.t1}
            </p>
          </div>
          <Swords className="w-5 h-5 text-zinc-600 shrink-0" />
          <div className="text-left flex-1">
            <p className="text-xs text-zinc-400 truncate">{team2Name}</p>
            <p className={`text-2xl font-bold ${liveScore.seriesScore.t2 > liveScore.seriesScore.t1 ? 'text-emerald-400' : 'text-white'}`}>
              {liveScore.seriesScore.t2}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {mapEntries.map(([gameNum, scores]) => {
          const isCurrentMap = Number(gameNum) === liveScore.currentMap && scores.status === 'live';
          return (
            <div
              key={gameNum}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                isCurrentMap ? 'bg-rose-500/5 border border-rose-500/10' : 'bg-black/20'
              }`}
            >
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider w-16">
                Map {gameNum}
              </span>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-mono font-semibold ${
                  scores.t1 > scores.t2 ? 'text-emerald-400' : 'text-white'
                }`}>
                  {scores.t1}
                </span>
                <span className="text-zinc-600 text-xs">-</span>
                <span className={`text-sm font-mono font-semibold ${
                  scores.t2 > scores.t1 ? 'text-emerald-400' : 'text-white'
                }`}>
                  {scores.t2}
                </span>
              </div>
              <span className={`text-[10px] w-16 text-right ${
                scores.status === 'live' ? 'text-rose-400' : 'text-zinc-600'
              }`}>
                {scores.status === 'live' ? 'LIVE' : 'Final'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface LiveScoreCardProps {
  matchId: string;
  team1Name?: string;
  team2Name?: string;
  bestOf: number;
}

/**
 * Standalone live score card with its own MatchHub subscription.
 * Match room pages should use useLiveScoreState + LiveScoreCardView instead.
 */
const LiveScoreCard: React.FC<LiveScoreCardProps> = ({
  matchId,
  team1Name = 'Team 1',
  team2Name = 'Team 2',
  bestOf,
}) => {
  const liveScore = useLiveScoreState();

  useMatchRealtime({
    matchId,
    enabled: !!matchId,
    onGoingLive: liveScore.handleGoingLive,
    onScoreUpdated: liveScore.handleScoreUpdated,
    onMapResult: liveScore.handleMapResult,
  });

  return (
    <LiveScoreCardView
      liveScore={liveScore}
      team1Name={team1Name}
      team2Name={team2Name}
      bestOf={bestOf}
    />
  );
};

export default LiveScoreCard;
