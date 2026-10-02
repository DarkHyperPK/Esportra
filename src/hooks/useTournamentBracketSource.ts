import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useBracketRealtime } from '@/hooks/useBracketRealtime';

export type BracketPageTournament = {
    id: string;
    name: string;
    slug?: string | null;
    game?: string | null;
    status?: string | null;
    organization?: { owner_id?: string | null } | null;
};

export type BracketStageSummary = {
    id: string;
    name: string;
    format?: string | null;
    advancement_count?: number | string | null;
    stage_order?: number | null;
};

type TournamentResponse = {
    tournament?: BracketPageTournament | null;
    stages?: BracketStageSummary[] | null;
    isOrganizer?: boolean;
};

type BracketVersionRow = { id: string; stage_id?: string | null };

/**
 * Everything a public bracket page needs before it can draw a bracket: the
 * tournament, its stages, which published bracket belongs to each stage, and
 * the stage on screen. Spectators only ever see active (published) brackets;
 * the organizer also sees drafts. The server enforces this; the filter only
 * asks for what this viewer may see.
 */
export function useTournamentBracketSource(slug?: string) {
    const { user, loading: authLoading } = useAuth();
    const [chosenStageId, setChosenStageId] = useState<string | null>(null);

    const tournamentQuery = useQuery({
        queryKey: ['tournament', 'brackets', slug],
        queryFn: () => apiClient.get<TournamentResponse>(`/api/tournaments/${slug}`),
        enabled: Boolean(slug) && !authLoading,
        staleTime: 1000 * 60 * 5,
    });

    const tournament = tournamentQuery.data?.tournament ?? null;
    const stages = useMemo(() => tournamentQuery.data?.stages ?? [], [tournamentQuery.data?.stages]);
    const isOrganizer = Boolean(tournamentQuery.data?.isOrganizer || (user?.id && tournament?.organization?.owner_id === user.id));
    const statusFilter = isOrganizer ? 'active,draft' : 'active';

    const versionsQuery = useQuery({
        queryKey: ['bracket-versions', tournament?.id, statusFilter],
        queryFn: () => apiClient.get<BracketVersionRow[]>(`/api/tournaments/${tournament?.id}/bracket-versions?status=${statusFilter}`),
        enabled: Boolean(tournament?.id),
    });

    const versionsMap = useMemo(() => {
        const map: Record<string, string> = {};
        (versionsQuery.data ?? []).forEach((version) => {
            if (version.stage_id && !map[version.stage_id]) map[version.stage_id] = version.id;
        });
        return map;
    }, [versionsQuery.data]);

    // Open on the first stage that has a bracket, once we know which ones do.
    const versionsReady = !versionsQuery.isLoading;
    useEffect(() => {
        if (chosenStageId || stages.length === 0 || !versionsReady) return;
        setChosenStageId((stages.find((stage) => versionsMap[stage.id]) ?? stages[0]).id);
    }, [chosenStageId, stages, versionsMap, versionsReady]);

    const activeVersionId = chosenStageId ? versionsMap[chosenStageId] ?? null : null;

    useBracketRealtime({ tournamentId: tournament?.id, versionId: activeVersionId ?? undefined });

    return {
        tournament,
        stages,
        versionsMap,
        selectedStageId: chosenStageId,
        selectStage: setChosenStageId,
        activeVersionId,
        isOrganizer,
        loading: tournamentQuery.isLoading || authLoading,
        versionsLoading: versionsQuery.isLoading,
        error: tournamentQuery.error,
    };
}
