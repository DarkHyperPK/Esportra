import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import MatchResultUpload from '@/components/tournament/MatchResultUpload';
import { MapVeto } from '@/components/tournament/MapVeto';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { UploadCloud, Eye, Settings, Radio, Copy, Check, Map as MapIcon, Maximize, Minimize, ZoomIn, ZoomOut } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { Tournament } from '@/hooks/useTournaments';
import { supabase } from '@/lib/supabase';
import BracketRound from '@/components/bracket/BracketRound';
import BracketMatchCard, { BracketMatchProps } from '@/components/bracket/BracketMatchCard';
import { generateDoubleEliminationMatches, generateBracketMatches } from '@/hooks/useTournamentBracket';
import type {
  Participant,
  Match,
  BracketTeam,
  BracketMatch,
  BracketSize,
  ScheduleConfig
} from '@/types/bracketTypes';
import { useBracketData, usePersistMatches, useClearBracket } from '@/hooks/useBracketQueries';
import { Slider } from '@/components/ui/slider';
import { calculateX, calculateY, S, ROUND_WIDTH, MATCH_HEIGHT, GAP } from '@/constants/bracketConstants';

type SwapPayload = { source: { round: number; matchNumber: number; slot: 'team1' | 'team2' }, target: { round: number; matchNumber: number; slot: 'team1' | 'team2' } };
const BracketVisualization: React.FC<{ matches: BracketMatch[]; teamCount: number; tournamentId?: string | null; isOrganizer?: boolean; isCaptain?: boolean; userTeamId?: string; matchVetoLinks?: Map<string, { team1Link?: string; team2Link?: string }>; onUploadResult?: (matchId: string) => void; onSwapTeam?: (p: SwapPayload) => void; onOpenMapVeto?: (match: BracketMatch, matchId: string) => void }> = React.memo(({ matches, teamCount, tournamentId, isOrganizer, isCaptain, userTeamId, matchVetoLinks = new Map(), onUploadResult, onSwapTeam, onOpenMapVeto }) => {
  const { toast } = useToast();
  const rounds = Math.log2(teamCount);
  const [scoreDraft, setScoreDraft] = React.useState<Record<string, { t1: string; t2: string }>>({});
  const [resultsOpen, setResultsOpen] = React.useState(false);
  const [resultsList, setResultsList] = React.useState<Array<{ image_url: string | null; comment: string | null; created_at: string; reporter_user_id: string }>>([]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<{ scheduled_at: string; best_of: string } | null>(null);
  const [editMatchId, setEditMatchId] = React.useState<string | null>(null);
  const [partyCodeOpen, setPartyCodeOpen] = React.useState(false);
  const [partyCodeMatch, setPartyCodeMatch] = React.useState<BracketMatch | null>(null);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [goLiveDialogOpen, setGoLiveDialogOpen] = React.useState(false);
  const [goLiveMatch, setGoLiveMatch] = React.useState<BracketMatch | null>(null);
  const [partyCodeInput, setPartyCodeInput] = React.useState('');
  const [vetoSetupMatchId, setVetoSetupMatchId] = React.useState<string | null>(null);

  // New state for collapsible rounds and expanded matches
  const [collapsedRounds, setCollapsedRounds] = React.useState<number[]>([]);
  const [viewSize, setViewSize] = React.useState<string>('all');
  const [viewBracket, setViewBracket] = React.useState<'winners' | 'losers' | 'all'>('all');
  const [expandedMatchId, setExpandedMatchId] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Panning state
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);
  const [scrollTop, setScrollTop] = React.useState(0);

  // Momentum refs
  const velocityRef = React.useRef({ x: 0, y: 0 });
  const lastPosRef = React.useRef({ x: 0, y: 0 });
  const lastTimeRef = React.useRef(0);
  const momentumIdRef = React.useRef<number>(0);
  const isDownRef = React.useRef(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const toggleRoundCollapse = (round: number) => {
    setCollapsedRounds(prev =>
      prev.includes(round) ? prev.filter(r => r !== round) : [...prev, round]
    );
  };

  const toggleMatch = (matchId: string) => {
    setExpandedMatchId(prev => prev === matchId ? null : matchId);
  };

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    // Only allow panning with left click
    if (e.button !== 0) return;

    // Stop any ongoing momentum
    if (momentumIdRef.current) {
      cancelAnimationFrame(momentumIdRef.current);
      momentumIdRef.current = 0;
    }

    isDownRef.current = true;
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setStartY(e.pageY - scrollContainerRef.current.offsetTop);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setScrollTop(scrollContainerRef.current.scrollTop);

    // Initialize velocity tracking
    lastPosRef.current = { x: e.pageX, y: e.pageY };
    lastTimeRef.current = Date.now();
    velocityRef.current = { x: 0, y: 0 };
  };

  const handleMouseUp = () => {
    isDownRef.current = false;
    setIsDragging(false);

    // Start momentum if velocity is high enough
    if (Math.abs(velocityRef.current.x) > 0.1 || Math.abs(velocityRef.current.y) > 0.1) {
      const applyMomentum = () => {
        if (!scrollContainerRef.current) return;

        // Apply friction
        velocityRef.current.x *= 0.95;
        velocityRef.current.y *= 0.95;

        // Update scroll position
        scrollContainerRef.current.scrollLeft -= velocityRef.current.x * 10;
        scrollContainerRef.current.scrollTop -= velocityRef.current.y * 10;

        // Continue if still moving
        if (Math.abs(velocityRef.current.x) > 0.1 || Math.abs(velocityRef.current.y) > 0.1) {
          momentumIdRef.current = requestAnimationFrame(applyMomentum);
        } else {
          momentumIdRef.current = 0;
        }
      };
      momentumIdRef.current = requestAnimationFrame(applyMomentum);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDownRef.current || !scrollContainerRef.current) return;
    e.preventDefault();

    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const y = e.pageY - scrollContainerRef.current.offsetTop;

    // Drag threshold check to prevent jitter on clicks
    if (!isDragging) {
      const dist = Math.hypot(x - startX, y - startY);
      if (dist < 10) return; // Increased threshold to 10px
      setIsDragging(true);
    }

    const walkX = (x - startX) * 1.0; // Reduced multiplier for smoother panning
    const walkY = (y - startY) * 1.0;

    scrollContainerRef.current.scrollLeft = scrollLeft - walkX;
    scrollContainerRef.current.scrollTop = scrollTop - walkY;

    // Track velocity
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      const dx = e.pageX - lastPosRef.current.x;
      const dy = e.pageY - lastPosRef.current.y;

      // Smooth velocity tracking
      velocityRef.current = {
        x: (dx / dt) * 0.5 + velocityRef.current.x * 0.5,
        y: (dy / dt) * 0.5 + velocityRef.current.y * 0.5
      };
    }
    lastPosRef.current = { x: e.pageX, y: e.pageY };
    lastTimeRef.current = now;
  };

  const transformMatch = (m: BracketMatch): BracketMatchProps['match'] => ({
    id: m.id,
    match_number: m.matchNumber,
    status: m.status,
    team1: m.team1 ? {
      id: m.team1.id,
      name: m.team1.name,
      logo: m.team1.logo_url,
      score: m.team1_score,
      isWinner: m.winner?.id === m.team1.id
    } : null,
    team2: m.team2 ? {
      id: m.team2.id,
      name: m.team2.name,
      logo: m.team2.logo_url,
      score: m.team2_score,
      isWinner: m.winner?.id === m.team2.id
    } : null,
    winner_id: m.winner?.id,
    roundName: getRoundName(m.round, m.bracketSide)
  });

  const renderMatchActions = (match: BracketMatchProps['match']) => {
    const m = matches.find(existing => existing.id === match.id);
    if (!m) return null;

    const isUserMatch = userTeamId && (m.team1?.id === userTeamId || m.team2?.id === userTeamId);
    const dbId = String(m.id).replace('db-', '');

    return (
      <div className="flex flex-col gap-3 w-full">
        {/* Captain Actions */}
        {tournamentId && String(m.id).startsWith('db-') && isCaptain && !isOrganizer && isUserMatch && (
          <div className="flex flex-wrap gap-2 justify-end">
            {m.status === 'in_progress' && m.partyCode && (
              <Button size="sm" variant="outline" className="text-xs h-7 border-green-600/40 text-green-400 bg-green-600/10 hover:bg-green-600/20" onClick={() => openPartyCode(m)}>
                <Radio className="w-3 h-3 mr-1" /> Party Code
              </Button>
            )}
            {m.team1 && m.team2 && m.team1.name !== 'TBD' && m.team2.name !== 'TBD' && onOpenMapVeto && (() => {
              const matchId = String(m.id).replace('db-', '');
              const vetoExists = matchVetoLinks.has(matchId) || vetoSetupMatchId === matchId;
              const canShowVeto = m.status === 'in_progress' || vetoExists;
              return canShowVeto ? (
                <Button
                  size="sm" variant="outline"
                  className="text-xs h-7 border-purple-600/40 text-purple-400 bg-purple-600/10 hover:bg-purple-600/20 relative"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenMapVeto(m, matchId);
                  }}
                >
                  <MapIcon className="w-3 h-3 mr-1" /> Map Veto
                  {isCaptain && userTeamId && matchVetoLinks.has(matchId) && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  )}
                </Button>
              ) : null;
            })()}

            {onUploadResult && (
              <Button size="sm" variant="outline" className="text-xs h-7 border-blue-500/40 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" onClick={() => onUploadResult(dbId)}>
                <UploadCloud className="w-3 h-3 mr-1" /> Upload Result
              </Button>
            )}
          </div>
        )}

        {/* Organizer Actions */}
        {isOrganizer && String(m.id).startsWith('db-') && (
          <div className="flex flex-col gap-2 border-t border-white/10 pt-2 mt-1">
            <div className="flex flex-wrap gap-2">
              {m.status === 'pending' && m.team1 && m.team2 && m.team1.name !== 'TBD' && m.team2.name !== 'TBD' && (
                <Button size="sm" variant="outline" className="text-xs h-7 border-green-600/40 text-green-400 bg-green-600/10 hover:bg-green-600/20" onClick={() => openGoLiveDialog(m)}>
                  <Radio className="w-3 h-3 mr-1" /> Go Live
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-xs h-7 border-white/20" onClick={() => openResults(m)}>
                <Eye className="w-3 h-3 mr-1" /> Results
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 border-white/20" onClick={() => openEdit(m)}>
                <Settings className="w-3 h-3 mr-1" /> Edit
              </Button>
              {m.team1 && m.team2 && m.team1.name !== 'TBD' && m.team2.name !== 'TBD' && onOpenMapVeto && (
                <Button
                  size="sm" variant="outline"
                  className="text-xs h-7 border-purple-600/40 text-purple-400 bg-purple-600/10 hover:bg-purple-600/20"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (m.status !== 'in_progress') {
                      toast({ title: 'Match not live', description: 'Go Live first.', variant: 'destructive' });
                      return;
                    }
                    onOpenMapVeto(m, String(m.id).replace('db-', ''));
                  }}
                >
                  <MapIcon className="w-3 h-3 mr-1" /> Veto
                </Button>
              )}
              {m.status === 'pending' && ((m.team1 && !m.team2) || (!m.team1 && m.team2)) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 border-orange-600/40 text-orange-400 bg-orange-600/10 hover:bg-orange-600/20"
                  onClick={() => {
                    const winnerId = m.team1 ? m.team1.id : m.team2!.id;
                    giveBye(m, winnerId);
                  }}
                >
                  <Check className="w-3 h-3 mr-1" /> Give BYE
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 bg-black/20 p-1 rounded">
              <input
                type="number"
                className="w-12 bg-[#16161d] border border-[#2a2a35] rounded px-1 py-0.5 text-xs text-center"
                placeholder="T1"
                value={scoreDraft[dbId]?.t1 || ''}
                onChange={(e) => setScoreDraft(prev => ({ ...prev, [dbId]: { t1: e.target.value, t2: prev[dbId]?.t2 || '' } }))}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs text-gray-500">-</span>
              <input
                type="number"
                className="w-12 bg-[#16161d] border border-[#2a2a35] rounded px-1 py-0.5 text-xs text-center"
                placeholder="T2"
                value={scoreDraft[dbId]?.t2 || ''}
                onChange={(e) => setScoreDraft(prev => ({ ...prev, [dbId]: { t1: prev[dbId]?.t1 || '', t2: e.target.value } }))}
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                size="sm"
                className="ml-auto h-6 text-[10px] px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  saveScoreAndAdvance(m);
                }}
                disabled={!(m.team1 && m.team2)}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getRoundName = (round: number, bracketSide?: string) => {
    if (bracketSide === 'final') return 'Grand Finals';
    if (bracketSide === 'reset') return 'Grand Finals Reset';

    const isDE = matches.some(m => m.bracketSide === 'losers');
    const prefix = bracketSide === 'losers' ? 'Lower' : 'Upper';
    const totalUpperRounds = Math.log2(teamCount);
    const totalLowerRounds = 2 * totalUpperRounds - 2;

    // For Lower Bracket, rounds are different
    if (bracketSide === 'losers') {
      if (round === totalLowerRounds) return 'Lower Finals';
      if (round === totalLowerRounds - 1) return 'Lower Semifinals';
      return `Lower Round ${round}`;
    }

    // Upper Bracket / Single Elimination Naming
    if (round === totalUpperRounds) return isDE ? 'Upper Finals' : 'Finals';
    if (round === totalUpperRounds - 1) return isDE ? 'Upper Semifinals' : 'Semifinals';
    if (round === totalUpperRounds - 2) return isDE ? 'Upper Quarterfinals' : 'Quarterfinals';

    return isDE ? `Upper Round ${round}` : `Round ${round}`;
  };

  const getMatchesByRound = (round: number) => {
    return matches.filter(match => match.round === round);
  };

  const onDragStart = (e: React.DragEvent, m: BracketMatch, slot: 'team1' | 'team2') => {
    if (!isOrganizer || m.status !== 'pending') return;
    const payload = JSON.stringify({ round: m.round, matchNumber: m.matchNumber, slot });
    e.dataTransfer.setData('application/json', payload);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (e: React.DragEvent, m: BracketMatch, slot: 'team1' | 'team2') => {
    if (!isOrganizer || !onSwapTeam || m.status !== 'pending') return;
    try {
      const src = JSON.parse(e.dataTransfer.getData('application/json')) as { round: number; matchNumber: number; slot: 'team1' | 'team2' };
      onSwapTeam({ source: src, target: { round: m.round, matchNumber: m.matchNumber, slot } });
    } catch { }
  };

  const saveScoreAndAdvance = async (m: BracketMatch) => {
    if (!tournamentId || !String(m.id).startsWith('db-')) return;
    const dbId = String(m.id).replace('db-', '');
    const draft = scoreDraft[dbId] || { t1: '', t2: '' };
    const s1 = parseInt(draft.t1 as any, 10);
    const s2 = parseInt(draft.t2 as any, 10);
    if (!Number.isFinite(s1) || !Number.isFinite(s2)) {
      toast({ title: 'Invalid scores', description: 'Please enter valid numbers for both teams.', variant: 'destructive' });
      return;
    }
    if (s1 === s2) {
      toast({ title: 'Tie not allowed', description: 'Scores cannot be equal. Please enter different scores.', variant: 'destructive' });
      return;
    }

    const winnerTeamId = s1 > s2 ? (m.team1?.id || null) : (m.team2?.id || null);
    const loserTeamId = s1 > s2 ? (m.team2?.id || null) : (m.team1?.id || null);

    // Get current team IDs from UI state
    const team1Id = m.team1?.id && !m.team1.id.startsWith('bye-') && !m.team1.id.startsWith('name:') ? m.team1.id : null;
    const team2Id = m.team2?.id && !m.team2.id.startsWith('bye-') && !m.team2.id.startsWith('name:') ? m.team2.id : null;

    try {
      // Update current match
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .update({
          team1_id: team1Id,
          team2_id: team2Id,
          team1_score: s1,
          team2_score: s2,
          status: 'completed',
          winner_team_id: winnerTeamId,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbId);

      if (matchError) throw matchError;

      // Advance winner
      if (winnerTeamId && m.nextMatchId) {
        // Fetch the next match to see which slot is available or intended
        const { data: nextMatch } = await supabase
          .from('tournament_matches')
          .select('team1_id, team2_id, match_number, bracket_side')
          .eq('id', m.nextMatchId)
          .single();

        if (nextMatch) {
          // Logic: if current match_number is odd, go to team1, if even go to team2
          let goesToSlot: 'team1_id' | 'team2_id' = (m.matchNumber % 2 === 1) ? 'team1_id' : 'team2_id';

          // Special case for Grand Finals: Force WB -> Team 1, LB -> Team 2
          if (nextMatch.bracket_side === 'final') {
            if (m.bracketSide === 'winners') goesToSlot = 'team1_id';
            if (m.bracketSide === 'losers') goesToSlot = 'team2_id';
          }

          await supabase
            .from('tournament_matches')
            .update({
              [goesToSlot]: winnerTeamId,
              updated_at: new Date().toISOString()
            })
            .eq('id', m.nextMatchId);
        }
      }

      // Advance loser (Double Elimination)
      if (loserTeamId && m.loserNextMatchId) {
        const { data: loserNextMatch } = await supabase
          .from('tournament_matches')
          .select('team1_id, team2_id')
          .eq('id', m.loserNextMatchId)
          .single();

        if (loserNextMatch) {
          // For LB, the slotting can be more complex, but usually it's team1 if from WB, team2 if from previous LB round
          // Or just fill the first available slot.
          const slotToFill: 'team1_id' | 'team2_id' = !loserNextMatch.team1_id ? 'team1_id' : 'team2_id';

          await supabase
            .from('tournament_matches')
            .update({
              [slotToFill]: loserTeamId,
              updated_at: new Date().toISOString()
            })
            .eq('id', m.loserNextMatchId);
        }
      }

      // Grand Finals Reset Logic
      if (m.bracketSide === 'final') {
        // Check if LB Winner (Team 2) won
        if (winnerTeamId === team2Id) {
          // Bracket Reset! LB Winner beat WB Winner.
          // Advance both to Reset Match
          if (m.nextMatchId) {
            await supabase.from('tournament_matches').update({
              team1_id: team2Id, // LB Winner becomes T1 in Reset
              team2_id: team1Id, // WB Winner becomes T2 in Reset
              status: 'pending'
            }).eq('id', m.nextMatchId);

            toast({ title: 'Bracket Reset!', description: 'The Losers Bracket winner forced a reset match!' });
          }
        } else {
          // WB Winner (Team 1) won. Tournament Over.
          // Cancel Reset Match
          if (m.nextMatchId) {
            await supabase.from('tournament_matches').update({
              status: 'cancelled' as any
            }).eq('id', m.nextMatchId);

            toast({ title: 'Tournament Complete!', description: 'The Winners Bracket winner has won the tournament!' });
          }
        }
      }

      setScoreDraft(prev => {
        const next = { ...prev };
        delete next[dbId];
        return next;
      });

      toast({ title: 'Score saved', description: 'Match result has been saved and teams advanced.' });
    } catch (error: any) {
      console.error('Error saving score:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save match result',
        variant: 'destructive'
      });
    }
  };

  const openResults = async (m: BracketMatch) => {
    if (!tournamentId || !String(m.id).startsWith('db-')) return;
    const dbId = String(m.id).replace('db-', '');
    const { data } = await (supabase as any)
      .from('tournament_match_results')
      .select('image_url, comment, created_at, reporter_user_id')
      .eq('tournament_id', tournamentId)
      .eq('match_id', dbId)
      .order('created_at', { ascending: false });
    setResultsList((data as any) || []);
    setResultsOpen(true);
  };

  const openEdit = async (m: BracketMatch) => {
    if (!tournamentId || !String(m.id).startsWith('db-')) return;
    const dbId = String(m.id).replace('db-', '');
    setEditMatchId(dbId);

    // Find the match in the matches array to get the raw scheduled_at value
    let iso = '';
    if (m.id && String(m.id).startsWith('db-')) {
      const matchId = String(m.id).replace('db-', '');
      // Fetch the match from database to get the raw scheduled_at
      const { data: matchData, error } = await (supabase as any)
        .from('tournament_matches')
        .select('scheduled_at')
        .eq('id', matchId)
        .maybeSingle();

      if (!error && matchData?.scheduled_at) {
        const date = new Date(matchData.scheduled_at);
        iso = date.toISOString().slice(0, 16);
      }
    }

    setEditDraft({ scheduled_at: iso, best_of: String(m.bestOf || 1) }); // best_of kept for backward compatibility but not shown in UI
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editMatchId || !editDraft) return;

    try {
      const payload: any = {
        updated_at: new Date().toISOString()
      };

      if (editDraft.scheduled_at) {
        payload.scheduled_at = new Date(editDraft.scheduled_at).toISOString();
      }

      const { error } = await supabase
        .from('tournament_matches')
        .update(payload)
        .eq('id', editMatchId);

      if (error) throw error;

      // Real-time subscription will automatically update bracketMatches and matches state
      // No need for manual state updates - realtime handles it

      // Real-time subscription will update matches state automatically

      toast({ title: 'Match updated', description: 'Match details have been saved.' });
      setEditOpen(false);

      // Real-time subscription will also update, ensuring consistency across all users
    } catch (error: any) {
      console.error('Error saving match edit:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update match',
        variant: 'destructive'
      });
    }
  };

  const openGoLiveDialog = (m: BracketMatch) => {
    // Check if both teams are filled
    if (!m.team1 || !m.team2 || m.team1.name === 'TBD' || m.team2.name === 'TBD') {
      toast({
        title: 'Cannot go live',
        description: 'Both teams must be filled before going live.',
        variant: 'destructive'
      });
      return;
    }
    setGoLiveMatch(m);
    setPartyCodeInput(m.partyCode || '');
    setGoLiveDialogOpen(true);
  };

  const goLive = async () => {
    if (!tournamentId || !goLiveMatch || !String(goLiveMatch.id).startsWith('db-')) return;
    if (!partyCodeInput.trim()) {
      toast({
        title: 'Party code required',
        description: 'Please enter a party code.',
        variant: 'destructive'
      });
      return;
    }

    const dbId = String(goLiveMatch.id).replace('db-', '');

    try {
      // Update match to in_progress and set party code
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          status: 'in_progress',
          party_code: partyCodeInput.trim().toUpperCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', dbId);

      if (error) throw error;

      toast({
        title: 'Match is now live',
        description: 'Party code has been set. Waiting for team members to join (5 minutes)...'
      });

      setGoLiveDialogOpen(false);
      setGoLiveMatch(null);
      setPartyCodeInput('');

      // Real-time subscription will update UI automatically
    } catch (error: any) {
      console.error('Error going live:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to go live',
        variant: 'destructive'
      });
    }
  };

  const openPartyCode = (m: BracketMatch) => {
    setPartyCodeMatch(m);
    setPartyCodeOpen(true);
    setCopiedCode(false);
  };

  const copyPartyCode = async () => {
    if (!partyCodeMatch?.partyCode) return;
    try {
      await navigator.clipboard.writeText(partyCodeMatch.partyCode);
      setCopiedCode(true);
      toast({ title: 'Copied!', description: 'Party code copied to clipboard.' });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to copy code', variant: 'destructive' });
    }
  };

  const advanceWinner = async (m: BracketMatch, winner: 'team1' | 'team2') => {
    if (!tournamentId || !String(m.id).startsWith('db-')) return;
    const dbId = String(m.id).replace('db-', '');
    const winnerTeamId = winner === 'team1' ? m.team1?.id : m.team2?.id;
    if (!winnerTeamId) return;
    // Parse next slot
    const nextRound = m.round + 1;
    const nextMatchNumber = Math.ceil(m.matchNumber / 2);
    const goesToSlot: 'team1_id' | 'team2_id' = (m.matchNumber % 2 === 1) ? 'team1_id' : 'team2_id';
    // Update current match with scores/status/winner
    await supabase.from('tournament_matches').update({
      winner_team_id: winnerTeamId,
      status: 'completed'
    }).eq('id', dbId);
    // Place winner into next round
    await supabase.from('tournament_matches').update({ [goesToSlot]: winnerTeamId }).match({
      tournament_id: tournamentId,
      round: nextRound,
      match_number: nextMatchNumber
    });
  };

  const giveBye = async (m: BracketMatch, winnerTeamId: string) => {
    if (!tournamentId || !String(m.id).startsWith('db-')) return;
    const dbId = String(m.id).replace('db-', '');

    try {
      // Use the RPC for consistent advancement logic
      const { error } = await supabase.rpc('advance_match_v2', {
        p_match_id: dbId,
        p_winner_id: winnerTeamId,
        p_team1_score: m.team1?.id === winnerTeamId ? 1 : 0,
        p_team2_score: m.team2?.id === winnerTeamId ? 1 : 0
      });

      if (error) throw error;

      toast({ title: 'BYE given', description: 'Team has been advanced to the next round.' });
    } catch (error: any) {
      console.error('Error giving BYE:', error);
      toast({ title: 'Error', description: error?.message || 'Failed to give BYE', variant: 'destructive' });
    }
  };

  const winnersMatches = matches.filter(m => m.bracketSide === 'winners');
  const losersMatches = matches.filter(m => m.bracketSide === 'losers');
  const finalMatches = matches.filter(m => m.bracketSide === 'final' || m.bracketSide === 'reset');
  const isDoubleElim = losersMatches.length > 0;

  const maxWinnersRound = Math.max(...winnersMatches.map(m => m.round), 0);
  const maxLosersRound = Math.max(...losersMatches.map(m => m.round), 0);
  const totalRounds = Math.log2(teamCount);

  // Calculate round offset for repositioning when filtering
  const roundOffset = React.useMemo(() => {
    if (viewSize === 'all') return 0;
    const size = parseInt(viewSize);
    const roundsToShow = Math.log2(size);
    return totalRounds - roundsToShow; // First visible round (0-indexed)
  }, [viewSize, totalRounds]);

  // Get human-readable round label
  const getRoundLabel = React.useCallback((roundNum: number, total: number): string => {
    if (roundNum === total) return 'Finals';
    if (roundNum === total - 1) return 'Semi-Finals';
    if (roundNum === total - 2) return 'Quarter-Finals';
    if (roundNum === total - 3) return 'Round of 16';
    if (roundNum === total - 4) return 'Round of 32';
    return `Round ${roundNum}`;
  }, []);

  // Calculate visible rounds count
  const visibleRoundsCount = React.useMemo(() => {
    if (viewSize === 'all') return totalRounds;
    return Math.log2(parseInt(viewSize));
  }, [viewSize, totalRounds]);

  const getMatchPos = React.useCallback((m: BracketMatch) => {
    const rIdx = m.round - 1;
    const mIdx = m.matchNumber - 1;

    // Apply round offset for repositioning when filtering
    // This makes the bracket act as an independent smaller bracket
    const adjustedRIdx = rIdx - roundOffset;

    // Use adjusted round index for BOTH x AND y positioning
    // This recalculates spacing as if this were a smaller bracket
    let x = calculateX(adjustedRIdx);
    // Add offset for round header labels (48px)
    const HEADER_OFFSET = 48;
    let y = calculateY(adjustedRIdx, mIdx) + HEADER_OFFSET; // Use adjustedRIdx for compact spacing

    if (m.bracketSide === 'losers') {
      // Compact vertical offset for Lower Bracket
      // If we are only viewing losers, move it to the top
      // Reduce vertical offset when filtering to create a more compact view
      const effectiveTeamCount = viewSize !== 'all' ? parseInt(viewSize) : teamCount;
      const lbVerticalOffset = viewBracket === 'losers' ? 40 : (effectiveTeamCount / 2) * S + 60;
      // Lower bracket rounds are paired (every 2 rounds reduce matches by half)
      const adjustedLosersRIdx = Math.floor(adjustedRIdx / 2);
      y = calculateY(adjustedLosersRIdx, mIdx) + lbVerticalOffset + HEADER_OFFSET;
      // Shift x with adjusted round
      x = calculateX(adjustedRIdx);
    } else if (m.bracketSide === 'final' || m.bracketSide === 'reset') {
      // Position Grand Finals to the right of the entire bracket
      const adjustedMaxRound = maxWinnersRound - roundOffset;
      x = (adjustedMaxRound + 1) * ROUND_WIDTH;
      // Center it between Upper Final and Lower Final with adjusted spacing
      const effectiveTeamCount = viewSize !== 'all' ? parseInt(viewSize) : teamCount;
      const lbVerticalOffset = viewBracket === 'losers' ? 40 : (effectiveTeamCount / 2) * S + 60;
      const adjustedUpperRound = maxWinnersRound - 1 - roundOffset;
      const upperFinalY = calculateY(adjustedUpperRound, 0) + HEADER_OFFSET;
      const adjustedLowerRound = Math.floor((maxLosersRound - 1 - roundOffset) / 2);
      const lowerFinalY = calculateY(adjustedLowerRound, 0) + lbVerticalOffset + HEADER_OFFSET;

      // If viewing only losers, we might want to center GF differently or just keep it relative
      y = viewBracket === 'losers' ? lowerFinalY : (upperFinalY + lowerFinalY) / 2;

      if (m.bracketSide === 'reset') {
        x += ROUND_WIDTH;
      }
    }

    return { x, y };
  }, [teamCount, maxWinnersRound, maxLosersRound, viewBracket, roundOffset, viewSize]);

  return (
    <div ref={containerRef} className={`w-full mt-4 transition-colors duration-300 ${isFullscreen ? 'flex flex-col h-full p-4 bg-zinc-950 overflow-auto' : 'space-y-4 bg-background'}`}>
      <div className="flex justify-between items-center mb-2 sticky top-0 z-10 bg-[#09090b]/95 backdrop-blur-md p-3 rounded-xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-3 bg-[#18181b] border border-zinc-800 rounded-lg px-4 py-1.5 shadow-inner">
            <ZoomOut className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white transition-colors" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} />
            <Slider
              value={[zoomLevel]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={(val) => setZoomLevel(val[0])}
              className="w-28"
            />
            <ZoomIn className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white transition-colors" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))} />
            <span className="text-xs font-mono text-zinc-400 w-10 text-right">{Math.round(zoomLevel * 100)}%</span>
          </div>
          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="icon"
            className="bg-[#18181b] border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-all"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {isDoubleElim && (
            <Select value={viewBracket} onValueChange={(val: any) => setViewBracket(val)}>
              <SelectTrigger className="w-[160px] bg-[#18181b] border-zinc-800 text-zinc-300 focus:ring-zinc-700">
                <SelectValue placeholder="Bracket Side" />
              </SelectTrigger>
              <SelectContent portalContainer={isFullscreen ? containerRef.current : undefined} className="bg-[#18181b] border-zinc-800 text-zinc-300">
                <SelectItem value="all">Full View</SelectItem>
                <SelectItem value="winners">Upper Bracket</SelectItem>
                <SelectItem value="losers">Lower Bracket</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={viewSize} onValueChange={setViewSize}>
            <SelectTrigger className="w-[140px] bg-[#18181b] border-zinc-800 text-zinc-300 focus:ring-zinc-700">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent portalContainer={isFullscreen ? containerRef.current : undefined} className="bg-[#18181b] border-zinc-800 text-zinc-300">
              <SelectItem value="all">Full Size</SelectItem>
              {rounds >= 4 && <SelectItem value="16">Last 16</SelectItem>}
              {rounds >= 3 && <SelectItem value="8">Last 8</SelectItem>}
              {rounds >= 2 && <SelectItem value="4">Semi-Finals</SelectItem>}
              <SelectItem value="2">Finals</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Unified Bracket Container */}
      <div className={`w-full overflow-hidden ${isFullscreen ? 'h-full flex flex-col border-none bg-[#09090b]' : 'border border-zinc-800 rounded-xl bg-[#09090b] shadow-2xl'}`}>
        <div
          ref={scrollContainerRef}
          className={`w-full ${isFullscreen ? 'flex-1 overflow-auto' : 'h-[70vh] min-h-[500px] overflow-auto'} p-4 cursor-grab active:cursor-grabbing scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent select-none`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="flex flex-col gap-12 min-w-max items-start pb-8 transition-transform origin-top-left"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Absolute Positioned Bracket Container */}
            <div
              className="relative"
              style={{
                width: (maxWinnersRound + (isDoubleElim ? 2 : 1)) * ROUND_WIDTH,
                height: (viewBracket === 'all' && isDoubleElim)
                  ? (teamCount / 2) * S * 2 + 200
                  : (teamCount / 2) * S + 100
              }}
            >
              {/* Section Headers */}
              {isDoubleElim && (
                <>
                  {viewBracket === 'all' && (
                    <>
                      <div className="absolute left-0 -top-8 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Upper Bracket</div>
                      <div className="absolute left-0 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase" style={{ top: (teamCount / 2) * S + 20 }}>Lower Bracket</div>
                    </>
                  )}
                  {viewBracket === 'winners' && (
                    <div className="absolute left-0 -top-8 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Upper Bracket</div>
                  )}
                  {viewBracket === 'losers' && (
                    <div className="absolute left-0 -top-8 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Lower Bracket</div>
                  )}
                </>
              )}

              {/* Round Header Labels */}
              <div className="absolute left-0 right-0 top-0 flex pointer-events-none z-20 pb-4">
                {Array.from({ length: Math.ceil(visibleRoundsCount) + (isDoubleElim ? 2 : 0) }).map((_, idx) => {
                  const actualRound = Math.floor(roundOffset) + idx + 1;
                  const isGrandFinals = idx === Math.ceil(visibleRoundsCount);
                  const isReset = idx === Math.ceil(visibleRoundsCount) + 1;

                  let label: string;
                  if (isReset) {
                    label = 'Reset';
                  } else if (isGrandFinals) {
                    label = 'Grand Finals';
                  } else {
                    label = getRoundLabel(actualRound, Math.floor(totalRounds));
                  }

                  // Only show finals labels for double elim
                  if (!isDoubleElim && (isGrandFinals || isReset)) return null;

                  return (
                    <div
                      key={`round-label-${actualRound}-${idx}`}
                      className="text-center font-bold text-sm text-white/90 uppercase tracking-wider bg-zinc-900/80 backdrop-blur-sm py-2 px-4 rounded-lg border border-white/10 mx-1"
                      style={{
                        width: ROUND_WIDTH - 8,
                        flexShrink: 0
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
              {/* SVG Connector Layer */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              >
                {matches.map(m => {
                  if (!m.nextMatchId) return null;
                  const nextMatch = matches.find(nm => nm.id === m.nextMatchId);
                  if (!nextMatch) return null;

                  const { x: curX, y: curY } = getMatchPos(m);
                  const { x: nxtX, y: nxtY } = getMatchPos(nextMatch);

                  const startX = curX + 280; // Match card width is roughly 280
                  const startY = curY + 50;  // Match card height is roughly 100
                  const endX = nxtX;
                  const endY = nxtY + 50;

                  const dx = ROUND_WIDTH / 2;
                  const path = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

                  return (
                    <path
                      key={`conn-${m.id}`}
                      d={path}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="2"
                      fill="none"
                    />
                  );
                })}
              </svg>

              {matches
                .filter(m => {
                  // Bracket side filter
                  if (viewBracket === 'winners') {
                    if (!(m.bracketSide === 'winners' || m.bracketSide === 'final' || m.bracketSide === 'reset')) return false;
                  }
                  if (viewBracket === 'losers') {
                    if (m.bracketSide !== 'losers') return false;
                  }

                  // View size filter (Last X teams)
                  if (viewSize !== 'all') {
                    const size = parseInt(viewSize);
                    // For single elimination, we can filter by round
                    // If size is 2 (Finals), we only show the last round
                    // If size is 4 (Semis), we show the last 2 rounds, etc.
                    const totalRounds = Math.log2(teamCount);
                    const roundsToShow = Math.log2(size);
                    if (m.round <= totalRounds - roundsToShow) return false;
                  }

                  return true;
                })
                .map(m => {
                  const { x, y } = getMatchPos(m);
                  const isExpanded = expandedMatchId === m.id;
                  return (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        left: x,
                        top: y,
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                        mass: 0.8
                      }}
                      className="absolute"
                      style={{
                        width: 280,
                        height: 100,
                        zIndex: isExpanded ? 50 : 1
                      }}
                    >
                      <BracketMatchCard
                        match={transformMatch(m)}
                        isExpanded={!isFullscreen && isExpanded}
                        onToggle={isFullscreen ? undefined : () => toggleMatch(m.id)}
                        actions={isFullscreen ? undefined : renderMatchActions(transformMatch(m))}
                        onTeamDragStart={isFullscreen ? undefined : (e, slot) => onDragStart(e, m, slot)}
                        onTeamDragOver={isFullscreen ? undefined : onDragOver}
                        onTeamDrop={isFullscreen ? undefined : (e, slot) => onDrop(e, m, slot)}
                        isDraggable={!isFullscreen && isOrganizer}
                      />
                    </motion.div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Results modal */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="sm:max-w-[720px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white">Submitted Results</DialogTitle>
            <DialogDescription className="text-gray-400">Images and comments submitted by teams for this match.</DialogDescription>
          </DialogHeader>
          {resultsList.length === 0 ? (
            <div className="text-gray-400 text-sm">No results submitted yet.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {resultsList.map((r, i) => (
                <div key={i} className="bg-gaming-gray/20 rounded border border-gaming-gray/30 overflow-hidden">
                  {r.image_url ? (
                    <a href={r.image_url} target="_blank" className="block">
                      <img src={r.image_url} alt="result" className="w-full h-32 object-cover" />
                    </a>
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center text-xs text-gray-400">No image</div>
                  )}
                  <div className="p-2">
                    <div className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                    {r.comment && <div className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{r.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit match modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Match</DialogTitle>
            <DialogDescription className="text-gray-400">Set match scheduled time.</DialogDescription>
          </DialogHeader>
          {editDraft && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Scheduled time</label>
                <input
                  type="datetime-local"
                  value={editDraft.scheduled_at}
                  onChange={(e) => setEditDraft({ ...editDraft, scheduled_at: e.target.value })}
                  className="w-full bg-[#16161d] border border-[#2a2a35] rounded px-3 py-2 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="text-right">
                <button
                  className="text-xs px-3 py-2 rounded bg-gaming-purple/70 hover:bg-gaming-purple/80 border border-gaming-purple/40"
                  onClick={saveEdit}
                >
                  Save changes
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Go Live Dialog - for organizer to enter party code */}
      <Dialog open={goLiveDialogOpen} onOpenChange={setGoLiveDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-400" />
              Go Live - Enter Party Code
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the party code from your in-game custom lobby. After going live, you'll have 5 minutes for team members to join, then the veto setup will begin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Party Code</label>
              <input
                type="text"
                value={partyCodeInput}
                onChange={(e) => setPartyCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter party code (e.g., ABC123)"
                className="w-full bg-[#16161d] border border-[#2a2a35] rounded-lg px-4 py-3 text-lg font-mono text-center tracking-widest text-white uppercase"
                maxLength={20}
                style={{ colorScheme: 'dark' }}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2">
                This code will be visible to team captains only.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={goLive}
                className="flex-1 bg-green-600 hover:bg-green-700"
                variant="default"
                disabled={!partyCodeInput.trim()}
              >
                <Radio className="w-4 h-4 mr-2" /> Go Live
              </Button>
              <Button
                onClick={() => {
                  setGoLiveDialogOpen(false);
                  setGoLiveMatch(null);
                  setPartyCodeInput('');
                }}
                variant="outline"
                className="border-gaming-gray/40"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Party Code modal - only visible to captains */}
      <Dialog open={partyCodeOpen} onOpenChange={setPartyCodeOpen}>
        <DialogContent className="sm:max-w-[420px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-400" />
              Match Party Code
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Use this code to join the custom lobby in-game.
            </DialogDescription>
          </DialogHeader>
          {partyCodeMatch?.partyCode && (
            <div className="space-y-4">
              <div className="bg-gaming-gray/20 rounded-lg p-6 border border-gaming-gray/30">
                <div className="text-center">
                  <div className="text-3xl font-bold tracking-widest text-green-400 mb-2 font-mono">
                    {partyCodeMatch.partyCode}
                  </div>
                  <p className="text-xs text-gray-400">Match is currently LIVE</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copyPartyCode}
                  className="flex-1 bg-gaming-purple hover:bg-gaming-purple/80 flex items-center justify-center"
                  variant="default"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" /> Copy Code
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setPartyCodeOpen(false)}
                  variant="outline"
                  className="border-gaming-gray/40"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

BracketVisualization.displayName = 'BracketVisualization';

const TournamentBrackets = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { currentRole } = useRole();

  // Legacy state - primary data source until TanStack Query migration is complete
  const [stages, setStages] = useState<any[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // TanStack Query for bracket data - available for future use
  // Currently disabled sync to avoid conflicts with existing fetch logic
  const {
    data: bracketQueryData,
    isLoading: queryLoading,
    refetch: refetchBracket
  } = useBracketData(slug, selectedStageId || undefined);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamCount, setTeamCount] = useState<8 | 16 | 24 | 32 | 64 | 128 | 256 | 512>(8);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);



  // NOTE: TanStack Query data sync temporarily disabled to restore original behavior
  // The manual fetchTournamentData useEffect handles data loading
  // TanStack Query can be re-enabled once the migration is fully tested

  const isOrganizerRole = currentRole === 'organizer';
  const isOrganizerOwner = useMemo(() =>
    isOrganizerRole && !!(user?.id && (tournament as any)?.organizer_id && user.id === (tournament as any).organizer_id),
    [isOrganizerRole, user?.id, (tournament as any)?.organizer_id]
  );
  const canView = useMemo(() => {
    if (isOrganizerOwner) return true;
    if (!user?.id) return false;
    return participants.some((p: any) => p.user_id === user.id || p.team_captain_id === user.id);
  }, [isOrganizerOwner, user?.id, participants]);

  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [scheduleStart, setScheduleStart] = useState<string>("");
  const [isClearing, setIsClearing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const [draftMatches, setDraftMatches] = useState<BracketMatch[] | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | undefined>(undefined);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMatchId, setUploadMatchId] = useState<string | undefined>(undefined);
  const [showEditBracket, setShowEditBracket] = useState(false);
  const [mapVetoOpen, setMapVetoOpen] = useState(false);
  const [mapVetoMatchId, setMapVetoMatchId] = useState<string | null>(null);
  const [mapVetoMatch, setMapVetoMatch] = useState<BracketMatch | null>(null);
  const [matchVetoLinks, setMatchVetoLinks] = useState<Map<string, { team1Link?: string; team2Link?: string }>>(new Map());
  const isUuid = (s?: string | null) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

  // Debug: Log map veto state changes
  useEffect(() => {
    console.log('[Brackets] Map Veto state:', { mapVetoOpen, mapVetoMatchId, hasMatch: !!mapVetoMatch });
  }, [mapVetoOpen, mapVetoMatchId, mapVetoMatch]);

  // Define fetchTournamentData first before any useEffect that uses it
  const fetchTournamentData = useCallback(async (isBackground = false) => {
    console.log('[Brackets] fetchTournamentData started for slug:', slug, 'isBackground:', isBackground);
    try {
      if (!isBackground) setLoading(true);

      // Fetch tournament details - try by slug first, then by id
      let tournamentData: any = null;
      let tournamentError: any = null;

      const { data: bySlug, error: errSlug } = await (supabase
        .from('tournaments') as any)
        .select('*')
        .eq('slug', slug)
        .single();
      if (!errSlug && bySlug) {
        tournamentData = bySlug;
      } else {
        const { data: byId, error: errId } = await (supabase
          .from('tournaments') as any)
          .select('*')
          .eq('id', slug)
          .single();
        if (!errId && byId) {
          tournamentData = byId;
        } else {
          tournamentError = errSlug || errId;
        }
      }

      if (tournamentError) {
        console.error('[Brackets] Error fetching tournament:', tournamentError);
        throw tournamentError;
      }

      console.log('[Brackets] Found tournament:', tournamentData?.id);

      // Fetch stages
      const { data: stagesData, error: stagesError } = await (supabase
        .from('tournament_stages') as any)
        .select('*')
        .eq('tournament_id', tournamentData.id)
        .order('stage_order', { ascending: true });

      if (stagesError) throw stagesError;
      const tournamentStages = stagesData || [];
      setStages(tournamentStages);

      // Set initial selected stage if not set
      let currentStageId = selectedStageId;
      if (!currentStageId && tournamentStages.length > 0) {
        currentStageId = tournamentStages[0].id;
        setSelectedStageId(currentStageId);
      }

      // Fetch participants and bans in parallel
      const [participantsResponse, bansResponse] = await Promise.all([
        (supabase
          .from('tournament_participants') as any)
          .select('*')
          .eq('tournament_id', tournamentData.id),
        (supabase
          .from('tournament_bans') as any)
          .select('user_id, team_id')
          .eq('tournament_id', tournamentData.id)
          .eq('is_active', true)
      ]);

      if (participantsResponse.error) throw participantsResponse.error;

      // Get banned user_ids and team_ids
      const bannedUserIds = new Set((bansResponse.data || []).filter(b => b.user_id).map(b => b.user_id));
      const bannedTeamIds = new Set((bansResponse.data || []).filter(b => b.team_id).map(b => b.team_id));

      // Filter out banned participants
      const participantsData = (participantsResponse.data || []).filter((p: any) => {
        if (p.user_id && bannedUserIds.has(p.user_id)) return false;
        if (p.team_id && bannedTeamIds.has(p.team_id)) return false;
        return true;
      });

      console.log('[Brackets] Participants loaded:', participantsData.length);

      const matchesQuery = (supabase as any)
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentData.id);

      if (currentStageId) {
        matchesQuery.eq('stage_id', currentStageId);
      }

      const { data: matchesData, error: matchesError } = await matchesQuery
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      console.log('[Brackets] Matches loaded from DB:', matchesData?.length);

      // Fetch results (images/comments per match)
      const { data: resultsData } = await (supabase as any)
        .from('tournament_match_results')
        .select('match_id, image_url, comment')
        .eq('tournament_id', tournamentData.id);
      const resultsByMatch: Record<string, { images: string[]; comments: string[] }> = {};
      (resultsData || []).forEach((r: any) => {
        const key = r.match_id;
        if (!key) return;
        if (!resultsByMatch[key]) resultsByMatch[key] = { images: [], comments: [] };
        if (r.image_url) resultsByMatch[key].images.push(r.image_url);
        if (r.comment) resultsByMatch[key].comments.push(r.comment);
      });

      if (matchesError) throw matchesError;

      setTournament(tournamentData);
      setParticipants(participantsData);
      setMatches(matchesData || []);

      // If there are saved matches in DB, convert them to visualization format for everyone (players too)
      if (matchesData && matchesData.length > 0) {
        const maxRound = Math.max(...matchesData.map((m: any) => Number(m.round || 1)));
        // Calculate team count from Round 1 matches: teamCount = matchesInRound1 * 2
        // For 32 teams: Round 1 has 16 matches, so 16 * 2 = 32
        // For 8 teams: Round 1 has 4 matches, so 4 * 2 = 8
        const round1Matches = matchesData.filter((m: any) => Number(m.round || 1) === 1);
        const matchesInRound1 = round1Matches.length;
        const inferredTeamCount = matchesInRound1 > 0 ? matchesInRound1 * 2 : Math.pow(2, Math.max(1, maxRound));
        // Always use inferred count from database matches (this is the source of truth)
        // The bracket size is determined by the number of matches in Round 1
        setTeamCount((inferredTeamCount as 8 | 16 | 24 | 32 | 64 | 128 | 256 | 512) || 8);
        // Build a comprehensive map of team_id -> display name and logo from tournament participants
        // This ensures we get the correct team names from the tournament's registrations
        const teamNameById = new Map<string, string>();
        const teamLogoById = new Map<string, string | null>();
        // Also build a reverse map: team name -> team_id for fallback matching
        const teamIdByName = new Map<string, string>();

        // First: Map from tournament participants (most accurate for this tournament)
        const participantTeamIds = new Set<string>();
        (participantsData || []).forEach((p: any) => {
          if (p.team_id) {
            participantTeamIds.add(p.team_id);
            // Prefer team_name over roster_name (roster represents team, so show team name)
            const display = p.team_name || p.roster_name;
            if (display) {
              teamNameById.set(p.team_id, display);
              // Store logo from participants if available
              if (p.team_logo) teamLogoById.set(p.team_id, p.team_logo);
              // Store both roster_name and team_name mappings for fallback
              if (p.roster_name) teamIdByName.set(p.roster_name.toLowerCase().trim(), p.team_id);
              if (p.team_name) teamIdByName.set(p.team_name.toLowerCase().trim(), p.team_id);
              console.log('[Brackets] Mapped team from participants:', p.team_id, '->', display);
            }
          }
        });

        // Fetch team names and logos for all participant teams from teams table
        if (participantTeamIds.size > 0) {
          const participantIdsArray = Array.from(participantTeamIds);
          const { data: participantTeams } = await (supabase
            .from('teams') as any)
            .select('id, name, logo_url')
            .in('id', participantIdsArray);

          (participantTeams || []).forEach((t: any) => {
            if (t.id) {
              // Update team name from teams table (prefer actual team name)
              if (t.name) {
                teamNameById.set(t.id, t.name);
                console.log('[Brackets] Updated team name from teams table:', t.id, '->', t.name);
              }
              // Update logo if not already set
              if (!teamLogoById.has(t.id)) {
                teamLogoById.set(t.id, t.logo_url || null);
                console.log('[Brackets] Fetched logo for participant team:', t.id, '->', t.logo_url || 'null');
              }
            }
          });
        }

        // Second: For any team_ids in matches that aren't in participants, fetch from teams table
        const matchTeamIds = new Set<string>();
        matchesData.forEach((m: any) => {
          if (m.team1_id) matchTeamIds.add(m.team1_id);
          if (m.team2_id) matchTeamIds.add(m.team2_id);
          if (m.winner_team_id) matchTeamIds.add(m.winner_team_id);
        });

        const missingTeamIds = Array.from(matchTeamIds).filter(id => !teamNameById.has(id) && !id.startsWith('bye-'));
        if (missingTeamIds.length > 0 && tournamentData?.id) {
          console.log('[Brackets] Fetching missing team names for:', missingTeamIds);

          // Fetch team names and logos directly from teams table
          const { data: missingTeams } = await (supabase
            .from('teams') as any)
            .select('id, name, logo_url')
            .in('id', missingTeamIds);

          (missingTeams || []).forEach((t: any) => {
            if (t.id && t.name) {
              teamNameById.set(t.id, t.name);
              if (t.logo_url) teamLogoById.set(t.id, t.logo_url);
              teamIdByName.set(t.name.toLowerCase().trim(), t.id);
              console.log('[Brackets] Mapped team from teams table:', t.id, '->', t.name);
            }
          });

          // Also double-check tournament_participants for any we still missed
          const stillMissing = missingTeamIds.filter(id => !teamNameById.has(id));
          if (stillMissing.length > 0) {
            // Try to find participants by team_id first
            const { data: extraParticipants } = await (supabase
              .from('tournament_participants') as any)
              .select('team_id, roster_name, team_name')
              .eq('tournament_id', tournamentData.id)
              .in('team_id', stillMissing)
              .not('team_id', 'is', null);

            (extraParticipants || []).forEach((p: any) => {
              if (p.team_id) {
                const display = p.team_name || p.roster_name;
                if (display) {
                  teamNameById.set(p.team_id, display);
                  console.log('[Brackets] Mapped team from extra participants:', p.team_id, '->', display);
                }
              }
            });

            // If still missing, try to find by fetching ALL participants and matching team_ids
            // This handles cases where team_id might be stored differently
            const stillStillMissing = stillMissing.filter(id => !teamNameById.has(id));
            if (stillStillMissing.length > 0) {
              console.log('[Brackets] Still missing team names, fetching all participants to find matches:', stillStillMissing);
              const { data: allParticipants } = await (supabase
                .from('tournament_participants') as any)
                .select('team_id, roster_name, team_name')
                .eq('tournament_id', tournamentData.id)
                .not('team_id', 'is', null);

              // Try to match by checking if any participant's team_id matches (case-insensitive string comparison)
              (allParticipants || []).forEach((p: any) => {
                if (p.team_id && stillStillMissing.includes(p.team_id)) {
                  const display = p.team_name || p.roster_name;
                  if (display) {
                    teamNameById.set(p.team_id, display);
                    console.log('[Brackets] Found match in all participants:', p.team_id, '->', display);
                  }
                }
              });
            }
          }
        }

        const mapDbToLocalStatus = (s: string | null | undefined): 'pending' | 'in_progress' | 'completed' => {
          if (!s) return 'pending';
          const v = String(s);
          if (v === 'scheduled' || v === 'pending' || v === 'not_started') return 'pending';
          if (v === 'in_progress' || v === 'live' || v === 'ongoing') return 'in_progress';
          return 'completed';
        };

        // Log all available team mappings for debugging
        console.log('[Brackets] Team name mappings:', Array.from(teamNameById.entries()));
        console.log('[Brackets] All participants:', (participantsData || []).map((p: any) => ({
          team_id: p.team_id,
          roster_name: p.roster_name,
          team_name: p.team_name
        })));

        // Calculate seeds for teams based on bracket position
        // In Round 1, seeds are: match 1 = (1, N), match 2 = (2, N-1), etc.
        const calculateSeed = (round: number, matchNumber: number, slot: 'team1' | 'team2', bracketSize: number): number => {
          if (round === 1) {
            // Round 1: seeds follow standard bracket pairing
            if (slot === 'team1') {
              return matchNumber;
            } else {
              return bracketSize - matchNumber + 1;
            }
          }
          // For later rounds, seeds are inherited from winners (0 indicates winner from previous round)
          return 0;
        };

        const converted: BracketMatch[] = matchesData.map((m: any) => {
          const t1Id = m.team1_id as string | null;
          const t2Id = m.team2_id as string | null;
          const t1Name = t1Id ? (teamNameById.get(t1Id) || (t1Id.startsWith('bye-') ? 'BYE' : null)) : null;
          const t2Name = t2Id ? (teamNameById.get(t2Id) || (t2Id.startsWith('bye-') ? 'BYE' : null)) : null;
          const winnerName = m.winner_team_id ? (teamNameById.get(m.winner_team_id) || null) : null;
          const round = Number(m.round || 1);
          const matchNum = Number(m.match_number || 1);

          // Log if we can't find a team name with more details
          if (t1Id && !t1Name && !t1Id.startsWith('bye-')) {
            console.warn('[Brackets] Could not resolve team name for team1_id:', t1Id, 'in match', m.id);
            console.warn('[Brackets] Available team IDs:', Array.from(teamNameById.keys()));
            // Try to find a participant with this team_id
            const found = (participantsData || []).find((p: any) => p.team_id === t1Id);
            if (found) {
              console.warn('[Brackets] Found participant but no name:', found);
            } else {
              console.warn('[Brackets] No participant found with team_id:', t1Id);
            }
          }
          if (t2Id && !t2Name && !t2Id.startsWith('bye-')) {
            console.warn('[Brackets] Could not resolve team name for team2_id:', t2Id, 'in match', m.id);
            console.warn('[Brackets] Available team IDs:', Array.from(teamNameById.keys()));
            // Try to find a participant with this team_id
            const found = (participantsData || []).find((p: any) => p.team_id === t2Id);
            if (found) {
              console.warn('[Brackets] Found participant but no name:', found);
            } else {
              console.warn('[Brackets] No participant found with team_id:', t2Id);
            }
          }

          // Calculate seeds for Round 1 matches
          const t1Seed = (round === 1 && t1Id && !t1Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team1', inferredTeamCount) : 0;
          const t2Seed = (round === 1 && t2Id && !t2Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team2', inferredTeamCount) : 0;

          return ({
            id: `db-${m.id}`,
            round: round,
            matchNumber: matchNum,
            team1: t1Id ? { id: t1Id, name: t1Name || 'Team', seed: t1Seed, logo_url: teamLogoById.get(t1Id) || null } : null,
            team2: t2Id ? { id: t2Id, name: t2Name || 'Team', seed: t2Seed, logo_url: teamLogoById.get(t2Id) || null } : null,
            winner: m.winner_team_id ? { id: m.winner_team_id, name: winnerName || 'Winner', seed: 0, logo_url: teamLogoById.get(m.winner_team_id) || null } : null,
            score: (typeof m.team1_score === 'number' && typeof m.team2_score === 'number') ? `${m.team1_score}-${m.team2_score}` : m.score || null,
            team1_score: typeof m.team1_score === 'number' ? m.team1_score : null,
            team2_score: typeof m.team2_score === 'number' ? m.team2_score : null,
            status: mapDbToLocalStatus(m.status),
            scheduledTime: (m.scheduled_at || m.scheduled_time) ? (() => {
              const date = new Date(m.scheduled_at || m.scheduled_time);
              // Format: DD/MM/YYYY at HH:MM AM/PM
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              const dateStr = `${day}/${month}/${year}`;
              const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              return `${dateStr} at ${timeStr}`;
            })() : undefined,
            bestOf: m.best_of || undefined,
            resultImages: resultsByMatch[m.id]?.images || [],
            resultComments: resultsByMatch[m.id]?.comments || [],
            partyCode: m.party_code || null,
            bracketSide: m.bracket_side || 'winners',
            nextMatchId: m.next_match_id || null,
            loserNextMatchId: m.loser_next_match_id || null,
            x: m.x ?? (m.bracket_side === 'losers'
              ? calculateX(Math.floor((Number(m.round || 1) - 1)))
              : calculateX(Number(m.round || 1) - 1)),
            y: m.y ?? (m.bracket_side === 'losers'
              ? calculateY(Math.floor((Number(m.round || 1) - 1) / 2), Number(m.match_number || 1) - 1) + (inferredTeamCount * S + GAP)
              : m.bracket_side === 'final'
                ? calculateY(Math.log2(inferredTeamCount) - 1, 0)
                : calculateY(Number(m.round || 1) - 1, Number(m.match_number || 1) - 1))
          });
        });
        setBracketMatches(converted);
        // If there are matches, set the schedule start time from the first match
        if (matchesData.length > 0) {
          const m = matchesData[0] as any;
          if (m.scheduled_at || m.scheduled_time) {
            setScheduleStart(new Date(m.scheduled_at || m.scheduled_time).toISOString().slice(0, 16));
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching tournament data:', error?.message || error, error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load tournament data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    console.log('Brackets page loaded with slug:', slug, 'authLoading:', authLoading, 'selectedStageId:', selectedStageId);
    // Wait for auth to finish loading before fetching data
    // This ensures RLS policies work correctly if the user is logged in
    if (slug && !authLoading) {
      fetchTournamentData();
    }
  }, [slug, authLoading, selectedStageId, fetchTournamentData]);

  // Removed refresh trigger - real-time subscriptions handle all updates

  // Fetch veto links for matches where user is captain
  useEffect(() => {
    if (!isCaptain || !userTeamId || !tournament?.id || matches.length === 0) {
      setMatchVetoLinks(new Map());
      return;
    }

    let mounted = true;

    const fetchVetoLinks = async () => {
      if (!mounted) return;

      try {
        // Get all matches for this tournament
        const matchIds = matches
          .filter(m => String(m.id).startsWith('db-'))
          .map(m => String(m.id).replace('db-', ''))
          .filter(id => isUuid(id));

        if (matchIds.length === 0 || !mounted) return;

        // Fetch veto records for these matches
        const { data: vetos, error } = await (supabase as any)
          .from('match_map_vetos')
          .select('match_id, team1_id, team2_id, team1_link_token, team2_link_token, status')
          .in('match_id', matchIds)
          .eq('status', 'in_progress');

        if (error || !mounted) {
          if (error) console.error('[Brackets] Error fetching veto links:', error);
          return;
        }

        // Build map of match_id -> links
        const linksMap = new Map<string, { team1Link?: string; team2Link?: string }>();

        (vetos || []).forEach((veto: any) => {
          const matchId = veto.match_id;
          const hasUserTeamLink =
            (veto.team1_id === userTeamId && veto.team1_link_token) ||
            (veto.team2_id === userTeamId && veto.team2_link_token);

          if (hasUserTeamLink) {
            linksMap.set(matchId, {
              team1Link: veto.team1_id === userTeamId ? veto.team1_link_token : undefined,
              team2Link: veto.team2_id === userTeamId ? veto.team2_link_token : undefined,
            });
          }
        });

        if (mounted) {
          setMatchVetoLinks(linksMap);
        }
      } catch (error) {
        console.error('[Brackets] Error in fetchVetoLinks:', error);
      }
    };

    fetchVetoLinks();

    // Set up realtime subscription for veto link updates
    const channel = supabase
      .channel(`veto-links-${tournament.id}-${userTeamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_map_vetos',
          filter: `team1_id=eq.${userTeamId}`,
        },
        () => {
          if (mounted) fetchVetoLinks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_map_vetos',
          filter: `team2_id=eq.${userTeamId}`,
        },
        () => {
          if (mounted) fetchVetoLinks();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [isCaptain, userTeamId, tournament?.id, matches.length]); // Only depend on matches.length, not matches array

  // Helper function to convert DB match to BracketMatch format
  const convertDbMatchToBracketMatch = async (dbMatch: any, teamNameById: Map<string, string>, teamLogoById: Map<string, string | null>, teamCount: number): Promise<BracketMatch | null> => {
    const mapDbToLocalStatus = (s: string | null | undefined): 'pending' | 'in_progress' | 'completed' => {
      if (!s) return 'pending';
      const v = String(s);
      if (v === 'scheduled' || v === 'pending' || v === 'not_started') return 'pending';
      if (v === 'in_progress' || v === 'live' || v === 'ongoing') return 'in_progress';
      return 'completed';
    };

    const calculateSeed = (round: number, matchNumber: number, slot: 'team1' | 'team2', bracketSize: number): number => {
      if (round === 1) {
        if (slot === 'team1') {
          return matchNumber;
        } else {
          return bracketSize - matchNumber + 1;
        }
      }
      return 0;
    };

    const t1Id = dbMatch.team1_id as string | null;
    const t2Id = dbMatch.team2_id as string | null;
    const t1Name = t1Id ? (teamNameById.get(t1Id) || (t1Id.startsWith('bye-') ? 'BYE' : null)) : null;
    const t2Name = t2Id ? (teamNameById.get(t2Id) || (t2Id.startsWith('bye-') ? 'BYE' : null)) : null;
    const winnerName = dbMatch.winner_team_id ? (teamNameById.get(dbMatch.winner_team_id) || null) : null;
    const round = Number(dbMatch.round || 1);
    const matchNum = Number(dbMatch.match_number || 1);

    // If team names are missing, try to fetch them
    const missingTeamIds: string[] = [];
    if (t1Id && !t1Name && !t1Id.startsWith('bye-')) missingTeamIds.push(t1Id);
    if (t2Id && !t2Name && !t2Id.startsWith('bye-')) missingTeamIds.push(t2Id);
    if (dbMatch.winner_team_id && !winnerName) missingTeamIds.push(dbMatch.winner_team_id);

    if (missingTeamIds.length > 0) {
      const { data: missingTeams } = await (supabase
        .from('teams') as any)
        .select('id, name, logo_url')
        .in('id', missingTeamIds);

      (missingTeams || []).forEach((t: any) => {
        if (t.id && t.name) {
          teamNameById.set(t.id, t.name);
          if (t.logo_url) teamLogoById.set(t.id, t.logo_url);
        }
      });
    }

    const finalT1Name = t1Id ? (teamNameById.get(t1Id) || (t1Id.startsWith('bye-') ? 'BYE' : 'Team')) : null;
    const finalT2Name = t2Id ? (teamNameById.get(t2Id) || (t2Id.startsWith('bye-') ? 'BYE' : 'Team')) : null;
    const finalWinnerName = dbMatch.winner_team_id ? (teamNameById.get(dbMatch.winner_team_id) || 'Winner') : null;

    const t1Seed = (round === 1 && t1Id && !t1Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team1', teamCount) : 0;
    const t2Seed = (round === 1 && t2Id && !t2Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team2', teamCount) : 0;

    // Fetch results for this match
    const { data: results } = await (supabase as any)
      .from('tournament_match_results')
      .select('image_url, comment, reporter_user_id')
      .eq('match_id', dbMatch.id);

    const resultImages: string[] = [];
    const resultComments: string[] = [];
    (results || []).forEach((r: any) => {
      if (r.image_url) resultImages.push(r.image_url);
      if (r.comment) resultComments.push(r.comment);
    });

    return {
      id: `db-${dbMatch.id}`,
      round: round,
      matchNumber: matchNum,
      team1: t1Id ? { id: t1Id, name: finalT1Name || 'Team', seed: t1Seed, logo_url: teamLogoById.get(t1Id) || null } : null,
      team2: t2Id ? { id: t2Id, name: finalT2Name || 'Team', seed: t2Seed, logo_url: teamLogoById.get(t2Id) || null } : null,
      winner: dbMatch.winner_team_id ? { id: dbMatch.winner_team_id, name: finalWinnerName || 'Winner', seed: 0, logo_url: teamLogoById.get(dbMatch.winner_team_id) || null } : null,
      score: (typeof dbMatch.team1_score === 'number' && typeof dbMatch.team2_score === 'number')
        ? `${dbMatch.team1_score}-${dbMatch.team2_score}`
        : null,
      team1_score: typeof dbMatch.team1_score === 'number' ? dbMatch.team1_score : null,
      team2_score: typeof dbMatch.team2_score === 'number' ? dbMatch.team2_score : null,
      status: mapDbToLocalStatus(dbMatch.status),
      scheduledTime: (dbMatch.scheduled_at || dbMatch.scheduled_time) ? (() => {
        const date = new Date(dbMatch.scheduled_at || dbMatch.scheduled_time);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const dateStr = `${day}/${month}/${year}`;
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateStr} at ${timeStr}`;
      })() : undefined,
      bestOf: (() => {
        // Determine Best Of:
        // 1. Check stage config first (dynamic update from wizard)
        // 2. Fallback to match record (persisted)
        // 3. Default to 1
        let effectiveBestOf = dbMatch.best_of || 1;
        if (dbMatch.stage_id) {
          const matchStage = stages.find(s => s.id === dbMatch.stage_id);
          if (matchStage && matchStage.config && typeof matchStage.config === 'object') {
            // Cast to any to access config properties safely
            const config = matchStage.config as any;
            if (config.bestOf) {
              console.log(`[Brackets] Found stage override for match ${dbMatch.id}: BO${config.bestOf}`);
              effectiveBestOf = Number(config.bestOf);
            }
          }
        }
        return effectiveBestOf;
      })(),
      resultImages: resultImages,
      resultComments: resultComments,
      partyCode: dbMatch.party_code || null,
      bracketSide: dbMatch.bracket_side || 'winners',
      nextMatchId: dbMatch.next_match_id || null,
      loserNextMatchId: dbMatch.loser_next_match_id || null,
    };
  };

  // Build team name/logo mappings from current participants
  const buildTeamMappings = useCallback(async (participantsData: any[]): Promise<{ teamNameById: Map<string, string>, teamLogoById: Map<string, string | null> }> => {
    const teamNameById = new Map<string, string>();
    const teamLogoById = new Map<string, string | null>();

    // Map from tournament participants
    const participantTeamIds = new Set<string>();
    (participantsData || []).forEach((p: any) => {
      if (p.team_id) {
        participantTeamIds.add(p.team_id);
        const display = p.team_name || p.roster_name;
        if (display) {
          teamNameById.set(p.team_id, display);
          if (p.team_logo) teamLogoById.set(p.team_id, p.team_logo);
        }
      }
    });

    // Fetch team names and logos from teams table
    if (participantTeamIds.size > 0) {
      const participantIdsArray = Array.from(participantTeamIds);
      const { data: participantTeams } = await (supabase
        .from('teams') as any)
        .select('id, name, logo_url')
        .in('id', participantIdsArray);

      (participantTeams || []).forEach((t: any) => {
        if (t.id) {
          if (t.name) teamNameById.set(t.id, t.name);
          if (!teamLogoById.has(t.id)) {
            teamLogoById.set(t.id, t.logo_url || null);
          }
        }
      });
    }

    return { teamNameById, teamLogoById };
  }, []);

  // Real-time sync: Subscribe to bracket changes
  useEffect(() => {
    if (!tournament?.id) return;

    console.log('[Brackets] Setting up realtime subscriptions for tournament:', tournament.id);

    // Update local state directly from real-time events for instant updates
    const handleMatchUpdate = async (payload: any) => {
      console.log('[Brackets] handleMatchUpdate called:', {
        eventType: payload.eventType,
        table: payload.table,
        new: payload.new,
        old: payload.old,
        timestamp: new Date().toISOString()
      });

      if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedMatch = payload.new;
        // Get current participants for team mappings
        const currentParticipants = participants;
        const teamMappings = await buildTeamMappings(currentParticipants);

        // Update local state immediately
        setBracketMatches(prevMatches =>
          prevMatches.map(match => {
            const matchDbId = String(match.id).replace('db-', '');
            if (matchDbId === updatedMatch.id) {
              // Check if team IDs changed (from drag-and-drop or other updates)
              const team1IdChanged = updatedMatch.team1_id !== (match.team1?.id || null);
              const team2IdChanged = updatedMatch.team2_id !== (match.team2?.id || null);

              // If team IDs changed, rebuild team objects with latest data
              let updatedTeam1 = match.team1;
              let updatedTeam2 = match.team2;

              if (team1IdChanged) {
                if (updatedMatch.team1_id) {
                  const teamName = teamMappings.teamNameById.get(updatedMatch.team1_id) || 'Team';
                  const teamLogo = teamMappings.teamLogoById.get(updatedMatch.team1_id) || null;
                  updatedTeam1 = {
                    id: updatedMatch.team1_id,
                    name: teamName,
                    seed: match.team1?.seed || 0,
                    logo_url: teamLogo,
                  };
                } else {
                  updatedTeam1 = null;
                }
              }

              if (team2IdChanged) {
                if (updatedMatch.team2_id) {
                  const teamName = teamMappings.teamNameById.get(updatedMatch.team2_id) || 'Team';
                  const teamLogo = teamMappings.teamLogoById.get(updatedMatch.team2_id) || null;
                  updatedTeam2 = {
                    id: updatedMatch.team2_id,
                    name: teamName,
                    seed: match.team2?.seed || 0,
                    logo_url: teamLogo,
                  };
                } else {
                  updatedTeam2 = null;
                }
              }

              // When match is reset to pending, also clear result images and comments
              const isResetToPending = updatedMatch.status === 'pending' && match.status !== 'pending';

              return {
                ...match,
                team1: updatedTeam1,
                team2: updatedTeam2,
                status: (updatedMatch.status === 'pending' ? 'pending' :
                  updatedMatch.status === 'in_progress' ? 'in_progress' : 'completed') as 'pending' | 'in_progress' | 'completed',
                team1_score: typeof updatedMatch.team1_score === 'number' ? updatedMatch.team1_score : match.team1_score,
                team2_score: typeof updatedMatch.team2_score === 'number' ? updatedMatch.team2_score : match.team2_score,
                score: (typeof updatedMatch.team1_score === 'number' && typeof updatedMatch.team2_score === 'number')
                  ? `${updatedMatch.team1_score}-${updatedMatch.team2_score}`
                  : match.score,
                bestOf: updatedMatch.best_of || match.bestOf,
                partyCode: updatedMatch.party_code || match.partyCode,
                // Clear results when match is reset to pending
                resultImages: isResetToPending ? [] : match.resultImages,
                resultComments: isResetToPending ? [] : match.resultComments,
              };
            }
            return match;
          })
        );

        // Also update matches state
        setMatches(prevMatches =>
          prevMatches.map((m: any) => {
            if (m.id === updatedMatch.id) {
              return { ...m, ...updatedMatch };
            }
            return m;
          })
        );
      } else if (payload.eventType === 'INSERT' && payload.new) {
        // New match inserted - convert and add to state directly
        const newMatch = payload.new;
        // Get current participants for team mappings
        const currentParticipants = participants;
        const teamMappings = await buildTeamMappings(currentParticipants);
        const convertedMatch = await convertDbMatchToBracketMatch(newMatch, teamMappings.teamNameById, teamMappings.teamLogoById, teamCount);
        if (convertedMatch) {
          setBracketMatches(prevMatches => {
            // Check if match already exists (avoid duplicates)
            const exists = prevMatches.some(m => m.id === convertedMatch.id);
            if (exists) return prevMatches;
            return [...prevMatches, convertedMatch].sort((a, b) => {
              if (a.round !== b.round) return a.round - b.round;
              return a.matchNumber - b.matchNumber;
            });
          });
          setMatches(prevMatches => {
            const exists = prevMatches.some((m: any) => m.id === newMatch.id);
            if (exists) return prevMatches;
            return [...prevMatches, newMatch];
          });
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        // Match deleted - remove from state directly
        // Note: When clearing brackets, multiple DELETE events fire (one per match)
        // Each event is processed individually to remove matches from state
        const deletedMatch = payload.old;
        const deletedMatchId = deletedMatch.id;
        const deletedTournamentId = deletedMatch.tournament_id;

        console.log('[Brackets] Processing DELETE event:', {
          deletedMatchId,
          tournamentId: deletedTournamentId,
          currentTournamentId: tournament.id
        });

        // Only process if it's for the current tournament
        if (deletedTournamentId !== tournament.id) {
          console.log('[Brackets] Ignoring DELETE event for different tournament');
          return;
        }

        // Remove the deleted match from state using functional updates
        setBracketMatches(prevMatches => {
          const filtered = prevMatches.filter(match => {
            const matchDbId = String(match.id).replace('db-', '');
            const shouldKeep = matchDbId !== deletedMatchId;
            if (!shouldKeep) {
              console.log('[Brackets] Removing match from bracketMatches state:', matchDbId);
            }
            return shouldKeep;
          });

          console.log('[Brackets] After DELETE filter (bracketMatches):', {
            before: prevMatches.length,
            after: filtered.length,
            deletedId: deletedMatchId
          });

          return filtered;
        });

        setMatches(prevMatches => {
          const filtered = prevMatches.filter((m: any) => {
            const shouldKeep = m.id !== deletedMatchId;
            if (!shouldKeep) {
              console.log('[Brackets] Removing match from matches state:', m.id);
            }
            return shouldKeep;
          });

          console.log('[Brackets] After DELETE filter (matches):', {
            before: prevMatches.length,
            after: filtered.length
          });

          return filtered;
        });
      }
    };

    // Subscribe to match changes (INSERT, UPDATE, DELETE)
    // Note: For DELETE events, Supabase sends individual events for each deleted row
    // When clearing brackets, multiple DELETE events will fire, and we process each one
    const matchesChannel = supabase
      .channel(`tournament_matches_${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        (payload) => {
          console.log('[Brackets] Real-time event received:', {
            eventType: payload.eventType,
            table: payload.table,
            old: payload.old,
            new: payload.new,
            timestamp: new Date().toISOString()
          });
          handleMatchUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Brackets] Subscription status for tournament_matches:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Brackets] Successfully subscribed to tournament_matches real-time updates for tournament:', tournament.id);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Brackets] Error subscribing to tournament_matches:', status);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Brackets] Subscription timed out, may retry...');
        }
      });

    // Subscribe to match results changes
    const resultsChannel = supabase
      .channel(`tournament_results_${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_match_results',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        async (payload) => {
          console.log('[Brackets] Real-time match result event received:', payload.eventType, payload);

          if (payload.eventType === 'INSERT' && payload.new) {
            // New result added - update specific match's results directly
            const newResult = payload.new;
            const matchId = newResult.match_id;

            setBracketMatches(prevMatches =>
              prevMatches.map(match => {
                const matchDbId = String(match.id).replace('db-', '');
                if (matchDbId === matchId) {
                  const currentImages = match.resultImages || [];
                  const currentComments = match.resultComments || [];
                  return {
                    ...match,
                    resultImages: newResult.image_url ? [...currentImages, newResult.image_url] : currentImages,
                    resultComments: newResult.comment ? [...currentComments, newResult.comment] : currentComments,
                  };
                }
                return match;
              })
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Result deleted - handle both individual and bulk deletions
            const deletedResult = payload.old;
            const matchId = deletedResult.match_id;

            setBracketMatches(prevMatches =>
              prevMatches.map(match => {
                const matchDbId = String(match.id).replace('db-', '');
                if (matchDbId === matchId) {
                  // If image_url or comment is null/undefined, it means all results were deleted (bulk deletion)
                  // Otherwise, remove the specific result
                  if (!deletedResult.image_url && !deletedResult.comment) {
                    // Bulk deletion - clear all results for this match
                    return {
                      ...match,
                      resultImages: [],
                      resultComments: [],
                    };
                  } else {
                    // Individual deletion - remove specific result
                    const currentImages = match.resultImages || [];
                    const currentComments = match.resultComments || [];
                    return {
                      ...match,
                      resultImages: deletedResult.image_url
                        ? currentImages.filter(img => img !== deletedResult.image_url)
                        : currentImages,
                      resultComments: deletedResult.comment
                        ? currentComments.filter(comment => comment !== deletedResult.comment)
                        : currentComments,
                    };
                  }
                }
                return match;
              })
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('[Brackets] Subscription status for tournament_match_results:', status);
      });

    // Subscribe to participant changes (in case teams are added/removed)
    const participantsChannel = supabase
      .channel(`tournament_participants_${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        async (payload) => {
          console.log('[Brackets] Real-time participant event received:', payload.eventType, payload);

          // Update participants state and rebuild team mappings in a single operation
          // Use functional update to get latest participants state and avoid double renders
          setParticipants(prevParticipants => {
            // Calculate updated participants
            const updatedParticipants = payload.eventType === 'INSERT' && payload.new
              ? (() => {
                const exists = prevParticipants.some((p: any) => p.id === payload.new.id);
                return exists ? prevParticipants : [...prevParticipants, payload.new];
              })()
              : payload.eventType === 'DELETE' && payload.old
                ? prevParticipants.filter((p: any) => p.id !== payload.old.id)
                : payload.eventType === 'UPDATE' && payload.new
                  ? prevParticipants.map((p: any) => p.id === payload.new.id ? payload.new : p)
                  : prevParticipants;

            // Rebuild mappings with updated participants
            buildTeamMappings(updatedParticipants).then(newMappings => {
              // Update matches that reference the affected team
              const affectedTeamId = (payload.new as any)?.team_id || (payload.old as any)?.team_id;
              if (affectedTeamId) {
                setBracketMatches(prevMatches =>
                  prevMatches.map(match => {
                    const needsUpdate =
                      (match.team1?.id === affectedTeamId) ||
                      (match.team2?.id === affectedTeamId) ||
                      (match.winner?.id === affectedTeamId);

                    if (needsUpdate) {
                      const updateTeam = (team: BracketTeam | null) => {
                        if (!team || team.id !== affectedTeamId) return team;
                        return {
                          ...team,
                          name: newMappings.teamNameById.get(team.id) || team.name,
                          logo_url: newMappings.teamLogoById.get(team.id) ?? team.logo_url,
                        };
                      };

                      return {
                        ...match,
                        team1: updateTeam(match.team1),
                        team2: updateTeam(match.team2),
                        winner: updateTeam(match.winner),
                      };
                    }
                    return match;
                  })
                );
              }
            });

            return updatedParticipants;
          });
        }
      )
      .subscribe((status) => {
        console.log('[Brackets] Subscription status for tournament_participants:', status);
      });

    // Cleanup subscriptions on unmount or tournament change
    return () => {
      console.log('[Brackets] Cleaning up realtime subscriptions for tournament:', tournament.id);
      matchesChannel.unsubscribe();
      resultsChannel.unsubscribe();
      participantsChannel.unsubscribe();
    };
  }, [tournament?.id, buildTeamMappings]); // Removed participants and teamCount - they're only used inside handlers

  // Ensure scheduler has a sensible default when opened
  useEffect(() => {
    if ((showSchedulerModal || showScheduleDialog) && !scheduleStart) {
      const now = new Date();
      const rounded = new Date(Math.ceil(now.getTime() / (15 * 60000)) * (15 * 60000));
      setScheduleStart(rounded.toISOString().slice(0, 16));
    }
  }, [showSchedulerModal, showScheduleDialog]);

  // Determine current user's team and captain status for this tournament
  useEffect(() => {
    const run = async () => {
      try {
        if (!user?.id || !tournament?.id) { setIsCaptain(false); setUserTeamId(undefined); return; }
        const { data: reg } = await (supabase
          .from('tournament_participants') as any)
          .select('*')
          .eq('tournament_id', tournament.id)
          .or(`user_id.eq.${user.id},team_captain_id.eq.${user.id}`)
          .maybeSingle();
        const teamId = (reg as any)?.team_id as string | undefined;
        setUserTeamId(teamId);
        if (!teamId) { setIsCaptain(false); return; }
        const { data: teamRow } = await (supabase
          .from('teams') as any)
          .select('owner_id')
          .eq('id', teamId)
          .maybeSingle();
        if (teamRow?.owner_id === user.id) { setIsCaptain(true); return; }
        const { data: member } = await (supabase
          .from('team_members') as any)
          .select('role')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        setIsCaptain(!!(member && (member as any).role === 'captain'));
      } catch {
        setIsCaptain(false);
      }
    };
    run();
  }, [user?.id, tournament?.id]);

  const openUploadForMatch = (matchId: string) => {
    setUploadMatchId(matchId);
    setUploadOpen(true);
  };

  // Organizer: generate bracket from registered participants
  const buildTeamsFromParticipants = async (): Promise<BracketTeam[]> => {
    // Include teams with UUIDs
    const teamEntries = (participants as any[]).filter((p: any) => isUuid(p.team_id));
    const seen = new Set<string>();
    const uniqueWithId = teamEntries.filter(p => {
      const id = String(p.team_id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Also include teams without UUIDs but with team names - resolve them
    const needResolve = (participants as any[]).filter((p: any) =>
      (p as any).participant_type === 'team' &&
      !isUuid(p.team_id) &&
      (p.team_name || p.roster_name)
    );

    const resolved: { id: string; name: string; logo_url?: string | null }[] = [];
    if (needResolve.length > 0) {
      const names = Array.from(new Set(needResolve.map((p: any) => p.team_name || p.roster_name).filter(Boolean)));
      if (names.length > 0) {
        // Try exact name matches - also fetch logos
        const { data: teamRows, error: teamQueryError } = await supabase
          .from('teams')
          .select('id, name, logo_url')
          .in('name', names);

        if (teamQueryError) {
          console.error('[Brackets] Error fetching teams by name:', teamQueryError);
        }

        const mapByName = new Map<string, { id: string; logo_url?: string | null }>();
        (teamRows || []).forEach((t: any) => mapByName.set(t.name, { id: t.id, logo_url: t.logo_url || null }));

        // Resolve by name (prefer team_name)
        for (const p of needResolve) {
          const teamName = p.team_name || p.roster_name;
          if (!teamName) continue;
          const match = mapByName.get(teamName);
          if (match) {
            resolved.push({ id: match.id, name: teamName, logo_url: match.logo_url });
          } else {
            // Fuzzy match - also fetch logo
            const { data: fuzzy } = await (supabase
              .from('teams') as any)
              .select('id, name, logo_url')
              .ilike('name', `%${teamName}%`)
              .limit(1)
              .maybeSingle();
            if (fuzzy?.id && !resolved.find(r => r.id === fuzzy.id)) {
              resolved.push({ id: fuzzy.id, name: fuzzy.name, logo_url: fuzzy.logo_url || null });
            }
          }
        }
      }
    }

    // Fetch team names and logos for teams with UUIDs from teams table
    const teamIds = uniqueWithId.map((p: any) => String(p.team_id));
    const logoMap = new Map<string, string | null>();
    const teamNameMap = new Map<string, string>();
    if (teamIds.length > 0) {
      // First try to get logos from participants
      uniqueWithId.forEach((p: any) => {
        if (p.team_logo) logoMap.set(String(p.team_id), p.team_logo);
      });

      // Fetch team names and logos from teams table (prefer actual team name)
      const { data: teamData } = await (supabase
        .from('teams') as any)
        .select('id, name, logo_url')
        .in('id', teamIds);

      (teamData || []).forEach((t: any) => {
        if (t.id) {
          // Always use team name from teams table (most accurate)
          if (t.name) teamNameMap.set(t.id, t.name);
          // Update logo if not already set from participants
          if (!logoMap.has(t.id)) {
            logoMap.set(t.id, t.logo_url || null);
          }
        }
      });
    }

    // Combine both and deduplicate
    const allTeams = [
      ...uniqueWithId.map((p: any) => ({
        id: String(p.team_id),
        // Prefer team name from teams table, fallback to team_name, then roster_name
        name: teamNameMap.get(String(p.team_id)) || p.team_name || p.roster_name || 'Team',
        logo_url: logoMap.get(String(p.team_id)) || null
      })),
      ...resolved
    ];

    const finalSeen = new Set<string>();
    const finalUnique = allTeams.filter(t => {
      if (finalSeen.has(t.id)) return false;
      finalSeen.add(t.id);
      return true;
    });

    return finalUnique.map((t, i: number) => ({
      id: t.id,
      name: t.name || `Team ${i + 1}`,
      seed: i + 1,
      logo_url: t.logo_url || null
    }));
  };

  const randomizeArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };


  // One-click: build strictly from registrations and persist immediately (no scheduler)
  const generateFromRegistrationsStrictAndSave = async (
    selectedSize?: 8 | 16 | 24 | 32 | 64 | 128 | 256 | 512,
    scheduleConfig?: { startTime: string; gapMinutes: number },
    type: 'single_elimination' | 'double_elimination' = 'single_elimination'
  ) => {
    try {
      console.log('[Brackets] generateFromRegistrationsStrictAndSave called with:', { selectedSize, scheduleConfig, type });
      // Use the provided size strictly - if user selected 8, use 8
      const bracketSize = selectedSize || 8;

      // Build team list resolving missing team_ids from names
      const regTeams = await buildTeamsFromParticipants();
      if (regTeams.length < 2) {
        toast({ title: 'Not enough participants', description: 'Need at least 2 to generate a bracket.' });
        return;
      }

      // Use the selected bracket size STRICTLY (user's choice)
      const minRequiredSize = regTeams.length <= 8 ? 8 : regTeams.length <= 16 ? 16 : regTeams.length <= 24 ? 24 : regTeams.length <= 32 ? 32 : regTeams.length <= 64 ? 64 : regTeams.length <= 128 ? 128 : regTeams.length <= 256 ? 256 : 512;
      let finalSize: 8 | 16 | 24 | 32 | 64 | 128 | 256 | 512;

      if (selectedSize) {
        finalSize = selectedSize;
        if (regTeams.length > selectedSize) {
          toast({
            title: 'Info',
            description: `Using first ${selectedSize} teams for ${selectedSize}-team bracket. ${regTeams.length - selectedSize} teams will not be included.`,
          });
        }
      } else {
        finalSize = minRequiredSize;
      }

      setTeamCount(finalSize);
      const teamsToUse = regTeams.slice(0, finalSize);
      const shuffled = randomizeArray(teamsToUse);

      let newMatches: BracketMatch[] = [];

      if (type === 'double_elimination') {
        console.log('[Brackets] Generating Double Elimination bracket');

        // Pad with BYEs to match finalSize
        const paddedTeams = [...shuffled];
        for (let i = shuffled.length; i < finalSize; i++) {
          paddedTeams.push({
            id: `bye-${i + 1}`,
            name: 'BYE',
            seed: i + 1,
            eliminated: true,
            logo_url: null
          });
        }

        // Convert BracketTeam to Team for the helper
        const teamsForHelper = paddedTeams.map(t => ({
          id: t.id,
          name: t.name,
          logo_url: t.logo_url || undefined
        }));

        const rawMatches = generateDoubleEliminationMatches(teamsForHelper, tournament?.id || '');

        // Map raw matches to BracketMatch
        newMatches = rawMatches.map(rm => {
          // Find team in paddedTeams (which includes BYEs)
          const t1 = paddedTeams.find(t => t.id === rm.team1_id);
          const t2 = paddedTeams.find(t => t.id === rm.team2_id);

          return {
            id: rm.id,
            round: rm.round,
            matchNumber: rm.match_number,
            team1: t1 || null,
            team2: t2 || null,
            winner: rm.winner_id ? (paddedTeams.find(t => t.id === rm.winner_id) || null) : null,
            score: null,
            team1_score: rm.team1_score || 0,
            team2_score: rm.team2_score || 0,
            status: rm.status || 'pending',
            bracketSide: rm.bracket_side,
            nextMatchId: rm.next_match_id,
            loserNextMatchId: rm.loser_next_match_id
          };
        });
      } else {
        // Single Elimination Logic - Now using helper for consistency

        // Pad with BYEs to match finalSize
        const paddedTeams = [...shuffled];
        for (let i = shuffled.length; i < finalSize; i++) {
          paddedTeams.push({
            id: `bye-${i + 1}`,
            name: 'BYE',
            seed: i + 1,
            eliminated: true,
            logo_url: null
          });
        }

        const teamsForHelper = paddedTeams.map(t => ({
          id: t.id,
          name: t.name,
          logo_url: t.logo_url || undefined
        }));

        const rawMatches = generateBracketMatches(teamsForHelper, tournament?.id || '');

        // Map raw matches to BracketMatch
        newMatches = rawMatches.map(rm => {
          const t1 = paddedTeams.find(t => t.id === rm.team1_id);
          const t2 = paddedTeams.find(t => t.id === rm.team2_id);

          return {
            id: rm.id,
            round: rm.round,
            matchNumber: rm.match_number,
            team1: t1 || null,
            team2: t2 || null,
            winner: rm.winner_id ? (paddedTeams.find(t => t.id === rm.winner_id) || null) : null,
            score: null,
            team1_score: rm.team1_score || 0,
            team2_score: rm.team2_score || 0,
            status: rm.status || 'pending',
            bracketSide: rm.bracket_side,
            nextMatchId: rm.next_match_id
          };
        });
      }

      console.log('[Brackets] Total matches generated:', {
        total: newMatches.length,
        byRound: {
          round1: newMatches.filter(m => m.round === 1).length,
          round2: newMatches.filter(m => m.round === 2).length,
          round3: newMatches.filter(m => m.round === 3).length,
          round4: newMatches.filter(m => m.round === 4).length,
        }
      });

      // Apply schedule if provided during generation
      if (scheduleConfig && scheduleConfig.startTime) {
        const start = new Date(scheduleConfig.startTime);
        const updatedMatches = newMatches.map((m, idx) => {
          const scheduledDate = new Date(start.getTime() + idx * scheduleConfig.gapMinutes * 60000);
          return {
            ...m,
            scheduledTime: scheduledDate.toISOString()
          };
        });
        await persistMatches(updatedMatches);
      } else {
        await persistMatches(newMatches);
      }
    } catch (e: any) {
      console.error('[Brackets] Generation error:', e);
      toast({ title: 'Generation failed', description: e?.message || 'Could not generate bracket', variant: 'destructive' });
    }
  };

  const persistMatches = async (matchesToSave: BracketMatch[]) => {
    try {
      if (!tournament) return;
      // clear existing matches first
      const del = await (supabase.from('tournament_matches') as any).delete().eq('tournament_id', tournament.id);
      if (del.error) throw del.error;
      // Resolve any placeholder team IDs (e.g., 'name:xyz') to real team IDs using teams table or participants
      const placeholderTeams = new Map<string, string>(); // key: placeholder id, value: team name
      matchesToSave.forEach(m => {
        if (m.team1?.id && m.team1.id.startsWith('name:')) placeholderTeams.set(m.team1.id, m.team1.name);
        if (m.team2?.id && m.team2.id.startsWith('name:')) placeholderTeams.set(m.team2.id, m.team2.name);
      });

      const resolvedIdByPlaceholder = new Map<string, string>();
      // Resolve using in-memory participants first (no RLS issues)
      if (placeholderTeams.size > 0) {
        const nameToTeamId = new Map<string, string>();
        (participants || []).forEach((p: any) => {
          if (p.team_id) {
            const keyA = String(p.team_name || '').trim().toLowerCase();
            const keyB = String(p.roster_name || '').trim().toLowerCase();
            if (keyA) nameToTeamId.set(keyA, p.team_id);
            if (keyB) nameToTeamId.set(keyB, p.team_id);
          }
        });
        for (const [ph, nm] of placeholderTeams.entries()) {
          const key = String(nm || '').trim().toLowerCase();
          const found = key ? nameToTeamId.get(key) : undefined;
          if (found) resolvedIdByPlaceholder.set(ph, found);
        }
      }
      if (placeholderTeams.size > 0) {
        const names = Array.from(new Set(Array.from(placeholderTeams.values()).filter(Boolean)));
        // 1) Exact name matches from teams table
        if (names.length > 0) {
          const { data: exactTeams } = await (supabase
            .from('teams') as any)
            .select('id, name')
            .in('name', names);
          (exactTeams || []).forEach((row: any) => {
            // find placeholders that used this name
            for (const [ph, nm] of placeholderTeams.entries()) {
              if (!resolvedIdByPlaceholder.has(ph) && nm === row.name) resolvedIdByPlaceholder.set(ph, row.id);
            }
          });
        }
        // 2) Fallback to participants with team_id
        const unresolvedNames = Array.from(new Set(Array.from(placeholderTeams.entries())
          .filter(([ph]) => !resolvedIdByPlaceholder.has(ph))
          .map(([ph, nm]) => nm)));
        if (unresolvedNames.length > 0) {
          const { data: partRows } = await (supabase
            .from('tournament_participants') as any)
            .select('team_id, team_name, roster_name')
            .eq('tournament_id', tournament.id)
            .in('team_name', unresolvedNames);
          (partRows || []).forEach((row: any) => {
            if (!row?.team_id) return;
            for (const [ph, nm] of placeholderTeams.entries()) {
              if (resolvedIdByPlaceholder.has(ph)) continue;
              if (nm === row.team_name || nm === row.roster_name) resolvedIdByPlaceholder.set(ph, row.team_id);
            }
          });
          // Also try ilike on roster_name if necessary
          if (unresolvedNames.length > 0) {
            const { data: partRows2 } = await (supabase
              .from('tournament_participants') as any)
              .select('team_id, team_name, roster_name')
              .eq('tournament_id', tournament.id);
            (partRows2 || []).forEach((row: any) => {
              if (!row?.team_id) return;
              for (const [ph, nm] of placeholderTeams.entries()) {
                if (resolvedIdByPlaceholder.has(ph)) continue;
                const key = String(nm || '').toLowerCase();
                if (String(row.team_name || '').toLowerCase() === key || String(row.roster_name || '').toLowerCase() === key) {
                  resolvedIdByPlaceholder.set(ph, row.team_id);
                }
              }
            });
          }
        }
        // 3) Last resort: fuzzy search teams by ilike, one by one
        for (const [ph, nm] of placeholderTeams.entries()) {
          if (resolvedIdByPlaceholder.has(ph) || !nm) continue;
          const fuzzy = await (supabase
            .from('teams') as any)
            .select('id, name')
            .ilike('name', `%${nm}%`)
            .limit(1)
            .maybeSingle();
          if (fuzzy.data?.id) {
            resolvedIdByPlaceholder.set(ph, fuzzy.data.id);
          }
        }
      }

      // insert with team slots and schedule if present
      // Ensure we have a stage ID
      let stageIdToUse = selectedStageId;
      if (!stageIdToUse && stages.length > 0) {
        stageIdToUse = stages[0].id;
        console.log('[Brackets] persistMatches: selectedStageId was null, falling back to first stage:', stageIdToUse);
      }

      if (!stageIdToUse) {
        console.error('[Brackets] persistMatches: No stage ID available!');
        toast({ title: 'Error', description: 'Could not determine tournament stage.', variant: 'destructive' });
        return;
      }

      console.log('[Brackets] persistMatches: Using stage ID:', stageIdToUse);
      console.log('[Brackets] persistMatches: Available stages:', stages.length);

      const payload = matchesToSave.map(m => {
        const team1IdRaw = m.team1?.id || null;
        const team2IdRaw = m.team2?.id || null;
        const t1 = (team1IdRaw && team1IdRaw.startsWith('name:')) ? (resolvedIdByPlaceholder.get(team1IdRaw) || null) : team1IdRaw;
        const t2 = (team2IdRaw && team2IdRaw.startsWith('name:')) ? (resolvedIdByPlaceholder.get(team2IdRaw) || null) : team2IdRaw;
        const safeT1 = (t1 && !t1.startsWith('bye-') && !t1.startsWith('name:')) ? t1 : null;
        const safeT2 = (t2 && !t2.startsWith('bye-') && !t2.startsWith('name:')) ? t2 : null;

        const matchId = m.id && !m.id.startsWith('match-') ? m.id : crypto.randomUUID();

        const scheduledTimeStr = m.scheduledTime ? new Date(m.scheduledTime).toISOString() : null;

        const winnerIdRaw = m.winner?.id || null;
        const winnerId = (winnerIdRaw && winnerIdRaw.startsWith('name:')) ? (resolvedIdByPlaceholder.get(winnerIdRaw) || null) : winnerIdRaw;
        const safeWinner = (winnerId && !winnerId.startsWith('bye-') && !winnerId.startsWith('name:')) ? winnerId : null;

        // Get bestOf from stage config, falling back to match bestOf, then 1
        const currentStage = stages.find((s: any) => s.id === stageIdToUse);
        const stageBestOf = currentStage?.config?.bestOf || currentStage?.config?.veto?.best_of;
        const effectiveBestOf = m.bestOf || stageBestOf || 1;

        return {
          id: matchId,
          match_id: matchId,
          tournament_id: tournament.id,
          round: m.round,
          match_number: m.matchNumber,
          team1_id: safeT1,
          team2_id: safeT2,
          team1_score: m.team1_score || 0,
          team2_score: m.team2_score || 0,
          status: m.status || 'pending',
          winner_team_id: safeWinner,
          scheduled_at: scheduledTimeStr,
          scheduled_time: scheduledTimeStr,
          best_of: effectiveBestOf,
          bracket_side: m.bracketSide || 'winners',
          next_match_id: m.nextMatchId || null,
          loser_next_match_id: m.loserNextMatchId || null,
          stage_id: stageIdToUse, // Link match to the current stage
        } as any;
      });

      console.log('[Brackets] persistMatches: Inserting/Updating', payload.length, 'matches into database');
      const { data: insertedData, error: insertError } = await (supabase
        .from('tournament_matches') as any)
        .upsert(payload as any[])
        .select('*');

      if (insertError) {
        console.error('[Brackets] persistMatches: Insert error:', insertError);
        throw insertError;
      }

      console.log('[Brackets] persistMatches: Successfully inserted', insertedData?.length || 0, 'matches');

      // Immediately update local state with the inserted matches for instant UI update
      if (insertedData && insertedData.length > 0) {
        const teamMappings = await buildTeamMappings(participants || []);
        const convertedMatches = await Promise.all(
          insertedData.map((dbMatch: any) =>
            convertDbMatchToBracketMatch(dbMatch, teamMappings.teamNameById, teamMappings.teamLogoById, teamCount)
          )
        );
        const validMatches = convertedMatches.filter((m): m is BracketMatch => m !== null);

        console.log('[Brackets] persistMatches: Converted', validMatches.length, 'matches, updating state');

        // Update state immediately
        setBracketMatches(validMatches);
        setMatches(insertedData as any[]);
      } else {
        console.warn('[Brackets] persistMatches: No data returned from insert, matches may not have been saved');
      }

      toast({ title: 'Brackets saved', description: `Bracket matches have been stored (${insertedData?.length || 0} matches). All users will see the updated bracket.` });
    } catch (e: any) {
      console.error('Failed to save brackets:', e);
      toast({ title: 'Save failed', description: e?.message || 'Could not save brackets', variant: 'destructive' });
    }
  };

  const saveBracketToDatabase = async () => {
    const toSave = (draftMatches && draftMatches.length > 0) ? draftMatches : bracketMatches;
    if (!toSave || toSave.length === 0) {
      toast({ title: 'Nothing to save', description: 'Generate or edit the bracket before saving.' });
      return;
    }

    try {
      await persistMatches(toSave);
      // Clear draft matches after successful save
      setDraftMatches(null);
    } catch (error: any) {
      console.error('Error saving bracket:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save bracket changes',
        variant: 'destructive'
      });
    }
  };

  const clearBracketCompletely = async () => {
    try {
      if (!tournament) return;

      // Confirm before clearing
      if (!confirm('Are you sure you want to DELETE all bracket matches? This will completely remove the bracket and you will need to regenerate it.')) {
        return;
      }

      // Delete all related data first
      console.log('[Brackets] Deleting all related data for tournament:', tournament.id);

      // 1. Delete match results
      await supabase.from('tournament_match_results').delete().eq('tournament_id', tournament.id);

      // 2. Delete disputes
      await (supabase as any).from('tournament_disputes').delete().eq('tournament_id', tournament.id);

      // 3. Delete map veto actions and vetos
      const { data: vetos } = await supabase.from('match_map_vetos').select('id').eq('tournament_id', tournament.id);
      if (vetos && vetos.length > 0) {
        const vetoIds = vetos.map(v => v.id);
        await supabase.from('match_map_veto_actions').delete().in('veto_id', vetoIds);
        await supabase.from('match_map_vetos').delete().in('id', vetoIds);
      }

      // 4. Delete all matches for this tournament
      const { error: deleteError } = await (supabase as any)
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournament.id);

      if (deleteError) {
        console.error('[Brackets] Error deleting matches:', deleteError);
        throw deleteError;
      }

      // Clear local state
      setMatches([]);
      setBracketMatches([]);

      toast({
        title: 'Bracket Cleared',
        description: 'All matches and related data have been deleted. You can now generate a new bracket.'
      });
    } catch (e: any) {
      console.error('Error clearing bracket:', e);
      toast({
        title: 'Clear failed',
        description: e?.message || 'Failed to clear bracket',
        variant: 'destructive'
      });
    } finally {
      setIsClearing(false);
    }
  };

  const autoAdvanceByes = async () => {
    if (!tournament?.id) return;
    setIsClearing(true);
    setLoadingMessage("Advancing BYEs...");
    try {
      // Helper to check if a branch is "dead" (will never produce a winner)
      const isBranchDead = (round: number, matchNumber: number): boolean => {
        // Find the match
        const match = bracketMatches.find(m => m.round === round && m.matchNumber === matchNumber);

        // If match doesn't exist (shouldn't happen), assume dead
        if (!match) return true;

        // If match has a winner, it's alive
        if (match.winner) return false;

        // If match has any teams, it's potentially alive (or is a BYE itself)
        if (match.team1 || match.team2) return false;

        // If match has NO teams:
        // Round 1: Dead (no one registered for these slots)
        if (round === 1) return true;

        // Round > 1: Dead only if BOTH source branches are dead
        const source1MatchNum = matchNumber * 2 - 1;
        const source2MatchNum = matchNumber * 2;

        return isBranchDead(round - 1, source1MatchNum) && isBranchDead(round - 1, source2MatchNum);
      };

      const matchesWithByes = bracketMatches.filter(m => {
        if (m.status !== 'pending') return false;

        // Check for explicit BYE IDs (any round)
        const explicitBye1 = m.team1 && m.team1.id.startsWith('bye-');
        const explicitBye2 = m.team2 && m.team2.id.startsWith('bye-');
        if (explicitBye1 || explicitBye2) return true;

        // Check for implicit BYEs
        // Case 1: Round 1, exactly one team present
        if (m.round === 1) {
          const hasTeam1 = !!m.team1;
          const hasTeam2 = !!m.team2;
          return (hasTeam1 && !hasTeam2) || (!hasTeam1 && hasTeam2);
        }

        // Case 2: Round > 1, exactly one team present, and the empty slot comes from a "dead" branch
        if (m.round > 1) {
          // STRICT CHECK: Do not advance any match in Round N if Round N-1 is not fully completed.
          // This prevents "ragged" brackets where teams advance deep into the bracket while early rounds are still playing.
          const prevRoundMatches = bracketMatches.filter(pm => pm.round === m.round - 1);
          const isPrevRoundComplete = prevRoundMatches.every(pm => pm.status === 'completed');

          if (!isPrevRoundComplete) {
            // If previous round is not complete, we hold off on advancing this BYE.
            // Exception: If the empty slot source is ALREADY dead (e.g. BYE vs BYE in prev round), we might still want to advance?
            // User request: "the bye must not run because round 1 hasn't finished fully".
            // So we enforce the strict check.
            return false;
          }

          const hasTeam1 = !!m.team1;
          const hasTeam2 = !!m.team2;

          // Must have exactly one team to be a BYE candidate
          if (!((hasTeam1 && !hasTeam2) || (!hasTeam1 && hasTeam2))) return false;

          // Find the source match for the empty slot
          const emptySlotSourceMatchNum = !hasTeam1 ? (m.matchNumber * 2 - 1) : (m.matchNumber * 2);

          // Check if the source branch is dead
          if (isBranchDead(m.round - 1, emptySlotSourceMatchNum)) {
            return true;
          }
        }

        return false;
      });

      console.log('Auto-Advance Debug:', {
        totalMatches: bracketMatches.length,
        matchesWithByes: matchesWithByes.length,
        sampleMatch: bracketMatches[0],
        pendingMatches: bracketMatches.filter(m => m.status === 'pending').length
      });

      if (matchesWithByes.length === 0) {
        toast({ title: 'No BYEs found', description: 'All matches currently have two teams or are already advanced.' });
        return;
      }

      let advancedCount = 0;
      for (const m of matchesWithByes) {
        let winnerTeamId: string | null = null;

        // Determine winner: The team that exists and is NOT a bye
        if (m.team1 && !m.team1.id.startsWith('bye-')) {
          // Team 1 is a real team. Wins if Team 2 is missing or is BYE.
          if (!m.team2 || m.team2.id.startsWith('bye-')) {
            winnerTeamId = m.team1.id;
          }
        } else if (m.team2 && !m.team2.id.startsWith('bye-')) {
          // Team 2 is a real team. Wins if Team 1 is missing or is BYE.
          if (!m.team1 || m.team1.id.startsWith('bye-')) {
            winnerTeamId = m.team2.id;
          }
        }

        if (winnerTeamId && String(m.id).startsWith('db-')) {
          const dbId = String(m.id).replace('db-', '');
          const { error } = await supabase.rpc('advance_match_v2', {
            p_match_id: dbId,
            p_winner_id: winnerTeamId,
            p_team1_score: m.team1?.id === winnerTeamId ? 1 : 0,
            p_team2_score: m.team2?.id === winnerTeamId ? 1 : 0
          });
          if (!error) advancedCount++;
        }
      }

      toast({ title: 'BYEs advanced', description: `Successfully advanced ${advancedCount} matches.` });

      // Refetch data to ensure UI updates immediately (especially for winner highlighting)
      await fetchTournamentData(true);
    } catch (error: any) {
      console.error('Error auto-advancing BYEs:', error);
      toast({ title: 'Error', description: error?.message || 'Failed to auto-advance BYEs', variant: 'destructive' });
    } finally {
      setIsClearing(false);
      setLoadingMessage("Loading...");
    }
  };



  const clearBracketInDatabase = async () => {
    try {
      if (!tournament) return;

      // Confirm before resetting
      if (!confirm('Are you sure you want to reset all bracket matches? This will reset all match statuses, scores, and winners, but keep the bracket structure.')) {
        return;
      }

      setIsClearing(true);
      setLoadingMessage("Resetting Bracket...");

      // Get all matches for this tournament
      const { data: matchIds, error: fetchError } = await (supabase
        .from('tournament_matches') as any)
        .select('id')
        .eq('tournament_id', tournament.id);

      if (fetchError) {
        console.error('[Brackets] Error fetching matches:', fetchError);
        throw fetchError;
      }

      if (!matchIds || matchIds.length === 0) {
        toast({ title: 'No matches', description: 'There are no matches to reset.' });
        setIsClearing(false);
        return;
      }

      const ids = matchIds.map(m => m.id);

      // Delete match results associated with these matches
      // Delete by match_id first (more specific)
      const { error: resultsDeleteError } = await (supabase as any)
        .from('tournament_match_results')
        .delete()
        .in('match_id', ids);

      if (resultsDeleteError) {
        console.error('[Brackets] Error deleting match results by match_id:', resultsDeleteError);
        // Try deleting by tournament_id as fallback
        const { error: tournamentResultsDeleteError } = await (supabase as any)
          .from('tournament_match_results')
          .delete()
          .eq('tournament_id', tournament.id);

        if (tournamentResultsDeleteError) {
          console.error('[Brackets] Error deleting match results by tournament_id:', tournamentResultsDeleteError);
        } else {
          console.log('[Brackets] Deleted match results by tournament_id');
        }
      } else {
        console.log('[Brackets] Deleted match results for', ids.length, 'matches');
      }

      // Use the comprehensive reset function to do everything in one transaction
      console.log('[Brackets] Resetting entire bracket for tournament:', tournament.id);

      const { error: resetError } = await supabase.rpc('reset_tournament_bracket' as any, {
        p_tournament_id: tournament.id
      });

      if (resetError) {
        console.error('[Brackets] Error resetting bracket:', resetError);
        throw resetError;
      }

      console.log('[Brackets] Successfully reset bracket, refetching data...');

      // Refetch data to update UI
      await fetchTournamentData(true);

      // Add a small delay to ensure the user sees the completion state
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsClearing(false);
      setLoadingMessage("Loading...");
      toast({ title: 'Bracket Reset', description: 'Bracket has been reset successfully.' });
      return;

    } catch (e: any) {
      console.error('Error resetting bracket:', e);
      toast({
        title: 'Reset failed',
        description: e?.message || 'Could not reset matches',
        variant: 'destructive'
      });
    } finally {
      setIsClearing(false);
    }
  };



  const applyAutoSchedule = async (gapMinutes = 30) => {
    if (!scheduleStart) {
      toast({ title: 'Error', description: 'Please select a start date and time', variant: 'destructive' });
      return;
    }

    const base = (draftMatches && draftMatches.length > 0) ? draftMatches : bracketMatches;
    if (!base || base.length === 0) {
      setShowSchedulerModal(false);
      setDraftMatches(null);
      return;
    }

    try {
      const start = new Date(scheduleStart);
      const updated = base.map((m, idx) => ({
        ...m,
        scheduledTime: new Date(start.getTime() + idx * gapMinutes * 60000).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      }));
      setBracketMatches(updated);
      setDraftMatches(null);
      setShowSchedulerModal(false);
      // Auto-persist so players can see brackets immediately
      await persistMatches(updated);
      toast({ title: 'Schedule applied', description: 'Match times have been scheduled and saved.' });
    } catch (error: any) {
      console.error('Error applying schedule:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to apply schedule',
        variant: 'destructive'
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-gaming-gray/20 rounded"></div>
            <div className="h-64 bg-gaming-gray/20 rounded"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Tournament not found</h1>
            <Button
              onClick={() => navigate('/organizer/tournaments')}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
              Back to Tournaments
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Restrict viewing to registered players or organizer-owner
  if (!isOrganizerOwner && !canView) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-[800px] mx-auto text-center">
            <h1 className="text-2xl font-bold mb-3">Brackets unavailable</h1>
            <p className="text-gray-400 mb-6">You must be registered in this tournament to view brackets.</p>
            <Button
              onClick={() => {
                const target = (tournament as any)?.slug || tournament.id;
                navigate(`/tournaments/${target}`);
              }}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
              View Tournament
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              <p className="text-gray-400">{tournament.game}</p>
            </div>
            <Button
              onClick={() => {
                if (isOrganizerOwner) {
                  navigate(`/organizer/tournament/${slug}`);
                } else {
                  navigate(`/tournaments/${slug}`);
                }
              }}
              variant="outline"
              className="border-gaming-gray/30"
            >
              Back to Tournament
            </Button>
          </div>

          <Card className="bg-[#09090b] border-zinc-800 shadow-xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold text-zinc-100">Tournament Brackets</CardTitle>
                <div className="flex gap-2 items-center flex-wrap justify-end">
                  {isOrganizerOwner && (
                    <>
                      <div className="w-32 px-3 py-2 text-sm bg-[#18181b] border border-zinc-800 rounded-md text-zinc-400 text-center select-none font-medium">
                        {teamCount} Teams
                      </div>
                      <Button
                        variant="outline"
                        className="bg-[#18181b] border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
                        onClick={() => setShowEditBracket(!showEditBracket)}
                      >
                        {showEditBracket ? 'Hide Edit Options' : 'Edit Bracket'}
                      </Button>
                      {showEditBracket && (
                        <Button variant="outline" className="bg-[#18181b] border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all" onClick={() => setShowSchedulerModal(true)}>
                          Schedule Matches
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all font-medium"
                        onClick={autoAdvanceByes}
                        disabled={isClearing}
                        title="Automatically advance all teams that have a BYE opponent"
                      >
                        {isClearing ? 'Advancing...' : '⏩ Auto-Advance BYEs'}
                      </Button>
                      <Button variant="outline" className="bg-[#18181b] border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all" onClick={saveBracketToDatabase}>
                        Save Bracket
                      </Button>
                      {/* Clear Bracket button - deletes all matches */}
                      <Button
                        variant="destructive"
                        onClick={clearBracketCompletely}
                        disabled={isClearing}
                        className="bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-medium"
                        title="Delete all matches completely (requires regeneration)"
                      >
                        {isClearing ? 'Clearing...' : '🗑️ Clear Bracket'}
                      </Button>
                      {/* Reset Bracket button - resets statuses but keeps structure */}
                      <Button
                        variant="outline"
                        onClick={clearBracketInDatabase}
                        disabled={isClearing}
                        className="bg-transparent border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 transition-all font-medium"
                        title="Reset all match statuses, scores, and winners (keeps bracket structure)"
                      >
                        {isClearing ? 'Resetting...' : '🔄 Reset Bracket'}
                      </Button>
                    </>
                  )}

                  {!isOrganizerOwner && (
                    <div className="w-32 px-3 py-2 text-sm bg-gaming-gray/10 border border-gaming-gray/20 rounded text-gray-300 text-center select-none">
                      {teamCount} Teams
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {/* Stage Selector */}
              {stages.length > 1 && (
                <div className="px-6 mb-6">
                  <div className="flex flex-wrap gap-2 p-1 bg-black/20 rounded-lg border border-white/5 w-fit">
                    {stages.map((stage, idx) => {
                      // Check if previous stage is completed
                      const previousStage = idx > 0 ? stages[idx - 1] : null;
                      const isPreviousStageCompleted = !previousStage || previousStage.status === 'completed';
                      const isLocked = !isPreviousStageCompleted && stage.status !== 'completed' && stage.status !== 'live';

                      return (
                        <div key={stage.id} className="relative group">
                          <button
                            onClick={() => setSelectedStageId(stage.id)}
                            className={cn(
                              "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                              selectedStageId === stage.id
                                ? "bg-gaming-purple text-white shadow-lg shadow-gaming-purple/20"
                                : isLocked
                                  ? "text-gray-500 cursor-not-allowed opacity-60"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            {isLocked && (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            )}
                            {stage.name}
                            {stage.status === 'live' && (
                              <span className="inline-flex items-center">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />
                                <span className="text-[10px] uppercase tracking-wider text-red-500 font-bold">Live</span>
                              </span>
                            )}
                            {stage.status === 'completed' && (
                              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          {/* Locked tooltip */}
                          {isLocked && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                              <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Complete <span className="font-semibold text-white">"{previousStage?.name}"</span> first</span>
                              </div>
                              {/* Arrow */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-700" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {bracketMatches.length > 0 ? (
                <div className="w-full overflow-x-auto pb-4 relative min-h-[400px]">
                  {isClearing && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg animate-fadeIn duration-300">
                      <div className="flex flex-col items-center gap-4 p-8 bg-black/80 border border-white/10 rounded-xl shadow-2xl">
                        <div className="relative w-16 h-16">
                          <div className="absolute inset-0 rounded-full border-4 border-gaming-purple/20"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-t-gaming-purple animate-spin"></div>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-white mb-1">{loadingMessage}</h3>
                          <p className="text-sm text-gray-400">Please wait while we process your request...</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={cn("min-w-0 max-w-full transition-opacity duration-300", isClearing ? "opacity-20 blur-sm pointer-events-none" : "opacity-100")}>
                    <BracketVisualization
                      matches={bracketMatches}
                      teamCount={teamCount}
                      tournamentId={tournament?.id}
                      isOrganizer={isOrganizerOwner}
                      isCaptain={isCaptain}
                      userTeamId={userTeamId}
                      matchVetoLinks={matchVetoLinks}
                      onUploadResult={openUploadForMatch}
                      onOpenMapVeto={(match, matchId) => {
                        setMapVetoMatch(match);
                        setMapVetoMatchId(matchId);
                        setMapVetoOpen(true);
                        // Remove notification badge after opening
                        setMatchVetoLinks(prev => {
                          const newMap = new Map(prev);
                          newMap.delete(matchId);
                          return newMap;
                        });
                      }}
                      onSwapTeam={async ({ source, target }) => {
                        // Restrict DnD to Round 1 and pending matches to avoid integrity issues
                        if (source.round !== 1 || target.round !== 1) return;
                        const next = bracketMatches.map(m => ({ ...m }));
                        const sIdx = next.findIndex(m => m.round === source.round && m.matchNumber === source.matchNumber);
                        const tIdx = next.findIndex(m => m.round === target.round && m.matchNumber === target.matchNumber);
                        if (sIdx === -1 || tIdx === -1) return;
                        const sMatch = next[sIdx];
                        const tMatch = next[tIdx];
                        if (sMatch.status !== 'pending' || tMatch.status !== 'pending') return;
                        const sTeam = source.slot === 'team1' ? sMatch.team1 : sMatch.team2;
                        const tTeam = target.slot === 'team1' ? tMatch.team1 : tMatch.team2;
                        // Prevent dragging BYE or null
                        if (!sTeam || (sTeam.id || '').startsWith('bye-')) return;

                        // Swap in UI state first for immediate feedback
                        if (source.slot === 'team1') sMatch.team1 = tTeam || null; else sMatch.team2 = tTeam || null;
                        if (target.slot === 'team1') tMatch.team1 = sTeam; else tMatch.team2 = sTeam;
                        setBracketMatches(next);

                        // Persist changes to database immediately
                        if (tournament?.id && String(sMatch.id).startsWith('db-') && String(tMatch.id).startsWith('db-')) {
                          const sDbId = String(sMatch.id).replace('db-', '');
                          const tDbId = String(tMatch.id).replace('db-', '');

                          const sTeam1Id = sMatch.team1?.id && !sMatch.team1.id.startsWith('bye-') && !sMatch.team1.id.startsWith('name:') ? sMatch.team1.id : null;
                          const sTeam2Id = sMatch.team2?.id && !sMatch.team2.id.startsWith('bye-') && !sMatch.team2.id.startsWith('name:') ? sMatch.team2.id : null;
                          const tTeam1Id = tMatch.team1?.id && !tMatch.team1.id.startsWith('bye-') && !tMatch.team1.id.startsWith('name:') ? tMatch.team1.id : null;
                          const tTeam2Id = tMatch.team2?.id && !tMatch.team2.id.startsWith('bye-') && !tMatch.team2.id.startsWith('name:') ? tMatch.team2.id : null;

                          try {
                            console.log('[Brackets] onSwapTeam: Saving team swap to database', {
                              sourceMatch: { id: sDbId, team1_id: sTeam1Id, team2_id: sTeam2Id },
                              targetMatch: { id: tDbId, team1_id: tTeam1Id, team2_id: tTeam2Id }
                            });

                            const { error: sError, data: sData } = await supabase
                              .from('tournament_matches')
                              .update({ team1_id: sTeam1Id, team2_id: sTeam2Id, updated_at: new Date().toISOString() })
                              .eq('id', sDbId)
                              .select();

                            if (sError) {
                              console.error('[Brackets] onSwapTeam: Error updating source match:', sError);
                              throw sError;
                            }
                            console.log('[Brackets] onSwapTeam: Source match updated:', sData);

                            const { error: tError, data: tData } = await supabase
                              .from('tournament_matches')
                              .update({ team1_id: tTeam1Id, team2_id: tTeam2Id, updated_at: new Date().toISOString() })
                              .eq('id', tDbId)
                              .select();

                            if (tError) {
                              console.error('[Brackets] onSwapTeam: Error updating target match:', tError);
                              throw tError;
                            }
                            console.log('[Brackets] onSwapTeam: Target match updated:', tData);

                            toast({
                              title: 'Teams swapped',
                              description: 'Team positions have been updated. Other users will see the change shortly.',
                            });
                          } catch (error: any) {
                            console.error('[Brackets] Error persisting drag-and-drop:', error);
                            toast({
                              title: 'Error',
                              description: error?.message || 'Failed to save team swap. Please try again.',
                              variant: 'destructive'
                            });
                            // Revert local state on error
                            setBracketMatches(bracketMatches);
                            // Real-time subscription will update UI automatically
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              ) : matches.length > 0 ? (
                <div className="space-y-8">
                  <p className="text-gray-400">Saved brackets detected. Rendering from stored matches will be enabled in the next step.</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No matches have been generated yet.</p>
                  {isOrganizerOwner && (
                    <p className="text-sm text-gray-500">
                      Go to the <strong>Stages</strong> tab in the tournament dashboard to generate brackets.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>


          {isOrganizerOwner && showSchedulerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-lg bg-gaming-dark rounded-2xl border border-gaming-gray/40 shadow-2xl">
                <div className="px-5 pt-5 pb-3 border-b border-gaming-gray/30">
                  <h3 className="text-xl font-extrabold tracking-tight">Schedule matches</h3>
                  <p className="text-sm text-gray-400 mt-1">Choose a start date & time. We’ll assign each match a slot with your selected gap.</p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Start date & time</label>
                      <input
                        type="datetime-local"
                        className="w-full bg-[#16161d] border border-[#2a2a35] focus:border-gaming-purple/50 focus:ring-0 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-400 caret-gaming-purple"
                        value={scheduleStart}
                        onChange={e => setScheduleStart(e.target.value)}
                        placeholder="YYYY-MM-DD HH:MM"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Gap</label>
                      <select
                        className="w-full bg-[#16161d] border border-[#2a2a35] focus:border-gaming-purple/50 focus:ring-0 rounded-lg px-3 py-2 text-sm text-white"
                        defaultValue="30"
                        id="gap-select"
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-5">
                    <Button variant="outline" className="border-gaming-gray/40" onClick={() => { setShowSchedulerModal(false); setDraftMatches(null); }}>Cancel</Button>
                    <Button
                      className="bg-gaming-purple hover:bg-gaming-purple/80"
                      onClick={() => {
                        const select = document.getElementById('gap-select') as HTMLSelectElement | null;
                        const gap = select ? parseInt(select.value) : 30;
                        applyAutoSchedule(gap);
                      }}
                    >
                      Apply gap
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      {/* Upload modal embedded on bracket page */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[520px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Match Result</DialogTitle>
            <DialogDescription className="text-gray-400">Attach a screenshot and optional comment. Only captains can submit.</DialogDescription>
          </DialogHeader>
          {tournament?.id && uploadMatchId && (
            <MatchResultUpload
              tournamentId={tournament.id}
              matchId={uploadMatchId}
              teamId={userTeamId}
              isCaptain={isCaptain}
              onSuccess={() => {
                setUploadOpen(false);
                setUploadMatchId(undefined);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Map Veto Dialog */}
      <Dialog open={mapVetoOpen} onOpenChange={(open) => {
        console.log('[Brackets] Map Veto dialog onOpenChange:', open, { mapVetoOpen, mapVetoMatchId, mapVetoMatch: !!mapVetoMatch });
        setMapVetoOpen(open);
        if (!open) {
          // Reset state when dialog closes
          setMapVetoMatchId(null);
          setMapVetoMatch(null);
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[900px] bg-gaming-dark border border-gaming-gray/40 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white">Map Veto</DialogTitle>
                <DialogDescription className="text-gray-400">
                  {mapVetoMatch?.team1?.name || 'Team 1'} vs {mapVetoMatch?.team2?.name || 'Team 2'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {tournament && mapVetoMatchId && mapVetoMatch ? (
            <MapVeto
              matchId={mapVetoMatchId}
              tournamentId={tournament.id}
              team1Id={mapVetoMatch.team1?.id || null}
              team2Id={mapVetoMatch.team2?.id || null}
              team1Name={mapVetoMatch.team1?.name || 'Team 1'}
              team2Name={mapVetoMatch.team2?.name || 'Team 2'}
              game={tournament.game}
              bestOf={mapVetoMatch.bestOf || 1}
              matchStatus={mapVetoMatch.status}
              onComplete={() => {
                console.log('[Brackets] Map Veto completed');
                // Don't close the dialog - let organizer see the result
                // Just update the local state via real-time subscription
                // setMapVetoOpen(false);
                // setMapVetoMatchId(null);
                // setMapVetoMatch(null);
                // Don't trigger refresh - real-time will handle it
                // setRefreshTrigger(prev => prev + 1);
              }}
            />
          ) : (
            <div className="text-center py-8 text-gray-400">
              {!tournament ? 'Loading tournament...' : !mapVetoMatchId ? `No match selected (mapVetoMatchId: ${mapVetoMatchId})` : `Loading match details... (matchId: ${mapVetoMatchId})`}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};


export default TournamentBrackets;