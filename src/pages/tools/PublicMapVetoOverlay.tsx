import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { usePublicVetoRealtime } from "@/hooks/usePublicVetoRealtime";
import { mapApiVetoToLocal } from "@/hooks/useMapVetoMachine";
import { useCrispMapImages } from "@/hooks/useCrispMapImages";
import { withMapImages } from "@/services/maps/valorantMapAssets";
import { normalizeHistoryEntry, type VetoHistoryEntry } from "@/hooks/useVetoHistory";
import { PublicMapVetoBroadcastOverlay } from "./PublicMapVetoBroadcastOverlay";
import { PublicMapVetoVctOverlay } from "./PublicMapVetoVctOverlay";
import { buildOverlayStepCards } from "./buildOverlayStepCards";
import {
  adaptPublicMapsToGameMaps,
  adaptPublicVetoToMatchVeto,
  normalizePublicVetoHistoryRow,
  normalizePublicVetoState,
  PUBLIC_VETO_GAMES,
  type PublicVetoGameMap,
  type PublicVetoHistoryRow,
} from "./publicMapVetoUtils";

/** Fallback refresh while the live connection is down; OBS needs moments within seconds. */
const PUBLIC_VETO_OVERLAY_POLL_MS = 3_000;

const adaptHistory = (
  rows: Array<PublicVetoHistoryRow | Record<string, unknown>>,
  maps: PublicVetoGameMap[],
  game: string,
): VetoHistoryEntry[] =>
  rows
    .map((row) => {
      const normalized = normalizePublicVetoHistoryRow(row as Record<string, unknown>, maps, game);
      return normalizeHistoryEntry({
        actionNumber: normalized.actionNumber,
        teamSide: normalized.teamSide,
        teamName: normalized.teamName,
        action: normalized.action,
        mapId: normalized.mapId,
        mapName: normalized.mapName,
        mapImageUrl: normalized.mapImageUrl,
        side: normalized.side,
        createdAt: normalized.createdAt,
      });
    })
    .sort((a, b) => a.actionNumber - b.actionNumber);

type OverlayTransition = "none" | "up" | "left" | "right";
/** `broadcast` is the Esportra theme. Retired theme names in old links fall back to it. */
type OverlayTheme = "broadcast" | "vct";

const overlayTransition = (value: string | null): OverlayTransition =>
  value === "none" || value === "left" || value === "right" ? value : "up";

const overlayTheme = (value: string | null): OverlayTheme => (value === "vct" ? "vct" : "broadcast");

/** Warm the cache for every map image so a slot never fills before its art has loaded. */
const usePreloadImages = (urls: Array<string | null | undefined>) => {
  const key = urls.filter(Boolean).join("|");
  useEffect(() => {
    if (!key) return;
    key.split("|").forEach((url) => {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
    });
  }, [key]);
};

const PublicMapVetoOverlay = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const transparent = searchParams.get("transparent") === "1";
  const transition = overlayTransition(searchParams.get("transition"));
  const theme = overlayTheme(searchParams.get("theme"));
  const replay = searchParams.get("playback") === "replay";
  const queryClient = useQueryClient();
  const actingRef = useRef(false);
  const realtimeConnectedRef = useRef(false);
  const stateQueryKey = useMemo(() => ["public-map-veto-overlay", token] as const, [token]);
  const historyQueryKey = useMemo(() => ["public-map-veto-overlay-history", token] as const, [token]);
  const statePath = `/api/tools/map-veto/overlay/${token}`;
  const fallbackStatePath = `/api/tools/map-veto/host/${token}`;
  const historyPath = `/api/tools/map-veto/overlay/${token}/history`;
  const fallbackHistoryPath = `/api/tools/map-veto/${token}/history`;

  const fetchOverlayState = useCallback(async () => {
    try {
      return await apiClient.get<Record<string, unknown>>(statePath);
    } catch {
      return apiClient.get<Record<string, unknown>>(fallbackStatePath);
    }
  }, [fallbackStatePath, statePath]);

  const fetchOverlayHistory = useCallback(async () => {
    try {
      return await apiClient.get<Array<Record<string, unknown>>>(historyPath);
    } catch {
      return apiClient.get<Array<Record<string, unknown>>>(fallbackHistoryPath);
    }
  }, [fallbackHistoryPath, historyPath]);

  const syncFromServer = useCallback(async () => {
    if (!token) return;
    const [rawState, historyRows] = await Promise.all([
      fetchOverlayState(),
      fetchOverlayHistory(),
    ]);
    const nextState = normalizePublicVetoState(rawState);
    queryClient.setQueryData(stateQueryKey, nextState);
    queryClient.setQueryData(
      historyQueryKey,
      historyRows.map((row) => normalizePublicVetoHistoryRow(row, nextState.maps, nextState.game)),
    );
  }, [fetchOverlayHistory, fetchOverlayState, historyQueryKey, queryClient, stateQueryKey, token]);

  const stateQuery = useQuery({
    queryKey: stateQueryKey,
    queryFn: async () => normalizePublicVetoState(await fetchOverlayState()),
    enabled: Boolean(token),
    staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      if (realtimeConnectedRef.current) return false;
      if (query.state.data?.status === "completed") return false;
      return PUBLIC_VETO_OVERLAY_POLL_MS;
    },
  });

  const historyQuery = useQuery({
    queryKey: historyQueryKey,
    queryFn: async () => {
      const rows = await fetchOverlayHistory();
      const maps = stateQuery.data?.maps ?? [];
      const game = stateQuery.data?.game ?? "valorant";
      return rows.map((row) => normalizePublicVetoHistoryRow(row, maps, game));
    },
    enabled: Boolean(token) && Boolean(stateQuery.data),
    staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: () => {
      if (realtimeConnectedRef.current) return false;
      if (stateQuery.data?.status === "completed") return false;
      return PUBLIC_VETO_OVERLAY_POLL_MS;
    },
  });

  const { connected: realtimeConnected } = usePublicVetoRealtime({
    sessionId: stateQuery.data?.id,
    enabled: Boolean(token) && Boolean(stateQuery.data),
    actingRef,
    onUpdated: syncFromServer,
    onReset: syncFromServer,
    onTossResult: () => void syncFromServer(),
  });
  realtimeConnectedRef.current = realtimeConnected;

  const state = stateQuery.data;
  const veto = useMemo(
    () => state ? mapApiVetoToLocal(adaptPublicVetoToMatchVeto(state)) : null,
    [state],
  );
  const storedMaps = useMemo(
    () => state ? adaptPublicMapsToGameMaps(state.maps, state.game) : [],
    [state],
  );
  const gameMaps = useCrispMapImages(storedMaps, state?.game ?? "");
  const history = useMemo(
    () => state ? withMapImages(adaptHistory((historyQuery.data ?? []) as PublicVetoHistoryRow[], state.maps, state.game), gameMaps) : [],
    [gameMaps, historyQuery.data, state],
  );
  const stepCards = useMemo(
    () => state && veto
      ? buildOverlayStepCards({
        veto,
        history,
        maps: gameMaps,
        game: state.game,
        bestOf: state.bestOf,
        team1Name: state.team1Name,
        team2Name: state.team2Name,
        team1Id: state.team1Id,
        team2Id: state.team2Id,
      })
      : [],
    [gameMaps, history, state, veto],
  );
  usePreloadImages(gameMaps.map((map) => map.map_image_url));

  const prevStatusRef = useRef<string | null>(null);
  const [showActsFirst, setShowActsFirst] = useState(false);

  useEffect(() => {
    if (
      prevStatusRef.current === "toss_choice_pending" &&
      state?.status === "in_progress" &&
      state.tossFirstActorTeamId
    ) {
      setShowActsFirst(true);
      const timer = window.setTimeout(() => setShowActsFirst(false), 3000);
      return () => window.clearTimeout(timer);
    }
    prevStatusRef.current = state?.status ?? null;
  }, [state?.status, state?.tossFirstActorTeamId]);

  if (stateQuery.isLoading) {
    return (
      <main className={cn("flex h-dvh w-dvw items-center justify-center overflow-hidden text-white", transparent ? "bg-transparent" : "bg-[#050505]")}>
        <div className="bg-black/72 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-white/70">
          Loading map veto overlay
        </div>
      </main>
    );
  }

  if (stateQuery.error || !state || !veto) {
    return (
      <main className={cn("flex h-dvh w-dvw items-center justify-center overflow-hidden px-6 text-center text-white", transparent ? "bg-transparent" : "bg-[#050505]")}>
        <div className="max-w-lg bg-black/78 px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">Overlay unavailable</p>
          <p className="mt-2 text-sm text-white/70">
            {getApiErrorMessage(stateQuery.error, "This map veto overlay link is unavailable or has expired.")}
          </p>
        </div>
      </main>
    );
  }

  const onClock = veto.status === "in_progress" && veto.current_action && veto.current_team_id
    ? {
      teamName: veto.current_team_id === veto.team1_id ? state.team1Name : state.team2Name,
      action: veto.current_action,
    }
    : null;
  const ThemeOverlay = theme === "vct" ? PublicMapVetoVctOverlay : PublicMapVetoBroadcastOverlay;
  const sectionStyle = { maxHeight: "min(24vh, 250px)" };
  const innerStyle = { height: "clamp(168px, 22vh, 238px)" };

  if (state.status === "pending_toss") {
    return (
      <main className={cn("h-dvh w-dvw overflow-hidden text-white", transparent ? "bg-transparent" : "bg-[#050505]")}>
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          <section
            className="w-full overflow-hidden bg-[#050505] shadow-[0_18px_70px_rgba(0,0,0,0.45)]"
            style={sectionStyle}
            aria-label="Map veto OBS overlay"
          >
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center"
              style={innerStyle}
            >
              <div className="text-[clamp(18px,1.6vw,36px)] font-black uppercase tracking-tight text-white">
                {state.team1Name} <span className="text-white/40">vs</span> {state.team2Name}
              </div>
              <div className="text-[clamp(10px,0.9vw,18px)] font-bold uppercase tracking-[0.18em] text-white/50">
                Waiting for the toss.
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (state.status === "toss_choice_pending") {
    return (
      <main className={cn("h-dvh w-dvw overflow-hidden text-white", transparent ? "bg-transparent" : "bg-[#050505]")}>
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          <section
            className="w-full overflow-hidden bg-[#050505] shadow-[0_18px_70px_rgba(0,0,0,0.45)]"
            style={sectionStyle}
            aria-label="Map veto OBS overlay"
          >
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center"
              style={innerStyle}
            >
              <div className="text-[clamp(18px,1.6vw,36px)] font-black uppercase tracking-tight text-white">
                {state.tossWinnerName ?? "—"}
              </div>
              <div className="text-[clamp(10px,0.9vw,18px)] font-bold uppercase tracking-[0.18em] text-white/50">
                {state.tossWinnerName
                  ? `${state.tossWinnerName} is choosing.`
                  : "Waiting for the toss result."}
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="relative">
      {showActsFirst && state.tossFirstActorTeamId && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-center pb-2"
          style={{ bottom: "clamp(168px, 22vh, 238px)" }}
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="bg-black/80 px-4 py-2 text-center text-[clamp(12px,1vw,20px)] font-black uppercase tracking-[0.15em] text-white">
            {state.tossFirstActorName
            ?? (state.team1Id && state.tossFirstActorTeamId === state.team1Id
              ? state.team1Name
              : state.team2Name)}
            {" "}acts first.
          </div>
        </div>
      )}
      <ThemeOverlay
        maps={gameMaps.map((map) => ({ id: String(map.id), name: map.map_name, imageUrl: map.map_image_url }))}
        cards={stepCards}
        gameLabel={PUBLIC_VETO_GAMES.find((game) => game.value === state.game)?.label ?? state.game}
        bestOf={state.bestOf}
        team1Name={state.team1Name}
        team2Name={state.team2Name}
        status={veto.status}
        onClock={onClock}
        transparent={transparent}
        transition={transition}
        replay={replay}
        ready={!historyQuery.isLoading}
      />
    </div>
  );
};

export default PublicMapVetoOverlay;
