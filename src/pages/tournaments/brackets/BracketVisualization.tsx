/**
 * BracketVisualization - Battlefy-Style with Glassmorphism
 * 
 * PERFECT TREE SYMMETRY:
 * - First round: evenly spaced
 * - Subsequent rounds: centered between source matches
 * 
 * CARD HEIGHT: Fixed at 200px to prevent overlapping
 */

import React, { useState, useMemo, useCallback, useRef, useDeferredValue, startTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check,
  Trophy, Swords, Gamepad2, Network, List
} from 'lucide-react';
import { MatchResultsDialog } from './dialogs/MatchResultsDialog';
import { Button, SuccessButton } from '@/components/ui/button';
import { CtaButton, GhostButton, OutlineButton, CancelButton } from '@/components/ui/app-buttons';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BracketMatch } from '@/types/bracketTypes';
import { GraphMatchService } from '@/services/bracket/GraphMatchService';
import { invalidateMatchLifecycleQueries } from '@/utils/matchLifecycleQueries';
import { MapVeto } from '@/components/tournament/MapVeto';
import { useGraphBracket } from '@/hooks/useGraphBracket';
import { adaptGraphToBracketMatches, buildCompetitorMapFromNodes, extractTeamIds } from '@/services/bracket/BracketAdapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { formatBracketMatchLabel } from '@/utils/bracketMatchLabel';
import { isMatchTooEarlyForLive } from '@/lib/timeUtils';
import { optimisticBracket } from '@/services/bracket/optimisticBracket';
import { useBracketWheelScroll } from '@/hooks/useBracketWheelScroll';
import { gameHasMapVeto } from '@/utils/gameFeatures';
import { useBracketLayout, CARD_WIDTH, CARD_HEIGHT, ROUND_GAP, MATCH_GAP, LEFT_PADDING, HEADING_HEIGHT, HEADING_MARGIN, BRACKET_SPACING } from '@/hooks/useBracketLayout';
import { useViewportCulling } from '@/hooks/useViewportCulling';

export interface BracketVisualizationProps {
  matches?: BracketMatch[];
  versionId?: string | null;
  teamCount?: number;
  tournamentId?: string | null;
  tournamentSlug?: string;
  isOrganizer?: boolean;
  isCaptain?: boolean;
  userTeamId?: string;
  onUploadResult?: (matchId: string) => void;
  onOpenMapVeto?: (match: BracketMatch, matchId: string) => void;

  onRefresh?: () => void;
  onByeAdvance?: (matchId: string) => void;
  stage?: any;
}

import { MatchCard } from './MatchCard';
import { BracketSidebarFilter, type FilterState } from '@/components/bracket/BracketSidebarFilter';
import { BracketExporter } from '@/components/bracket/BracketExporter';
import { VirtualizedMatchesList } from '@/components/bracket/VirtualizedMatchesList';
import { Download } from 'lucide-react';
import { GroupStageView } from '@/components/bracket/GroupStageView';
import { SwissView } from '@/components/bracket/SwissView';
import EntityAvatar from '@/components/ui/EntityAvatar';



const getRawId = (id: string | number) => String(id).replace(/^(db-|wb-|lb-)/, '');
const isDbMatch = (id: string | number) => String(id).startsWith('db-');

const BracketVisualization: React.FC<BracketVisualizationProps> = React.memo(({
  matches: propMatches = [],
  versionId,
  teamCount: propTeamCount = 0,
  tournamentId,
  tournamentSlug,
  isOrganizer = false,
  onOpenMapVeto,
  onRefresh,
  onByeAdvance,
  stage,
}) => {
  // Data Fetching Logic with Realtime subscriptions
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: graphData, refetch: refetchGraph } = useGraphBracket(versionId || '', tournamentId || undefined);

  const { data: tournamentMeta } = useQuery({
    queryKey: ['tournament-meta', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return null;
      return apiClient.get<{ game?: string; game_mode?: string | null; settings?: unknown; tournament?: any; mockCount?: number }>(`/api/tournaments/${tournamentId}`);
    },
    enabled: !!tournamentId,
    staleTime: 60_000,
  });

  const tournamentDetails = tournamentMeta?.tournament ?? tournamentMeta;
  const suppressMockVetoRolePrompt = isOrganizer && (tournamentMeta?.mockCount ?? 0) > 0;
  const tournamentGame = tournamentDetails?.game ?? '';
  const tournamentGameMode = tournamentDetails?.game_mode ?? tournamentDetails?.gameMode ?? null;
  const tournamentSettings = useMemo(() => {
    const raw = tournamentDetails?.settings;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  }, [tournamentDetails?.settings]);
  const canUseMapVeto = gameHasMapVeto(tournamentGame, tournamentGameMode)
    && tournamentSettings.mapVetoEnabled !== false;

  // Fetch match proofs (from both old tournament_match_results and new match_result_reports)
  const { data: proofs } = useQuery({
    queryKey: ['match-proofs', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return {};
      const map: Record<string, string[]> = {};

      // Old system: tournament_match_results
      try {
        const data = await apiClient.get<{ match_id: string; image_url: string | null }[]>(
          `/api/tournaments/${tournamentId}/match-reports`
        );
        data?.forEach((r: any) => {
          const id = r.match_id;
          if (!map[id]) map[id] = [];
          if (r.image_url) map[id].push(r.image_url);
        });
      } catch { /* old table may not exist */ }

      // New system: match_result_reports with screenshot_urls
      try {
        const allReports = await apiClient.get<any[]>(
          `/api/tournaments/${tournamentId}/result-reports`
        );
        allReports?.forEach((r: any) => {
          const id = r.match_id;
          if (!map[id]) map[id] = [];
          const urls = r.screenshot_urls ?? r.screenshotUrls;
          if (Array.isArray(urls)) {
            urls.forEach((url: string) => { if (url) map[id].push(url); });
          }
        });
      } catch { /* endpoint may not exist yet */ }

      return map;
    },
    enabled: !!tournamentId,
    staleTime: 1000 * 30,
  });

  // Fetch detailed game results (automated reports)
  const { data: automatedGames } = useQuery({
    queryKey: ['bracket-match-games', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return {};
      const data = await apiClient.get<any[]>(
        `/api/brackets/match-games?tournament_id=${tournamentId}&status=completed`
      );

      const map: Record<string, any[]> = {};
      data?.forEach((game: any) => {
        const prefixedId = game.match_id;
        if (!map[prefixedId]) map[prefixedId] = [];

        // Handle join data (sometimes PostgREST returns array for joins)
        const joinedMapName = Array.isArray(game.game_maps)
          ? game.game_maps[0]?.map_name
          : game.game_maps?.map_name;

        map[prefixedId].push({
          ...game,
          map_name: joinedMapName || game.map_name
        });
      });
      return map;
    },
    enabled: !!tournamentId,
    staleTime: 1000 * 30,
  });

  // Fetch teams
  // Fetch teams
  const teamIds = useMemo(() => {
    if (!graphData?.nodes) return [];
    const ids = extractTeamIds(graphData.nodes);
    return ids.sort(); // Stable sort to prevent unnecessary refetches
  }, [graphData?.nodes]);

  const { data: teamsData } = useQuery({
    queryKey: ['bracket-teams', teamIds.join(',')],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const data = await apiClient.get<{ id: string; name: string; logo_url?: string | null }[]>(
        `/api/teams?ids=${teamIds.join(',')}`
      );
      return data;
    },
    enabled: teamIds.length > 0,
    placeholderData: (prev) => prev, // Keep previous data while fetching
  });

  // Create teamsMap from fetched data (shared with child components)
  const teamsMap = useMemo(() => {
    const map = buildCompetitorMapFromNodes(graphData?.nodes ?? []);
    teamsData?.forEach((t: any) => map.set(t.id, t));
    return map;
  }, [graphData?.nodes, teamsData]);

  // Adapt data
  const { matches: adaptedMatches } = useMemo(() => {
    if (propMatches.length > 0) return { matches: propMatches, teamCount: propTeamCount };

    // Always use live nodes/edges — the graph endpoint serves real-time DB state.
    // cached_ui_state is intentionally excluded from the graph endpoint response.
    if (!graphData?.nodes || !graphData?.edges) return { matches: [], teamCount: 0 };

    const adapted = adaptGraphToBracketMatches(graphData.nodes, graphData.edges, teamsMap);
    const count = Math.max(graphData.nodes.filter(n => n.bracket_type === 'winners' && n.round_index === 0).length * 2, 4);

    return { matches: adapted, teamCount: count };
  }, [propMatches, propTeamCount, graphData, teamsMap]);


  // Derived matches
  const matches = useMemo(() => {
    return adaptedMatches;
  }, [adaptedMatches]);

  // Combined refresh handler
  const handleRefresh = useCallback(() => {
    console.log('[BracketVisualization] Handle Refresh triggered. Refetching graph...');
    if (versionId) {
      refetchGraph().then(() => console.log('[BracketVisualization] Refetch complete.'));
    }
    onRefresh?.();
  }, [versionId, refetchGraph, onRefresh]);

  const format = useMemo(() => {
    if (matches.some(m => m.bracketType === 'group')) return 'round_robin';
    if (matches.some(m => m.bracketType === 'swiss_round')) return 'swiss';
    return 'elimination';
  }, [matches]);

  const { toast } = useToast();

  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const scoreDraftRef = useRef<Record<string, { t1: string; t2: string }>>({});
  const [goLiveDialogOpen, setGoLiveDialogOpen] = useState(false);
  const [goLiveMatch, setGoLiveMatch] = useState<BracketMatch | null>(null);
  const [partyCodeInput, setPartyCodeInput] = useState('');
  const [partyCodeOpen, setPartyCodeOpen] = useState(false);
  const [partyCodeMatch, setPartyCodeMatch] = useState<BracketMatch | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterState>({ type: 'all' });
  const [viewMode, setViewModeState] = useState<'bracket' | 'matches'>('bracket');
  const setViewMode = useCallback((mode: 'bracket' | 'matches') => {
    startTransition(() => {
      setViewModeState(mode);
    });
  }, []);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [mapVetoOpen, setMapVetoOpen] = useState(false);
  const [mapVetoMatch, setMapVetoMatch] = useState<BracketMatch | null>(null);
  
  // Bracket container ref for viewport culling
  const bracketContainerRef = useRef<HTMLDivElement>(null);

  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [resultsDialogMatch, setResultsDialogMatch] = useState<BracketMatch | null>(null);
  const bracketScroll = useBracketWheelScroll<HTMLDivElement>();

  const handleViewResults = useCallback((m: BracketMatch) => {
    setResultsDialogMatch(m);
    setResultsDialogOpen(true);
  }, []);


  // Categorize matches
  const { winnersRounds, losersRounds, finalsMatches } = useMemo(() => {
    const winners: Record<number, BracketMatch[]> = {};
    const losers: Record<number, BracketMatch[]> = {};
    const finals: BracketMatch[] = [];

    matches.forEach(m => {
      if (m.bracketSide === 'final') finals.push(m);
      else if (m.bracketSide === 'losers') {
        if (!losers[m.round]) losers[m.round] = [];
        losers[m.round].push(m);
      } else {
        if (!winners[m.round]) winners[m.round] = [];
        winners[m.round].push(m);
      }
    });

    Object.values(winners).forEach(arr => arr.sort((a, b) => a.matchNumber - b.matchNumber));
    Object.values(losers).forEach(arr => arr.sort((a, b) => a.matchNumber - b.matchNumber));

    return {
      winnersRounds: winners,
      losersRounds: losers,
      finalsMatches: finals.sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber),
    };
  }, [matches]);

  // Auto-select first round when switching to matches view with 'All' filter
  // This prevents rendering 500+ matches at once
  useEffect(() => {
    if (viewMode === 'matches' && activeFilter.type === 'all') {
      const winnersRoundNumbers = Object.keys(winnersRounds).map(Number);
      if (winnersRoundNumbers.length > 0) {
        const firstWinnersRound = Math.min(...winnersRoundNumbers);
        if (Number.isFinite(firstWinnersRound)) {
          startTransition(() => {
            setActiveFilter({ type: 'winners', round: firstWinnersRound });
          });
        }
      }
    }
  }, [viewMode, winnersRounds]);

  // Use the extracted layout hook for position calculations
  const { positions: matchPositions, totalWidth, totalHeight, winnersBottomY } = useBracketLayout({
    matches,
    edges: graphData?.edges,
  });

  // Calculate X offset for filtering
  const filterXOffset = useMemo(() => {
    if (activeFilter.type === 'all') return 0;

    // Find the minimum X of visible matches
    let minX = Infinity;
    matches.forEach(m => {
      if (activeFilter.type === 'winners' && m.bracketSide === 'winners' && m.round === activeFilter.round) {
        const pos = matchPositions.get(String(m.id));
        if (pos && pos.x < minX) minX = pos.x;
      }
      if (activeFilter.type === 'losers' && m.bracketSide === 'losers' && m.round === activeFilter.round) {
        const pos = matchPositions.get(String(m.id));
        if (pos && pos.x < minX) minX = pos.x;
      }
      if (activeFilter.type === 'final' && m.bracketSide === 'final') {
        const pos = matchPositions.get(String(m.id));
        if (pos && pos.x < minX) minX = pos.x;
      }
    });

    return minX === Infinity ? 0 : minX - LEFT_PADDING;
  }, [activeFilter, matches, matchPositions]);

  // Calculate Y offset for filtering (specifically for Losers Bracket)
  const filterYOffset = useMemo(() => {
    if (activeFilter.type !== 'losers') return 0;

    let minY = Infinity;
    matches.forEach(m => {
      if (m.bracketSide === 'losers' && m.round === activeFilter.round) {
        const pos = matchPositions.get(String(m.id));
        if (pos && pos.y < minY) minY = pos.y;
      }
    });

    // We want the matches to start at roughly y=50 (below the heading)
    // newY = oldY - offset => 50 = minY - offset => offset = minY - 50
    return minY === Infinity ? 0 : minY - 50;
  }, [activeFilter, matches, matchPositions]);

  // When filtering to a specific round, compute stacked list positions (no bracket gaps)
  const filteredListPositions = useMemo(() => {
    if (activeFilter.type === 'all') return null;

    const visibleMatches = matches.filter(m => {
      if (activeFilter.type === 'winners') return (!m.bracketSide || m.bracketSide === 'winners') && m.round === activeFilter.round;
      if (activeFilter.type === 'losers') return m.bracketSide === 'losers' && m.round === activeFilter.round;
      if (activeFilter.type === 'final') return m.bracketSide === 'final';
      return false;
    });

    visibleMatches.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));

    const listGap = 8;
    const startY = 50;
    const positions = new Map<string, { x: number; y: number }>();
    visibleMatches.forEach((m, i) => {
      positions.set(String(m.id), { x: LEFT_PADDING, y: startY + i * (CARD_HEIGHT + listGap) });
    });

    const listHeight = visibleMatches.length > 0
      ? startY + visibleMatches.length * (CARD_HEIGHT + listGap) + 50
      : 0;

    return { positions, height: listHeight };
  }, [activeFilter, matches]);

  // Memoize SVG connector paths to prevent re-computation on expandedMatch changes
  const connectorPaths = useMemo(() => {
    return matches.map(match => {
      if (!match.nextMatchId) return null;
      const sourcePos = matchPositions.get(String(match.id)) || matchPositions.get(getRawId(match.id));
      const targetPos = matchPositions.get(String(match.nextMatchId)) || matchPositions.get(getRawId(match.nextMatchId));
      if (!sourcePos || !targetPos) return null;

      const connectorGap = Math.min(18, Math.max(12, ROUND_GAP * 0.16));
      const connectorInset = Math.min(36, Math.max(18, (ROUND_GAP - connectorGap * 2) * 0.45));
      const startX = sourcePos.x + CARD_WIDTH + connectorGap;
      const startY = sourcePos.y + CARD_HEIGHT / 2;
      const endX = targetPos.x - connectorGap;
      const endY = targetPos.y + CARD_HEIGHT / 2;
      const midX = Math.max(startX + 8, Math.min(startX + connectorInset, endX - 8));

      return {
        key: `edge-${match.id}`,
        d: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`
      };
    }).filter(Boolean) as { key: string; d: string }[];
  }, [matches, matchPositions]);

  // Use viewport culling hook for large brackets
  const { visibleItems: visibleMatches, handleScroll: handleBracketScroll } = useViewportCulling(
    matches,
    bracketContainerRef,
    {
      positions: matchPositions,
      itemWidth: CARD_WIDTH,
      itemHeight: CARD_HEIGHT,
      buffer: 400,
    }
  );

  // Handlers
  const toggleExpand = useCallback((id: string) => setExpandedMatch(p => p === id ? null : id), []);
  const handleGoLive = useCallback(async (matchOverride?: BracketMatch, codeOverride?: string, force = false) => {
    const match = matchOverride || goLiveMatch;
    const code = codeOverride || partyCodeInput;

    if (!match || !isDbMatch(match.id) || !code?.trim()) { toast({ title: 'Party code required', variant: 'destructive' }); return; }

    setIsProcessing(true);

    // --- OPTIMISTIC UPDATE ---
    const queryKey = ['bracket-graph', versionId];
    const previousGraphData = queryClient.getQueryData<{ nodes: any[]; edges: any[] }>(queryKey);

    if (previousGraphData && versionId) {
      queryClient.setQueryData(queryKey, {
        ...previousGraphData,
        nodes: previousGraphData.nodes.map((n: any) =>
          n.id === getRawId(match.id)
            ? { ...n, status: 'in_progress', party_code: code.trim().toUpperCase() }
            : n
        ),
      });
    }
    // -------------------------

    const r = await GraphMatchService.goLive(
      getRawId(match.id),
      code.trim(),
      force || (isOrganizer && isMatchTooEarlyForLive(match.scheduledTime)),
    );
    setIsProcessing(false);

    if (r.success) {
      toast({ title: '🎮 Match is LIVE!' });
      setGoLiveDialogOpen(false);
    } else {
      // ROLLBACK
      if (previousGraphData && versionId) {
        queryClient.setQueryData(queryKey, previousGraphData);
      }
      toast({ title: 'Error', description: r.error, variant: 'destructive' });
    }
  }, [goLiveMatch, partyCodeInput, toast, queryClient, versionId, isOrganizer]);

  const openGoLive = useCallback((m: BracketMatch, code?: string, force = false) => {
    if (code) {
      handleGoLive(m, code, force);
    } else {
      setGoLiveMatch(m);
      setPartyCodeInput('');
      setGoLiveDialogOpen(true);
    }
  }, [handleGoLive]);
  const openMapVeto = useCallback((m: BracketMatch) => {
    if (!canUseMapVeto) {
      toast({ title: 'Map veto unavailable', description: 'This tournament does not use map veto.', variant: 'destructive' });
      return;
    }
    if (onOpenMapVeto) onOpenMapVeto(m, String(m.id)); else { setMapVetoMatch(m); setMapVetoOpen(true); }
  }, [canUseMapVeto, onOpenMapVeto, toast]);
  const openPartyCode = useCallback((m: BracketMatch) => { setPartyCodeMatch(m); setPartyCodeOpen(true); setCopiedCode(false); }, []);
  const openMatchRoom = useCallback((m: BracketMatch) => {
    if (!tournamentSlug) return;
    navigate(`/tournaments/${tournamentSlug}/captain-match/${getRawId(m.id)}`);
  }, [navigate, tournamentSlug]);
  const copyPartyCode = async () => { if (!partyCodeMatch?.partyCode) return; await navigator.clipboard.writeText(partyCodeMatch.partyCode); setCopiedCode(true); toast({ title: '📋 Copied!' }); setTimeout(() => setCopiedCode(false), 2000); };
  const isDoubleElimination = useMemo(
    () => matches.some((match) => match.bracketSide === 'losers'),
    [matches],
  );
  const maxFinalRound = useMemo(
    () => (finalsMatches.length > 0 ? Math.max(...finalsMatches.map((finalMatch) => finalMatch.round)) : undefined),
    [finalsMatches],
  );
  const getMatchLabel = useCallback((m: BracketMatch) => (
    formatBracketMatchLabel(m, {
      isDoubleElimination,
      finalsMatchCount: finalsMatches.length,
      maxFinalRound,
    }) ?? ''
  ), [finalsMatches.length, isDoubleElimination, maxFinalRound]);
  const handleScoreChange = useCallback((id: string, t: 't1' | 't2', v: string) => {
    const rawId = getRawId(id);
    if (!scoreDraftRef.current[rawId]) {
      const match = matches.find(m => String(m.id) === id || getRawId(m.id) === rawId);
      scoreDraftRef.current[rawId] = {
        t1: match?.team1_score?.toString() ?? '',
        t2: match?.team2_score?.toString() ?? ''
      };
    }
    scoreDraftRef.current[rawId][t] = v;
  }, [matches]);

  const saveScore = useCallback(async (m: BracketMatch) => {
    if (!isDbMatch(m.id)) return;

    const draft = scoreDraftRef.current[getRawId(m.id)];
    const s1Str = draft ? draft.t1 : (m.team1_score?.toString() ?? '');
    const s2Str = draft ? draft.t2 : (m.team2_score?.toString() ?? '');

    const s1 = parseInt(s1Str), s2 = parseInt(s2Str);

    if (!Number.isFinite(s1) || !Number.isFinite(s2)) { toast({ title: 'Invalid scores', description: 'Please enter valid numbers for both scores.', variant: 'destructive' }); return; }
    if (s1 === s2) { toast({ title: 'Invalid scores', description: 'Scores cannot be equal.', variant: 'destructive' }); return; }

    setIsProcessing(true);

    // --- OPTIMISTIC UPDATE ---
    const queryKey = ['bracket-graph', versionId];
    const previousGraphData = queryClient.getQueryData<{ nodes: any[]; edges: any[] }>(queryKey);

    if (previousGraphData && versionId) {
      const winnerId = s1 > s2 ? m.team1?.id || null : m.team2?.id || null;
      const loserId = s1 < s2 ? m.team1?.id || null : m.team2?.id || null;

      const nodesWithScore = optimisticBracket.applyScore(
        previousGraphData.nodes,
        getRawId(m.id),
        s1,
        s2,
        m.team1?.id || null,
        m.team2?.id || null
      );

      const nodesWithAdvancement = optimisticBracket.applyAdvancement(
        nodesWithScore,
        previousGraphData.edges,
        getRawId(m.id),
        winnerId,
        loserId
      );

      queryClient.setQueryData(queryKey, {
        ...previousGraphData,
        nodes: nodesWithAdvancement,
      });
    }
    // -------------------------

    const r = await GraphMatchService.saveScoreAndAdvance(getRawId(m.id), s1, s2, m.team1?.id || null, m.team2?.id || null);
    setIsProcessing(false);
    if (r.success) {
      delete scoreDraftRef.current[getRawId(m.id)];
      invalidateMatchLifecycleQueries(queryClient, {
        matchId: getRawId(m.id),
        versionId,
      });
      toast({ title: '🏆 Score saved!' });
    }
    else {
      // ROLLBACK
      if (previousGraphData && versionId) {
        queryClient.setQueryData(queryKey, previousGraphData);
      }
      toast({ title: 'Error', description: r.error, variant: 'destructive' });
    }
  }, [toast, queryClient, versionId]);

  const disableGlass = matches.length > 64;

  const renderMatchCard = useCallback((match: BracketMatch, x: number | undefined, y: number | undefined, label: string) => (
    <MatchCard
      key={match.id}
      match={match}
      x={x}
      y={y}
      label={label}
      expandedMatchId={expandedMatch}
      onToggleExpand={toggleExpand}
      isOrganizer={isOrganizer}
      isProcessing={isProcessing}
      versionId={versionId}
      tournamentId={tournamentId}
      onScoreChange={handleScoreChange}
      onGoLive={openGoLive}
      onMapVeto={canUseMapVeto ? openMapVeto : undefined}
      onPartyCode={openPartyCode}
      onSaveScore={saveScore}
      onMatchRoom={isOrganizer && tournamentSlug ? openMatchRoom : undefined}
      scoreDraftRef={scoreDraftRef}
      proofs={proofs?.[getRawId(match.id)]}
      onByeAdvance={onByeAdvance}
      automatedStatus={(match as any).automated_report_status}
      disableGlass={disableGlass}
      onViewResults={handleViewResults}
    />
  ), [expandedMatch, isOrganizer, isProcessing, versionId, tournamentId, handleScoreChange, toggleExpand, openGoLive, canUseMapVeto, openMapVeto, openPartyCode, saveScore, proofs, onByeAdvance, tournamentSlug, openMatchRoom, disableGlass, handleViewResults]);

  const filteredMatchesForList = useMemo(() => {
    if (activeFilter.type === 'all') return matches;
    return matches.filter((match) => {
      if (activeFilter.type === 'winners') {
        return (!match.bracketSide || match.bracketSide === 'winners') && match.round === activeFilter.round;
      }
      if (activeFilter.type === 'losers') {
        return match.bracketSide === 'losers' && match.round === activeFilter.round;
      }
      if (activeFilter.type === 'final') {
        return match.bracketSide === 'final';
      }
      return true;
    });
  }, [activeFilter, matches]);

  const matchListGroups = useMemo(() => {
    const grouped = new Map<string, BracketMatch[]>();
    const sorted = [...filteredMatchesForList].sort((a, b) => {
      const sideOrder = (side?: string) => side === 'winners' ? 0 : side === 'losers' ? 1 : side === 'final' ? 2 : 0;
      return sideOrder(a.bracketSide) - sideOrder(b.bracketSide)
        || (a.round ?? 0) - (b.round ?? 0)
        || (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
    });

    sorted.forEach((match) => {
      const key = match.bracketSide === 'final'
        ? 'Grand Finals'
        : `${match.bracketSide === 'losers' ? 'Losers' : 'Winners'} Round ${match.round}`;
      grouped.set(key, [...(grouped.get(key) ?? []), match]);
    });

    return Array.from(grouped.entries());
  }, [filteredMatchesForList]);

  const renderViewToggle = () => (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-950/80 p-1">
      {viewMode === 'bracket' ? (
        <CtaButton type="button" size="sm" className="h-8 gap-2 text-xs" onClick={() => setViewMode('bracket')}>
          <Network className="h-3.5 w-3.5" />
          Bracket
        </CtaButton>
      ) : (
        <GhostButton type="button" size="sm" className="h-8 gap-2 text-xs" onClick={() => setViewMode('bracket')}>
          <Network className="h-3.5 w-3.5" />
          Bracket
        </GhostButton>
      )}
      {viewMode === 'matches' ? (
        <CtaButton type="button" size="sm" className="h-8 gap-2 text-xs" onClick={() => setViewMode('matches')}>
          <List className="h-3.5 w-3.5" />
          Matches
        </CtaButton>
      ) : (
        <GhostButton type="button" size="sm" className="h-8 gap-2 text-xs" onClick={() => setViewMode('matches')}>
          <List className="h-3.5 w-3.5" />
          Matches
        </GhostButton>
      )}
    </div>
  );

  const renderRoundTabs = () => {
    const isDoubleElim = Object.keys(losersRounds).length > 0;
    const roundTabs: { label: string; filter: FilterState }[] = [
      { label: 'All', filter: { type: 'all' } },
      ...Object.keys(winnersRounds).map(Number).sort((a, b) => a - b).map(r => ({
        label: isDoubleElim ? `WB R${r}` : `Round ${r}`,
        filter: { type: 'winners' as const, round: r },
      })),
      ...Object.keys(losersRounds).map(Number).sort((a, b) => a - b).map(r => ({
        label: `LB R${r}`,
        filter: { type: 'losers' as const, round: r },
      })),
      ...(finalsMatches.length > 0 ? [{ label: 'Grand Final', filter: { type: 'final' as const } }] : []),
    ];
    const isTabActive = (f: FilterState) => JSON.stringify(f) === JSON.stringify(activeFilter);
    return (
      <div className="sticky top-0 z-40 flex items-center gap-1 overflow-x-auto border-b border-white/5 bg-zinc-950/90 px-4 py-2 backdrop-blur">
        {roundTabs.map(tab => (
          <button
            key={tab.label}
            onClick={() => setActiveFilter(tab.filter)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all',
              isTabActive(tab.filter)
                ? 'border border-rose-500/30 bg-rose-500/20 text-rose-400'
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  // Render Alternative Views
  if (format === 'round_robin') {
    return (
      <div className="p-6">
        <GroupStageView
          stageId={graphData?.version?.stage_id || ''}
          versionId={versionId || ''}
          matches={graphData?.nodes || []}
          isOrganizer={isOrganizer}
          onMatchUpdate={handleRefresh}
          teamsMap={teamsMap}
          tournamentId={tournamentId}
          game={tournamentGame}
          onByeAdvance={onByeAdvance}
          stage={stage}
          advancementCount={stage?.advancement_count}
          canUseMapVeto={canUseMapVeto}
          suppressVetoRoleSwitchPrompt={suppressMockVetoRolePrompt}
          onMatchRoom={isOrganizer && tournamentSlug ? openMatchRoom : undefined}
        />
      </div>
    );
  }


  if (format === 'swiss') {
    return (
      <div className="p-6">
        <SwissView
          stageId={graphData?.version?.stage_id || ''}
          versionId={versionId || ''}
          matches={matches}
          isOrganizer={isOrganizer}
          onMatchUpdate={handleRefresh}
          tournamentId={tournamentId}
          game={tournamentGame}
          onByeAdvance={onByeAdvance}
          stage={stage}
          canUseMapVeto={canUseMapVeto}
          suppressVetoRoleSwitchPrompt={suppressMockVetoRolePrompt}
          onMatchRoom={isOrganizer && tournamentSlug ? openMatchRoom : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 bg-zinc-950/70 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Match View</p>
          <p className="text-xs text-zinc-500">Switch between bracket tree and list view.</p>
        </div>
        {renderViewToggle()}
      </div>
      {viewMode === 'matches' ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/30">
          {renderRoundTabs()}
          <VirtualizedMatchesList
            matchGroups={matchListGroups}
            renderMatchCard={renderMatchCard}
            getMatchLabel={getMatchLabel}
          />
        </div>
      ) : (
      <div className="flex h-[calc(100vh-140px)]">
        <div className="flex flex-col h-full border-r border-zinc-800 bg-zinc-900/50">
          <BracketSidebarFilter
            winnersRounds={Object.keys(winnersRounds).map(Number).sort((a, b) => a - b)}
            losersRounds={Object.keys(losersRounds).map(Number).sort((a, b) => a - b)}
            hasFinals={finalsMatches.length > 0}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
          <div className="p-4 border-t border-zinc-800">
            <BracketExporter
              matches={matches}
              triggerButton={
                <OutlineButton className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export PNG
                </OutlineButton>
              }
            />
          </div>
        </div>

        {/* Bracket - Container Free (Like Battlefy) */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950/30">
          {renderRoundTabs()}
          <div
            ref={(el) => {
              bracketScroll.scrollRef.current = el;
              bracketContainerRef.current = el;
            }}
            onWheel={bracketScroll.onWheel}
            onScroll={handleBracketScroll}
            tabIndex={0}
            aria-label="Scrollable bracket management canvas"
            className="min-h-0 flex-1 overflow-auto overscroll-contain [touch-action:pan-x_pan-y] focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            data-lenis-prevent
          >
            <div style={{
              width: totalWidth,
              height: filteredListPositions ? filteredListPositions.height : totalHeight,
              position: 'relative'
            }}>
            {activeFilter.type === 'all' && (
              <svg
                className="absolute left-0 top-0 pointer-events-none overflow-visible"
                style={{ width: totalWidth, height: totalHeight }}
              >
                {connectorPaths.map(path => (
                  <path
                    key={path.key}
                    d={path.d}
                    fill="none"
                    stroke="#cbd5e1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    className="opacity-55"
                  />
                ))}
              </svg>
            )}

            {/* Winners Bracket Heading */}
            {(activeFilter.type === 'all' || activeFilter.type === 'winners') &&
              matches.some(m => m.bracketSide === 'winners') &&
              stage?.format !== 'single_elimination' && (
                <div style={{ position: 'absolute', left: LEFT_PADDING, top: 0, width: 350, zIndex: 100 }}>
                  <h3 className="text-xl font-semibold tracking-tight text-white flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    Winners Bracket
                  </h3>
                </div>
              )}

            {/* Losers Bracket Heading */}
            {(activeFilter.type === 'all' || activeFilter.type === 'losers') && matches.some(m => m.bracketSide === 'losers') && (
              <div style={{
                position: 'absolute',
                left: LEFT_PADDING,
                top: activeFilter.type === 'losers' ? 0 : (winnersBottomY + BRACKET_SPACING),
                width: 350,
                zIndex: 100
              }}>
                <h3 className="text-xl font-semibold tracking-tight text-white flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-red-500/10 border border-red-500/20">
                    <Swords className="w-4 h-4 text-red-500" />
                  </div>
                  Losers Bracket
                </h3>
              </div>
            )}

            {/* Matches - disable animations for large brackets (>64 matches) for performance */}
            {matches.length <= 64 ? (
              <AnimatePresence mode='popLayout'>
                {matches.map(m => {
                  // Filter logic
                  if (activeFilter.type === 'winners') {
                    if ((m.bracketSide && m.bracketSide !== 'winners') || m.round !== activeFilter.round) return null;
                  }
                  if (activeFilter.type === 'losers') {
                    if (m.bracketSide !== 'losers' || m.round !== activeFilter.round) return null;
                  }
                  if (activeFilter.type === 'final') {
                    if (m.bracketSide !== 'final') return null;
                  }

                  const pos = filteredListPositions
                    ? filteredListPositions.positions.get(String(m.id))
                    : matchPositions.get(String(m.id));
                  if (!pos) return null;
                  const left = filteredListPositions ? pos.x : pos.x - filterXOffset;
                  const top = filteredListPositions ? pos.y : pos.y - filterYOffset;

                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      style={{ position: 'absolute', left, top }}
                    >
                      {renderMatchCard(m, 0, 0, getMatchLabel(m))}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            ) : (
              // Large bracket: viewport-based rendering for performance
              visibleMatches.map(m => {
                if (activeFilter.type === 'winners') {
                  if ((m.bracketSide && m.bracketSide !== 'winners') || m.round !== activeFilter.round) return null;
                }
                if (activeFilter.type === 'losers') {
                  if (m.bracketSide !== 'losers' || m.round !== activeFilter.round) return null;
                }
                if (activeFilter.type === 'final') {
                  if (m.bracketSide !== 'final') return null;
                }

                const pos = filteredListPositions
                  ? filteredListPositions.positions.get(String(m.id))
                  : matchPositions.get(String(m.id));
                if (!pos) return null;
                const left = filteredListPositions ? pos.x : pos.x - filterXOffset;
                const top = filteredListPositions ? pos.y : pos.y - filterYOffset;

                return (
                  <div key={m.id} style={{ position: 'absolute', left, top }}>
                    {renderMatchCard(m, 0, 0, getMatchLabel(m))}
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Dialogs */}
      <Dialog open={goLiveDialogOpen} onOpenChange={setGoLiveDialogOpen}>
        <DialogContent
          className="max-w-md p-0 overflow-hidden border border-white/20 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.3) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.15), 0 25px 50px -12px rgba(0,0,0,0.5)'
          }}
        >
          {/* Centered Title */}
          <div className="text-center pt-6 pb-4">
            <h2 className="text-lg font-semibold text-white">Start Match</h2>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Team Logos - Containerless */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <EntityAvatar
                  src={goLiveMatch?.team1?.logo_url}
                  name={goLiveMatch?.team1?.name}
                  entityId={goLiveMatch?.team1?.id}
                  type="team"
                  size="w-16 h-16"
                  fallbackClassName="text-xl"
                  imgClassName="object-contain"
                />
                <span className="text-xs text-white/60 text-center max-w-[120px]">{goLiveMatch?.team1?.name}</span>
              </div>

              <span className="text-lg font-medium text-white/20">vs</span>

              <div className="flex flex-col items-center gap-2">
                <EntityAvatar
                  src={goLiveMatch?.team2?.logo_url}
                  name={goLiveMatch?.team2?.name}
                  entityId={goLiveMatch?.team2?.id}
                  type="team"
                  size="w-16 h-16"
                  fallbackClassName="text-xl"
                  imgClassName="object-contain"
                />
                <span className="text-xs text-white/60 text-center max-w-[120px]">{goLiveMatch?.team2?.name}</span>
              </div>
            </div>

            {/* Party Code Input */}
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-lg font-mono uppercase tracking-[0.25em] text-center placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
              placeholder="PARTY CODE"
              value={partyCodeInput}
              onChange={(e) => setPartyCodeInput(e.target.value.toUpperCase())}
              autoFocus
            />

            {/* Buttons */}
            <div className="flex gap-3">
              <CancelButton
                onClick={() => setGoLiveDialogOpen(false)}
                className="flex-1 h-12 rounded-2xl"
              >
                Cancel
              </CancelButton>
              <SuccessButton
                onClick={() => handleGoLive()}
                disabled={isProcessing || !partyCodeInput.trim()}
                className="flex-1 h-12"
              >
                Go Live
              </SuccessButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={partyCodeOpen} onOpenChange={setPartyCodeOpen}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-xs text-center">
          <DialogHeader><DialogTitle><Gamepad2 className="w-5 h-5 inline mr-2 text-green-500" />Party Code</DialogTitle></DialogHeader>
          <div className="py-5">
            <div className="text-3xl font-mono font-bold bg-white/5 rounded-xl py-5 mb-4">{partyCodeMatch?.partyCode || 'N/A'}</div>
            <Button onClick={copyPartyCode} className="w-full">{copiedCode ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}{copiedCode ? 'Copied!' : 'Copy Code'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={canUseMapVeto && mapVetoOpen} onOpenChange={setMapVetoOpen}>
        <DialogContent className="bg-[#09090b] border-zinc-800/80 max-w-[min(96vw,1280px)] h-[min(86dvh,780px)] overflow-hidden p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 py-3 border-b border-zinc-800 bg-[#18181b] flex-shrink-0">
            <DialogTitle className="text-white flex items-center gap-2 text-base font-semibold">
              <Swords className="w-4 h-4 text-rose-500" />
              Map Veto
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-lenis-prevent>
            {mapVetoMatch && tournamentId && (
              <MapVeto
                matchId={getRawId(mapVetoMatch.id)}
                tournamentId={tournamentId}
                tournamentSlug={tournamentSlug}
                team1Id={mapVetoMatch.team1?.id}
                team2Id={mapVetoMatch.team2?.id}
                team1Name={mapVetoMatch.team1?.name}
                team2Name={mapVetoMatch.team2?.name}
                game={tournamentGame}
                bestOf={mapVetoMatch.bestOf ?? stage?.best_of ?? stage?.bestOf ?? 1}
                matchStatus={mapVetoMatch.status as 'pending' | 'in_progress' | 'completed'}
                layout="modal"
                showShareLinks
                suppressRoleSwitchPrompt={suppressMockVetoRolePrompt}
                onComplete={() => { setMapVetoOpen(false); onRefresh?.(); }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MatchResultsDialog
        open={resultsDialogOpen}
        onOpenChange={setResultsDialogOpen}
        results={resultsDialogMatch ? (proofs?.[getRawId(resultsDialogMatch.id)] || []).map(url => ({
          image_url: url,
          comment: null,
          created_at: new Date().toISOString(),
          reporter_user_id: ''
        })) : []}
        automatedResults={resultsDialogMatch ? (automatedGames?.[getRawId(resultsDialogMatch.id)] || []) : []}
        team1Name={resultsDialogMatch?.team1?.name}
        team2Name={resultsDialogMatch?.team2?.name}
        team1Id={resultsDialogMatch?.team1?.id}
      />
    </div >
  );
});

BracketVisualization.displayName = 'BracketVisualization';
export default BracketVisualization;
