import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
import type { PublicVetoGameFilter, PublicVetoSessionsResponse } from '@/types/publicVetoSessions';

const count = z.number().int().nonnegative();
const pageSchema = z.number().int().positive().max(42_949_673);
const gameSchema = z.enum(['all', 'valorant', 'cs2', 'r6s']);
const responseSchema = z.object({
  sessions: z.array(z.object({
    id: z.string(), game: z.string(), bestOf: z.number().int(), team1Name: z.string().nullable(), team2Name: z.string().nullable(),
    status: z.string(), createdAt: z.string().nullable(), expiresAt: z.string().nullable(), completedAt: z.string().nullable(), overlayAccessedAt: z.string().nullable(),
  })).max(50),
  page: pageSchema, pageSize: z.literal(50), total: count,
  summary: z.object({ totalSessions: count, completedSessions: count, overlaySessions: count }),
});

export const parseVetoSessionsResponse = (raw: unknown): PublicVetoSessionsResponse => responseSchema.parse(raw);
export function buildVetoSessionsPath(page: number, game: string) {
  pageSchema.parse(page);
  gameSchema.parse(game);
  return `/api/admin/public-tools/veto-sessions?page=${page}${game === 'all' ? '' : `&game=${game}`}`;
}

export function useAdminPublicVetoSessions(enabled: boolean) {
  const [filter, setFilter] = useState<{ page: number; game: PublicVetoGameFilter }>({ page: 1, game: 'all' });
  const query = useQuery({
    queryKey: ['admin-public-veto-sessions', filter.game, filter.page], enabled,
    queryFn: async () => parseVetoSessionsResponse(await apiClient.get<unknown>(buildVetoSessionsPath(filter.page, filter.game))),
    retry: false,
  });
  const setGame = (game: PublicVetoGameFilter) => { gameSchema.parse(game); setFilter({ game, page: 1 }); };
  const setPage = (page: number) => { pageSchema.parse(page); setFilter((current) => ({ ...current, page })); };
  return { ...filter, setGame, setPage, query };
}
