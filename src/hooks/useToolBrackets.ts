import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import {
    normalizeToolBracketPayload,
    normalizeToolBracketResponse,
    type PublicBracketResponse,
} from '@/pages/tools/publicToolUtils';

/** A saved bracket as the list endpoint returns it (camel or snake case). */
export type ToolBracketRow = {
    id: string;
    title: string;
    format: string;
    bestOf: number;
    shared: boolean;
    updatedAt?: string;
};

type RawRow = Record<string, unknown>;

const field = (row: RawRow, ...keys: string[]) => {
    for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
    return undefined;
};

export const toToolBracketRow = (row: RawRow): ToolBracketRow => ({
    id: String(field(row, 'id') ?? ''),
    title: String(field(row, 'title') ?? '') || 'Untitled bracket',
    format: String(field(row, 'format') ?? ''),
    bestOf: Number(field(row, 'bestOf', 'best_of') ?? 1) || 1,
    shared: Boolean(field(row, 'shareToken', 'share_token')),
    updatedAt: field(row, 'updatedAt', 'updated_at', 'createdAt', 'created_at') as string | undefined,
});

export const TOOL_BRACKETS_MINE_KEY = ['tool-brackets', 'mine'] as const;

/** The signed-in user's saved brackets. */
export function useToolBracketList(enabled: boolean) {
    return useQuery({
        queryKey: TOOL_BRACKETS_MINE_KEY,
        queryFn: async () => (await apiClient.get<RawRow[]>('/api/tools/brackets/mine')).map(toToolBracketRow),
        enabled,
        staleTime: 0,
        refetchOnMount: 'always',
        retry: 1,
    });
}

/** One bracket, by id for its owner or by share token for everyone else. */
export function useToolBracket(mode: 'owner' | 'share', key?: string) {
    const queryKey: QueryKey = mode === 'owner' ? ['tool-bracket', key] : ['tool-bracket-share', key];
    const query = useQuery({
        queryKey,
        queryFn: async () => normalizeToolBracketResponse(
            await apiClient.get<RawRow>(mode === 'owner' ? `/api/tools/brackets/${key}` : `/api/tools/brackets/share/${key}`),
        ),
        enabled: Boolean(key),
    });
    return { ...query, queryKey };
}

const rawId = (id: string) => id.replace(/^(db-|wb-|lb-|source-)/, '');

/**
 * What the owner can do to a bracket. Each call updates the cached bracket with
 * the server's answer, so the tree redraws without a refetch.
 */
export function useToolBracketActions(bracket: PublicBracketResponse | undefined, queryKey: QueryKey) {
    const queryClient = useQueryClient();
    const replacePayload = (payload: RawRow) => {
        if (!bracket) return;
        queryClient.setQueryData<PublicBracketResponse>(queryKey, { ...bracket, payload: normalizeToolBracketPayload(payload) });
    };

    return {
        reportResult: async (matchId: string, result: { team1Score: number; team2Score: number; winnerId: string }) => {
            if (!bracket) return;
            replacePayload(await apiClient.patch<RawRow>(`/api/tools/brackets/${bracket.id}/matches/${rawId(matchId)}`, result));
        },
        reset: async () => {
            if (!bracket) return;
            replacePayload(await apiClient.post<RawRow>(`/api/tools/brackets/${bracket.id}/reset`, {}));
        },
        toggleSharing: async () => {
            if (!bracket) return null;
            const next = normalizeToolBracketResponse(
                await apiClient.patch<RawRow>(`/api/tools/brackets/${bracket.id}/sharing`, { enabled: bracket.visibility !== 'unlisted' }),
            );
            queryClient.setQueryData(queryKey, next);
            void queryClient.invalidateQueries({ queryKey: TOOL_BRACKETS_MINE_KEY });
            return next;
        },
        remove: async (id = bracket?.id) => {
            if (!id) return;
            await apiClient.delete(`/api/tools/brackets/${id}`);
            await queryClient.invalidateQueries({ queryKey: TOOL_BRACKETS_MINE_KEY });
        },
    };
}
