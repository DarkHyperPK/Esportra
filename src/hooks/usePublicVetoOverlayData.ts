import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { usePublicVetoRealtime } from '@/hooks/usePublicVetoRealtime';
import { normalizePublicVetoHistoryRow, normalizePublicVetoState } from '@/pages/tools/publicMapVetoUtils';

const isNotFound = (error: unknown) => Boolean(error && typeof error === 'object' && 'status' in error && error.status === 404);
const retry = (attempt: number, error: unknown) => !isNotFound(error) && attempt < 2;
const pastDeadline = (expiresAt?: string) => Boolean(expiresAt && Date.parse(expiresAt) <= Date.now());

/** Owns fetch/realtime lifetime. Expiry always wins over query-cached success. */
export function usePublicVetoOverlayData(token?: string) {
  const queryClient = useQueryClient();
  const [expiredToken, setExpiredToken] = useState<string>();
  const terminalToken = useRef<string>();
  const currentToken = useRef(token);
  currentToken.current = token;
  const actingRef = useRef(false);
  const connectedRef = useRef(false);
  const stateKey = useMemo(() => ['public-map-veto-overlay', token] as const, [token]);
  const historyKey = useMemo(() => ['public-map-veto-overlay-history', token] as const, [token]);
  const expire = useCallback(() => {
    if (!token || currentToken.current !== token) return;
    terminalToken.current = token;
    setExpiredToken(token);
  }, [token]);
  const enabled = Boolean(token) && expiredToken !== token;

  const fetchState = useCallback(async () => {
    try {
      const raw = await apiClient.get<Record<string, unknown>>(`/api/tools/map-veto/overlay/${token}`);
      const state = normalizePublicVetoState(raw);
      if (pastDeadline(state.expiresAt)) expire();
      return state;
    } catch (error) { if (isNotFound(error)) expire(); throw error; }
  }, [expire, token]);
  const stateQuery = useQuery({
    queryKey: stateKey, queryFn: fetchState, enabled, retry, staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: () => terminalToken.current === token || connectedRef.current ? false : 3000,
  });
  const expired = expiredToken === token && Boolean(token) || pastDeadline(stateQuery.data?.expiresAt);
  const fetchHistory = useCallback(async () => {
    try {
      const rows = await apiClient.get<Array<Record<string, unknown>>>(`/api/tools/map-veto/overlay/${token}/history`);
      const state = queryClient.getQueryData<ReturnType<typeof normalizePublicVetoState>>(stateKey);
      return rows.map((row) => normalizePublicVetoHistoryRow(row, state?.maps ?? [], state?.game ?? 'valorant'));
    } catch (error) { if (isNotFound(error)) expire(); throw error; }
  }, [expire, queryClient, stateKey, token]);
  const historyQuery = useQuery({
    queryKey: historyKey, queryFn: fetchHistory, enabled: enabled && !expired && Boolean(stateQuery.data), retry, staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: () => terminalToken.current === token || connectedRef.current ? false : 3000,
  });
  useEffect(() => {
    if (!stateQuery.data?.expiresAt || expired) return;
    const remaining = Date.parse(stateQuery.data.expiresAt) - Date.now();
    if (!Number.isFinite(remaining)) return;
    const timer = setTimeout(expire, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [expire, expired, stateQuery.data?.expiresAt]);

  const refresh = useCallback(async () => {
    if (!token || terminalToken.current === token) return;
    // Query-managed failures are visible to the view. Settled promises never leak through hub handlers.
    await Promise.allSettled([
      queryClient.fetchQuery({ queryKey: stateKey, queryFn: fetchState, retry }),
      queryClient.fetchQuery({ queryKey: historyKey, queryFn: fetchHistory, retry }),
    ]);
  }, [fetchHistory, fetchState, historyKey, queryClient, stateKey, token]);
  const { connected } = usePublicVetoRealtime({
    sessionId: stateQuery.data?.id, enabled: enabled && !expired && Boolean(stateQuery.data),
    actingRef, onUpdated: refresh, onReset: refresh, onTossResult: () => { void refresh(); },
  });
  connectedRef.current = connected;
  return { stateQuery, historyQuery, expired };
}
