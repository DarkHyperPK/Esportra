/**
 * BracketVisualization - Battlefy-Style with Glassmorphism
 * 
 * PERFECT TREE SYMMETRY:
 * - First round: evenly spaced
 * - Subsequent rounds: centered between source matches
 * 
 * CARD HEIGHT: Fixed at 200px to prevent overlapping
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Copy, Check, ZoomIn, ZoomOut,
  Trophy, PlayCircle, Swords, Gamepad2, ChevronDown, RefreshCw, Eye, Settings2, Maximize2, Bot
} from 'lucide-react';
import { MatchResultsDialog } from './dialogs/MatchResultsDialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { BracketMatch } from '@/types/bracketTypes';
import { GraphMatchService } from '@/services/bracket/GraphMatchService';
import { MapVeto } from '@/components/tournament/MapVeto';
import { useGraphBracket } from '@/hooks/useGraphBracket';
import { adaptGraphToBracketMatches, extractTeamIds } from '@/services/bracket/BracketAdapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { optimisticBracket } from '@/services/bracket/optimisticBracket';

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
  isOrganizer = false,
  onOpenMapVeto,
  onRefresh,
  onByeAdvance,
  stage,
}) => {
  // Data Fetching Logic with Realtime subscriptions
  const queryClient = useQueryClient();
  const { data: graphData, refetch: refetchGraph } = useGraphBracket(versionId || '', tournamentId || undefined);

  // Fetch match proofs
  const { data: proofs } = useQuery({
    queryKey: ['match-proofs', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return {};
      const { data } = await supabase
        .from('tournament_match_results')
        .select('match_id, image_url')
        .eq('tournament_id', tournamentId)
        .not('image_url', 'is', null);

      const map: Record<string, string[]> = {};
      data?.forEach((r: any) => {
        // Handle both raw UUID and db- prefixed ID if necessary
        // Assuming tournament_match_results uses raw UUID
        const id = r.match_id;
        if (!map[id]) map[id] = [];
        if (r.image_url) map[id].push(r.image_url);
      });
      return map;
    },
    enabled: !!tournamentId,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Fetch detailed game results (automated reports)
  const { data: automatedGames } = useQuery({
    queryKey: ['bracket-match-games', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return {};
      const { data, error } = await supabase
        .from('brkt_match_games')
        .select(`
          *,
          game_maps (
            map_name
          )
        `)
        .eq('status', 'completed');

      if (error) throw error;

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
      const { data, error } = await supabase.from('teams').select('id, name, logo_url').in('id', teamIds);
      if (error) throw error;
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
  const { matches: adaptedMatches, teamCount } = useMemo(() => {
    if (propMatches.length > 0) return { matches: propMatches, teamCount: propTeamCount };

    // Preferred: Cache 
    if (graphData?.version?.cached_ui_state) {
      const cached = graphData.version.cached_ui_state;
      const count = Math.max(cached.filter((m: any) => m.bracketSide === 'winners' && m.round === 1).length * 2, 4);
      return { matches: cached, teamCount: count };
    }

    // Fallback: Realtime adaptation for backwards compatibility / uninitialized cache
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [mapVetoOpen, setMapVetoOpen] = useState(false);
  const [mapVetoMatch, setMapVetoMatch] = useState<BracketMatch | null>(null);

  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [resultsDialogMatch, setResultsDialogMatch] = useState<BracketMatch | null>(null);



  // Categorize matches
  const { winnersRounds, losersRounds, finalsMatches, maxWinnersRound } = useMemo(() => {
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
      finalsMatches: finals.sort((a, b) => a.matchNumber - b.matchNumber),
      maxWinnersRound: Math.max(...Object.keys(winners).map(Number), 0)
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
          const prevRound = wRounds[rIdx - 1];

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
  const handleGoLive = useCallback(async (matchOverride?: BracketMatch, codeOverride?: string) => {
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

    const r = await GraphMatchService.goLive(getRawId(match.id), code.trim());
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

  const openGoLive = useCallback((m: BracketMatch, code?: string) => {
    if (code) {
      handleGoLive(m, code);
    } else {
      setGoLiveMatch(m);
      setPartyCodeInput('');
      setGoLiveDialogOpen(true);
    }
  }, [handleGoLive]);
  const openMapVeto = useCallback((m: BracketMatch) => { if (onOpenMapVeto) onOpenMapVeto(m, String(m.id)); else { setMapVetoMatch(m); setMapVetoOpen(true); } }, [onOpenMapVeto]);
  const openPartyCode = useCallback((m: BracketMatch) => { setPartyCodeMatch(m); setPartyCodeOpen(true); setCopiedCode(false); }, []);
  const copyPartyCode = async () => { if (!partyCodeMatch?.partyCode) return; await navigator.clipboard.writeText(partyCodeMatch.partyCode); setCopiedCode(true); toast({ title: '📋 Copied!' }); setTimeout(() => setCopiedCode(false), 2000); };
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

  const renderMatchCard = useCallback((match: BracketMatch, x: number, y: number, label: string) => (
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
      onMapVeto={openMapVeto}
      onPartyCode={openPartyCode}
      onSaveScore={saveScore}
      scoreDraftRef={scoreDraftRef}
      proofs={proofs?.[getRawId(match.id)]}
      onByeAdvance={onByeAdvance}
      automatedStatus={(match as any).automated_report_status}
      onViewResults={(m) => {
        setResultsDialogMatch(m);
        setResultsDialogOpen(true);
      }}
    />
  ), [expandedMatch, isOrganizer, isProcessing, handleScoreChange, toggleExpand, openGoLive, openMapVeto, openPartyCode, saveScore, proofs, onByeAdvance]);

  // Open bracket in fullscreen new tab
  const openFullscreen = useCallback(() => {
    const url = window.location.href;
    window.open(url, '_blank', 'fullscreen=yes,menubar=no,toolbar=no,location=no,status=no');
  }, []);

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
          onByeAdvance={onByeAdvance}
          stage={stage}
          advancementCount={stage?.advancement_count}
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
          onByeAdvance={onByeAdvance}
          stage={stage}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Enterprise Toolbar */}


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
        <div className="relative flex-1 overflow-auto bg-zinc-950/30">
          <div style={{
            width: totalWidth,
            height: totalHeight,
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
                const pos = matchPositions.get(String(m.id));
                if (!pos) return null;

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    style={{ position: 'absolute', left: pos.x - filterXOffset, top: pos.y - filterYOffset }}
                  >
                    {renderMatchCard(m, 0, 0, // Pass 0,0 because we position the wrapper
                      m.bracketSide === 'final' ? "Grand Finals" :
                        `${m.bracketSide === 'losers' ? 'L' : 'W'}${m.round} • M${m.matchNumber}`
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

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

      <Dialog open={mapVetoOpen} onOpenChange={setMapVetoOpen}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-5xl max-h-[90vh] overflow-auto p-0">
          <DialogHeader className="p-4 border-b border-white/10"><DialogTitle><Swords className="w-5 h-5 inline mr-2 text-orange-500" />Map Veto</DialogTitle></DialogHeader>
          {mapVetoMatch && tournamentId && <MapVeto matchId={getRawId(mapVetoMatch.id)} tournamentId={tournamentId} team1Id={mapVetoMatch.team1?.id} team2Id={mapVetoMatch.team2?.id} team1Name={mapVetoMatch.team1?.name} team2Name={mapVetoMatch.team2?.name} bestOf={3} matchStatus={mapVetoMatch.status as any} onComplete={() => { setMapVetoOpen(false); onRefresh?.(); }} />}
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
