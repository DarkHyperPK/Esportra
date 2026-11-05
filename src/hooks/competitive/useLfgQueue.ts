/**
 * useLfgQueue.ts
 *
 * Queue Now (live swipe matching). The backend has no "get session" route, so presence is a
 * heartbeat probe: 200 = in the queue, 404 = not in the queue (never started, ended, or timed out).
 * The heartbeat doubles as keep-alive and carries the pending-likes count.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { competitiveApiClient as api } from '@/hooks/competitive/competitiveApiClient';
import { ApiError } from '@/lib/apiClient';
import { lfgQueueKeys } from './queryKeys';
import {
  heartbeatSchema, queueCardSchema, queueMatchSchema, queueSessionSchema, queueStatsSchema,
  startQueueSchema, swipeResultSchema,
  type QueueCard, type QueueSession, type QueueStats, type StartQueueInput, type SwipeResult,
} from '@/schemas/lfgQueue';

const BASE = '/api/competitive/lfg/swipe';
export const HEARTBEAT_MS = 60_000;

export interface QueuePresence { active: boolean; pendingLikes: number }

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

/** Heartbeat probe. Polls only while the tab is focused, so an abandoned tab drops out of the pool. */
export function useQueuePresence(enabled: boolean) {
  return useQuery({
    queryKey: lfgQueueKeys.presence(),
    enabled,
    queryFn: async (): Promise<QueuePresence> => {
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

export function useStartQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StartQueueInput): Promise<QueueSession> => {
      const body = startQueueSchema.parse(input);
      return queueSessionSchema.parse(await api.post<unknown>(`${BASE}/session`, body));
    },
    onSuccess: () => {
      qc.setQueryData<QueuePresence>(lfgQueueKeys.presence(), { active: true, pendingLikes: 0 });
      void qc.invalidateQueries({ queryKey: lfgQueueKeys.cards() });
    },
  });
}

/** Reads the summary first (DELETE answers with no body through the shared client), then leaves. */
export function useEndQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<QueueStats | null> => {
      let stats: QueueStats | null = null;
      try { stats = queueStatsSchema.parse(await api.get<unknown>(`${BASE}/session/stats`)); }
      catch (error) { if (!isNotFound(error)) throw error; }
      await api.delete(`${BASE}/session`);
      return stats;
    },
    onSuccess: () => {
      qc.setQueryData<QueuePresence>(lfgQueueKeys.presence(), { active: false, pendingLikes: 0 });
      qc.removeQueries({ queryKey: lfgQueueKeys.cards() });
    },
  });
}

/** Summary of the latest session; the server keeps it after the last slot fills. */
export function useQueueStats(enabled: boolean) {
  return useQuery({
    queryKey: lfgQueueKeys.stats(),
    enabled,
    queryFn: async () => queueStatsSchema.parse(await api.get<unknown>(`${BASE}/session/stats`)),
    retry: false,
  });
}

export function useQueueCards(enabled: boolean) {
  return useQuery({
    queryKey: lfgQueueKeys.cards(),
    enabled,
    queryFn: async () => z.array(queueCardSchema).parse(await api.get<unknown>(`${BASE}/cards?limit=6&tier_range=4`)),
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.length === 0 ? 15_000 : false),
  });
}

export function useQueueMatches(enabled: boolean) {
  return useQuery({
    queryKey: lfgQueueKeys.matches(),
    enabled,
    queryFn: async () => z.array(queueMatchSchema).parse(await api.get<unknown>(`${BASE}/matches`)),
    staleTime: 15_000,
  });
}

interface SwipeVars { card: QueueCard; direction: 'right' | 'left' }
interface SwipeContext { previous?: QueueCard[] }

/** Optimistic swipe: the card leaves the deck immediately and returns if the request fails. */
export function useQueueSwipe() {
  const qc = useQueryClient();
  return useMutation<SwipeResult | null, Error, SwipeVars, SwipeContext>({
    mutationFn: async ({ card, direction }) => {
      const raw = await api.post<unknown>(`${BASE}/${card.userId}/${direction}`);
      return direction === 'right' ? swipeResultSchema.parse(raw) : null;
    },
    onMutate: async ({ card }) => {
      await qc.cancelQueries({ queryKey: lfgQueueKeys.cards() });
      const previous = qc.getQueryData<QueueCardList>(lfgQueueKeys.cards());
      qc.setQueryData<QueueCardList>(lfgQueueKeys.cards(), (old) => (old ?? []).filter((c) => c.userId !== card.userId));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(lfgQueueKeys.cards(), context.previous);
    },
    onSettled: () => {
      // Refill before the deck runs dry, but never while a swipe is still being recorded server-side.
      const left = qc.getQueryData<QueueCardList>(lfgQueueKeys.cards())?.length ?? 0;
      if (left <= 1) void qc.invalidateQueries({ queryKey: lfgQueueKeys.cards() });
    },
    onSuccess: (result) => {
      if (result?.matched) {
        void qc.invalidateQueries({ queryKey: lfgQueueKeys.matches() });
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      }
      if (result?.sessionEnded) {
        qc.setQueryData<QueuePresence>(lfgQueueKeys.presence(), { active: false, pendingLikes: 0 });
      }
    },
  });
}

type QueueCardList = QueueCard[];
