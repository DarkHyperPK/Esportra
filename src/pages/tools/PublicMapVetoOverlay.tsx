import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePublicVetoOverlayData } from "@/hooks/usePublicVetoOverlayData";
import { mapApiVetoToLocal } from "@/hooks/useMapVetoMachine";
import { useCrispMapImages } from "@/hooks/useCrispMapImages";
import { withMapImages } from "@/services/maps/valorantMapAssets";
import { normalizeHistoryEntry, type VetoHistoryEntry } from "@/hooks/useVetoHistory";
import { PublicMapVetoBroadcastOverlay } from "./PublicMapVetoBroadcastOverlay";
import { PublicMapVetoVctOverlay } from "./PublicMapVetoVctOverlay";
import { buildOverlayStepCards } from "./buildOverlayStepCards";
import { OverlayTossScreen } from "./OverlayTossScreen";
import { tossDecisionLine } from "./tossPresentation";
import {
  adaptPublicMapsToGameMaps,
  adaptPublicVetoToMatchVeto,
  effectivePublicVetoSequence,
  normalizePublicVetoHistoryRow,
  PUBLIC_VETO_GAMES,
  type PublicVetoGameMap,
  type PublicVetoHistoryRow,
} from "./publicMapVetoUtils";

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
  const { stateQuery, historyQuery, expired } = usePublicVetoOverlayData(token);

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
        sequence: effectivePublicVetoSequence(state),
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
      const timer = window.setTimeout(() => setShowActsFirst(false), 6000);
      return () => window.clearTimeout(timer);
    }
    prevStatusRef.current = state?.status ?? null;
  }, [state?.status, state?.tossFirstActorTeamId]);

  if (expired || stateQuery.isLoading || stateQuery.error || !state || !veto) {
    const title = expired ? "Session has expired" : stateQuery.isLoading ? "Loading stream overlay" : "Overlay unavailable";
    const message = expired ? "Ask the host for a new stream overlay link." : stateQuery.isLoading ? null : "Check the connection and reload the browser source.";
    return (
      <main className={cn("flex h-dvh w-dvw items-center justify-center overflow-hidden px-6 text-center text-white", transparent ? "bg-transparent" : "bg-background")}>
        <div className="w-full max-w-[480px] border border-white/10 bg-card p-5 sm:p-6" role="status">
          <h1 className="font-heading text-xl font-bold sm:text-2xl">{title}</h1>
          {message && <p className="mt-2 text-sm text-zinc-300 sm:text-[15px]">{message}</p>}
        </div>
      </main>
    );
  }

  const onClock = veto.status === "in_progress" && veto.current_action && veto.current_team_id
    ? {
      teamName: state.currentTeamSide === "team1" ? state.team1Name : state.team2Name,
      action: veto.current_action,
    }
    : null;
  const ThemeOverlay = theme === "vct" ? PublicMapVetoVctOverlay : PublicMapVetoBroadcastOverlay;
  if (state.status === "pending_toss" || state.status === "toss_choice_pending") {
    return <OverlayTossScreen state={state} transparent={transparent} />;
  }

  const decisionLine = tossDecisionLine(state);

  return (
    <div className="relative">
      {showActsFirst && decisionLine && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-center pb-2"
          style={{ bottom: "clamp(168px, 22vh, 238px)" }}
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="bg-black/80 px-4 py-2 text-center text-[clamp(12px,1vw,20px)] font-black uppercase tracking-[0.15em] text-white">
            {decisionLine}
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
