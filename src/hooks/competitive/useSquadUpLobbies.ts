/**
 * useSquadUpLobbies.ts
 *
 * Lobby mode: browse compatible open lobbies, ask for a slot, or host one and accept players.
 * Views refresh on their own every few seconds, and instantly when the server pushes SquadUpLobbyUpdated.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { competitiveApiClient as api } from '@/hooks/competitive/competitiveApiClient';
import { squadUpKeys } from './queryKeys';
import { createLobbySchema, lobbySchema, myLobbiesSchema, type CreateLobbyInput } from '@/schemas/squadUpLobby';
import type { SquadUpFilters } from '@/schemas/squadUp';

const BASE = '/api/competitive/lfg/swipe/lobbies';
const LOBBIES = ['squad-up', 'lobbies'] as const;

export function lobbyBoardQuery(filters: SquadUpFilters): string {
  const params = new URLSearchParams({ mode: filters.mode, area: filters.areas[0] });
  if (filters.minTier != null) params.set('min_tier', String(filters.minTier));
  if (filters.maxTier != null) params.set('max_tier', String(filters.maxTier));
  return params.toString();
}

export function useLobbyBoard(filters: SquadUpFilters | null, enabled: boolean) {
  const query = filters ? lobbyBoardQuery(filters) : '';
  return useQuery({
    queryKey: squadUpKeys.lobbyBoard(query),
    enabled: enabled && !!filters,
    queryFn: async () => z.array(lobbySchema).parse(await api.get<unknown>(`${BASE}?${query}`)),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useMyLobbies(enabled: boolean) {
  return useQuery({
    queryKey: squadUpKeys.lobbyMine(),
    enabled,
    queryFn: async () => myLobbiesSchema.parse(await api.get<unknown>(`${BASE}/mine`)),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}

/** Every lobby action refreshes the board and "mine" together. */
function useLobbyAction<TVars>(run: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => { void qc.invalidateQueries({ queryKey: LOBBIES }); },
  });
}

export function useCreateLobby() {
  return useLobbyAction(async ({ input, filters }: { input: CreateLobbyInput; filters: SquadUpFilters }) => {
    const body = createLobbySchema.parse(input);
    return lobbySchema.parse(await api.post<unknown>(BASE, { ...body, game: filters.game, mode: filters.mode, area: filters.areas[0], minTier: filters.minTier, maxTier: filters.maxTier }));
  });
}

export const useRequestLobbySlot = () =>
  useLobbyAction(({ lobbyId, roleKey, area }: { lobbyId: string; roleKey?: string | null; area?: string | null }) =>
    api.post(`${BASE}/${lobbyId}/requests`, { roleKey: roleKey ?? null, area: area ?? null }));
export const useAcceptLobbyRequest = () =>
  useLobbyAction(({ lobbyId, userId }: { lobbyId: string; userId: string }) => api.post(`${BASE}/${lobbyId}/requests/${userId}/accept`));
export const useDeclineLobbyRequest = () =>
  useLobbyAction(({ lobbyId, userId }: { lobbyId: string; userId: string }) => api.post(`${BASE}/${lobbyId}/requests/${userId}/decline`));
export const useLeaveLobby = () => useLobbyAction((lobbyId: string) => api.post(`${BASE}/${lobbyId}/leave`));
export const useKickFromLobby = () =>
  useLobbyAction(({ lobbyId, userId }: { lobbyId: string; userId: string }) => api.post(`${BASE}/${lobbyId}/kick/${userId}`));
export const useCloseLobby = () => useLobbyAction((lobbyId: string) => api.post(`${BASE}/${lobbyId}/close`));
