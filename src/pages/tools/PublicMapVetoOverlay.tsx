import { useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { usePublicVetoRealtime } from "@/hooks/usePublicVetoRealtime";
import { mapApiVetoToLocal } from "@/hooks/useMapVetoMachine";
import { normalizeHistoryEntry, type VetoHistoryEntry } from "@/hooks/useVetoHistory";
import { buildVetoSelectedMapEntries } from "@/components/tournament/map-veto/buildVetoSelectedMapEntries";
import { getSideFullLabel } from "@/components/tournament/map-veto/vetoActionPresentation";
import {
  adaptPublicMapsToGameMaps,
  adaptPublicVetoToMatchVeto,
  normalizePublicVetoHistoryRow,
  normalizePublicVetoState,
  type PublicVetoGameMap,
  type PublicVetoHistoryRow,
} from "./publicMapVetoUtils";

const PUBLIC_VETO_OVERLAY_POLL_MS = 30_000;

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

const teamCode = (name: string) => {
  const clean = name.trim();
  const initials = clean
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  return (initials || clean.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "TEAM").slice(0, 6);
};

type OverlaySlotKind = "ban" | "pick" | "decider" | "pending";
type OverlayTransition = "none" | "up" | "left" | "right";
type OverlayTheme = "tactical" | "premium" | "glitch";

type OverlaySlot = {
  key: string;
  mapId: string;
  mapName: string;
  mapImageUrl?: string | null;
  kind: OverlaySlotKind;
  topTeam?: string;
  bottomTeam?: string;
  side?: "attack" | "defend" | null;
};

type OverlayMap = ReturnType<typeof adaptPublicMapsToGameMaps>[number];

const overlayTransition = (value: string | null): OverlayTransition =>
  value === "none" || value === "left" || value === "right" ? value : "up";

const overlayTheme = (value: string | null): OverlayTheme =>
  value === "premium" || value === "glitch" ? value : "tactical";

const MAP_THEME: Record<OverlayTheme, {
  shell: string;
  slot: string;
  topBar: string;
  bottomBar: string;
  mapShade: string;
  banShade: string;
  name: string;
  banName: string;
  stamp: string;
}> = {
  tactical: {
    shell: "bg-[#05050a]",
    slot: "border-r border-cyan-300/20 bg-[#070711] shadow-[inset_0_0_0_1px_rgba(125,249,255,0.08)]",
    topBar: "bg-[#0c0d16]/94 text-cyan-100 border-b border-cyan-300/24",
    bottomBar: "bg-[#6d1bd1]/96 text-white border-t border-cyan-200/20",
    mapShade: "bg-[linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.62)),radial-gradient(circle_at_50%_40%,rgba(0,255,255,.16),transparent_46%)]",
    banShade: "bg-[linear-gradient(180deg,rgba(0,0,0,.56),rgba(0,0,0,.84)),radial-gradient(circle_at_50%_50%,rgba(109,27,209,.28),transparent_46%)]",
    name: "text-white drop-shadow-[0_4px_12px_rgba(0,0,0,1)]",
    banName: "text-white/92 drop-shadow-[0_4px_14px_rgba(0,0,0,1)]",
    stamp: "border-[#6d1bd1]/95 shadow-[0_0_22px_rgba(109,27,209,.65)]",
  },
  premium: {
    shell: "bg-[#08080b]",
    slot: "border-r border-white/16 bg-[#101014] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
    topBar: "bg-[#f1f1f4]/96 text-[#140c35] border-b border-white/20",
    bottomBar: "bg-[#24144f]/96 text-white border-t border-white/18",
    mapShade: "bg-[linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.48))]",
    banShade: "bg-[linear-gradient(180deg,rgba(245,245,248,.16),rgba(0,0,0,.78))]",
    name: "text-white drop-shadow-[0_3px_10px_rgba(0,0,0,.88)]",
    banName: "text-white/88 drop-shadow-[0_3px_10px_rgba(0,0,0,.95)]",
    stamp: "border-white/78 shadow-[0_0_18px_rgba(255,255,255,.22)]",
  },
  glitch: {
    shell: "bg-[#040006]",
    slot: "border-r border-fuchsia-300/24 bg-[#0a0310] shadow-[inset_0_0_0_1px_rgba(255,43,214,.12)]",
    topBar: "bg-[#17051e]/96 text-fuchsia-100 border-b border-fuchsia-300/30",
    bottomBar: "bg-[#ff2bd6]/90 text-black border-t border-white/18",
    mapShade: "bg-[linear-gradient(180deg,rgba(255,43,214,.08),rgba(0,0,0,.58)),repeating-linear-gradient(0deg,rgba(255,255,255,.07)_0_1px,transparent_1px_5px)]",
    banShade: "bg-[linear-gradient(180deg,rgba(255,43,214,.26),rgba(0,0,0,.86)),repeating-linear-gradient(0deg,rgba(255,255,255,.08)_0_1px,transparent_1px_4px)]",
    name: "text-white drop-shadow-[3px_0_0_rgba(255,43,214,.65),-3px_0_0_rgba(0,255,255,.45),0_4px_10px_rgba(0,0,0,1)]",
    banName: "text-white/94 drop-shadow-[3px_0_0_rgba(255,43,214,.7),-3px_0_0_rgba(0,255,255,.45),0_4px_12px_rgba(0,0,0,1)]",
    stamp: "border-[#ff2bd6]/95 shadow-[0_0_24px_rgba(255,43,214,.62)]",
  },
};

const transitionClassName = (transition: OverlayTransition) => {
  if (transition === "left") return "map-veto-overlay-enter-left";
  if (transition === "right") return "map-veto-overlay-enter-right";
  if (transition === "up") return "map-veto-overlay-enter-up";
  return "";
};

const actionAnimationKey = (slot: OverlaySlot) =>
  [
    slot.key,
    slot.kind,
    slot.topTeam || "",
    slot.bottomTeam || "",
    slot.side || "",
  ].join(":");

const VetoMark = ({ theme }: { theme: OverlayTheme }) => (
  <div className="map-veto-stamp pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
    <div className={cn("relative h-[54%] aspect-square rounded-full border-[10px] opacity-95", MAP_THEME[theme].stamp)}>
      <div className={cn("absolute left-1/2 top-1/2 h-[10px] w-[132%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full", theme === "premium" ? "bg-white/82" : theme === "glitch" ? "bg-[#ff2bd6]" : "bg-[#6d1bd1]")} />
    </div>
  </div>
);

const OVERLAY_ANIMATION_CSS = `
@keyframes map-veto-overlay-up {
  from { opacity: 0; transform: translate3d(0, 48px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes map-veto-overlay-left {
  from { opacity: 0; transform: translate3d(-72px, 0, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes map-veto-overlay-right {
  from { opacity: 0; transform: translate3d(72px, 0, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes map-veto-top-bar-in {
  from { opacity: 0; transform: translateY(-100%); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes map-veto-bottom-bar-in {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes map-veto-slot-pop {
  0% { opacity: 0.72; transform: scale(0.985); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes map-veto-stamp-in {
  0% { opacity: 0; transform: scale(1.35) rotate(-18deg); }
  62% { opacity: 1; transform: scale(0.92) rotate(0deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

@keyframes map-veto-name-pop {
  from { opacity: 0; transform: translateY(10px) scale(0.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes map-veto-image-settle {
  from { transform: scale(1.14); filter: saturate(1.12); }
  to { transform: scale(1); filter: saturate(1); }
}

@keyframes map-veto-ban-image-settle {
  from { transform: scale(1.18); filter: grayscale(0) saturate(1.15); }
  to { transform: scale(1.05); filter: grayscale(1) saturate(0.75); }
}

@keyframes map-veto-dim-sweep {
  from { opacity: 0; transform: translateX(-100%); }
  to { opacity: 0.8; transform: translateX(100%); }
}

.map-veto-overlay-enter-up {
  animation: map-veto-overlay-up 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.map-veto-overlay-enter-left {
  animation: map-veto-overlay-left 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.map-veto-overlay-enter-right {
  animation: map-veto-overlay-right 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.map-veto-slot-action {
  animation: map-veto-slot-pop 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

.map-veto-top-bar {
  animation: map-veto-top-bar-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  will-change: transform, opacity;
}

.map-veto-bottom-bar {
  animation: map-veto-bottom-bar-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  will-change: transform, opacity;
}

.map-veto-stamp {
  animation: map-veto-stamp-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

.map-veto-map-name {
  animation: map-veto-name-pop 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

.map-veto-image {
  animation: map-veto-image-settle 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, filter;
}

.map-veto-ban-image {
  animation: map-veto-ban-image-settle 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, filter;
}

.map-veto-dim-sweep::after {
  animation: map-veto-dim-sweep 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
  content: "";
  inset: 0;
  position: absolute;
}

.map-veto-theme-tactical {
  background-image:
    radial-gradient(circle at 50% 30%, rgba(0,255,255,.12), transparent 38%),
    linear-gradient(90deg, rgba(255,255,255,.04), transparent 24%, transparent 76%, rgba(255,255,255,.04));
}

.map-veto-theme-premium {
  width: 92% !important;
  padding: 10px 18px;
  border-top: 1px solid rgba(255,255,255,.34);
  border-bottom: 1px solid rgba(255,255,255,.18);
  background-image:
    linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.02)),
    linear-gradient(90deg, rgba(255,255,255,.08), transparent 42%, rgba(255,255,255,.06));
}

.map-veto-theme-premium .map-veto-slot {
  margin: 0 5px;
  border: 1px solid rgba(255,255,255,.20);
  box-shadow: 0 16px 28px rgba(0,0,0,.24), inset 0 0 0 1px rgba(255,255,255,.08);
  grid-template-rows: 1fr !important;
}

.map-veto-theme-premium .map-veto-slot > .relative {
  grid-row: 1 / -1 !important;
  min-height: 100%;
}

.map-veto-theme-premium .map-veto-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 42;
  height: 36px;
  background: rgba(244,244,247,.94);
}

.map-veto-theme-premium .map-veto-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 42;
  height: 42px;
}

.map-veto-theme-premium .map-veto-top-bar,
.map-veto-theme-premium .map-veto-bottom-bar {
  letter-spacing: .12em;
}

.map-veto-theme-glitch {
  width: 96% !important;
  padding: 12px 10px;
  overflow: visible !important;
  background-image:
    repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 5px),
    radial-gradient(circle at 50% 30%, rgba(255,43,214,.20), transparent 42%);
}

.map-veto-theme-glitch .map-veto-slot {
  margin: 0 3px;
  border: 1px solid rgba(255,43,214,.30);
  box-shadow: 4px 0 rgba(0,255,255,.18), -4px 0 rgba(255,43,214,.18), inset 0 0 0 1px rgba(255,255,255,.06);
  grid-template-rows: 1fr !important;
}

.map-veto-theme-glitch .map-veto-slot > .relative {
  grid-row: 1 / -1 !important;
  min-height: 100%;
}

.map-veto-theme-glitch .map-veto-top-bar {
  position: absolute;
  left: -1px;
  right: 20%;
  top: 0;
  z-index: 42;
  height: 46px;
  clip-path: polygon(0 0, 92% 0, 100% 100%, 0 100%);
}

.map-veto-theme-glitch .map-veto-bottom-bar {
  position: absolute;
  left: 18%;
  right: -1px;
  bottom: 0;
  z-index: 42;
  height: 48px;
  clip-path: polygon(8% 0, 100% 0, 100% 100%, 0 100%);
}

.map-veto-theme-glitch .map-veto-slot:nth-child(odd) {
  transform: translateY(-5px) skewX(-2deg);
}

.map-veto-theme-glitch .map-veto-slot:nth-child(even) {
  transform: translateY(5px) skewX(-2deg);
}

@media (prefers-reduced-motion: reduce) {
  .map-veto-overlay-enter-up,
  .map-veto-overlay-enter-left,
  .map-veto-overlay-enter-right,
  .map-veto-slot-action,
  .map-veto-top-bar,
  .map-veto-bottom-bar,
  .map-veto-stamp,
  .map-veto-map-name,
  .map-veto-image,
  .map-veto-ban-image,
  .map-veto-dim-sweep::after {
    animation: none !important;
  }
}
`;

const StripSlot = ({ slot, theme }: { slot: OverlaySlot; theme: OverlayTheme }) => {
  const isBan = slot.kind === "ban";
  const isPick = slot.kind === "pick" || slot.kind === "decider";
  const hasSideChoice = isPick && Boolean(slot.bottomTeam && slot.side);
  const isPending = slot.kind === "pending";
  const topTeamLabel = slot.topTeam?.trim() || "";
  const topActionLabel = isBan ? "BANNED" : "SELECT MAP";
  const bottomLabel = hasSideChoice
    ? `${teamCode(slot.bottomTeam || "")} PICKS\n${getSideFullLabel(slot.side)}`
    : "";

  return (
    <div
      className={cn(
        "map-veto-slot relative grid min-w-0 overflow-hidden last:border-r-0",
        theme === "premium" ? "grid-rows-[34px_minmax(96px,1fr)_38px]" : theme === "glitch" ? "grid-rows-[52px_minmax(96px,1fr)_54px]" : "grid-rows-[44px_minmax(96px,1fr)_48px]",
        theme === "glitch" && "skew-x-[-2deg]",
        MAP_THEME[theme].slot,
        !isPending && "map-veto-slot-action",
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-30 opacity-70 [background:linear-gradient(135deg,rgba(255,255,255,.18)_0_1px,transparent_1px_42px)]" />
      {!isPending && (
        <div className={cn("map-veto-top-bar flex min-w-0 flex-col items-center justify-center px-1 text-center text-[clamp(10px,0.78vw,16px)] font-black uppercase leading-[1.05] tracking-[0.08em]", MAP_THEME[theme].topBar)}>
          {slot.kind === "decider" ? (
            <>
              <span className="max-w-full truncate">DECIDER</span>
              <span className="max-w-full truncate">MAP</span>
            </>
          ) : (
            <>
              <span className="max-w-full truncate">{topTeamLabel}</span>
              <span className="max-w-full truncate">{topActionLabel}</span>
            </>
          )}
        </div>
      )}
      <div
        className={cn(
          "relative isolate min-h-0 overflow-hidden bg-zinc-900",
          isPending && "row-span-3",
          isBan && "row-span-2",
          isPick && !hasSideChoice && "row-span-2",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-cover bg-center",
            isBan ? "map-veto-ban-image scale-105 grayscale" : !isPending && "map-veto-image",
          )}
          style={{ backgroundImage: slot.mapImageUrl ? `url(${slot.mapImageUrl})` : undefined }}
        />
        <div className={cn("absolute inset-0", isBan ? MAP_THEME[theme].banShade : MAP_THEME[theme].mapShade)} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] bg-white/30" />
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-[2px] bg-white/16" />
        {isBan && <div className="map-veto-dim-sweep pointer-events-none absolute inset-0 z-10 overflow-hidden" />}
        {isBan && <VetoMark theme={theme} />}
        <div
          className={cn(
            "absolute inset-x-1 text-center",
            isBan ? "inset-y-0 z-10 flex items-center justify-center" : "bottom-2 z-30",
          )}
        >
          <div
            className={cn(
              "map-veto-map-name truncate text-[clamp(18px,1.45vw,34px)] font-black uppercase leading-none text-white",
              isBan ? MAP_THEME[theme].banName : MAP_THEME[theme].name,
            )}
          >
            {slot.mapName}
          </div>
        </div>
      </div>
      {hasSideChoice && (
        <div
          className={cn(
            "flex items-center justify-center px-1 text-center text-[clamp(10px,0.78vw,16px)] font-black uppercase leading-[1.08] tracking-wide whitespace-pre-line",
            "map-veto-bottom-bar",
            MAP_THEME[theme].bottomBar,
          )}
        >
          {bottomLabel}
        </div>
      )}
    </div>
  );
};

const buildOverlaySlots = (options: {
  maps: OverlayMap[];
  history: VetoHistoryEntry[];
  selectedMaps: Array<{
    map_id: string;
    map_name: string;
    map_image_url?: string | null;
    mapPickerTeamName: string;
    side?: "attack" | "defend";
  }>;
}): OverlaySlot[] => {
  const { maps, history, selectedMaps } = options;
  const mapsById = new Map(maps.map((map) => [String(map.id), map]));
  const used = new Set<string>();
  const sideByMap = new Map<string, { teamName: string; side?: "attack" | "defend" | null }>();

  history.forEach((entry) => {
    if (entry.action === "pick_side" && entry.mapId) {
      sideByMap.set(entry.mapId, { teamName: entry.teamName, side: entry.side });
    }
  });

  const actionSlots = history
    .filter((entry) => (entry.action === "ban" || entry.action === "pick") && entry.mapId)
    .map((entry): OverlaySlot | null => {
      const map = mapsById.get(entry.mapId);
      const sideInfo = sideByMap.get(entry.mapId);
      used.add(entry.mapId);
      return {
        key: `history-${entry.actionNumber}-${entry.mapId}`,
        mapId: entry.mapId,
        mapName: map?.map_name || entry.mapName,
        mapImageUrl: map?.map_image_url || entry.mapImageUrl,
        kind: entry.action === "ban" ? "ban" : "pick",
        topTeam: entry.teamName,
        bottomTeam: sideInfo?.teamName,
        side: sideInfo?.side,
      };
    })
    .filter((slot): slot is OverlaySlot => Boolean(slot));

  const decider = selectedMaps.find((entry) => entry.mapPickerTeamName === "Decider");
  if (decider && !used.has(decider.map_id)) {
    const sideInfo = sideByMap.get(decider.map_id);
    actionSlots.push({
      key: `decider-${decider.map_id}`,
      mapId: decider.map_id,
      mapName: decider.map_name,
      mapImageUrl: decider.map_image_url,
      kind: "decider",
      bottomTeam: sideInfo?.teamName,
      side: sideInfo?.side,
    });
    used.add(decider.map_id);
  }

  maps.forEach((map) => {
    const mapId = String(map.id);
    if (used.has(mapId)) return;
    actionSlots.push({
      key: `pending-${mapId}`,
      mapId,
      mapName: map.map_name,
      mapImageUrl: map.map_image_url,
      kind: "pending",
    });
  });

  return actionSlots;
};

const PublicMapVetoOverlay = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const transparent = searchParams.get("transparent") === "1";
  const transition = overlayTransition(searchParams.get("transition"));
  const theme = overlayTheme(searchParams.get("theme"));
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
  });
  realtimeConnectedRef.current = realtimeConnected;

  const state = stateQuery.data;
  const veto = useMemo(
    () => state ? mapApiVetoToLocal(adaptPublicVetoToMatchVeto(state)) : null,
    [state],
  );
  const gameMaps = useMemo(
    () => state ? adaptPublicMapsToGameMaps(state.maps, state.game) : [],
    [state],
  );
  const history = useMemo(
    () => state ? adaptHistory((historyQuery.data ?? []) as PublicVetoHistoryRow[], state.maps, state.game) : [],
    [historyQuery.data, state],
  );
  const selectedMaps = useMemo(
    () => state && veto
      ? buildVetoSelectedMapEntries({
        veto,
        bestOf: state.bestOf,
        game: state.game,
        mapLookup: gameMaps,
        team1Name: state.team1Name,
        team2Name: state.team2Name,
        team1Id: state.team1Id,
        team2Id: state.team2Id,
      })
      : [],
    [gameMaps, state, veto],
  );
  const slots = useMemo(
    () => buildOverlaySlots({ maps: gameMaps, history, selectedMaps }),
    [gameMaps, history, selectedMaps],
  );

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

  return (
    <main className={cn("h-dvh w-dvw overflow-hidden text-white", transparent ? "bg-transparent" : "bg-[#050505]")}>
      <style>{OVERLAY_ANIMATION_CSS}</style>
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <section
          className={cn(`map-veto-theme-${theme}`, "w-full overflow-hidden shadow-[0_18px_70px_rgba(0,0,0,0.45)]", MAP_THEME[theme].shell, transitionClassName(transition))}
          style={{ maxHeight: "min(24vh, 250px)" }}
          aria-label="Map veto OBS overlay"
        >
          <div
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${Math.max(slots.length, 1)}, minmax(0, 1fr))`,
              height: "clamp(168px, 22vh, 238px)",
            }}
          >
            {slots.map((slot) => (
              <StripSlot key={actionAnimationKey(slot)} slot={slot} theme={theme} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PublicMapVetoOverlay;
