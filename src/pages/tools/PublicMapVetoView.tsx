import React, { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Link2 } from "lucide-react";
import { MapPool } from "@/components/tournament/map-veto/MapPool";
import { VetoDialogs } from "@/components/tournament/map-veto/VetoDialogs";
import { VetoHeader } from "@/components/tournament/map-veto/VetoHeader";
import { VetoSelectedMaps } from "@/components/tournament/map-veto/VetoSelectedMaps";
import { VetoSequence } from "@/components/tournament/map-veto/VetoSequence";
import { VetoTeamDisplay } from "@/components/tournament/map-veto/VetoTeamDisplay";
import { getVetoActionClasses, getVetoActionNoun } from "@/components/tournament/map-veto/vetoActionPresentation";
import { getVetoLayoutConfig } from "@/components/tournament/map-veto/vetoLayoutConfig";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GameMap, isVetoLive, mapApiVetoToLocal } from "@/hooks/useMapVetoMachine";
import { normalizeHistoryEntry, VetoHistoryEntry } from "@/hooks/useVetoHistory";
import { cn } from "@/lib/utils";
import { copyText } from "./publicToolUtils";
import {
  adaptPublicMapsToGameMaps,
  adaptPublicVetoToMatchVeto,
  buildPublicHostVetoUrl,
  buildPublicTeamVetoUrl,
  PublicVetoHistoryRow,
  PublicVetoState,
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
};

const noOp = () => undefined;

const adaptHistory = (rows: PublicVetoHistoryRow[]): VetoHistoryEntry[] =>
  rows.map((row) => normalizeHistoryEntry({
    actionNumber: row.actionNumber,
    teamSide: row.teamSide ?? (row.teamName ? undefined : "team1"),
    teamName: row.teamName,
    action: row.action,
    mapId: row.mapId,
    mapName: row.mapName,
    mapImageUrl: row.mapImageUrl,
    side: row.side,
    createdAt: row.createdAt,
  }));

const PublicMapVetoView: React.FC<PublicMapVetoViewProps> = ({
  state,
  history,
  historyLoading = false,
  isHost,
  acting,
  onMapAction,
  onReset,
}) => {
  const { toast } = useToast();
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSideDialog, setShowSideDialog] = useState(false);
  const [pendingMapId, setPendingMapId] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);

  const veto = useMemo(() => mapApiVetoToLocal(adaptPublicVetoToMatchVeto(state)), [state]);
  const gameMaps = useMemo(
    () => adaptPublicMapsToGameMaps(state.maps, state.game) as GameMap[],
    [state.game, state.maps],
  );
  const vetoHistory = useMemo(() => adaptHistory(history), [history]);

  const isComplete = veto.status === "completed";
  const vetoLive = isVetoLive(veto);
  const layout = "fullscreen" as const;
  const ui = getVetoLayoutConfig(layout, isComplete);
  const currentBestOf = veto.best_of || state.bestOf || 1;
  const boText = `BO${currentBestOf}`;
  const currentTeamName = veto.current_team_id === veto.team1_id ? state.team1Name : state.team2Name;
  const activeSide = veto.current_team_id === veto.team1_id
    ? "team1"
    : veto.current_team_id === veto.team2_id
      ? "team2"
      : null;

  const isUserTurn = !isHost
    && veto.status === "in_progress"
    && ((state.role === "team1" && veto.current_team_id === veto.team1_id)
      || (state.role === "team2" && veto.current_team_id === veto.team2_id));

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

  const renderSelectedMapsPanel = (compact = ui.selectedMapsCompact, className = "mb-0", rail = false) => (
    <VetoSelectedMaps
      veto={veto}
      availableMaps={gameMaps}
      allAvailableMaps={gameMaps}
      team1Name={state.team1Name}
      team2Name={state.team2Name}
      team1Id={state.team1Id}
      team2Id={state.team2Id}
      imagesLoaded={imagesLoaded}
      setImagesLoaded={setImagesLoaded}
      bestOf={currentBestOf}
      game={state.game}
      compact={compact}
      rail={rail}
      className={className}
    />
  );

  const copyHostLink = async () => {
    if (!state.hostToken) return;
    await copyText(buildPublicHostVetoUrl(state.hostToken));
    setCopiedHost(true);
    toast({ title: "Host link copied" });
    window.setTimeout(() => setCopiedHost(false), 2000);
  };

  const leftRail = (
    <>
      <div className="mb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-400">Public tools</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">
          {state.team1Name} <span className="text-zinc-500">vs</span> {state.team2Name}
        </h2>
        {state.expiresAt && (
          <p className="mt-1 text-[11px] text-zinc-500">
            Expires {new Date(state.expiresAt).toLocaleString()}
          </p>
        )}
      </div>

      <VetoHeader
        boText={boText}
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
        compact={ui.headerCompact}
        getTeamVetoUrl={buildPublicTeamVetoUrl}
      />

      {isHost && state.hostToken && (
        <Button
          type="button"
          onClick={() => { void copyHostLink(); }}
          variant="outline"
          size="sm"
          className="gap-1.5 border-white/20 text-white/80 hover:bg-white/10"
        >
          {copiedHost ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
          Host observer link
        </Button>
      )}

      {!isComplete && (
        <div className="hidden lg:block">
          {renderSelectedMapsPanel(true, "mb-0", true)}
        </div>
      )}
    </>
  );

  const teamRow = (
    <div className="mb-3 flex justify-center sm:mb-4">
      <VetoTeamDisplay
        team1Name={state.team1Name}
        team2Name={state.team2Name}
        activeSide={isComplete ? null : activeSide}
        currentAction={veto.current_action}
        completed={isComplete}
        bestOf={currentBestOf}
        compact={false}
      />
    </div>
  );

  const mapPoolPanel = (
    <MapPool
      veto={veto}
      availableMaps={gameMaps}
      allAvailableMaps={gameMaps}
      isUserTurn={isUserTurn}
      actionLoading={isHost ? null : (actionLoading ?? (acting ? "busy" : null))}
      handleMapAction={isHost ? noOp : handleMapAction}
      imagesLoaded={imagesLoaded}
      setImagesLoaded={setImagesLoaded}
      currentTeamName={currentTeamName}
      team1Name={state.team1Name}
      team2Name={state.team2Name}
      team1Id={state.team1Id}
      team2Id={state.team2Id}
      bestOf={currentBestOf}
      game={state.game}
      layoutMode={layout}
    />
  );

  const sequencePanel = (
    <div className={cn(
      "min-h-0 rounded-xl border border-white/10 bg-black/30 p-2.5 sm:p-3",
      isComplete && "bg-gradient-to-b from-white/[0.04] to-black/30",
    )}>
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3 sm:gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Veto Sequence</div>
          <div className="mt-0.5 text-[11px] text-zinc-500 sm:mt-1 sm:text-xs">
            {isComplete ? "Final ban/pick recap" : "Live turn order"}
          </div>
        </div>
        {!isComplete && veto.current_action && (
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest sm:px-2.5 sm:py-1 sm:text-[10px]",
            getVetoActionClasses(veto.current_action),
          )}>
            {getVetoActionNoun(veto.current_action)}
          </span>
        )}
      </div>
      <div className={ui.sequenceScroll} data-lenis-prevent>
        <VetoSequence
          veto={veto}
          entries={vetoHistory}
          loading={historyLoading}
          bestOf={currentBestOf}
          team1Name={state.team1Name}
          team2Name={state.team2Name}
          team1Id={state.team1Id}
          team2Id={state.team2Id}
          availableMaps={gameMaps}
          allAvailableMaps={gameMaps}
          game={state.game}
          compact={ui.sequenceCompact}
          columns={ui.sequenceColumns}
          emptyMessage={!vetoLive ? "Veto has not started yet." : "No veto actions recorded yet."}
        />
      </div>
    </div>
  );

  const turnBar = !isComplete && vetoLive && veto.current_action ? (
    <motion.div
      key={`${veto.current_action_number}-${veto.current_team_id}-${veto.current_action}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 sm:px-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Current Turn</div>
          <div className={cn("mt-0.5 text-sm font-black", isUserTurn ? "text-rose-200" : "text-white")}>
            {isHost
              ? `${currentTeamName}'s turn`
              : isUserTurn
                ? "Your turn"
                : `${currentTeamName}'s turn`}
          </div>
        </div>
        <span className={cn(
          "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
          getVetoActionClasses(veto.current_action),
        )}>
          {getVetoActionNoun(veto.current_action)}
        </span>
      </div>
    </motion.div>
  ) : null;

  const stageContent = isComplete ? (
    <>
      <div className="min-w-0">{renderSelectedMapsPanel()}</div>
      <div className="min-w-0">{sequencePanel}</div>
    </>
  ) : (
    <>
      {turnBar}
      <div className={ui.stageGrid}>
        <div className="min-w-0">{mapPoolPanel}</div>
        <div className="min-w-0">{sequencePanel}</div>
      </div>
      <div className="min-w-0 lg:hidden">{renderSelectedMapsPanel()}</div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={ui.shell}
    >
      {teamRow}
      <div className={ui.grid}>
        <aside className={ui.rail}>{leftRail}</aside>
        <main className={ui.stage}>{stageContent}</main>
      </div>

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

export const PublicMapVetoLoading = () => {
  const ui = getVetoLayoutConfig("fullscreen", false);
  return (
    <div className={ui.shell}>
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-white/10" />
        <div className={cn("grid gap-2.5", ui.mapPool.gridCols)}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <Skeleton key={item} className={cn("w-full rounded-lg bg-white/10", ui.mapPool.tileHeight)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicMapVetoView;
