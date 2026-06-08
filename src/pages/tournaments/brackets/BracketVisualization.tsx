/**
 * BracketVisualization - Battlefy-Style with Glassmorphism
 * 
 * PERFECT TREE SYMMETRY:
 * - First round: evenly spaced
 * - Subsequent rounds: centered between source matches
 * 
 * CARD HEIGHT: Fixed at 200px to prevent overlapping
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check,
  Trophy, Swords, Gamepad2, Network, List
} from 'lucide-react';
import { MatchResultsDialog } from './dialogs/MatchResultsDialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BracketMatch } from '@/types/bracketTypes';
import { GraphMatchService } from '@/services/bracket/GraphMatchService';
import { MapVeto } from '@/components/tournament/MapVeto';
import { useGraphBracket } from '@/hooks/useGraphBracket';
import { adaptGraphToBracketMatches, extractTeamIds } from '@/services/bracket/BracketAdapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { optimisticBracket } from '@/services/bracket/optimisticBracket';
import { useBracketWheelScroll } from '@/hooks/useBracketWheelScroll';
import { gameHasMapVeto } from '@/utils/gameFeatures';

// =============================================================================
// LAYOUT CONSTANTS - THESE MUST MATCH ACTUAL RENDERED CARD SIZE
// =============================================================================
const CARD_WIDTH = 320;
const CARD_HEIGHT = 180;  // Increased for better layout
const ROUND_GAP = 120;    // Horizontal gap between rounds
const MATCH_GAP = 20;     // Vertical gap between first-round matches
const LEFT_PADDING = 50;  // Padding for headings

// Spacing Constants
const HEADING_HEIGHT = 40;
const HEADING_MARGIN = 50; // Space between heading and cards
const BRACKET_SPACING = 100; // Space between Winners bottom and Losers heading

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
    const map = new Map<string, { id: string; name: string; logo_url?: string | null }>();
    teamsData?.forEach((t: any) => map.set(t.id, t));
    return map;
  }, [teamsData]);

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
  const [viewMode, setViewMode] = useState<'bracket' | 'matches'>('bracket');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mapVetoOpen, setMapVetoOpen] = useState(false);
  const [mapVetoMatch, setMapVetoMatch] = useState<BracketMatch | null>(null);

  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [resultsDialogMatch, setResultsDialogMatch] = useState<BracketMatch | null>(null);
  const bracketScroll = useBracketWheelScroll<HTMLDivElement>();



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



  // =============================================================================
  // GRAPH LAYOUT (Using coordinates from Graph Engine)
  // =============================================================================

  // =============================================================================
  // AUTO-LAYOUT ALGORITHM (Client-Side for Perfect Symmetry)
  // =============================================================================
  // =============================================================================
  // AUTO-LAYOUT ALGORITHM (Client-Side for Perfect Symmetry)
  // =============================================================================
  const matchPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();

    if (matches.length === 0) return map;

    // 1. Group by Round and Bracket Side
    const rounds: Record<string, Record<number, BracketMatch[]>> = {
      winners: {},
      losers: {},
      final: {}
    };

    matches.forEach(m => {
      const side = m.bracketSide || 'winners';
      if (!rounds[side][m.round]) rounds[side][m.round] = [];
      rounds[side][m.round].push(m);
    });

    // Sort matches in each round by matchNumber
    Object.keys(rounds).forEach(side => {
      Object.keys(rounds[side]).forEach(r => {
        rounds[side][Number(r)].sort((a, b) => a.matchNumber - b.matchNumber);
      });
    });

    // 2. Calculate Positions for Winners Bracket (Slot-Based)
    const wRounds = Object.keys(rounds.winners).map(Number).sort((a, b) => a - b);

    // We need to track the "virtual slot" of each match to calculate parents
    const matchSlots = new Map<string, number>();

    wRounds.forEach((round, rIdx) => {
      const roundMatches = rounds.winners[round];

      roundMatches.forEach((m, idx) => {
        const id = String(m.id);
        const rawId = getRawId(id);

        let slot = 0;

        if (rIdx === 0) {
          // Round 1: Assign sequential slots
          slot = idx;
        } else {
          // Subsequent Rounds: Center between children

          // Find matches in previous round where target_match_id == this match id
          const children = graphData?.edges?.filter(e =>
            String(e.target_match_id) === rawId || String(e.target_match_id) === id
          ).map(e => String(e.source_match_id)) || [];

          const childSlots = children.map(cId => matchSlots.get(cId)).filter(s => s !== undefined);

          if (childSlots.length > 0) {
            const min = Math.min(...childSlots as number[]);
            const max = Math.max(...childSlots as number[]);
            slot = (min + max) / 2;
          } else {
            // Fallback
            slot = idx * Math.pow(2, rIdx);
          }
        }

        matchSlots.set(id, slot);
        matchSlots.set(rawId, slot);

        // Use rIdx (0-based index) for X positioning to align with heading
        const x = LEFT_PADDING + (rIdx * (CARD_WIDTH + ROUND_GAP));
        // Matches start below heading
        const y = HEADING_HEIGHT + HEADING_MARGIN + (slot * (CARD_HEIGHT + MATCH_GAP));

        map.set(id, { x, y });
        map.set(rawId, { x, y });
      });
    });

    // Process Losers Bracket (Stack below)
    // Find max Y of winners bracket
    const maxWinnersY = Math.max(...Array.from(map.values()).map(p => p.y + CARD_HEIGHT), 0);

    // Losers Heading Position (calculated for render)
    const losersHeadingY = maxWinnersY + BRACKET_SPACING;

    // Losers Cards Start Y
    const losersStartY = losersHeadingY + HEADING_HEIGHT + HEADING_MARGIN;

    const lRounds = Object.keys(rounds.losers).map(Number).sort((a, b) => a - b);

    lRounds.forEach((round, rIdx) => {
      rounds.losers[round].forEach((m, idx) => {
        const id = String(m.id);
        const rawId = getRawId(id);
        // Use rIdx for X positioning to align with winners bracket
        const x = LEFT_PADDING + (rIdx * (CARD_WIDTH + ROUND_GAP));
        const y = losersStartY + (idx * (CARD_HEIGHT + MATCH_GAP));
        map.set(id, { x, y });
        map.set(rawId, { x, y });
      });
    });

    // Finals - position after last winners round
    const finalX = LEFT_PADDING + (wRounds.length * (CARD_WIDTH + ROUND_GAP));
    const lastWinnerMatch = rounds.winners[wRounds[wRounds.length - 1]]?.[0];
    let finalY = 100;
    if (lastWinnerMatch) {
      const p = map.get(String(lastWinnerMatch.id));
      if (p) finalY = p.y;
    }

    const fRounds = Object.keys(rounds.final).map(Number).sort((a, b) => a - b);
    fRounds.forEach((r, rIdx) => {
      rounds.final[r].forEach((m, i) => {
        const id = String(m.id);
        const rawId = getRawId(id);
        // Use rIdx for X positioning to separate rounds (e.g. GF vs Reset)
        const x = finalX + (rIdx * (CARD_WIDTH + ROUND_GAP)) + (i * (CARD_WIDTH + 50));
        map.set(id, { x, y: finalY });
        map.set(rawId, { x, y: finalY });
      });
    });

    return map;
  }, [matches, graphData?.edges]);

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

  // Calculate canvas size based on max X/Y
  const { totalWidth, totalHeight, winnersBottomY } = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    let maxWinnerY = 0;

    matches.forEach(m => {
      const pos = matchPositions.get(String(m.id));
      if (pos) {
        maxX = Math.max(maxX, pos.x + CARD_WIDTH);
        maxY = Math.max(maxY, pos.y + CARD_HEIGHT);
        if (m.bracketSide === 'winners') {
          maxWinnerY = Math.max(maxWinnerY, pos.y + CARD_HEIGHT);
        }
      }
    });
    return {
      totalWidth: Math.max(maxX + 400, 1600), // Increased container size
      totalHeight: Math.max(maxY + 400, 1000),
      winnersBottomY: maxWinnerY
    };
  }, [matches, matchPositions]);

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

    const r = await GraphMatchService.goLive(getRawId(match.id), code.trim(), force);
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
  }, [goLiveMatch, partyCodeInput, toast, queryClient, versionId]);

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
  const getMatchLabel = useCallback((m: BracketMatch) => (
    m.bracketSide === 'final'
      ? (finalsMatches.length > 1 && m.round === Math.max(...finalsMatches.map(f => f.round))
        ? "Grand Finals Reset"
        : "Grand Finals")
      : `${m.bracketSide === 'losers' ? 'L' : 'W'}${m.round} • M${m.matchNumber}`
  ), [finalsMatches]);
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
      onViewResults={(m) => {
        setResultsDialogMatch(m);
        setResultsDialogOpen(true);
      }}
    />
  ), [expandedMatch, isOrganizer, isProcessing, versionId, tournamentId, handleScoreChange, toggleExpand, openGoLive, canUseMapVeto, openMapVeto, openPartyCode, saveScore, proofs, onByeAdvance, tournamentSlug, openMatchRoom]);

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
      <Button
        type="button"
        size="sm"
        variant={viewMode === 'bracket' ? 'default' : 'ghost'}
        className={cn('h-8 gap-2 text-xs', viewMode === 'bracket' ? 'bg-rose-500 hover:bg-rose-600' : 'text-zinc-400 hover:text-white')}
        onClick={() => setViewMode('bracket')}
      >
        <Network className="h-3.5 w-3.5" />
        Bracket
      </Button>
      <Button
        type="button"
        size="sm"
        variant={viewMode === 'matches' ? 'default' : 'ghost'}
        className={cn('h-8 gap-2 text-xs', viewMode === 'matches' ? 'bg-rose-500 hover:bg-rose-600' : 'text-zinc-400 hover:text-white')}
        onClick={() => setViewMode('matches')}
      >
        <List className="h-3.5 w-3.5" />
        Matches
      </Button>
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950/30">
          {renderRoundTabs()}
          <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="space-y-5">
            {matchListGroups.map(([group, groupMatches]) => (
              <section key={group} className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{group}</h3>
                  <span className="text-xs text-zinc-500">{groupMatches.length} match{groupMatches.length === 1 ? '' : 'es'}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {groupMatches.map((match) => (
                    <div key={match.id} className="min-w-0">
                      {renderMatchCard(match, undefined, undefined, getMatchLabel(match))}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {matchListGroups.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">
                No matches match this filter.
              </div>
            )}
          </div>
          </div>
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
                <Button variant="outline" className="w-full bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
                  <Download className="w-4 h-4 mr-2" />
                  Export PNG
                </Button>
              }
            />
          </div>
        </div>

        {/* Bracket - Container Free (Like Battlefy) */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950/30">
          {renderRoundTabs()}
          <div
            ref={bracketScroll.scrollRef}
            onWheel={bracketScroll.onWheel}
            tabIndex={0}
            aria-label="Scrollable bracket management canvas"
            className="min-h-0 flex-1 overflow-auto overscroll-contain [touch-action:pan-x_pan-y] focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            <div style={{
              width: totalWidth,
              height: filteredListPositions ? filteredListPositions.height : totalHeight,
              position: 'relative'
            }}>
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

            {/* Matches */}
            <AnimatePresence mode='popLayout'>
              {matches.map(m => {
                // Filter logic
                if (activeFilter.type === 'winners') {
                  // Allow explicit 'winners' or undefined (fallback)
                  if ((m.bracketSide && m.bracketSide !== 'winners') || m.round !== activeFilter.round) return null;
                }
                if (activeFilter.type === 'losers') {
                  if (m.bracketSide !== 'losers' || m.round !== activeFilter.round) return null;
                }
                if (activeFilter.type === 'final') {
                  if (m.bracketSide !== 'final') return null;
                }

                // Use calculated positions from matchPositions
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
              <Button
                variant="ghost"
                onClick={() => setGoLiveDialogOpen(false)}
                className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white/80 rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleGoLive()}
                disabled={isProcessing || !partyCodeInput.trim()}
                className="flex-1 h-12 bg-green-600 hover:bg-green-500 text-white font-medium rounded-2xl"
              >
                Go Live
              </Button>
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
