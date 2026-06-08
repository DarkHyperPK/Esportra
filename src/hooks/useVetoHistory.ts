import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export type VetoHistoryAction = 'ban' | 'pick' | 'pick_side' | 'auto_decider';

export interface VetoHistoryEntry {
    actionNumber: number;
    teamSide: 'team1' | 'team2';
    teamId: string | null;
    teamName: string;
    action: VetoHistoryAction;
    mapId: string;
    mapName: string;
    mapImageUrl?: string | null;
    side?: 'attack' | 'defend' | null;
    createdAt: string;
}

export function normalizeHistoryEntry(raw: Record<string, unknown>): VetoHistoryEntry {
    const teamSideRaw = String(raw.teamSide ?? raw.team_side ?? 'team1').toLowerCase();
    const teamSide: 'team1' | 'team2' = teamSideRaw === 'team2' ? 'team2' : 'team1';

    return {
        actionNumber: Number(raw.actionNumber ?? raw.action_number ?? 0),
        teamSide,
        teamId: (raw.teamId ?? raw.team_id ?? null) as string | null,
        teamName: String(raw.teamName ?? raw.team_name ?? (teamSide === 'team1' ? 'Team 1' : 'Team 2')),
        action: String(raw.action ?? raw.actionType ?? raw.action_type ?? 'ban') as VetoHistoryAction,
        mapId: String(raw.mapId ?? raw.map_id ?? ''),
        mapName: String(raw.mapName ?? raw.map_name ?? 'Unknown Map'),
        mapImageUrl: (raw.mapImageUrl ?? raw.map_image_url ?? null) as string | null | undefined,
        side: (raw.side ?? null) as 'attack' | 'defend' | null | undefined,
        createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    };
}

export function useVetoHistory(matchId?: string | null, enabled = true, vetoToken?: string | null) {
    return useQuery({
        queryKey: ['veto-history', matchId, vetoToken],
        queryFn: async (): Promise<VetoHistoryEntry[]> => {
            if (!matchId) return [];
            const cleanedId = matchId.replace(/^(db-|wb-|lb-)/, '');
            const data = await apiClient.get<unknown>(
                vetoToken ? `/api/veto/token/${vetoToken}/history` : `/api/veto/${cleanedId}/history`
            );
            const rows = Array.isArray(data)
                ? data
                : Array.isArray((data as { actions?: unknown[] })?.actions)
                    ? (data as { actions: unknown[] }).actions
                    : [];
            return rows
                .map((row) => normalizeHistoryEntry(row as Record<string, unknown>))
                .sort((a, b) => a.actionNumber - b.actionNumber);
        },
        enabled: Boolean(matchId) && enabled,
        staleTime: 0,
        refetchInterval: false,
    });
}
