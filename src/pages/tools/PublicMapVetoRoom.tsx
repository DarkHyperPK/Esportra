import React, { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import PublicMapVetoView, { PublicMapVetoLoading } from "./PublicMapVetoView";
import type { PublicVetoHistoryRow, PublicVetoState } from "./publicMapVetoUtils";

const PublicMapVetoRoom = () => {
  const { token } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isHost = location.pathname.includes("/host/");
  const [acting, setActing] = useState(false);
  const statePath = isHost ? `/api/tools/map-veto/host/${token}` : `/api/tools/map-veto/team/${token}`;

  const stateQuery = useQuery({
    queryKey: ["public-map-veto", isHost ? "host" : "team", token],
    queryFn: () => apiClient.get<PublicVetoState>(statePath),
    enabled: Boolean(token),
    refetchInterval: 2500,
  });

  const historyQuery = useQuery({
    queryKey: ["public-map-veto-history", token],
    queryFn: () => apiClient.get<PublicVetoHistoryRow[]>(`/api/tools/map-veto/${token}/history`),
    enabled: Boolean(token),
    refetchInterval: 2500,
  });

  const performAction = async (mapId: string, side?: string | null) => {
    const state = stateQuery.data;
    if (!state?.currentAction || !token || isHost) return;
    setActing(true);
    try {
      const actionPath = state.currentAction === "pick_side" ? "pick-side" : state.currentAction;
      await apiClient.post(
        `/api/tools/map-veto/team/${token}/${actionPath}`,
        state.currentAction === "pick_side" ? { mapId, side } : { mapId },
      );
      await Promise.all([stateQuery.refetch(), historyQuery.refetch()]);
    } catch (err) {
      toast({ title: "Action failed", description: getApiErrorMessage(err), variant: "destructive" });
      throw err;
    } finally {
      setActing(false);
    }
  };

  const reset = async () => {
    if (!token) return;
    setActing(true);
    try {
      await apiClient.post(`/api/tools/map-veto/host/${token}/reset`, {});
      await queryClient.invalidateQueries({ queryKey: ["public-map-veto"] });
      await queryClient.invalidateQueries({ queryKey: ["public-map-veto-history", token] });
      toast({ title: "Veto reset" });
    } catch (err) {
      toast({ title: "Reset failed", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      setActing(false);
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
        history={historyQuery.data ?? []}
        historyLoading={historyQuery.isLoading}
        isHost={isHost}
        acting={acting}
        onMapAction={performAction}
        onReset={reset}
      />
    </div>
  );
};

export default PublicMapVetoRoom;
