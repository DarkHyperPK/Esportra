import React, { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, ImagePlus, X } from "lucide-react";
import { MapPool } from "@/components/tournament/map-veto/MapPool";
import { VetoDialogs } from "@/components/tournament/map-veto/VetoDialogs";
import { VetoHeader } from "@/components/tournament/map-veto/VetoHeader";
import { VetoSelectedMaps } from "@/components/tournament/map-veto/VetoSelectedMaps";
import { VetoSequence } from "@/components/tournament/map-veto/VetoSequence";
import { VetoTeamDisplay } from "@/components/tournament/map-veto/VetoTeamDisplay";
import { VetoTurnBanner } from "@/components/tournament/map-veto/VetoTurnBanner";
import { TossDecisionNotice } from "@/components/tournament/map-veto/toss/TossDecisionNotice";
import { Skeleton } from "@/components/ui/skeleton";
import { GameMap, isVetoLive, mapApiVetoToLocal } from "@/hooks/useMapVetoMachine";
import { useCrispMapImages } from "@/hooks/useCrispMapImages";
import { withMapImages } from "@/services/maps/valorantMapAssets";
import { normalizeHistoryEntry, VetoHistoryEntry } from "@/hooks/useVetoHistory";
import { PublicMapVetoBroadcastOverlay } from "./PublicMapVetoBroadcastOverlay";
import { buildOverlayStepCards } from "./buildOverlayStepCards";
import { PublicVetoTossStage } from "./PublicVetoTossStage";
import { tossDecisionLine } from "./tossPresentation";
import { downloadNodeAsPng } from "@/lib/exportNodePng";
import {
  adaptPublicMapsToGameMaps,
  adaptPublicVetoToMatchVeto,
  buildPublicTeamVetoUrl,
  PUBLIC_VETO_GAMES,
  PublicVetoGameMap,
  PublicVetoHistoryRow,
  PublicVetoState,
  normalizePublicVetoHistoryRow,
  serializePublicVetoSide,
} from "./publicMapVetoUtils";


type PublicMapVetoViewProps = {
  state: PublicVetoState;
  history: PublicVetoHistoryRow[];
  historyLoading?: boolean;
  isHost: boolean;
  acting: boolean;
  onMapAction: (mapId: string, side?: string | null) => Promise<void>;
  onReset: () => Promise<void>;
  onPerformToss?: () => Promise<void>;
  onPerformTossChoice?: (goFirst: boolean) => Promise<void>;
  team1Logo: string | null;
  team2Logo: string | null;
  onTeam1Logo: (url: string | null) => void;
  onTeam2Logo: (url: string | null) => void;
};

const TeamLogoSlot = ({
  teamName,
  value,
  onChange,
}: {
  teamName: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) => (
  <div className="relative flex items-center gap-2">
    <label
      className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden border border-white/10 bg-black/30 transition-colors hover:border-white/25"
      title={`Upload ${teamName} logo`}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(URL.createObjectURL(file));
          e.target.value = "";
        }}
      />
      {value ? (
        <img src={value} alt={teamName} className="h-full w-full object-contain" />
      ) : (
        <ImagePlus className="h-3.5 w-3.5 text-zinc-500" />
      )}
    </label>
    {value && (
      <button
        type="button"
        onClick={() => onChange(null)}
        className="text-zinc-600 transition-colors hover:text-zinc-400"
        aria-label={`Remove ${teamName} logo`}
      >
        <X className="h-3 w-3" />
      </button>
    )}
  </div>
);

const noOp = () => undefined;

const adaptHistory = (
  rows: Array<PublicVetoHistoryRow | Record<string, unknown>>,
  maps: PublicVetoGameMap[],
  game: string,
): VetoHistoryEntry[] =>
  rows.map((row) => {
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
  });

const PublicMapVetoView: React.FC<PublicMapVetoViewProps> = ({
  state,
  history,
  historyLoading = false,
  isHost,
  acting,
  onMapAction,
  onReset,
  onPerformToss,
  onPerformTossChoice,
  team1Logo,
  team2Logo,
  onTeam1Logo,
  onTeam2Logo,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSideDialog, setShowSideDialog] = useState(false);
  const [pendingMapId, setPendingMapId] = useState<string | null>(null);

  const veto = useMemo(() => mapApiVetoToLocal(adaptPublicVetoToMatchVeto(state)), [state]);
  const storedMaps = useMemo(
    () => adaptPublicMapsToGameMaps(state.maps, state.game) as GameMap[],
    [state.game, state.maps],
  );
  const gameMaps = useCrispMapImages(storedMaps, state.game);
  const vetoHistory = useMemo(
    () => withMapImages(adaptHistory(history, state.maps, state.game), gameMaps),
    [gameMaps, history, state.game, state.maps],
  );

  const isComplete = veto.status === "completed";
  const stepCards = useMemo(
    () => buildOverlayStepCards({
      veto,
      history: vetoHistory,
      maps: gameMaps,
      game: state.game,
      bestOf: veto.best_of || state.bestOf || 1,
      team1Name: state.team1Name,
      team2Name: state.team2Name,
      team1Id: state.team1Id,
      team2Id: state.team2Id,
    }),
    [veto, vetoHistory, gameMaps, state.game, state.bestOf, state.team1Name, state.team2Name, state.team1Id, state.team2Id],
  );
  const overlayMaps = useMemo(
    () => gameMaps.map((m) => ({ id: String(m.id), name: m.map_name, imageUrl: m.map_image_url })),
    [gameMaps],
  );
  const gameLabel = PUBLIC_VETO_GAMES.find((g) => g.value === state.game)?.label ?? state.game;
  const vetoLive = isVetoLive(veto);
  const tossPending =
    state.status === "pending_toss" || state.status === "toss_choice_pending";
  // Shown until the first veto action, so the team that lost the toss knows what was decided.
  const decisionLine = state.status === "in_progress" && state.currentActionNumber === 1 ? tossDecisionLine(state) : null;
  const currentBestOf = veto.best_of || state.bestOf || 1;
  // currentTeamSide is server-supplied for all roles and is authoritative.
  // Fall back to ID comparison when team1Id is available (host view retains both IDs).
  const resolvedCurrentTeamSide: "team1" | "team2" | null =
    state.currentTeamSide
    ?? (veto.current_team_id && veto.team1_id
      ? (veto.current_team_id === veto.team1_id ? "team1"
        : veto.current_team_id === veto.team2_id ? "team2"
        : null)
      : null);

  const currentTeamName = resolvedCurrentTeamSide === "team1" ? state.team1Name : state.team2Name;
  const activeSide = resolvedCurrentTeamSide;

  const isUserTurn = !isHost
    && veto.status === "in_progress"
    && ((state.role === "team1" && resolvedCurrentTeamSide === "team1")
      || (state.role === "team2" && resolvedCurrentTeamSide === "team2"));
  const handleMapAction = useCallback(async (mapId: string) => {
    if (!veto.current_action || acting) return;
    if (veto.current_action === "pick_side") {
      setPendingMapId(mapId);
      setShowSideDialog(true);
      return;
    }
    setActionLoading(mapId);
    try {
      await onMapAction(mapId);
    } finally {
      setActionLoading(null);
    }
  }, [acting, onMapAction, veto.current_action]);

  const performMapAction = useCallback(async (
    mapId: string,
    actionType: "ban" | "pick" | "pick_side",
    side: "attack" | "defend" | null,
  ) => {
    if (acting) return;
    setActionLoading(mapId);
    try {
      if (actionType === "pick_side") {
        await onMapAction(mapId, serializePublicVetoSide(side));
      } else {
        await onMapAction(mapId);
      }
      setShowSideDialog(false);
      setPendingMapId(null);
    } finally {
      setActionLoading(null);
    }
  }, [acting, onMapAction]);

  const handleDownload = async () => {
    const node = overlayRef.current;
    if (!node) return;
    await downloadNodeAsPng(
      node,
      `map-veto-${state.team1Name}-vs-${state.team2Name}.png`,
      { width: node.offsetWidth, height: node.offsetHeight },
    );
  };

  const lineup = (rail: boolean) => (
    <VetoSelectedMaps
      veto={veto}
      availableMaps={gameMaps}
      allAvailableMaps={gameMaps}
      team1Name={state.team1Name}
      team2Name={state.team2Name}
      team1Id={state.team1Id}
      team2Id={state.team2Id}
      bestOf={currentBestOf}
      history={vetoHistory}
      game={state.game}
      rail={rail}
    />
  );



  const pageHeader = (
    <div className="space-y-1">
      <VetoHeader
        vetoStatus={veto.status}
        effectiveIsOrganizer={isHost}
        handleResetVeto={() => { void onReset(); }}
        resetting={acting}
        vetoId={isHost ? veto.id : undefined}
        team1LinkToken={state.team1Token}
        team2LinkToken={state.team2Token}
        team1Name={state.team1Name}
        team2Name={state.team2Name}
        showShareLinks={isHost}
        getTeamVetoUrl={buildPublicTeamVetoUrl}
      />
      {state.expiresAt && (
        <p className="text-xs text-zinc-500">
          Link expires {new Date(state.expiresAt).toLocaleString()}
        </p>
      )}
    </div>
  );

  const hostTools = (
    <>
      {!isComplete
        && state.status !== "pending_toss"
        && state.status !== "toss_choice_pending"
        && (
          <div className="hidden lg:block">
            {lineup(true)}
          </div>
        )}
    </>
  );

  const sequenceProps = {
    veto,
    entries: vetoHistory,
    loading: historyLoading && vetoHistory.length === 0,
    bestOf: currentBestOf,
    team1Name: state.team1Name,
    team2Name: state.team2Name,
    team1Id: state.team1Id,
    team2Id: state.team2Id,
    availableMaps: gameMaps,
    allAvailableMaps: gameMaps,
    game: state.game,
  };

  const mapPoolPanel = (
    <div className="relative min-w-0">
      <MapPool
        veto={veto}
        availableMaps={gameMaps}
        allAvailableMaps={gameMaps}
        isUserTurn={isUserTurn && !acting}
        actionLoading={isHost ? null : (actionLoading ?? (acting ? "busy" : null))}
        handleMapAction={isHost ? noOp : handleMapAction}
        currentTeamName={currentTeamName}
        team1Name={state.team1Name}
        team2Name={state.team2Name}
        team1Id={state.team1Id}
        team2Id={state.team2Id}
        bestOf={currentBestOf}
        game={state.game}
        layoutMode="fullscreen"
        transitionOnClick={false}
        showInstruction={false}
      />
      {acting && !isHost && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-black/35" aria-hidden="true" />
      )}
    </div>
  );

  const liveStage = (
    <>
      {decisionLine ? <TossDecisionNotice text={decisionLine} /> : null}
      <VetoTurnBanner
        veto={veto}
        isUserTurn={isUserTurn && !acting}
        currentTeamName={currentTeamName}
      />
      <VetoSequence {...sequenceProps} variant="track" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {mapPoolPanel}
        <aside className="min-w-0">{lineup(true)}</aside>
      </div>
      {isHost ? hostTools : null}
    </>
  );

  const completeStage = (
    <>
      {lineup(false)}
      <VetoSequence {...sequenceProps} doneOnly variant="track" />
      {isHost ? hostTools : null}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => { void handleDownload(); }}
          className="flex items-center gap-2 border border-white/10 bg-black/30 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
        >
          <Download className="h-3.5 w-3.5" />
          Download results
        </button>
      </div>
    </>
  );

  const waitingStage = (
    <>
      <p className="border-b border-white/[0.07] pb-4 font-heading text-2xl font-black tracking-tight text-zinc-300">
        The veto opens when both captains join.
      </p>
      <VetoSequence {...sequenceProps} variant="track" emptyMessage="The veto order appears here once it starts." />
      {isHost ? hostTools : null}
    </>
  );

  const tossStage = (
    <PublicVetoTossStage
      state={state}
      isHost={isHost}
      acting={acting}
      onPerformToss={onPerformToss}
      onPerformTossChoice={onPerformTossChoice}
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className="min-h-screen w-full bg-background px-4 py-5 text-white lg:px-8 lg:py-8"
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {decisionLine ?? ""}
      </div>
      <div className="mx-auto max-w-[1400px] space-y-6">
        {pageHeader}
        {isHost && !vetoLive && !isComplete && (
          <div className="flex items-center gap-4">
            <TeamLogoSlot teamName={state.team1Name} value={team1Logo} onChange={onTeam1Logo} />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-600">logos</span>
            <TeamLogoSlot teamName={state.team2Name} value={team2Logo} onChange={onTeam2Logo} />
          </div>
        )}
        <VetoTeamDisplay
          team1Name={state.team1Name}
          team1Logo={team1Logo}
          team2Name={state.team2Name}
          team2Logo={team2Logo}
          activeSide={isComplete || !vetoLive ? null : activeSide}
          completed={isComplete}
          bestOf={currentBestOf}
        />
        {tossPending ? tossStage : isComplete ? completeStage : vetoLive ? liveStage : waitingStage}
      </div>

      {isComplete && (
        <div
          className="pointer-events-none absolute left-[-9999px] top-0 overflow-hidden"
          aria-hidden="true"
        >
          <div ref={overlayRef}>
            <PublicMapVetoBroadcastOverlay
              maps={overlayMaps}
              cards={stepCards}
              gameLabel={gameLabel}
              bestOf={currentBestOf}
              team1Name={state.team1Name}
              team2Name={state.team2Name}
              team1Logo={team1Logo}
              team2Logo={team2Logo}
              status={veto.status}
              onClock={null}
              transparent={false}
              transition="none"
              replay={false}
              ready={true}
            />
          </div>
        </div>
      )}

      {!isHost && (
        <VetoDialogs
          showRoleSwitchPrompt={false}
          setShowRoleSwitchPrompt={noOp}
          handleRoleSwitch={noOp}
          showBODialog={false}
          setShowBODialog={noOp}
          availableMaps={gameMaps}
          allAvailableMaps={gameMaps}
          imagesLoaded={imagesLoaded}
          setImagesLoaded={setImagesLoaded}
          selectedBO={currentBestOf}
          handleSetBO={noOp}
          setDialogManuallyClosed={noOp}
          veto={veto}
          showSideDialog={showSideDialog}
          setShowSideDialog={setShowSideDialog}
          pendingMapId={pendingMapId}
          setPendingMapId={setPendingMapId}
          performMapAction={performMapAction}
          setActionLoading={setActionLoading}
          team1Name={state.team1Name}
          team2Name={state.team2Name}
          game={state.game}
          bestOf={currentBestOf}
        />
      )}
    </motion.div>
  );
};

export const PublicMapVetoLoading = () => (
  <div className="min-h-screen w-full bg-background px-4 py-5 lg:px-8 lg:py-8">
    <div className="mx-auto max-w-[1400px] space-y-4">
      <Skeleton className="h-7 w-48 rounded-none bg-white/[0.06]" />
      <Skeleton className="h-20 w-full rounded-none bg-white/[0.06]" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((item) => (
          <Skeleton key={item} className="h-[236px] flex-1 rounded-none bg-white/[0.04] sm:h-[272px]" />
        ))}
      </div>
    </div>
  </div>
);

export default PublicMapVetoView;
