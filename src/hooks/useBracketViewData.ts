import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useGraphBracket } from '@/hooks/useGraphBracket';
import { adaptGraphToBracketMatches, extractTeamIds } from '@/services/bracket/BracketAdapter';
import type { BracketMatch } from '@/types/bracketTypes';
import type { RawMatchGame } from '@/services/matchStats/publicGameStats';

type ProofRow = { match_id: string; image_url?: string | null };
type ReportRow = { match_id: string; screenshot_urls?: string[] | null; screenshotUrls?: string[] | null };
type GameRow = RawMatchGame & { match_id: string };
type TeamRow = { id: string; name: string; logo_url?: string | null };

/** Screenshots players attached to each match, from manual proofs and result reports. */
async function fetchProofs(tournamentId: string) {
    const map: Record<string, string[]> = {};
    const add = (id: string, url?: string | null) => {
        if (!url) return;
        map[id] = [...(map[id] ?? []), url];
    };
    const [proofs, reports] = await Promise.all([
        apiClient.get<ProofRow[]>(`/api/tournaments/${tournamentId}/match-proofs`).catch(() => [] as ProofRow[]),
        apiClient.get<ReportRow[]>(`/api/tournaments/${tournamentId}/result-reports`).catch(() => [] as ReportRow[]),
    ]);
    proofs?.forEach((row) => add(row.match_id, row.image_url));
    reports?.forEach((row) => (row.screenshot_urls ?? row.screenshotUrls ?? []).forEach((url) => add(row.match_id, url)));
    return map;
}

/** Per-match game results reported automatically (stats, scoreboards). */
async function fetchGames(tournamentId: string) {
    const rows = await apiClient.get<GameRow[]>(`/api/tournaments/${tournamentId}/match-games`);
    const map: Record<string, RawMatchGame[]> = {};
    rows?.forEach((row) => {
        map[row.match_id] = [...(map[row.match_id] ?? []), row];
    });
    return map;
}

/**
 * One published bracket, ready to draw: its matches (teams resolved in one
 * batch call), plus the screenshots and game stats attached to each match.
 * The three requests run in parallel.
 */
export function useBracketViewData(versionId: string | null, tournamentId: string) {
    const graphQuery = useGraphBracket(versionId ?? '');
    const graph = graphQuery.data;

    const proofsQuery = useQuery({
        queryKey: ['match-proofs', tournamentId],
        queryFn: () => fetchProofs(tournamentId),
        enabled: Boolean(tournamentId),
        staleTime: 1000 * 60,
    });

    const gamesQuery = useQuery({
        queryKey: ['bracket-match-games', tournamentId],
        queryFn: () => fetchGames(tournamentId),
        enabled: Boolean(tournamentId),
        staleTime: 1000 * 60,
    });

    const teamIds = useMemo(() => extractTeamIds(graph?.nodes ?? []), [graph?.nodes]);
    const teamsQuery = useQuery({
        queryKey: ['teams', teamIds],
        queryFn: () => apiClient.post<TeamRow[]>('/api/teams/batch', { ids: teamIds }),
        enabled: teamIds.length > 0,
    });

    const matches = useMemo<BracketMatch[]>(() => {
        const cached = graph?.version?.cached_ui_state as BracketMatch[] | undefined;
        if (cached) return cached;
        if (!graph?.nodes || !graph?.edges) return [];
        const teams = new Map((teamsQuery.data ?? []).map((team) => [team.id, team]));
        return adaptGraphToBracketMatches(graph.nodes, graph.edges, teams);
    }, [graph, teamsQuery.data]);

    return {
        matches,
        loading: Boolean(versionId) && graphQuery.isLoading,
        error: graphQuery.error,
        proofs: proofsQuery.data ?? {},
        games: gamesQuery.data ?? {},
    };
}
