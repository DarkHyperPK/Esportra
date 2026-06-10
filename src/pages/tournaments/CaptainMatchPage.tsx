import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, AlertCircle, Swords, Copy, MessageCircle, Clock, ShieldAlert, ExternalLink, ChevronDown } from 'lucide-react';
import { MatchRepository } from '@/services/bracket/MatchRepository';
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';
import { adaptGraphToBracketMatches, buildCompetitorMapFromNodes } from '@/services/bracket/BracketAdapter';
import { MapVeto } from '@/components/tournament/MapVeto';
import MatchResultUpload from '@/components/tournament/MatchResultUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MatchAutoReport } from '@/components/tournament/MatchAutoReport';
import { MatchResultVerification } from '@/components/tournament/MatchResultVerification';
import { BracketMatch, BracketTeam, BracketSide, Participant } from '@/types/bracketTypes';
import CaptainMatchHistory from '@/components/tournament/CaptainMatchHistory';
import { gameHasMapVeto, isAssistedMatchReportingEnabled, isBattleRoyale } from '@/utils/gameFeatures';
import { useGameTerminology } from '@/hooks/useGameTerminology';
import MatchCheckinCard from '@/components/tournament/MatchCheckinCard';
import TimeProposalCard from '@/components/tournament/TimeProposalCard';

import MatchChat from '@/components/tournament/MatchChat';
import TournamentEndScreen from '@/components/tournament/TournamentEndScreen';
import EntityAvatar from '@/components/ui/EntityAvatar';

import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useTimeProposal } from '@/hooks/useTimeProposal';
import { useMatchResultReport } from '@/hooks/useMatchResultReport';
import { useBracketRealtime } from '@/hooks/useBracketRealtime';
import { useMatchRealtime } from '@/hooks/useMatchRealtime';
import { useVetoRealtime } from '@/hooks/useVetoRealtime';
import ServerConnectionCard from '@/components/match/ServerConnectionCard';
import LiveScoreCard from '@/components/match/LiveScoreCard';
import { VetoHistoryTimeline } from '@/components/tournament/map-veto/VetoHistoryTimeline';
import { useVetoHistory } from '@/hooks/useVetoHistory';

const repo = new MatchRepository();

// ... existing imports

const CaptainMatchPage = () => {
    // ... existing hooks

    const { slug, matchId: urlMatchId } = useParams<{ slug: string; matchId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { userTeams, loading: teamsLoading } = useTeamManagement();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [userTeamId, setUserTeamId] = useState<string | undefined>(undefined);
    const [isCaptain, setIsCaptain] = useState(false);
    const [staffPermissions, setStaffPermissions] = useState<string[]>([]);
    const stageFormat = 'single_elimination';
    const roundDeadline: string | null = null;
    const [participantStatus, setParticipantStatus] = useState<string | null>(null);
    const [stageConfigs, setStageConfigs] = useState<Record<string, any>>({});

    // Match actions state
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadMatchId, setUploadMatchId] = useState<string | undefined>(undefined);
    const [mapVetoOpen, setMapVetoOpen] = useState(false);
    const [mapVetoMatch, setMapVetoMatch] = useState<BracketMatch | null>(null);
    const [mapVetoMatchId, setMapVetoMatchId] = useState<string | null>(null);
    const [vetoSummaryOpen, setVetoSummaryOpen] = useState(false);

    // Debounced bracket refetch to prevent rapid cascading re-renders from realtime events
    const bracketRefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedBracketInvalidate = useCallback(() => {
        if (bracketRefetchTimer.current) clearTimeout(bracketRefetchTimer.current);
        bracketRefetchTimer.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });
        }, 1500);
    }, [queryClient]);
    useEffect(() => () => { if (bracketRefetchTimer.current) clearTimeout(bracketRefetchTimer.current); }, []);

    const { data: tournamentResponse, isLoading: tournamentLoading, isError: tournamentError } = useQuery({
        queryKey: ['tournament-captain-room', slug],
        queryFn: async () => {
            const response = await apiClient.get<any>(`/api/tournaments/${slug}`);
            if (!response?.tournament) throw new Error('Tournament not found');
            const tourney = response.tournament;
            if (typeof tourney.settings === 'string') {
                try { tourney.settings = JSON.parse(tourney.settings); } catch { /* keep as-is */ }
            }
            return response;
        },
        enabled: !!slug,
    });

    const tournament = tournamentResponse?.tournament ?? null;
    const terminology = useGameTerminology(tournament?.game);

    const isOrganizer = useMemo(() => {
        if (!tournamentResponse || !user) return false;
        const tourney = tournamentResponse.tournament;
        const perms: string[] = tournamentResponse.staffPermissions || [];
        const ownsOrg = user.id === tourney.organization?.owner_id;
        const isOrganizerUser = user.id === tourney.organizer_id;
        const hasMatchRoomStaffPerm =
            perms.includes('bracket:edit') || perms.includes('disputes:assist');
        return Boolean(
            tournamentResponse.isOrganizer || ownsOrg || isOrganizerUser || hasMatchRoomStaffPerm,
        );
    }, [tournamentResponse, user]);

    useEffect(() => {
        if (tournamentResponse?.participants) {
            setParticipants(tournamentResponse.participants);
        }
    }, [tournamentResponse?.participants]);

    useEffect(() => {
        if (tournamentResponse?.staffPermissions) {
            setStaffPermissions(tournamentResponse.staffPermissions);
        }
    }, [tournamentResponse?.staffPermissions]);

    useEffect(() => {
        if (tournamentError) {
            toast({
                title: 'Error',
                description: 'Failed to load tournament data',
                variant: 'destructive',
            });
        }
    }, [tournamentError, toast]);

    const canManageMatchRoom = useMemo(
        () =>
            isOrganizer
            || staffPermissions.includes('bracket:edit')
            || staffPermissions.includes('disputes:assist'),
        [isOrganizer, staffPermissions],
    );

    const isOrganizerMatchView = !!urlMatchId && canManageMatchRoom;

    const { data: organizerMatch } = useQuery({
        queryKey: ['organizer-match', urlMatchId],
        queryFn: async () => {
            if (!urlMatchId || !canManageMatchRoom) return null;
            try {
                const data = await apiClient.get<any>(`/api/brackets/matches/${urlMatchId}`);
                if (!data) return null;
                const team1: BracketTeam | null = data.team1_id ? {
                    id: data.team1_id,
                    name: data.team1_name || 'TBD',
                    seed: 0,
                    logo_url: data.team1_logo,
                } : null;
                const team2: BracketTeam | null = data.team2_id ? {
                    id: data.team2_id,
                    name: data.team2_name || 'TBD',
                    seed: 0,
                    logo_url: data.team2_logo,
                } : null;
                const winner: BracketTeam | null = data.winner_id ? (team1?.id === data.winner_id ? team1 : team2?.id === data.winner_id ? team2 : null) : null;
                const bracketMatch: BracketMatch = {
                    id: `db-${data.id}`,
                    round: data.round_index + 1,
                    matchNumber: data.match_number || 1,
                    team1,
                    team2,
                    winner,
                    score: null,
                    team1_score: data.team1_score ?? null,
                    team2_score: data.team2_score ?? null,
                    status: data.status || 'pending',
                    scheduledTime: data.scheduled_time,
                    bestOf: data.best_of || data.stage_best_of,
                    partyCode: data.party_code,
                    bracketSide: data.bracket_type as BracketSide || undefined,
                    bracketType: data.bracket_type as BracketMatch['bracketType'] || data.stage_format as BracketMatch['bracketType'],
                    nextMatchId: null,
                    loserNextMatchId: null,
                    stageId: data.version_id,
                    groupId: data.group_id,
                    x: data.x,
                    y: data.y,
                };
                return bracketMatch;
            } catch (error: any) {
                console.error('Error fetching organizer match:', error);
                return null;
            }
        },
        enabled: !!urlMatchId && canManageMatchRoom,
    });

    const organizerVersionId = organizerMatch?.stageId;

    // Captain path: scan all bracket versions to locate the user's active match
    const { data: bracketVersions, isLoading: versionsLoading } = useQuery({
        queryKey: ['captain-bracket-versions', tournament?.id],
        queryFn: async () => {
            if (!tournament?.id) return [];
            const data = await apiClient.get<any[]>(`/api/brackets/versions/tournament/${tournament.id}`);
            return data || [];
        },
        enabled: !!tournament?.id && !isOrganizerMatchView,
    });

    const { data: captainGraphData, isLoading: captainGraphLoading, refetch: refetchCaptainGraph } = useQuery({
        queryKey: ['captain-all-matches', bracketVersions?.map((v: any) => v.id).join(',')],
        queryFn: async () => {
            if (!bracketVersions || bracketVersions.length === 0) return { nodes: [], edges: [] };
            const results = await Promise.all(
                bracketVersions.map((version: any) => repo.getGraphStructure(version.id))
            );
            const allNodes: any[] = [];
            const allEdges: any[] = [];
            for (const { nodes, edges } of results) {
                allNodes.push(...nodes);
                allEdges.push(...edges);
            }
            return { nodes: allNodes, edges: allEdges };
        },
        enabled: !isOrganizerMatchView && !!bracketVersions && bracketVersions.length > 0,
    });

    // Organizer deep-link: one version graph for match history (not every bracket version)
    const { data: organizerVersionMeta } = useQuery({
        queryKey: ['bracket-version', organizerVersionId],
        queryFn: () => apiClient.get<any>(`/api/brackets/versions/${organizerVersionId}`),
        enabled: isOrganizerMatchView && !!organizerVersionId,
    });

    const { data: organizerGraphData, isLoading: organizerGraphLoading, refetch: refetchOrganizerGraph } = useQuery({
        queryKey: ['captain-organizer-graph', organizerVersionId],
        queryFn: () => repo.getGraphStructure(organizerVersionId!),
        enabled: isOrganizerMatchView && !!organizerVersionId,
    });

    const allGraphData = isOrganizerMatchView ? organizerGraphData : captainGraphData;
    const graphLoading = isOrganizerMatchView ? organizerGraphLoading : (versionsLoading || captainGraphLoading);
    const refetchBracket = isOrganizerMatchView ? refetchOrganizerGraph : refetchCaptainGraph;

    const { data: stagesData } = useQuery({
        queryKey: ['tournament-stages', tournament?.id],
        queryFn: () => apiClient.get<any[]>(`/api/tournaments/${tournament!.id}/stages`),
        enabled: !!tournament?.id,
    });

    useEffect(() => {
        if (!stagesData?.length) return;
        const configs: Record<string, any> = {};
        stagesData.forEach((stage: any) => {
            let sc = stage.scheduling_config;
            if (typeof sc === 'string') {
                try { sc = JSON.parse(sc); } catch { sc = null; }
            }
            configs[stage.id] = {
                format: stage.format,
                scheduling_config: sc,
            };
        });
        setStageConfigs(configs);
    }, [stagesData]);

    // Build competitor map from graph nodes (includes solo participant slots — not /api/teams ids)
    const teamsMap = useMemo(() => {
        if (!allGraphData?.nodes) return new Map<string, { id: string; name: string; logo_url?: string | null }>();
        return buildCompetitorMapFromNodes(allGraphData.nodes);
    }, [allGraphData?.nodes]);

    // Convert graph data to BracketMatch format
    const matches = useMemo<BracketMatch[]>(() => {
        if (!allGraphData?.nodes || !allGraphData?.edges) {
            return [];
        }
        const adapted = adaptGraphToBracketMatches(allGraphData.nodes, allGraphData.edges, teamsMap);
        return adapted;
    }, [allGraphData?.nodes, allGraphData?.edges, teamsMap]);

    const organizerMatchLoading = isOrganizerMatchView && !organizerMatch;
    const pageLoading = tournamentLoading || graphLoading || organizerMatchLoading;

    // Identify captain and team
    useEffect(() => {
        const checkRoles = async () => {
            if (!user || !participants.length || teamsLoading || !tournament) return;

            // 1. Organizer status already set from API response

            const inactiveStatuses = new Set(['cancelled', 'rejected', 'disqualified']);
            const matchingParticipants: any[] = [];

            participants.forEach((p: any) => {
                if (p.user_id === user.id) {
                    matchingParticipants.push(p);
                    return;
                }
                if (p.team_id && userTeams.some(t => t.id === p.team_id)) {
                    matchingParticipants.push(p);
                }
            });

            const userParticipant =
                matchingParticipants.find(
                    (p) => !inactiveStatuses.has(String(p.status || '').toLowerCase()),
                ) ?? matchingParticipants[0];

            if (userParticipant) {
                let isCap = false;
                const teamId = userParticipant.participant_type === 'solo'
                    || userParticipant.entry_kind === 'solo_player'
                    ? userParticipant.id
                    : (userParticipant.team_id || undefined);

                if (userParticipant.participant_type === 'solo' || userParticipant.entry_kind === 'solo_player') {
                    isCap = true;
                } else if (userParticipant.team_id) {
                    const userTeam = userTeams.find(t => t.id === userParticipant.team_id);
                    if (userTeam) {
                        const myMember = userTeam.members?.find(m => m.id === user.id);
                        isCap = userTeam.owner_id === user.id
                            || !!(myMember && (myMember.role === 'captain' || (myMember as any).is_captain === true));
                    }
                }

                setIsCaptain(isCap);
                setUserTeamId(teamId);

                const status = String(userParticipant.status || '').toLowerCase();
                if (canManageMatchRoom && inactiveStatuses.has(status)) {
                    setParticipantStatus(null);
                } else {
                    setParticipantStatus(userParticipant.status);
                }
            } else {
                setIsCaptain(false);
                setUserTeamId(undefined);
                setParticipantStatus(null);
            }
        };

        checkRoles();
    }, [user, participants, userTeams, teamsLoading, tournament, canManageMatchRoom]);

    // Find active match for the team (prefer URL matchId from notification links)
    const activeMatch = useMemo(() => {
        // Organizer mode: use directly fetched match if available
        if (canManageMatchRoom && urlMatchId && organizerMatch) {
            return organizerMatch;
        }

        // Fallback to bracket graph data
        if (!matches.length) {
            return null;
        }

        if (urlMatchId) {
            const urlMatch = matches.find(m =>
                m.id === urlMatchId || m.id.replace(/^(db-|wb-|lb-)/, '') === urlMatchId
            );
            const isUsersMatch = !!userTeamId && (urlMatch?.team1?.id === userTeamId || urlMatch?.team2?.id === userTeamId);
            if (urlMatch && (canManageMatchRoom || isUsersMatch)) {
                return urlMatch;
            }
        }

        if (!userTeamId) {
            return null;
        }

        // Find matches involving this team
        const teamMatches = matches.filter(m =>
            m.team1?.id === userTeamId || m.team2?.id === userTeamId
        );

        // Sort by round/match number to find the earliest upcoming match
        // Priority: earliest pending match > earliest in_progress match > null
        const sortedTeamMatches = teamMatches.sort((a, b) => {
            if (a.round !== b.round) return a.round - b.round;
            return (a.matchNumber || 0) - (b.matchNumber || 0);
        });

        // Find the first match that is pending or in_progress (upcoming/active match)
        const nextMatch = sortedTeamMatches.find(m =>
            m.status === 'pending' || m.status === 'in_progress'
        );
        return nextMatch || null;

    }, [canManageMatchRoom, userTeamId, matches, urlMatchId, organizerMatch]);

    const organizerFocusTeamIds = useMemo(() => {
        if (!canManageMatchRoom || !activeMatch) return undefined;
        const ids = [activeMatch.team1?.id, activeMatch.team2?.id].filter(Boolean) as string[];
        return ids.length > 0 ? ids : undefined;
    }, [canManageMatchRoom, activeMatch]);

    const showMatchHistory = Boolean(userTeamId || canManageMatchRoom);
    const historyIncludeLiveMatchId =
        activeMatch?.status === 'in_progress' ? activeMatch.id : undefined;

    // Lifted Proposal state for higher-level visibility (page owns MatchHub subscription)
    const { acceptedProposal } = useTimeProposal(
        activeMatch?.id?.replace(/^(db-|wb-|lb-)/, ''),
        { subscribeRealtime: false },
    );

    // The source of truth for "When is this match?"
    // If the database has it, use it. Otherwise, if there's an accepted proposal on this page, use that.
    const effectiveScheduledTime = useMemo(() => {
        return activeMatch?.scheduledTime || acceptedProposal?.proposed_time;
    }, [activeMatch?.scheduledTime, acceptedProposal?.proposed_time]);

    // Fetch map veto status for the active match
    const { data: vetoData } = useQuery({
        queryKey: ['match-veto', activeMatch?.id],
        queryFn: async () => {
            if (!activeMatch?.id) return null;
            const cleanedId = activeMatch.id.replace(/^(db-|wb-|lb-)/, '');
            try {
                const data = await apiClient.get<any>(`/api/veto/${cleanedId}`);
                return data;
            } catch (error: any) {
                // 404 means no veto exists yet — not an error
                if (error?.status === 404 || error?.message?.includes('404')) return null;
                console.error('[CaptainMatchPage] Error fetching map veto:', error);
                throw error;
            }
        },
        enabled: !!activeMatch?.id,
    });

    const isVetoCompleted = useMemo(() => {
        if (!activeMatch) return false;
        // Veto must exist AND be completed — no veto record means veto hasn't started
        if (!vetoData) return false;
        return vetoData.status === 'completed' || !!vetoData.completed_at;
    }, [activeMatch, vetoData]);

    // Match is "live" when status is in_progress (party code shared / checkin done)
    const isMatchLive = useMemo(() => {
        return activeMatch?.status === 'in_progress';
    }, [activeMatch?.status]);

    // Find the latest completed match for context (e.g. "Waiting for next round")
    const lastCompletedMatch = useMemo(() => {
        if (!userTeamId || !matches.length) return null;
        const teamMatches = matches.filter(m =>
            (m.team1?.id === userTeamId || m.team2?.id === userTeamId) &&
            m.status === 'completed'
        );
        return teamMatches.sort((a, b) => (b.matchNumber || 0) - (a.matchNumber || 0))[0];
    }, [userTeamId, matches]);

    const isDE = useMemo(() =>
        matches.some(m => m.bracketSide === 'losers') || stageFormat === 'double_elimination'
        , [matches, stageFormat]);

    // Check if the user is the tournament champion
    const isTournamentWinner = useMemo(() => {
        if (activeMatch) return false;
        if (!lastCompletedMatch) return false;

        const userWon = lastCompletedMatch.winner?.id === userTeamId;
        if (!userWon) return false;

        const side = lastCompletedMatch.bracketSide;
        const round = lastCompletedMatch.round;
        const totalUpperRounds = Math.ceil(Math.log2(participants.length || 8));

        return (
            side === 'final' ||
            side === 'reset' ||
            (!isDE && side === 'winners' && round === totalUpperRounds)
        );
    }, [activeMatch, lastCompletedMatch, userTeamId, participants.length, isDE]);

    // Check if the user is the tournament runner-up
    const isTournamentRunnerUp = useMemo(() => {
        if (activeMatch) return false;
        if (!lastCompletedMatch || isTournamentWinner) return false;

        const side = lastCompletedMatch.bracketSide;
        const round = lastCompletedMatch.round;
        const totalUpperRounds = Math.ceil(Math.log2(participants.length || 8));

        const isFinalMatch =
            side === 'final' ||
            side === 'reset' ||
            (!isDE && side === 'winners' && round === totalUpperRounds);

        return isFinalMatch && lastCompletedMatch.winner?.id !== userTeamId;
    }, [activeMatch, lastCompletedMatch, userTeamId, participants.length, isTournamentWinner, isDE]);

    // Check if the team has been eliminated from the tournament
    const isEliminated = useMemo(() => {
        if (activeMatch) return false;
        if (isTournamentWinner || isTournamentRunnerUp) return false;
        if (!lastCompletedMatch) return false;

        const userLost = lastCompletedMatch.winner?.id !== userTeamId;
        if (!userLost) return false; // Won last match — waiting for next round

        // In single elimination, any loss = eliminated
        if (!isDE) return true;

        // In double elimination, check if loss was in losers bracket
        if (lastCompletedMatch.bracketSide === 'losers') return true;

        // Lost in winners bracket — dropped to losers, check if there's a pending losers match
        const hasUpcomingLosersMatch = matches.some(m =>
            (m.team1?.id === userTeamId || m.team2?.id === userTeamId) &&
            m.bracketSide === 'losers' &&
            (m.status === 'pending' || m.status === 'in_progress')
        );
        // If no upcoming losers match found, might still be waiting for bracket to update
        // Only mark eliminated if tournament is past draft and no pending match exists
        return !hasUpcomingLosersMatch && tournament?.status !== 'draft';
    }, [activeMatch, isTournamentWinner, isTournamentRunnerUp, lastCompletedMatch, userTeamId, isDE, matches, tournament?.status]);

    // Derive scheduling config for the current active match
    const activeMatchVersion = useMemo(() => {
        if (isOrganizerMatchView && organizerVersionMeta) {
            return organizerVersionMeta;
        }
        return bracketVersions?.find((v: any) => v.id === activeMatch?.stageId);
    }, [isOrganizerMatchView, organizerVersionMeta, bracketVersions, activeMatch?.stageId]);

    const schedulingConfig = useMemo(() => {
        if (!activeMatchVersion?.stage_id) return null;
        return stageConfigs[activeMatchVersion.stage_id]?.scheduling_config;
    }, [activeMatchVersion, stageConfigs]);

    const isVetoEnabled = useMemo(() => {
        if (!gameHasMapVeto(tournament?.game || '', tournament?.game_mode)) return false;
        return tournament?.settings?.mapVetoEnabled !== false;
    }, [tournament?.settings, tournament?.game, tournament?.game_mode]);

    // Watch reports for the active match — used to detect disputed status
    const activeMatchRawId = activeMatch ? activeMatch.id.replace(/^(db-|wb-|lb-)/, '') : undefined;
    const { reports: activeMatchReports } = useMatchResultReport(activeMatchRawId);
    const hasDisputedReport = activeMatchReports?.some((r: { status: string }) => r.status === 'disputed') ?? false;
    // Track which game numbers are disputed — blocks re-submission for those specific games
    const disputedGameNumbers = new Set(
        (activeMatchReports || [])
            .filter((r: { status: string }) => r.status === 'disputed')
            .map((r: { game_number: number }) => r.game_number)
    );

    // Auto-Report State
    const [, setMatchGames] = useState<any[]>([]);
    const [nextGameNumber, setNextGameNumber] = useState(1);
    const [nextGameMap, setNextGameMap] = useState<{ id: string, name: string } | null>(null);

    const { refetch: refetchMatchGames } = useQuery({
        queryKey: ['match-games', activeMatchRawId],
        queryFn: async () => {
            if (!activeMatchRawId) return [];
            try {
                return await apiClient.get<any[]>(`/api/matches/${activeMatchRawId}/games`) || [];
            } catch {
                return [];
            }
        },
        enabled: !!activeMatchRawId,
    });

    const applyMatchGames = useCallback((games: any[]) => {
        setMatchGames(games);
        const completed = games.filter((g: any) => g.status === 'completed').length;
        const gameNum = completed + 1;
        setNextGameNumber(gameNum);

        const targetGame = games.find((g: any) => {
            const gn = g.game_number ?? g.gameNumber;
            return gn == gameNum;
        });
        if (targetGame) {
            setNextGameMap({
                id: targetGame.map_id ?? targetGame.mapId ?? '',
                name: targetGame.map_name ?? targetGame.mapName ?? 'Unknown Map',
            });
            return;
        }

        setNextGameMap(null);
        queryClient.invalidateQueries({ queryKey: ['match-history-games'] });
    }, [queryClient]);

    const fetchMatchGamesAndMap = useCallback(async () => {
        if (!activeMatchRawId) return;
        const { data: games } = await refetchMatchGames();
        applyMatchGames(games || []);
    }, [activeMatchRawId, refetchMatchGames, applyMatchGames]);

    useEffect(() => {
        if (!activeMatchRawId) return;
        void refetchMatchGames().then(({ data: games }) => applyMatchGames(games || []));
    }, [activeMatchRawId, refetchMatchGames, applyMatchGames]);

    // Legacy aliases for SignalR handlers
    const fetchMatchGames = fetchMatchGamesAndMap;
    const determineMap = fetchMatchGamesAndMap;

    // SignalR realtime subscriptions (replaces Supabase postgres_changes)
    const rawMatchId = activeMatch?.id?.replace(/^(db-|wb-|lb-)/, '') ?? null;
    const { data: vetoHistory = [], isLoading: vetoHistoryLoading } = useVetoHistory(
        rawMatchId,
        Boolean(vetoData) && isVetoEnabled,
    );

    // Bracket updates → debounced invalidation (structural changes)
    useBracketRealtime({
        versionId: isOrganizerMatchView
            ? (organizerVersionId ?? null)
            : (bracketVersions?.[0]?.id ?? null),
        enabled: !!activeMatch?.id,
        onMatchUpdated: () => {
            debouncedBracketInvalidate();
        },
    });

    // Match lifecycle events → debounced invalidation + targeted refetches
    useMatchRealtime({
        matchId: rawMatchId,
        enabled: !!rawMatchId,
        onReportSubmitted: () => {
            debouncedBracketInvalidate();
            fetchMatchGames();
        },
        onReportAccepted: () => {
            debouncedBracketInvalidate();
            fetchMatchGames();
        },
        onStatusChanged: () => {
            debouncedBracketInvalidate();
            fetchMatchGames();
            determineMap();
            // Also invalidate time-proposals and checkins (needed after match reset)
            queryClient.invalidateQueries({ queryKey: ['match-time-proposals'] });
            queryClient.invalidateQueries({ queryKey: ['match-checkins'] });
        },
        onDisputeResolved: () => {
            debouncedBracketInvalidate();
        },
    });

    // Veto state updates → only update veto-specific state, no bracket refetch needed
    // B1 fix: disable when MapVeto dialog is open (it has its own SignalR connection)
    useVetoRealtime({
        matchId: rawMatchId,
        enabled: !!rawMatchId && !mapVetoOpen,
        onStateUpdate: () => {
            determineMap();
            queryClient.invalidateQueries({ queryKey: ['match-veto', activeMatch?.id] });
        },
        onComplete: () => {
            determineMap();
            queryClient.invalidateQueries({ queryKey: ['match-veto', activeMatch?.id] });
        },
        onReset: () => {
            determineMap();
        },
    });

    const getRoundName = (round: number, bracketSide?: string) => {
        // Format-aware round naming
        if (stageFormat === 'swiss') {
            return `Swiss Round ${round}`;
        }
        if (stageFormat === 'round_robin') {
            return `Matchday ${round}`;
        }

        // Single and Double Elimination
        if (bracketSide === 'final') {
            const finalMatches = matches.filter(m => m.bracketSide === 'final');
            if (finalMatches.length > 1 && round === Math.max(...finalMatches.map(f => f.round))) {
                return 'Grand Finals Reset';
            }
            return 'Grand Finals';
        }
        if (bracketSide === 'reset') return 'Grand Finals Reset';

        const teamCount = participants.length > 0 ? participants.length : 8; // Default to 8 if not loaded
        const isDE = matches.some(m => m.bracketSide === 'losers') || stageFormat === 'double_elimination';
        const totalUpperRounds = Math.max(Math.log2(teamCount), 1);
        const totalLowerRounds = 2 * totalUpperRounds - 2;

        // For Lower Bracket
        if (bracketSide === 'losers') {
            if (round === totalLowerRounds) return 'Losers Finals';
            if (round === totalLowerRounds - 1) return 'Losers Semi-Finals';
            return `Losers Round ${round}`;
        }

        // Upper Bracket / Single Elimination Naming
        const roundsFromEnd = totalUpperRounds - round + 1;
        if (roundsFromEnd === 1) return isDE ? 'Winners Finals' : 'Finals';
        if (roundsFromEnd === 2) return isDE ? 'Winners Semi-Finals' : 'Semi-Finals';
        if (roundsFromEnd === 3) return isDE ? 'Winners Quarter-Finals' : 'Quarter-Finals';

        return isDE ? `Winners Round ${round}` : `Round ${round}`;
    };

    // Actions handlers
    const handleOpenVeto = (match: BracketMatch) => {
        if (!isVetoEnabled) {
            toast({
                title: 'Map veto unavailable',
                description: 'This tournament does not use map veto.',
                variant: 'destructive'
            });
            return;
        }
        // Block veto access until match is live
        if (match.status !== 'in_progress') {
            toast({
                title: 'Match not live',
                description: 'The match must be live before starting map veto.',
                variant: 'destructive'
            });
            return;
        }
        setMapVetoMatch(match);
        setMapVetoMatchId(match.id);
        setMapVetoOpen(true);
    };

    const handleUploadResult = (matchId: string) => {
        setUploadMatchId(matchId);
        setUploadOpen(true);
    };

    if (pageLoading) {
        return <PremiumLoadingScreen text="SYNCHRONIZING MATCH DATA" />;
    }

    if (!tournament) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
                <Button onClick={() => navigate('/tournaments')}>Go Back</Button>
            </div>
        );
    }

    if (
        !canManageMatchRoom
        && (participantStatus === 'cancelled' || participantStatus === 'rejected')
    ) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-4">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Registration Removed</h1>
                <p className="text-gray-400 max-w-md text-center mb-6">
                    You have been removed from this tournament. This typically happens if you missed the check-in window or did not meet the entry requirements.
                </p>
                <Button onClick={() => navigate('/tournaments')}>Back to Dashboard</Button>
            </div>
        );
    }

    // Helper to calculate default deadline (matching Organizer view)
    const getDefaultDeadline = (roundIndex: number): string => {
        if (!tournament?.start_date) return '';
        // Date parsing safety
        const startDate = new Date(tournament.start_date);
        if (isNaN(startDate.getTime())) return '';

        let daysOffset = roundIndex;

        // For round robin, might need more spacing
        if (stageFormat === 'round_robin') {
            daysOffset = roundIndex; // 1 matchday per day
        }
        // For swiss, all rounds can be closer together
        else if (stageFormat === 'swiss') {
            daysOffset = roundIndex; // 1 round per day
        }

        // Add days logic
        const roundDate = new Date(startDate);
        roundDate.setDate(startDate.getDate() + daysOffset);

        // Set to end of day
        roundDate.setHours(23, 59, 0, 0);
        return roundDate.toISOString();
    };


    return (
        <div className="min-h-screen bg-transparent text-white p-4 md:p-8 font-body">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        className="text-gray-400 hover:text-white pl-0"
                        onClick={() => navigate(`/tournaments/${slug}`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div className="text-right">
                        <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
                        <p className="text-sm text-emerald-500 font-medium uppercase tracking-wider">
                            {isOrganizerMatchView ? 'Organizer Match Room' : "Captain's Match View"}
                        </p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Match Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Active Match Section */}
                        <div className="space-y-5">
                            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                                <Swords className="w-4 h-4 text-esports-accent" />
                                {isOrganizerMatchView ? 'Selected Match Room' : 'Your Active Match'}
                            </h2>

                            {activeMatch ? (
                                <div className="w-full max-w-lg mx-auto space-y-4">
                                    {/* Round Name */}
                                    <p className="text-center text-xs font-medium text-emerald-500 uppercase tracking-widest">
                                        {getRoundName(activeMatch.round, activeMatch.bracketSide)}
                                    </p>

                                    {/* Team VS Team — compact */}
                                    <div className="flex items-center justify-center gap-6 py-4">
                                        <div className="flex flex-col items-center gap-2">
                                            <EntityAvatar
                                                src={activeMatch.team1?.logo_url}
                                                name={activeMatch.team1?.name}
                                                entityId={activeMatch.team1?.id}
                                                type="team"
                                                size="w-14 h-14"
                                            />
                                            <span className="text-xs font-medium text-white max-w-[100px] truncate">
                                                {activeMatch.team1?.name || 'TBD'}
                                            </span>
                                        </div>

                                        <span className="text-lg font-bold text-zinc-600">VS</span>

                                        <div className="flex flex-col items-center gap-2">
                                            <EntityAvatar
                                                src={activeMatch.team2?.logo_url}
                                                name={activeMatch.team2?.name}
                                                entityId={activeMatch.team2?.id}
                                                type="team"
                                                size="w-14 h-14"
                                            />
                                            <span className="text-xs font-medium text-white max-w-[100px] truncate">
                                                {activeMatch.team2?.name || 'TBD'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Waiting for opponent */}
                                    {(!activeMatch.team2?.id) && activeMatch.status === 'pending' && (
                                        <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 text-center">
                                            <p className="text-zinc-400 text-sm">⏳ Waiting for your opponent to be determined</p>
                                            <p className="text-zinc-500 text-xs mt-1">Your next match will begin once the other bracket matches are completed.</p>
                                        </div>
                                    )}

                                    {/* Check-in Card */}
                                    {effectiveScheduledTime && activeMatch.status === 'pending' && activeMatch.team2?.id && (
                                        <MatchCheckinCard
                                            matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                            team1Id={activeMatch.team1?.id}
                                            team2Id={activeMatch.team2?.id}
                                            team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                                            team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                                            userTeamId={isOrganizerMatchView ? undefined : userTeamId}
                                            scheduledTime={effectiveScheduledTime}
                                            isCaptain={!isOrganizerMatchView && isCaptain}
                                            selfPlayEnabled={!isBattleRoyale(tournament?.game || '') && (schedulingConfig?.self_play_enabled || false)}
                                            checkInWindowMinutes={schedulingConfig?.checkin_window_minutes || 15}
                                            onPartyCodeGenerated={(code) => {
                                                refetchBracket();
                                                toast({ title: 'Match Started', description: `Party Code: ${code}` });
                                            }}
                                            subscribeRealtime={false}
                                        />
                                    )}

                                    {/* Time Proposal Card */}
                                    {((!effectiveScheduledTime) && (!isBattleRoyale(tournament?.game || '') && schedulingConfig?.self_play_enabled && activeMatch.status === 'pending') && activeMatch.team2?.id) && (
                                        (() => {
                                            const roundIndex = activeMatch.round - 1;
                                            const configDeadline = schedulingConfig?.round_deadlines?.[String(roundIndex)];
                                            const defaultDeadline = getDefaultDeadline(roundIndex);
                                            const effectiveDeadline = configDeadline || defaultDeadline || roundDeadline || activeMatch.scheduledTime;
                                            return (
                                                <TimeProposalCard
                                                    matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                    roundDeadline={effectiveDeadline}
                                                    team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                                                    team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                                                    userTeamId={isOrganizerMatchView ? undefined : userTeamId}
                                                    team1Id={activeMatch.team1?.id}
                                                    isCaptain={!isOrganizerMatchView && isCaptain}
                                                    onTimeAccepted={() => {
                                                        refetchBracket();
                                                        toast({ title: 'Match Scheduled!', description: 'Now proceed to check-in.' });
                                                    }}
                                                    subscribeRealtime={false}
                                                />
                                            );
                                        })()
                                    )}

                                    {/* Map veto summary — visible once veto record exists */}
                                    {isVetoEnabled && vetoData && (
                                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden">
                                            <button
                                                type="button"
                                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
                                                onClick={() => setVetoSummaryOpen((open) => !open)}
                                                aria-expanded={vetoSummaryOpen}
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-white">Map veto summary</p>
                                                    <p className="text-xs text-zinc-500 mt-0.5">
                                                        {vetoData.status === 'completed'
                                                            ? `${vetoHistory.length} actions recorded`
                                                            : `In progress — ${vetoHistory.length} actions so far`}
                                                    </p>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${vetoSummaryOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {vetoSummaryOpen && (
                                                <div className="px-4 pb-4 border-t border-zinc-800/60">
                                                    <VetoHistoryTimeline
                                                        entries={vetoHistory}
                                                        loading={vetoHistoryLoading}
                                                        compact
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions — progressively unlocked */}
                                    <div className="space-y-2">
                                        {/* Disputed result notice */}
                                        {hasDisputedReport && (
                                            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                                <ShieldAlert className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-yellow-300">Match Result Disputed</p>
                                                    <p className="text-xs text-yellow-400/80 mt-0.5">
                                                        A result has been disputed and is pending organizer review.
                                                    </p>
                                                </div>
                                                <a
                                                    href="/user/my-disputes"
                                                    className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 font-semibold shrink-0 transition-colors"
                                                >
                                                    My Disputes <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        )}

                                        {/* Progressive unlock flow indicator */}
                                        {activeMatch.status !== 'completed' && !isMatchLive && (
                                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-xs text-zinc-500">
                                                <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                                <span>{isVetoEnabled ? 'Complete check-in to unlock Map Veto and match actions' : 'Complete check-in to unlock match actions'}</span>
                                            </div>
                                        )}

                                        {isVetoEnabled && isMatchLive && !isVetoCompleted && activeMatch.status !== 'completed' && (
                                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-xs text-indigo-300">
                                                <Swords className="w-3.5 h-3.5 shrink-0" />
                                                <span>Complete Map Veto to unlock result reporting</span>
                                            </div>
                                        )}

                                        {/* CS2 Live Score — show after veto completes */}
                                        {rawMatchId && isMatchLive && isVetoCompleted &&
                                         (tournament?.game?.toLowerCase() === 'counter-strike 2' || tournament?.game?.toLowerCase() === 'cs2') && (
                                            <LiveScoreCard
                                                matchId={rawMatchId}
                                                team1Name={activeMatch.team1?.name}
                                                team2Name={activeMatch.team2?.name}
                                                bestOf={activeMatch.bestOf || 1}
                                            />
                                        )}

                                        {/* CS2 Server Connection — show after veto completes */}
                                        {rawMatchId && isMatchLive && isVetoCompleted &&
                                         (tournament?.game?.toLowerCase() === 'counter-strike 2' || tournament?.game?.toLowerCase() === 'cs2') && (
                                            <ServerConnectionCard matchId={rawMatchId} />
                                        )}

                                        {/* Valorant Auto-Report — only when veto completed (or veto disabled) */}
                                        {(() => {
                                            const assistedEnabled = isAssistedMatchReportingEnabled(
                                                tournament?.game || '',
                                                tournament?.game_mode,
                                                tournament?.settings as { assistedMatchReporting?: boolean },
                                            );
                                            if (!assistedEnabled) return null;
                                            const bestOf = activeMatch.bestOf || 1;
                                            const winsNeeded = bestOf === 1 ? 1 : Math.ceil(bestOf / 2);
                                            const isMatchDecided = (activeMatch.team1_score || 0) >= winsNeeded || (activeMatch.team2_score || 0) >= winsNeeded;
                                            const vetoReady = !isVetoEnabled || isVetoCompleted;
                                            if (activeMatch.status !== 'completed' && !isMatchDecided && nextGameNumber <= bestOf && vetoReady) {
                                                // Block auto-report for disputed games
                                                if (disputedGameNumbers.has(nextGameNumber)) {
                                                    return (
                                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                                                            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                                                            Game {nextGameNumber} is disputed — awaiting organizer resolution.
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <MatchAutoReport
                                                        matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                        gameNumber={nextGameNumber}
                                                        mapName={nextGameMap?.name || 'Unknown Map'}
                                                        mapId={nextGameMap?.id || ''}
                                                        scheduledTime={activeMatch.scheduledTime ?? undefined}
                                                        userTeamId={isOrganizerMatchView ? undefined : userTeamId}
                                                        team1Id={activeMatch.team1?.id}
                                                        team2Id={activeMatch.team2?.id}
                                                        team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                                                        team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                                                        team1Logo={activeMatch.team1?.logo_url ?? undefined}
                                                        team2Logo={activeMatch.team2?.logo_url ?? undefined}
                                                        isCaptain={!isOrganizerMatchView && isCaptain}
                                                        className="w-full h-10"
                                                        onSuccess={() => {
                                                            toast({ title: "Game Reported", description: "Result verified and saved." });
                                                            refetchBracket();
                                                            fetchMatchGames();
                                                        }}
                                                    />
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* Result verification — all live matches (manual + auto reports) */}
                                        {isMatchLive && activeMatch.status !== 'completed' && !disputedGameNumbers.has(nextGameNumber) && (
                                            <MatchResultVerification
                                                matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                gameNumber={nextGameNumber}
                                                userTeamId={isOrganizerMatchView ? undefined : userTeamId}
                                                team1Id={activeMatch.team1?.id}
                                                team2Id={activeMatch.team2?.id}
                                                team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                                                team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                                                team1Logo={activeMatch.team1?.logo_url ?? undefined}
                                                team2Logo={activeMatch.team2?.logo_url ?? undefined}
                                                isCaptain={!isOrganizerMatchView && isCaptain}
                                                onSuccess={() => {
                                                    refetchBracket();
                                                    fetchMatchGames();
                                                }}
                                            />
                                        )}

                                        {/* Map Veto + Manual Report — only show when match is live */}
                                        {isMatchLive && activeMatch.status !== 'completed' && (
                                            <div className={`grid gap-2 ${isVetoEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                {isVetoEnabled && (
                                                    <Button
                                                        onClick={() => handleOpenVeto(activeMatch)}
                                                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 text-white h-10 text-sm font-semibold font-mono tracking-wide"
                                                    >
                                                        <Swords className="w-4 h-4 mr-1.5" />
                                                        Map Veto
                                                    </Button>
                                                )}
                                                <Button
                                                    onClick={() => handleUploadResult(activeMatch.id)}
                                                    className="bg-rose-500 hover:bg-rose-600 text-white h-10 text-sm font-semibold font-mono tracking-wide disabled:opacity-40"
                                                    disabled={(isVetoEnabled && !isVetoCompleted) || disputedGameNumbers.has(nextGameNumber)}
                                                >
                                                    <Trophy className="w-4 h-4 mr-1.5" />
                                                    {disputedGameNumbers.has(nextGameNumber) ? `Game ${nextGameNumber} Disputed`
                                                        : (isVetoEnabled && !isVetoCompleted) ? 'Awaiting Veto' : 'Manual Report'}
                                                </Button>
                                            </div>
                                        )}

                                        {/* Party Code — inline */}
                                        {activeMatch.partyCode && (
                                            <div className="flex items-center justify-between bg-zinc-900/40 px-4 py-3 rounded-lg border border-zinc-800/60">
                                                <div>
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block">Party Code</span>
                                                    <code className="text-base font-mono text-emerald-400 font-bold">{activeMatch.partyCode}</code>
                                                </div>
                                                <button
                                                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                    onClick={() => {
                                                        if (!activeMatch.partyCode) return;
                                                        navigator.clipboard.writeText(activeMatch.partyCode);
                                                        toast({ title: "Copied", description: "Party code copied" });
                                                    }}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            ) : (
                                <TournamentEndScreen
                                    state={
                                        isTournamentWinner ? 'winner'
                                        : isTournamentRunnerUp ? 'runner_up'
                                        : isEliminated ? 'eliminated'
                                        : lastCompletedMatch ? 'waiting'
                                        : 'no_match'
                                    }
                                    exitRoundName={lastCompletedMatch ? getRoundName(lastCompletedMatch.round, lastCompletedMatch.bracketSide) : undefined}
                                    tournamentStatus={tournament?.status}
                                    slug={slug}
                                    onNavigate={navigate}
                                />
                            )}


                        </div>

                        {showMatchHistory && (
                            <CaptainMatchHistory
                                tournamentId={tournament.id}
                                teamId={userTeamId}
                                matches={matches}
                                isOrganizer={Boolean(canManageMatchRoom && isOrganizerMatchView)}
                                focusTeamIds={canManageMatchRoom && isOrganizerMatchView ? organizerFocusTeamIds : undefined}
                                includeLiveMatchId={historyIncludeLiveMatchId}
                            />
                        )}
                    </div>

                    {/* Right Column: Sticky Chat */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            {activeMatch ? (
                                <>
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-sm font-medium text-emerald-400">Live Match Chat</span>
                                    </div>
                                    <MatchChat
                                        matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                        userTeamId={isOrganizerMatchView ? undefined : userTeamId}
                                        team1Id={activeMatch.team1?.id}
                                        team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                                        team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                                    />
                                    <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200">
                                        <p className="flex gap-2">
                                            <MessageCircle className="w-4 h-4 flex-shrink-0" />
                                            {isOrganizerMatchView
                                                ? 'Organizer observer mode: monitor chat, check-in status, scheduling, and match coordination.'
                                                : 'Communication is key! Use this chat to coordinate map vetoes and scheduling with your opponent.'}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/50 text-zinc-500 p-6 text-center">
                                    <MessageCircle className="w-8 h-8 mb-3 opacity-20" />
                                    <p className="text-sm">Chat will be available when you have an active match.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <Dialog open={isVetoEnabled && mapVetoOpen} onOpenChange={setMapVetoOpen}>
                    <DialogContent className="bg-[#09090b] border-zinc-800/80 max-w-[min(96vw,1280px)] h-[min(86dvh,780px)] overflow-hidden p-0 flex flex-col gap-0">
                        <DialogHeader className="px-4 py-3 border-b border-zinc-800 bg-[#18181b] flex-shrink-0">
                            <DialogTitle className="text-white text-base font-semibold">Map Veto</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-lenis-prevent>
                            {mapVetoMatch && mapVetoMatchId && (
                                <MapVeto
                                    matchId={mapVetoMatchId.replace(/^(db-|wb-|lb-)/, '')}
                                    tournamentId={tournament.id}
                                    tournamentSlug={slug}
                                    team1Id={mapVetoMatch.team1?.id}
                                    team2Id={mapVetoMatch.team2?.id}
                                    team1Name={mapVetoMatch.team1?.name}
                                    team2Name={mapVetoMatch.team2?.name}
                                    bestOf={mapVetoMatch.bestOf}
                                    game={tournament.game}
                                    layout="modal"
                                    showShareLinks={false}
                                    onComplete={() => {
                                        setMapVetoOpen(false);
                                        toast({ title: "Veto Completed", description: "Map veto process has been finalized." });
                                    }}
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogContent className="sm:max-w-md bg-[#18181b] border-zinc-800 p-0">
                        <DialogTitle className="sr-only">Manual Result Report</DialogTitle>
                        <MatchResultUpload
                            matchId={(uploadMatchId || '').replace(/^(db-|wb-|lb-)/, '')}
                            teamId={userTeamId}
                            team1Id={activeMatch?.team1?.id}
                            team2Id={activeMatch?.team2?.id}
                            gameNumber={nextGameNumber}
                            mapName={nextGameMap?.name}
                            mapId={nextGameMap?.id}
                            team1Name={activeMatch?.team1?.name || `${terminology.competitorLabel} 1`}
                            team2Name={activeMatch?.team2?.name || `${terminology.competitorLabel} 2`}
                            isCaptain={isCaptain}
                            onSuccess={() => {
                                setUploadOpen(false);
                                fetchMatchGames();
                                refetchBracket();
                                toast({ title: "Result Submitted", description: "Match result reported. Awaiting opponent confirmation." });
                            }}
                        />
                    </DialogContent>
                </Dialog>


            </div>
        </div>
    );
};

export default CaptainMatchPage;
