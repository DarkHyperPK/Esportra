/**
 * useSquadUp.ts
 *
 * Squad Up (live swipe matching). The backend has no "get session" route, so presence is a
 * heartbeat probe: 200 = in the squadUp, 404 = not in the squadUp (never started, ended, or timed out).
 * The heartbeat doubles as keep-alive and carries the pending-likes count.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { competitiveApiClient as api } from '@/hooks/competitive/competitiveApiClient';
import { ApiError } from '@/lib/apiClient';
import { squadUpKeys } from './queryKeys';
import {
  heartbeatSchema, squadUpCardSchema, squadUpMatchSchema, squadUpSessionSchema, squadUpStatsSchema,
  startSquadUpSchema, swipeResultSchema,
  type SquadUpCard, type SquadUpSession, type SquadUpStats, type StartSquadUpInput, type SwipeResult,
} from '@/schemas/squadUp';

const BASE = '/api/competitive/lfg/swipe';
export const HEARTBEAT_MS = 60_000;

export interface SquadUpPresence { active: boolean; pendingLikes: number }

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

/** Heartbeat probe. Polls only while the tab is focused, so an abandoned tab drops out of the pool. */
export function useSquadUpPresence(enabled: boolean) {
  return useQuery({
    queryKey: squadUpKeys.presence(),
    enabled,
    queryFn: async (): Promise<SquadUpPresence> => {
      try {
        const data = heartbeatSchema.parse(await api.post<unknown>(`${BASE}/session/heartbeat`));
        return { active: true, pendingLikes: data.pendingLikes };
      } catch (error) {
        if (isNotFound(error)) return { active: false, pendingLikes: 0 };
        throw error;
      }
    },
    refetchInterval: (query) => (query.state.data?.active ? HEARTBEAT_MS : false),
    staleTime: 0,
    retry: 1,
  });
}

export function useStartSquadUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StartSquadUpInput): Promise<SquadUpSession> => {
      const body = startSquadUpSchema.parse(input);
      return squadUpSessionSchema.parse(await api.post<unknown>(`${BASE}/session`, body));
    },
    onSuccess: () => {
      qc.setQueryData<SquadUpPresence>(squadUpKeys.presence(), { active: true, pendingLikes: 0 });
      void qc.invalidateQueries({ queryKey: squadUpKeys.cards() });
    },
  });
}

/** Reads the summary first (DELETE answers with no body through the shared client), then leaves. */
export function useEndSquadUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<SquadUpStats | null> => {
      let stats: SquadUpStats | null = null;
      try { stats = squadUpStatsSchema.parse(await api.get<unknown>(`${BASE}/session/stats`)); }
      catch (error) { if (!isNotFound(error)) throw error; }
      await api.delete(`${BASE}/session`);
      return stats;
    },
    onSuccess: () => {
      qc.setQueryData<SquadUpPresence>(squadUpKeys.presence(), { active: false, pendingLikes: 0 });
      qc.removeQueries({ queryKey: squadUpKeys.cards() });
    },
  });
}

/** Summary of the latest session; the server keeps it after the last slot fills. */
export function useSquadUpStats(enabled: boolean) {
  return useQuery({
    queryKey: squadUpKeys.stats(),
    enabled,
    queryFn: async () => squadUpStatsSchema.parse(await api.get<unknown>(`${BASE}/session/stats`)),
    retry: false,
  });
}

export function useSquadUpCards(enabled: boolean) {
  return useQuery({
    queryKey: squadUpKeys.cards(),
    enabled,
    queryFn: async () => z.array(squadUpCardSchema).parse(await api.get<unknown>(`${BASE}/cards?limit=6&tier_range=4`)),
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.length === 0 ? 15_000 : false),
  });
}

export function useSquadUpMatches(enabled: boolean) {
  return useQuery({
    queryKey: squadUpKeys.matches(),
    enabled,
    queryFn: async () => z.array(squadUpMatchSchema).parse(await api.get<unknown>(`${BASE}/matches`)),
    staleTime: 15_000,
  });
}

interface SwipeVars { card: SquadUpCard; direction: 'right' | 'left' }
interface SwipeContext { previous?: SquadUpCard[] }

/** Optimistic swipe: the card leaves the deck immediately and returns if the request fails. */
export function useSquadUpSwipe() {
  const qc = useQueryClient();
  return useMutation<SwipeResult | null, Error, SwipeVars, SwipeContext>({
    mutationFn: async ({ card, direction }) => {
      const raw = await api.post<unknown>(`${BASE}/${card.userId}/${direction}`);
      return direction === 'right' ? swipeResultSchema.parse(raw) : null;
    },
    onMutate: async ({ card }) => {
      await qc.cancelQueries({ queryKey: squadUpKeys.cards() });
      const previous = qc.getQueryData<SquadUpCardList>(squadUpKeys.cards());
      qc.setQueryData<SquadUpCardList>(squadUpKeys.cards(), (old) => (old ?? []).filter((c) => c.userId !== card.userId));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(squadUpKeys.cards(), context.previous);
    },
    onSettled: () => {
      // Refill before the deck runs dry, but never while a swipe is still being recorded server-side.
      const left = qc.getQueryData<SquadUpCardList>(squadUpKeys.cards())?.length ?? 0;
      if (left <= 1) void qc.invalidateQueries({ queryKey: squadUpKeys.cards() });
    },
    onSuccess: (result) => {
      if (result?.matched) {
        void qc.invalidateQueries({ queryKey: squadUpKeys.matches() });
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      }
      if (result?.sessionEnded) {
        qc.setQueryData<SquadUpPresence>(squadUpKeys.presence(), { active: false, pendingLikes: 0 });
      }
    },
  });
}

type SquadUpCardList = SquadUpCard[];
