import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Copy, RotateCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { copyText } from "./publicToolUtils";

type VetoMap = {
  id: string;
  map_name?: string;
  mapName?: string;
  map_image_url?: string | null;
  mapImageUrl?: string | null;
};

type PickedMap = {
  mapId: string;
  side?: string | null;
};

type VetoState = {
  id: string;
  game: string;
  bestOf: number;
  team1Name: string;
  team2Name: string;
  team1Id: string;
  team2Id: string;
  status: string;
  currentTeamId?: string | null;
  currentAction?: "ban" | "pick" | "pick_side" | null;
  currentActionNumber?: number;
  team1BannedMaps: string[];
  team2BannedMaps: string[];
  team1PickedMaps: PickedMap[];
  team2PickedMaps: PickedMap[];
  selectedMapId?: string | null;
  maps: VetoMap[];
  hostToken?: string | null;
  team1Token?: string | null;
  team2Token?: string | null;
  role: "host" | "team1" | "team2" | "viewer";
  expiresAt?: string;
};

type HistoryRow = {
  actionNumber: number;
  teamName: string;
  action: string;
  mapName?: string;
  mapId: string;
  side?: string | null;
};

const mapName = (map?: VetoMap) => map?.mapName ?? map?.map_name ?? "Unknown map";
const fallbackMapImage = "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=500&fit=crop&q=80";
const imageUrl = (map?: VetoMap, game?: string) => {
  const explicit = map?.mapImageUrl ?? map?.map_image_url;
  if (explicit) return explicit.trim();
  if (game === "valorant" && map?.id && /^[0-9a-f-]{36}$/i.test(map.id)) {
    return `https://media.valorant-api.com/maps/${map.id}/splash.png`;
  }
  return fallbackMapImage;
};

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
    queryFn: () => apiClient.get<VetoState>(statePath),
    enabled: Boolean(token),
    refetchInterval: 2500,
  });

  const historyQuery = useQuery({
    queryKey: ["public-map-veto-history", token],
    queryFn: () => apiClient.get<HistoryRow[]>(`/api/tools/map-veto/${token}/history`),
    enabled: Boolean(token),
    refetchInterval: 2500,
  });

  const state = stateQuery.data;
  const mapsById = useMemo(() => new Map((state?.maps ?? []).map((map) => [map.id, map])), [state?.maps]);
  const teamName = state
    ? (state.role === "team1" ? state.team1Name : state.role === "team2" ? state.team2Name : "Host")
    : "Host";
  const currentTeamName = state
    ? (state.currentTeamId === state.team1Id
      ? state.team1Name
      : state.currentTeamId === state.team2Id
        ? state.team2Name
        : "None")
    : "None";
  const canAct = Boolean(state && !isHost && state.status === "in_progress" && ((state.role === "team1" && state.currentTeamId === state.team1Id) || (state.role === "team2" && state.currentTeamId === state.team2Id)));
  const banned = new Set([...(state?.team1BannedMaps ?? []), ...(state?.team2BannedMaps ?? [])]);
  const picked = new Set([...(state?.team1PickedMaps ?? []), ...(state?.team2PickedMaps ?? [])].map((pick) => pick.mapId));

  const eligibleMaps = useMemo(() => {
    if (!state) return [];
    if (state.currentAction === "pick_side") {
      const missingSide = [...state.team1PickedMaps, ...state.team2PickedMaps]
        .filter((pick) => !pick.side)
        .map((pick) => mapsById.get(pick.mapId))
        .filter(Boolean) as VetoMap[];
      if (missingSide.length > 0) return missingSide;
      return state.maps.filter((map) => !banned.has(map.id) && !picked.has(map.id));
    }
    return state.maps.filter((map) => !banned.has(map.id) && !picked.has(map.id));
  }, [banned, mapsById, picked, state]);

  const makeLink = (path: "host" | "team", linkToken?: string | null) => linkToken ? `${window.location.origin}/tools/map-veto/${path}/${linkToken}` : "";

  const performAction = async (mapId: string, side?: string) => {
    if (!state?.currentAction || !token) return;
    setActing(true);
    try {
      const actionPath = state.currentAction === "pick_side" ? "pick-side" : state.currentAction;
      await apiClient.post(`/api/tools/map-veto/team/${token}/${actionPath}`, state.currentAction === "pick_side" ? { mapId, side } : { mapId });
      await Promise.all([stateQuery.refetch(), historyQuery.refetch()]);
    } catch (err) {
      toast({ title: "Action failed", description: getApiErrorMessage(err), variant: "destructive" });
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
    return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-zinc-400">Loading veto room...</main>;
  }

  if (stateQuery.error || !state) {
    return <main className="mx-auto max-w-3xl px-4 py-8 text-red-200">{getApiErrorMessage(stateQuery.error, "Veto room was not found or has expired.")}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 text-white">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-400">Map veto</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{state.team1Name} vs {state.team2Name}</h1>
          <p className="mt-1 text-sm text-zinc-500">BO{state.bestOf} · {teamName} view · expires {state.expiresAt ? new Date(state.expiresAt).toLocaleString() : "soon"}</p>
        </div>
        {isHost && (
          <Button disabled={acting} variant="outline" onClick={reset} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
            <RotateCcw className="mr-2 h-4 w-4" /> Reset veto
          </Button>
        )}
      </div>

      {isHost && (
        <section className="mb-4 grid gap-2 lg:grid-cols-3">
          {[
            ["Host", makeLink("host", state.hostToken)],
            [state.team1Name, makeLink("team", state.team1Token)],
            [state.team2Name, makeLink("team", state.team2Token)],
          ].map(([label, link]) => (
            <div key={label} className="flex min-w-0 items-center gap-2 border border-white/10 bg-black/35 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p>
                <code className="block truncate text-xs text-zinc-300">{link}</code>
              </div>
              <Button size="sm" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => copyText(link).then(() => toast({ title: "Link copied" }))}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="border border-white/10 bg-black/35 p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge className={state.status === "completed" ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"}>
              {state.status}
            </Badge>
            <span className="text-sm text-zinc-400">
              {state.status === "completed" ? "Veto complete" : `${currentTeamName}: ${String(state.currentAction ?? "").replace("_", " ")}`}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {state.maps.map((map) => {
              const isBanned = banned.has(map.id);
              const isPicked = picked.has(map.id) || state.selectedMapId === map.id;
              const isEligible = eligibleMaps.some((item) => item.id === map.id);
              return (
                <div key={map.id} className={`overflow-hidden border ${isEligible ? "border-rose-400/50" : "border-white/10"} bg-black/45`}>
                  <div
                    className="h-24 bg-zinc-900 bg-cover bg-center"
                    style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.08)), url(${imageUrl(map, state.game)})` }}
                  />
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="truncate text-sm font-bold">{mapName(map)}</h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{isBanned ? "Banned" : isPicked ? "Picked" : "Open"}</span>
                    </div>
                    {canAct && isEligible && state.currentAction !== "pick_side" && (
                      <Button disabled={acting} size="sm" className="mt-3 w-full bg-rose-600 text-white hover:bg-rose-500" onClick={() => performAction(map.id)}>
                        {state.currentAction === "ban" ? "Ban map" : "Pick map"}
                      </Button>
                    )}
                    {canAct && isEligible && state.currentAction === "pick_side" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button disabled={acting} size="sm" className="bg-rose-600 text-white hover:bg-rose-500" onClick={() => performAction(map.id, "attack")}>Attack</Button>
                        <Button disabled={acting} size="sm" className="bg-rose-600 text-white hover:bg-rose-500" onClick={() => performAction(map.id, "defense")}>Defense</Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="border border-white/10 bg-black/40 p-4">
          <h2 className="text-base font-bold">Veto history</h2>
          <div className="mt-3 space-y-2">
            {(historyQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500">No actions yet.</p>
            ) : (
              (historyQuery.data ?? []).map((row) => (
                <div key={`${row.actionNumber}-${row.mapId}`} className="border border-white/10 bg-black/35 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Step {row.actionNumber}</p>
                  <p className="mt-1 text-sm text-zinc-200">
                    {row.teamName} {row.action.replace("_", " ")} {row.mapName ?? row.mapId}
                    {row.side ? ` (${row.side})` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
};

export default PublicMapVetoRoom;
