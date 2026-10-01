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

function pickHistoryField(raw: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
        const value = raw[key];
        if (value !== undefined && value !== null) return value;
    }
    return undefined;
}

/** Case-insensitive; keeps unknown actions visible instead of silently calling them bans. */
function normalizeHistoryAction(raw: unknown): VetoHistoryAction {
    const key = String(raw ?? '').trim().toLowerCase().replace(/[\s-]/g, '_');
    if (key === 'pickside' || key === 'side') return 'pick_side';
    return (key || 'ban') as VetoHistoryAction;
}

function normalizeHistorySide(raw: unknown): 'attack' | 'defend' | null {
    const key = String(raw ?? '').trim().toLowerCase();
    if (key === 'attack' || key === 'atk' || key === 'attacker') return 'attack';
    if (key === 'defend' || key === 'def' || key === 'defense' || key === 'defence' || key === 'defender') return 'defend';
    return null;
}

export function normalizeHistoryEntry(raw: Record<string, unknown>): VetoHistoryEntry {
    const teamSideRaw = String(pickHistoryField(raw, 'teamSide', 'team_side', 'teamside') ?? 'team1').toLowerCase();
    const teamSide: 'team1' | 'team2' = teamSideRaw === 'team2' ? 'team2' : 'team1';

    return {
        actionNumber: Number(pickHistoryField(raw, 'actionNumber', 'action_number', 'actionnumber') ?? 0),
        teamSide,
        teamId: (pickHistoryField(raw, 'teamId', 'team_id', 'teamid') ?? null) as string | null,
        teamName: String(pickHistoryField(raw, 'teamName', 'team_name', 'teamname') ?? (teamSide === 'team1' ? 'Team 1' : 'Team 2')),
        action: normalizeHistoryAction(pickHistoryField(raw, 'action', 'actionType', 'action_type', 'actiontype')),
        mapId: String(pickHistoryField(raw, 'mapId', 'map_id', 'mapid') ?? ''),
        mapName: String(pickHistoryField(raw, 'mapName', 'map_name', 'mapname') ?? 'Unknown Map'),
        mapImageUrl: (pickHistoryField(raw, 'mapImageUrl', 'map_image_url', 'mapimageurl') ?? null) as string | null | undefined,
        side: normalizeHistorySide(pickHistoryField(raw, 'side')),
        createdAt: String(pickHistoryField(raw, 'createdAt', 'created_at', 'createdat') ?? new Date().toISOString()),
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
