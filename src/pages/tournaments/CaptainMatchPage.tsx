import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import PremiumBackground from '@/components/ui/PremiumBackground';
import { Trophy, AlertCircle, Swords, ShieldAlert, ExternalLink } from 'lucide-react';
import { MatchRoomHero } from '@/components/tournament/match-room/MatchRoomHero';
import { MatchRoomActionList } from '@/components/tournament/match-room/MatchRoomActionList';
import { FloatingMatchChat } from '@/components/tournament/match-room/FloatingMatchChat';
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
import { gameHasMapVeto, isAssistedMatchReportingEnabled } from '@/utils/gameFeatures';
import { useGameTerminology } from '@/hooks/useGameTerminology';
import MatchCheckinCard from '@/components/tournament/MatchCheckinCard';
import TimeProposalCard from '@/components/tournament/TimeProposalCard';
import PartyCodeGoLiveCard from '@/components/tournament/PartyCodeGoLiveCard';
import { competitorIdsMatch } from '@/utils/competitorId';

import MatchChat from '@/components/tournament/MatchChat';
import { useMatchChat } from '@/hooks/useMatchChat';
import TournamentEndScreen from '@/components/tournament/TournamentEndScreen';

import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useMatchResultReport } from '@/hooks/useMatchResultReport';
import { useBracketRealtime } from '@/hooks/useBracketRealtime';
import { useMatchRoomRealtime } from '@/hooks/useMatchRoomRealtime';
import { useVetoRealtime } from '@/hooks/useVetoRealtime';
import ServerConnectionCard from '@/components/match/ServerConnectionCard';
import { LiveScoreCardView, useLiveScoreState } from '@/components/match/LiveScoreCard';
import { useMatchRoomState } from '@/hooks/useMatchRoomState';
import { useTimeProposal } from '@/hooks/useTimeProposal';
import { normalizeScheduledTime, parseScheduledTimeMs } from '@/utils/scheduledTime';
import {
    isSelfPlaySchedulingEnabled,
    readCheckinWindowMinutes,
} from '@/utils/selfPlayScheduling';
import { matchRoomStateQueryKey } from '@/hooks/useMatchRoomState';
import { matchTimeProposalsQueryKey } from '@/hooks/useMatchRoomRealtime';
import { useMatchLifecycleInvalidation } from '@/hooks/useMatchLifecycleInvalidation';
import { useTournamentAccess } from '@/hooks/useTournamentAccess';
import {
    isBracketMatchSettled,
    resolveActiveMatch,
    toRawMatchId,
} from '@/utils/matchRoomLifecycle';
import {
    didTeamWinBracketMatch,
    findLatestCompletedTeamMatch,
    formatTeamMatchHistoryLabel,
    isChampionshipBracketMatch,
    isDoubleEliminationBracket,
    isEliminationStageFormat,
    readTournamentWinnerTeamId,
} from '@/utils/bracketMatchProgress';
import { format } from 'date-fns';
import { useMatchScheduling } from '@/hooks/useMatchScheduling';
import { useStageRealtime } from '@/hooks/useStageRealtime';

const repo = new MatchRepository();

const readStageId = (value: any): string | undefined =>
    value?.stage_id ?? value?.stageId;

const readSchedulingConfig = (value: any): any => {
    const raw = value?.scheduling_config ?? value?.schedulingConfig;
    if (typeof raw !== 'string') return raw ?? null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

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
    const [participantStatus, setParticipantStatus] = useState<string | null>(null);
    const [stageConfigs, setStageConfigs] = useState<Record<string, any>>({});

    // Match actions state
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadMatchId, setUploadMatchId] = useState<string | undefined>(undefined);
    const [mapVetoOpen, setMapVetoOpen] = useState(false);
    const [chatUnread, setChatUnread] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [mapVetoMatch, setMapVetoMatch] = useState<BracketMatch | null>(null);
    const [mapVetoMatchId, setMapVetoMatchId] = useState<string | null>(null);


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

    const { access, can, isLoading: accessLoading } = useTournamentAccess(slug);

    const tournament = tournamentResponse?.tournament ?? null;
    const terminology = useGameTerminology(tournament?.game);

    useEffect(() => {
        if (tournamentResponse?.participants) {
            setParticipants(tournamentResponse.participants);
        }
    }, [tournamentResponse?.participants]);

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
            !accessLoading
            && (
                Boolean(access?.isOrganizer || access?.isPlatformAdmin)
                || can('bracket:edit')
                || can('disputes:assist')
            ),
        [access, accessLoading, can],
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
        enabled: !!urlMatchId && !accessLoading && canManageMatchRoom,
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
            const stageId = stage.id ?? stage.stage_id ?? stage.stageId;
            if (!stageId) return;
            configs[stageId] = {
                format: stage.format,
                scheduling_config: readSchedulingConfig(stage),
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
    const pageLoading = tournamentLoading || accessLoading || graphLoading || organizerMatchLoading;

    // Identify captain and team
    useEffect(() => {
        const checkRoles = async () => {
            if (!user || !participants.length || teamsLoading || !tournament) return;

            // 1. Organizer status already set from API response

            const inactiveStatuses = new Set(['cancelled', 'rejected', 'disqualified', 'pending']);
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
                    const myMember = userTeam?.members?.find(m => m.id === user.id);
                    isCap = userParticipant.user_id === user.id
                        || userParticipant.team_captain_id === user.id
                        || userTeam?.owner_id === user.id
                        || !!(myMember && (myMember.role === 'captain' || (myMember as any).is_captain === true));
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

    const activeMatchResolution = useMemo(
        () => resolveActiveMatch({
            matches,
            userTeamId,
            urlMatchId,
            focusMatch: organizerMatch,
            canManageMatchRoom,
            isOrganizerMatchView,
        }),
        [matches, userTeamId, urlMatchId, organizerMatch, canManageMatchRoom, isOrganizerMatchView],
    );

    const activeMatch = activeMatchResolution.activeMatch;

    const activeMatchVersion = useMemo(() => {
        if (isOrganizerMatchView && organizerVersionMeta) {
            return organizerVersionMeta;
        }
        return bracketVersions?.find((v: any) => v.id === activeMatch?.stageId);
    }, [isOrganizerMatchView, organizerVersionMeta, bracketVersions, activeMatch?.stageId]);

    const activeStageId = useMemo(
        () => readStageId(activeMatchVersion),
        [activeMatchVersion],
    );

    const stageFormat = useMemo(() => {
        if (!activeStageId) return 'single_elimination';
        return stageConfigs[activeStageId]?.format ?? 'single_elimination';
    }, [activeStageId, stageConfigs]);

    useStageRealtime({ tournamentId: tournament?.id });

    const { schedulingConfig } = useMatchScheduling(activeStageId);

    useEffect(() => {
        if (!activeMatchResolution.shouldUnpinUrl || !slug) return;
        navigate(`/tournaments/${slug}/captain-match`, { replace: true });
    }, [activeMatchResolution.shouldUnpinUrl, slug, navigate]);

    const activeMatchRawId = activeMatch ? toRawMatchId(activeMatch.id) : undefined;

    const {
        messages: chatMessages,
        isLoading: isChatLoading,
        isError: isChatError,
        chatError,
        sendMessage,
        scrollRef: chatScrollRef,
        scrollToBottom: chatScrollToBottom,
        connectionStatus: chatConnectionStatus,
        isJoined: chatIsJoined,
        opponentLastReadAt,
        markRead,
    } = useMatchChat(activeMatchRawId, {
        onNewMessage: () => setChatUnread(c => c + 1),
        isChatOpen,
    });

    const lifecycleScope = useMemo(
        () => ({
            matchId: activeMatchRawId ?? urlMatchId,
            versionId: isOrganizerMatchView
                ? organizerVersionId
                : (activeMatch?.stageId ?? bracketVersions?.[0]?.id),
        }),
        [
            activeMatchRawId,
            urlMatchId,
            isOrganizerMatchView,
            organizerVersionId,
            activeMatch?.stageId,
            bracketVersions,
        ],
    );

    const { invalidateNow } = useMatchLifecycleInvalidation(lifecycleScope);

    const {
        roomState,
        isLoading: roomStateLoading,
        isError: roomStateError,
        error: roomStateFetchError,
    } = useMatchRoomState(activeMatchRawId, {
        subscribeRealtime: false,
        versionId: lifecycleScope.versionId,
    });

    const { acceptedProposal: _acceptedProposal, acceptedProposalTime } = useTimeProposal(activeMatchRawId, { subscribeRealtime: false });

    const [pendingAcceptedTime, setPendingAcceptedTime] = useState<string | null>(null);

    const organizerFocusTeamIds = useMemo(() => {
        if (!canManageMatchRoom || !activeMatch) return undefined;
        const ids = [activeMatch.team1?.id, activeMatch.team2?.id].filter(Boolean) as string[];
        return ids.length > 0 ? ids : undefined;
    }, [canManageMatchRoom, activeMatch]);

    const showMatchHistory = Boolean(userTeamId || canManageMatchRoom);

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

    // Latest completed match by bracket round (match_number resets each round).
    const lastCompletedMatch = useMemo(() => {
        if (!userTeamId || !matches.length) return null;
        return findLatestCompletedTeamMatch(matches, userTeamId);
    }, [userTeamId, matches]);

    const isDE = useMemo(
        () => isDoubleEliminationBracket(matches) || stageFormat === 'double_elimination',
        [matches, stageFormat],
    );

    const tournamentWinnerTeamId = readTournamentWinnerTeamId(tournament);

    // Check if the user is the tournament champion
    const isTournamentWinner = useMemo(() => {
        if (activeMatch) return false;
        if (!userTeamId) return false;
        if (tournamentWinnerTeamId && competitorIdsMatch(userTeamId, tournamentWinnerTeamId)) {
            return true;
        }
        if (!lastCompletedMatch) return false;
        if (!didTeamWinBracketMatch(lastCompletedMatch, userTeamId)) return false;
        if (!isEliminationStageFormat(stageFormat)) return false;
        return isChampionshipBracketMatch(lastCompletedMatch, matches);
    }, [activeMatch, lastCompletedMatch, userTeamId, matches, stageFormat, tournamentWinnerTeamId]);

    // Check if the user is the tournament runner-up
    const isTournamentRunnerUp = useMemo(() => {
        if (activeMatch) return false;
        if (!lastCompletedMatch || isTournamentWinner || !userTeamId) return false;
        if (!isEliminationStageFormat(stageFormat)) return false;
        if (!isChampionshipBracketMatch(lastCompletedMatch, matches)) return false;
        return !didTeamWinBracketMatch(lastCompletedMatch, userTeamId);
    }, [activeMatch, lastCompletedMatch, userTeamId, matches, isTournamentWinner, stageFormat]);

    // Check if the team has been eliminated from the tournament
    const isEliminated = useMemo(() => {
        if (activeMatch) return false;
        if (isTournamentWinner || isTournamentRunnerUp) return false;
        if (!lastCompletedMatch) return false;

        const userLost = !didTeamWinBracketMatch(lastCompletedMatch, userTeamId!);
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

    const selfPlayEnabled = isSelfPlaySchedulingEnabled(schedulingConfig, roomState ?? null);
    const checkInWindowMinutes = readCheckinWindowMinutes(schedulingConfig, roomState ?? null);
    const effectiveScheduledTime = roomState?.effectiveScheduledTime ?? null;
    const agreedScheduledTime = useMemo(() => {
        for (const candidate of [pendingAcceptedTime, acceptedProposalTime, effectiveScheduledTime]) {
            const normalized = normalizeScheduledTime(candidate);
            if (normalized) return normalized;
        }
        return null;
    }, [pendingAcceptedTime, acceptedProposalTime, effectiveScheduledTime]);
    const nextAction = roomState?.nextAction ?? null;

    useEffect(() => {
        if (!pendingAcceptedTime || !effectiveScheduledTime) return;
        const pendingMs = parseScheduledTimeMs(pendingAcceptedTime);
        const effectiveMs = parseScheduledTimeMs(effectiveScheduledTime);
        if (pendingMs != null && effectiveMs != null && Math.abs(pendingMs - effectiveMs) < 1000) {
            setPendingAcceptedTime(null);
        }
    }, [pendingAcceptedTime, effectiveScheduledTime]);

    const canVerifyResult = useMemo(() => {
        if (isOrganizerMatchView || !user) return false;
        if (roomState?.callerCompetitorId) return true;
        if (!userTeamId || !activeMatch) return false;
        return competitorIdsMatch(userTeamId, activeMatch.team1?.id)
            || competitorIdsMatch(userTeamId, activeMatch.team2?.id);
    }, [isOrganizerMatchView, user, roomState?.callerCompetitorId, userTeamId, activeMatch]);

    const isVetoEnabled = useMemo(() => {
        if (roomState) return roomState.mapVetoEnabled;
        if (!gameHasMapVeto(tournament?.game || '', tournament?.game_mode)) return false;
        return tournament?.settings?.mapVetoEnabled !== false;
    }, [roomState, tournament?.settings, tournament?.game, tournament?.game_mode]);

    const isTeam1Captain = roomState?.callerIsTeam1Captain ?? Boolean(
        !isOrganizerMatchView
        && isCaptain
        && userTeamId
        && activeMatch?.team1?.id
        && competitorIdsMatch(userTeamId, activeMatch.team1.id),
    );

    const isMatchLive = roomState?.isMatchLive ?? activeMatch?.status === 'in_progress';
    const displayPartyCode = activeMatch?.partyCode ?? roomState?.partyCode ?? null;
    const historyIncludeLiveMatchId =
        isMatchLive || activeMatch?.status === 'in_progress' ? activeMatch?.id : undefined;
    const mapVetoCompleted = roomState?.mapVetoCompleted ?? isVetoCompleted;

    const liveScore = useLiveScoreState();
    const { reports: activeMatchReports } = useMatchResultReport(activeMatchRawId, undefined, {
        subscribeRealtime: false,
    });
    const matchSettled = isBracketMatchSettled(activeMatch, roomState?.phase ?? null);
    const checkinForfeitResolved = Boolean(roomState?.matchOutcome);
    const showCheckinCard = Boolean(
        agreedScheduledTime
        && activeMatch.team2?.id
        && !isMatchLive
        && (
            activeMatch.status === 'pending'
            || checkinForfeitResolved
        ),
    );
    const hasDisputedReport = !matchSettled
        && (activeMatchReports?.some((r: { status: string }) => r.status === 'disputed') ?? false);
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

    // Bracket updates → debounced invalidation (structural changes)
    useBracketRealtime({
        versionId: lifecycleScope.versionId ?? null,
        enabled: Boolean(lifecycleScope.versionId),
        onMatchUpdated: () => {
            invalidateNow();
            refetchBracket();
        },
    });

    // Match lifecycle events → single MatchHub subscription + coordinated invalidation
    useMatchRoomRealtime({
        matchId: activeMatchRawId ?? lifecycleScope.matchId ?? null,
        versionId: lifecycleScope.versionId,
        enabled: Boolean(activeMatchRawId || lifecycleScope.matchId),
        onStatusChanged: () => {
            invalidateNow();
            refetchBracket();
            fetchMatchGames();
            determineMap();
        },
        onReportSubmitted: () => {
            fetchMatchGames();
        },
        onReportAccepted: () => {
            invalidateNow();
            fetchMatchGames();
        },
        onDisputeResolved: () => {
            invalidateNow();
        },
        onScheduleChanged: (payload) => {
            invalidateNow();
            refetchBracket();
            const matchNum = payload.matchNumber ?? activeMatch?.matchNumber;
            const timeLabel = payload.scheduledTime
                ? format(new Date(payload.scheduledTime), 'MMM d, yyyy h:mm a')
                : 'TBD';
            toast({
                title: 'Match rescheduled',
                description: matchNum
                    ? `Match ${matchNum} is now scheduled for ${timeLabel}.`
                    : `Your match is now scheduled for ${timeLabel}.`,
            });
        },
        onTimeProposalUpdated: () => {
            invalidateNow();
            refetchBracket();
            if (activeMatchRawId) {
                void queryClient.refetchQueries({ queryKey: matchTimeProposalsQueryKey(activeMatchRawId) });
                void queryClient.refetchQueries({ queryKey: matchRoomStateQueryKey(activeMatchRawId) });
            }
        },
        onGoingLive: liveScore.handleGoingLive,
        onScoreUpdated: liveScore.handleScoreUpdated,
        onMapResult: liveScore.handleMapResult,
    });

    // Veto state updates → only update veto-specific state, no bracket refetch needed
    // B1 fix: disable when MapVeto dialog is open (it has its own SignalR connection)
    useVetoRealtime({
        matchId: activeMatchRawId ?? null,
        enabled: !!activeMatchRawId && !mapVetoOpen,
        onStateUpdate: () => {
            determineMap();
            invalidateNow();
        },
        onComplete: () => {
            determineMap();
            invalidateNow();
        },
        onReset: () => {
            determineMap();
            invalidateNow();
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
        // Use room-state live flag — bracket cache may lag behind go-live
        if (!isMatchLive && match.status !== 'in_progress') {
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

    if (!canManageMatchRoom && participantStatus === 'pending') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-4">
                <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Pending Approval</h1>
                <p className="text-gray-400 max-w-md text-center mb-6">
                    Your registration is awaiting organizer approval. You will be able to access the match room once your entry has been confirmed.
                </p>
                <Button onClick={() => navigate(`/tournaments/${tournament.slug || tournament.id}`)}>
                    Back to Tournament
                </Button>
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


    const assistedMatchReportAction = activeMatch
        ? (() => {
            const assistedEnabled = isAssistedMatchReportingEnabled(
                tournament?.game || '',
                tournament?.game_mode,
                tournament?.settings as { assistedReportingEnabled?: boolean },
            );
            if (!assistedEnabled) return null;

            const bestOf = activeMatch.bestOf || 1;
            const winsNeeded = bestOf === 1 ? 1 : Math.ceil(bestOf / 2);
            const isMatchDecided = (activeMatch.team1_score || 0) >= winsNeeded || (activeMatch.team2_score || 0) >= winsNeeded;
            const vetoReady = !isVetoEnabled || mapVetoCompleted;

            if (activeMatch.status === 'completed' || isMatchDecided || nextGameNumber > bestOf || !vetoReady) {
                return null;
            }

            if (disputedGameNumbers.has(nextGameNumber)) {
                return (
                    <div className="flex items-center gap-2 border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
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
                    scheduledTime={(selfPlayEnabled ? effectiveScheduledTime : activeMatch.scheduledTime) ?? undefined}
                    userTeamId={isOrganizerMatchView ? undefined : userTeamId}
                    team1Id={activeMatch.team1?.id}
                    team2Id={activeMatch.team2?.id}
                    team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                    team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                    team1Logo={activeMatch.team1?.logo_url ?? undefined}
                    team2Logo={activeMatch.team2?.logo_url ?? undefined}
                    isCaptain={!isOrganizerMatchView && isCaptain}
                    className="!w-auto h-9 rounded-none px-4 text-[10px]"
                    onSuccess={() => {
                        toast({ title: "Game Reported", description: "Result verified and saved." });
                        refetchBracket();
                        fetchMatchGames();
                    }}
                />
            );
        })()
        : null;

    const manualReportLabel = disputedGameNumbers.has(nextGameNumber) ? `Game ${nextGameNumber} disputed`
        : (isVetoEnabled && !mapVetoCompleted) ? 'Awaiting veto'
        : 'Upload result';

    return (
        <PremiumBackground animated intensity={0.14} className="text-white font-body overflow-x-hidden">
            <MatchRoomHero
                tournamentGame={tournament.game}
                slug={slug || ''}
                isOrganizerView={isOrganizerMatchView}
                activeMatch={activeMatch}
                roundLabel={activeMatch ? getRoundName(activeMatch.round, activeMatch.bracketSide) : undefined}
                isLive={isMatchLive}
                matchSettled={matchSettled}
                nextGameNumber={nextGameNumber}
                nextMapName={nextGameMap?.name}
                partyCode={displayPartyCode}
                onNavigateBack={() => navigate(`/tournaments/${slug}`)}
                onCopyPartyCode={displayPartyCode ? () => {
                    navigator.clipboard.writeText(displayPartyCode);
                    toast({ title: 'Copied', description: 'Party code copied' });
                } : undefined}
            />

            {activeMatch ? (
                <>
                    <section className="border-b border-white/10 bg-[#08080a]">
                        <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 md:px-10 lg:grid-cols-[minmax(0,1fr)_360px]">
                            <div className="space-y-5">
                                <div className="w-full space-y-4">
                                    {roomStateError && (
                                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-200">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            <span>
                                                {roomStateFetchError instanceof Error
                                                    ? roomStateFetchError.message
                                                    : 'Unable to load match room state. Deploy the latest backend or refresh the page.'}
                                            </span>
                                        </div>
                                    )}

                                    {roomStateLoading && !roomState && !roomStateError && (
                                        <div className="text-center text-xs text-zinc-500 py-2">Loading match room state…</div>
                                    )}

                                    {/* Waiting for opponent */}
                                    {(!activeMatch.team2?.id) && activeMatch.status === 'pending' && (
                                        <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 text-center">
                                            <p className="text-zinc-400 text-sm">⏳ Waiting for your opponent to be determined</p>
                                            <p className="text-zinc-500 text-xs mt-1">Your next match will begin once the other bracket matches are completed.</p>
                                        </div>
                                    )}

                                    {/* Time Proposal Card — step 1 in self-play */}
                                    {selfPlayEnabled
                                        && !agreedScheduledTime
                                        && activeMatch.status === 'pending'
                                        && activeMatch.team2?.id && (
                                        (() => {
                                            const roundIndex = activeMatch.round - 1;
                                            const bracketType = activeMatch.bracketType ?? activeMatch.bracketSide ?? null;
                                            const deadlineKey = stageFormat === 'double_elimination' && bracketType
                                                ? `${bracketType}_${roundIndex}`
                                                : String(roundIndex);
                                            const deadlines = {
                                                ...((schedulingConfig as any)?.roundDeadlines ?? {}),
                                                ...((schedulingConfig as any)?.round_deadlines ?? {}),
                                            };
                                            const configDeadline = deadlines[deadlineKey] ?? deadlines[String(roundIndex)] ?? null;
                                            const defaultDeadline = getDefaultDeadline(roundIndex);
                                            const effectiveDeadline = configDeadline || defaultDeadline || null;
                                            return (
                                                <TimeProposalCard
                                                    matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                    roundDeadline={effectiveDeadline}
                                                    team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                                                    team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                                                    userTeamId={isOrganizerMatchView ? undefined : userTeamId}
                                                    team1Id={activeMatch.team1?.id}
                                                    isCaptain={!isOrganizerMatchView && isCaptain}
                                                    suggestedStartTime={null}
                                                    onTimeAccepted={(acceptedTime) => {
                                                        setPendingAcceptedTime(normalizeScheduledTime(acceptedTime));
                                                        refetchBracket();
                                                        toast({ title: 'Match Scheduled!', description: 'Now proceed to check-in.' });
                                                    }}
                                                    subscribeRealtime={false}
                                                />
                                            );
                                        })()
                                    )}

                                    {/* Check-in + party code — steps 2–3 in self-play */}
                                    {showCheckinCard && (
                                        <MatchCheckinCard
                                            matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                            team1Id={activeMatch.team1?.id}
                                            team2Id={activeMatch.team2?.id}
                                            team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                                            team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                                            userTeamId={isOrganizerMatchView ? undefined : userTeamId}
                                            scheduledTime={agreedScheduledTime}
                                            isCaptain={!isOrganizerMatchView && isCaptain}
                                            selfPlayEnabled={selfPlayEnabled}
                                            checkInWindowMinutes={checkInWindowMinutes}
                                            checkinWindowOpen={roomState?.checkinWindowOpen}
                                            checkinWindowClosed={roomState?.checkinWindowClosed}
                                            matchOutcome={roomState?.matchOutcome ?? null}
                                            forfeitReason={roomState?.forfeitReason ?? null}
                                            hidePartyCodeInput={nextAction === 'submit_party_code'}
                                            initialPartyCode={displayPartyCode}
                                            onPartyCodeGenerated={() => {
                                                invalidateNow();
                                                refetchBracket();
                                            }}
                                            subscribeRealtime={false}
                                        />
                                    )}

                                    {/* Actions — progressively unlocked */}
                                    <div className="space-y-2">
                                        {matchSettled && (
                                            <div
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs ${
                                                    roomState?.matchOutcome === 'double_forfeit'
                                                        ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                                }`}
                                            >
                                                <Trophy className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                    {roomState?.message
                                                        ?? (activeMatch.winner?.name
                                                            ? `Match complete — ${activeMatch.winner.name} wins`
                                                            : 'Match complete')}.
                                                </span>
                                            </div>
                                        )}

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

                                        {nextAction === 'submit_party_code'
                                            && isTeam1Captain
                                            && !isMatchLive
                                            && !displayPartyCode && (
                                            <PartyCodeGoLiveCard
                                                matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                versionId={lifecycleScope.versionId}
                                                onSuccess={() => {
                                                    refetchBracket();
                                                    invalidateNow();
                                                }}
                                            />
                                        )}

                                        {isVetoEnabled && isMatchLive && !mapVetoCompleted && activeMatch.status !== 'completed' && (
                                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-xs text-indigo-300">
                                                <Swords className="w-3.5 h-3.5 shrink-0" />
                                                <span>Complete Map Veto to unlock result reporting</span>
                                            </div>
                                        )}

                                        {/* CS2 Live Score — show after veto completes */}
                                        {activeMatchRawId && isMatchLive && mapVetoCompleted &&
                                         (tournament?.game?.toLowerCase() === 'counter-strike 2' || tournament?.game?.toLowerCase() === 'cs2') && (
                                            <LiveScoreCardView
                                                liveScore={liveScore}
                                                team1Name={activeMatch.team1?.name}
                                                team2Name={activeMatch.team2?.name}
                                                bestOf={activeMatch.bestOf || 1}
                                            />
                                        )}

                                        {/* CS2 Server Connection — show after veto completes */}
                                        {activeMatchRawId && isMatchLive && mapVetoCompleted &&
                                         (tournament?.game?.toLowerCase() === 'counter-strike 2' || tournament?.game?.toLowerCase() === 'cs2') && (
                                            <ServerConnectionCard matchId={activeMatchRawId} />
                                        )}

                                        {/* Result verification — all live matches (manual + auto reports) */}
                                        {isMatchLive && activeMatch.status !== 'completed' && !disputedGameNumbers.has(nextGameNumber) && (
                                            <MatchResultVerification
                                                matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                gameNumber={nextGameNumber}
                                                userTeamId={isOrganizerMatchView
                                                    ? undefined
                                                    : (userTeamId ?? roomState?.callerCompetitorId ?? undefined)}
                                                team1Id={activeMatch.team1?.id}
                                                team2Id={activeMatch.team2?.id}
                                                team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                                                team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                                                team1Logo={activeMatch.team1?.logo_url ?? undefined}
                                                team2Logo={activeMatch.team2?.logo_url ?? undefined}
                                                isCaptain={!isOrganizerMatchView && isCaptain}
                                                canVerify={canVerifyResult}
                                                subscribeRealtime={false}
                                                onSuccess={() => {
                                                    refetchBracket();
                                                    fetchMatchGames();
                                                }}
                                            />
                                        )}

                                    </div>
                                </div>
                            </div>

                            <aside className="lg:sticky lg:top-8 lg:self-start">
                                <MatchRoomActionList
                                    vetoEnabled={isVetoEnabled}
                                    canOpenVeto={isMatchLive && activeMatch.status !== 'completed'}
                                    manualReportDisabled={(isVetoEnabled && !mapVetoCompleted) || disputedGameNumbers.has(nextGameNumber)}
                                    manualReportLabel={manualReportLabel}
                                    hideManualReport={isOrganizerMatchView}
                                    assistedAction={assistedMatchReportAction}
                                    onOpenVeto={() => handleOpenVeto(activeMatch)}
                                    onManualReport={() => handleUploadResult(activeMatch.id)}
                                />
                            </aside>
                        </div>
                    </section>
                </>
            ) : (
                <section className="border-b border-white/10 bg-[#08080a]">
                    <div className="mx-auto max-w-[1180px] px-4 py-16 md:px-10">
                        <TournamentEndScreen
                            state={
                                isTournamentWinner ? 'winner'
                                : isTournamentRunnerUp ? 'runner_up'
                                : isEliminated ? 'eliminated'
                                : lastCompletedMatch ? 'waiting'
                                : 'no_match'
                            }
                            exitRoundName={lastCompletedMatch
                                ? formatTeamMatchHistoryLabel(lastCompletedMatch, matches)
                                : undefined}
                            tournamentStatus={tournament?.status}
                            slug={slug}
                            onNavigate={navigate}
                        />
                    </div>
                </section>
            )}

            {showMatchHistory && (
                <section className="bg-[#070708]">
                    <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-10">
                    <CaptainMatchHistory
                        tournamentId={tournament.id}
                        teamId={userTeamId}
                        matches={matches}
                        isOrganizer={Boolean(canManageMatchRoom && isOrganizerMatchView)}
                        focusTeamIds={canManageMatchRoom && isOrganizerMatchView ? organizerFocusTeamIds : undefined}
                        includeLiveMatchId={historyIncludeLiveMatchId}
                    />
                    </div>
                </section>
            )}

            {activeMatch ? (
                <FloatingMatchChat
                    unreadCount={chatUnread}
                    onOpen={() => {
                        setIsChatOpen(true);
                        setChatUnread(0);
                        markRead();
                    }}
                    onClose={() => setIsChatOpen(false)}
                >
                    <MatchChat
                        messages={chatMessages}
                        sendMessage={sendMessage}
                        scrollRef={chatScrollRef}
                        scrollToBottom={chatScrollToBottom}
                        isLoading={isChatLoading}
                        connectionStatus={chatConnectionStatus}
                        isJoined={chatIsJoined}
                        chatError={chatError}
                        isError={isChatError}
                        opponentLastReadAt={opponentLastReadAt}
                        userTeamId={isOrganizerMatchView ? undefined : userTeamId}
                        team1Id={activeMatch.team1?.id}
                        team1Name={activeMatch.team1?.name || `${terminology.competitorLabel} 1`}
                        team2Name={activeMatch.team2?.name || `${terminology.competitorLabel} 2`}
                        allowMinimize={false}
                    />
                </FloatingMatchChat>
            ) : null}

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


        </PremiumBackground>
    );
};

export default CaptainMatchPage;
