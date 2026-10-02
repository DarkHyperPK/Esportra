import React, { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Link2, MonitorUp, RefreshCw } from "lucide-react";
import { MapPool } from "@/components/tournament/map-veto/MapPool";
import { VetoDialogs } from "@/components/tournament/map-veto/VetoDialogs";
import { VetoHeader } from "@/components/tournament/map-veto/VetoHeader";
import { VetoSelectedMaps } from "@/components/tournament/map-veto/VetoSelectedMaps";
import { VetoSequence } from "@/components/tournament/map-veto/VetoSequence";
import { VetoTeamDisplay } from "@/components/tournament/map-veto/VetoTeamDisplay";
import { VetoTurnBanner } from "@/components/tournament/map-veto/VetoTurnBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandButton } from "@/components/management/CommandSurface";
import { useToast } from "@/hooks/use-toast";
import { GameMap, isVetoLive, mapApiVetoToLocal } from "@/hooks/useMapVetoMachine";
import { normalizeHistoryEntry, VetoHistoryEntry } from "@/hooks/useVetoHistory";
import { copyText } from "./publicToolUtils";
import {
  adaptPublicMapsToGameMaps,
  adaptPublicVetoToMatchVeto,
  buildPublicHostVetoUrl,
  buildPublicTeamVetoUrl,
  buildPublicVetoOverlayUrl,
  PublicVetoGameMap,
  PublicVetoHistoryRow,
  PublicVetoState,
  normalizePublicVetoHistoryRow,
  serializePublicVetoSide,
} from "./publicMapVetoUtils";

const OBS_PREVIEW_WIDTH = 1600;
const OBS_PREVIEW_HEIGHT = 900;
const OVERLAY_THEMES = [
  { value: "broadcast", label: "Esportra broadcast" },
  { value: "tactical", label: "Tactical Neon" },
  { value: "premium", label: "Premium Minimal" },
  { value: "glitch", label: "Glitch Arena" },
] as const;

const OverlayPreviewFrame = ({
  src,
  refreshKey,
  title,
}: {
  src: string;
  refreshKey: number;
  title: string;
}) => {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  React.useEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const update = () => setScale(element.clientWidth / OBS_PREVIEW_WIDTH);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="relative aspect-video w-full overflow-hidden border border-white/10 bg-black">
      <div
        className="absolute left-0 top-0"
        style={{
          width: OBS_PREVIEW_WIDTH,
          height: OBS_PREVIEW_HEIGHT,
          transform: `scale(${scale || 0.001})`,
          transformOrigin: "top left",
        }}
      >
        <iframe
          key={`${src}-${refreshKey}`}
          src={src}
          title={title}
          className="h-full w-full border-0"
          loading="eager"
        />
      </div>
    </div>
  );
};

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
}) => {
  const { toast } = useToast();
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSideDialog, setShowSideDialog] = useState(false);
  const [pendingMapId, setPendingMapId] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);
  const [overlayTransition, setOverlayTransition] = useState("up");
  const [overlayTheme, setOverlayTheme] = useState("broadcast");
  const [overlayPlayback, setOverlayPlayback] = useState("live");
  const [overlayPreviewKey, setOverlayPreviewKey] = useState(0);

  const veto = useMemo(() => mapApiVetoToLocal(adaptPublicVetoToMatchVeto(state)), [state]);
  const gameMaps = useMemo(
    () => adaptPublicMapsToGameMaps(state.maps, state.game) as GameMap[],
    [state.game, state.maps],
  );
  const vetoHistory = useMemo(
    () => adaptHistory(history, state.maps, state.game),
    [history, state.game, state.maps],
  );

  const isComplete = veto.status === "completed";
  const vetoLive = isVetoLive(veto);
  const currentBestOf = veto.best_of || state.bestOf || 1;
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
  const overlayToken = state.overlayToken ?? state.hostToken;
  const overlayPreviewUrl = overlayToken ? buildPublicVetoOverlayUrl(overlayToken, overlayTransition, overlayTheme, overlayPlayback) : "";

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
      game={state.game}
      rail={rail}
    />
  );

  const copyHostLink = async () => {
    if (!state.hostToken) return;
    await copyText(buildPublicHostVetoUrl(state.hostToken));
    setCopiedHost(true);
    toast({ title: "Host link copied" });
    window.setTimeout(() => setCopiedHost(false), 2000);
  };

  const copyOverlayLink = async () => {
    if (!overlayToken) return;
    await copyText(buildPublicVetoOverlayUrl(overlayToken, overlayTransition, overlayTheme, overlayPlayback));
    setCopiedOverlay(true);
    toast({ title: "OBS overlay link copied" });
    window.setTimeout(() => setCopiedOverlay(false), 2000);
  };

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
      {isHost && (state.hostToken || state.overlayToken) && (
        <section className="space-y-3 border-t border-white/[0.07] pt-6" aria-label="Host tools">
          <h3 className="font-heading text-lg font-bold tracking-tight text-white">Host tools</h3>
          <div className="flex flex-wrap gap-2">
            {state.hostToken && (
              <CommandButton variant="ghost" size="sm" onClick={() => { void copyHostLink(); }}>
                {copiedHost ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                Observer link
              </CommandButton>
            )}
            {(state.overlayToken || state.hostToken) && (
              <div className="flex overflow-hidden border border-white/10">
                <select
                  value={overlayTransition}
                  onChange={(event) => setOverlayTransition(event.target.value)}
                  className="h-9 border-r border-white/10 bg-black/40 px-2 font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-200 outline-none focus-visible:bg-white/[0.06]"
                  aria-label="OBS overlay transition"
                >
                  <option value="up">Slide up</option>
                  <option value="left">Slide left</option>
                  <option value="right">Slide right</option>
                  <option value="none">None</option>
                </select>
                <select
                  value={overlayTheme}
                  onChange={(event) => setOverlayTheme(event.target.value)}
                  className="h-9 border-r border-white/10 bg-black/40 px-2 font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-200 outline-none focus-visible:bg-white/[0.06]"
                  aria-label="OBS overlay theme"
                >
                  {OVERLAY_THEMES.map((theme) => (
                    <option key={theme.value} value={theme.value}>{theme.label}</option>
                  ))}
                </select>
                {overlayTheme === "broadcast" && (
                  <select
                    value={overlayPlayback}
                    onChange={(event) => setOverlayPlayback(event.target.value)}
                    className="h-9 border-r border-white/10 bg-black/40 px-2 font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-200 outline-none focus-visible:bg-white/[0.06]"
                    aria-label="OBS overlay playback"
                  >
                    <option value="live">Follow live</option>
                    <option value="replay">Full replay</option>
                  </select>
                )}
                <CommandButton variant="ghost" size="sm" className="border-0" onClick={() => { void copyOverlayLink(); }}>
                  {copiedOverlay ? <Check className="h-3.5 w-3.5" /> : <MonitorUp className="h-3.5 w-3.5" />}
                  Copy OBS link
                </CommandButton>
              </div>
            )}
            {overlayPreviewUrl && (
              <CommandButton variant="ghost" size="sm" onClick={() => setOverlayPreviewKey((key) => key + 1)}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh preview
              </CommandButton>
            )}
          </div>
          {overlayPreviewUrl && (
            <div className="space-y-2 border border-white/[0.07] bg-card p-2">
              <OverlayPreviewFrame
                src={overlayPreviewUrl}
                refreshKey={overlayPreviewKey}
                title="Map veto OBS overlay preview"
              />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {OVERLAY_THEMES.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => setOverlayTheme(theme.value)}
                    aria-pressed={overlayTheme === theme.value}
                    className={`space-y-1 p-1 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${overlayTheme === theme.value ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]" : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"}`}
                  >
                    <div className="px-1 text-xs text-zinc-300">{theme.label}</div>
                    <OverlayPreviewFrame
                      src={overlayToken ? buildPublicVetoOverlayUrl(overlayToken, overlayTransition, theme.value) : ""}
                      refreshKey={overlayPreviewKey}
                      title={`Map veto ${theme.label} preview`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className="min-h-screen w-full bg-background px-4 py-5 text-white lg:px-8 lg:py-8"
    >
      <div className="mx-auto max-w-[1400px] space-y-6">
        {pageHeader}
        <VetoTeamDisplay
          team1Name={state.team1Name}
          team2Name={state.team2Name}
          activeSide={isComplete || !vetoLive ? null : activeSide}
          completed={isComplete}
          bestOf={currentBestOf}
        />
        {isComplete ? completeStage : vetoLive ? liveStage : waitingStage}
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
