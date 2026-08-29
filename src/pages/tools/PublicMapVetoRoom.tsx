import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { usePublicVetoRealtime } from "@/hooks/usePublicVetoRealtime";
import PublicMapVetoView, { PublicMapVetoLoading } from "./PublicMapVetoView";
import {
  normalizePublicVetoHistoryRow,
  normalizePublicVetoState,
  type PublicVetoHistoryRow,
  type PublicVetoState,
} from "./publicMapVetoUtils";

const PUBLIC_VETO_FALLBACK_POLL_MS = 30_000;

const PublicMapVetoRoom = () => {
  const { token } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isHost = location.pathname.includes("/host/");
  const actingRef = useRef(false);
  const realtimeConnectedRef = useRef(false);
  const [acting, setActing] = useState(false);
  const statePath = isHost ? `/api/tools/map-veto/host/${token}` : `/api/tools/map-veto/team/${token}`;
  const stateQueryKey = useMemo(() => ["public-map-veto", isHost ? "host" : "team", token] as const, [isHost, token]);
  const historyQueryKey = useMemo(() => ["public-map-veto-history", token] as const, [token]);

  const refreshHistory = useCallback(async (maps: PublicVetoState["maps"], game: string) => {
    if (!token) return;
    const rows = await apiClient.get<Array<Record<string, unknown>>>(`/api/tools/map-veto/${token}/history`);
    queryClient.setQueryData(
      historyQueryKey,
      rows.map((row) => normalizePublicVetoHistoryRow(row, maps, game)),
    );
  }, [historyQueryKey, queryClient, token]);

  const syncFromServer = useCallback(async () => {
    if (!token || actingRef.current) return;
    const [rawState, historyRows] = await Promise.all([
      apiClient.get<Record<string, unknown>>(statePath),
      apiClient.get<Array<Record<string, unknown>>>(`/api/tools/map-veto/${token}/history`),
    ]);
    const nextState = normalizePublicVetoState(rawState);
    queryClient.setQueryData(stateQueryKey, nextState);
    queryClient.setQueryData(
      historyQueryKey,
      historyRows.map((row) => normalizePublicVetoHistoryRow(row, nextState.maps, nextState.game)),
    );
  }, [historyQueryKey, queryClient, statePath, stateQueryKey, token]);

  const stateQuery = useQuery({
    queryKey: stateQueryKey,
    queryFn: async () => normalizePublicVetoState(await apiClient.get<Record<string, unknown>>(statePath)),
    enabled: Boolean(token),
    staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      if (actingRef.current || realtimeConnectedRef.current) return false;
      if (query.state.data?.status === "completed") return false;
      return PUBLIC_VETO_FALLBACK_POLL_MS;
    },
  });

  const historyQuery = useQuery({
    queryKey: historyQueryKey,
    queryFn: async () => {
      const rows = await apiClient.get<Array<Record<string, unknown>>>(`/api/tools/map-veto/${token}/history`);
      const maps = stateQuery.data?.maps ?? [];
      const game = stateQuery.data?.game ?? "valorant";
      return rows.map((row) => normalizePublicVetoHistoryRow(row, maps, game));
    },
    enabled: Boolean(token) && Boolean(stateQuery.data),
    staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: () => {
      if (actingRef.current || realtimeConnectedRef.current) return false;
      if (stateQuery.data?.status === "completed") return false;
      return PUBLIC_VETO_FALLBACK_POLL_MS;
    },
  });

  const { connected: realtimeConnected } = usePublicVetoRealtime({
    sessionId: stateQuery.data?.id,
    enabled: Boolean(token) && Boolean(stateQuery.data),
    actingRef,
    onUpdated: syncFromServer,
    onReset: syncFromServer,
  });

  realtimeConnectedRef.current = realtimeConnected;

  const beginAction = () => {
    actingRef.current = true;
    setActing(true);
  };

  const endAction = () => {
    actingRef.current = false;
    setActing(false);
  };

  const applyServerState = (raw: Record<string, unknown>) => {
    const nextState = normalizePublicVetoState(raw);
    queryClient.setQueryData(stateQueryKey, nextState);
    return nextState;
  };

  const performAction = async (mapId: string, side?: string | null) => {
    const state = stateQuery.data;
    if (!state?.currentAction || !token || isHost || actingRef.current) return;

    beginAction();
    try {
      const actionPath = state.currentAction === "pick_side" ? "pick-side" : state.currentAction;
      const updated = await apiClient.post<Record<string, unknown>>(
        `/api/tools/map-veto/team/${token}/${actionPath}`,
        state.currentAction === "pick_side" ? { mapId, side } : { mapId },
      );
      const nextState = applyServerState(updated);
      await refreshHistory(nextState.maps, nextState.game);
    } catch (err) {
      toast({ title: "Action failed", description: getApiErrorMessage(err), variant: "destructive" });
      await syncFromServer();
      throw err;
    } finally {
      endAction();
    }
  };

  const reset = async () => {
    if (!token || actingRef.current) return;
    beginAction();
    try {
      const updated = await apiClient.post<Record<string, unknown>>(`/api/tools/map-veto/host/${token}/reset`, {});
      const nextState = applyServerState(updated);
      queryClient.setQueryData(historyQueryKey, []);
      await refreshHistory(nextState.maps, nextState.game);
      toast({ title: "Veto reset" });
    } catch (err) {
      toast({ title: "Reset failed", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      endAction();
    }
  };

  if (stateQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <PublicMapVetoLoading />
      </div>
    );
  }

  if (stateQuery.error || !stateQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-8 text-red-200">
        {getApiErrorMessage(stateQuery.error, "Veto room was not found or has expired.")}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicMapVetoView
        state={stateQuery.data}
        history={(historyQuery.data ?? []) as PublicVetoHistoryRow[]}
        historyLoading={historyQuery.isLoading || historyQuery.isFetching}
        isHost={isHost}
        acting={acting}
        onMapAction={performAction}
        onReset={reset}
      />
    </div>
  );
};

export default PublicMapVetoRoom;
