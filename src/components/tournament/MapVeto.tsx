import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { isVetoLive, useMapVetoMachine } from '@/hooks/useMapVetoMachine';
import { VetoHeader } from './map-veto/VetoHeader';
import { VetoTeamDisplay } from './map-veto/VetoTeamDisplay';
import { VetoSelectedMaps } from './map-veto/VetoSelectedMaps';
import { MapPool } from './map-veto/MapPool';
import { VetoDialogs } from './map-veto/VetoDialogs';
import { VetoSequence } from './map-veto/VetoSequence';
import { VetoSettingsPanel } from './map-veto/VetoSettingsPanel';
import { useVetoSettings } from '@/hooks/useVetoSettings';
import { useVetoHistory } from '@/hooks/useVetoHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getVetoActionClasses, getVetoActionNoun } from './map-veto/vetoActionPresentation';
import { getVetoLayoutConfig } from './map-veto/vetoLayoutConfig';

interface MapVetoProps {
  matchId: string;
  tournamentId: string;
  tournamentSlug?: string | null;
  team1Id?: string | null;
  team2Id?: string | null;
  team1Name?: string;
  team2Name?: string;
  game?: string;
  bestOf?: number;
  onComplete?: () => void;
  forcedTeamId?: string | null;
  vetoToken?: string | null;
  matchStatus?: 'pending' | 'in_progress' | 'completed';
  layout?: 'modal' | 'fullscreen' | 'embedded';
  showShareLinks?: boolean;
  readOnly?: boolean;
  suppressRoleSwitchPrompt?: boolean;
}
const noOp = () => { };

export const MapVeto: React.FC<MapVetoProps> = ({
  matchId,
  tournamentId,
  tournamentSlug,
  team1Id,
  team2Id,
  team1Name = 'Team 1',
  team2Name = 'Team 2',
  bestOf,
  game = 'valorant',
  onComplete,
  forcedTeamId,
  vetoToken,
  layout = 'embedded',
  showShareLinks = true,
  readOnly = false,
  suppressRoleSwitchPrompt = false,
}) => {
  const {
    veto,
    loading,
    availableMaps,
    allAvailableMaps,
    actionLoading,
    showBODialog,
    setShowBODialog,
    dialogStep,
    setDialogStep,
    selectedBO,
    handleSetBO,
    showRoleSwitchPrompt,
    setShowRoleSwitchPrompt,
    handleRoleSwitch,
    imagesLoaded,
    setImagesLoaded,
    handleMapAction,
    handleResetVeto,
    resetting,
    isOrganizer,
    isCaptain: _isCaptain,
    userTeamId: _userTeamId,
    showSideDialog,
    setShowSideDialog,
    pendingMapId,
    setPendingMapId,
    performMapAction,
    setDialogManuallyClosed,
    team1Logo,
    team2Logo,
    isTeam1Captain,
    isTeam2Captain
  } = useMapVetoMachine({
    matchId,
    tournamentId,
    tournamentSlug,
    team1Id,
    team2Id,
    team1Name,
    team2Name,
    bestOf,
    game,
    forcedTeamId,
    vetoToken,
    onComplete,
  });

  const { data: vetoHistory = [], isLoading: vetoHistoryLoading } = useVetoHistory(
    matchId,
    !loading && Boolean(veto),
    vetoToken,
  );

  const isUserTurn = useMemo(() => {
    if (readOnly || !veto) return false;
    if (forcedTeamId) return veto.current_team_id === forcedTeamId;
    if (veto.current_team_id === veto.team1_id && isTeam1Captain) return true;
    if (veto.current_team_id === veto.team2_id && isTeam2Captain) return true;
    return false;
  }, [forcedTeamId, veto, isTeam1Captain, isTeam2Captain, readOnly]);


  const { settings: vetoSettings } = useVetoSettings({
    matchId,
    vetoStatus: veto?.status,
    enabled: Boolean(veto),
  });

  const layoutConfig = getVetoLayoutConfig(layout, false);

  if (loading) {
    return (
      <div className={layoutConfig.shell}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-40 bg-white/10" />
          <div className={cn('grid gap-2.5', layoutConfig.mapPool.gridCols)}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className={cn('w-full rounded-lg bg-white/10', layoutConfig.mapPool.tileHeight)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!veto) {
    return (
      <div className="flex items-center justify-center min-h-[280px]">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-white">No Veto Found</h2>
          <p className="text-zinc-500 text-sm">Waiting for organizer to initialize the veto...</p>
        </div>
      </div>
    );
  }

  const effectiveIsOrganizer = isOrganizer && !readOnly;
  const isComplete = veto.status === 'completed';
  const vetoLive = isVetoLive(veto);
  const ui = getVetoLayoutConfig(layout, isComplete);
  const currentBestOf = veto.best_of || bestOf || 1;
  const boText = `BO${currentBestOf}`;
  const currentTeamName = veto.current_team_id === veto.team1_id ? team1Name : team2Name;
  const noopMapAction = readOnly ? noOp : handleMapAction;
  const activeSide = veto.current_team_id === veto.team1_id
    ? 'team1'
    : veto.current_team_id === veto.team2_id
      ? 'team2'
      : null;
  const showSelectedMapsInRail = layout === 'fullscreen' && !isComplete;
  const renderSelectedMapsPanel = (compact = ui.selectedMapsCompact, className = 'mb-0', rail = false) => (
    <VetoSelectedMaps
      veto={veto}
      availableMaps={availableMaps}
      allAvailableMaps={allAvailableMaps}
      team1Name={team1Name}
      team2Name={team2Name}
      team1Id={team1Id}
      team2Id={team2Id}
      imagesLoaded={imagesLoaded}
      setImagesLoaded={setImagesLoaded}
      bestOf={currentBestOf}
      game={game}
      compact={compact}
      rail={rail}
      className={className}
    />
  );

  const sequencePanel = (
    <div className="min-h-0 py-1">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
          {isComplete ? 'Recap' : 'Veto order'}
        </span>
        {!isComplete && veto.current_action && (
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest',
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
          loading={vetoHistoryLoading}
          bestOf={currentBestOf}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Id={team1Id}
          team2Id={team2Id}
          availableMaps={availableMaps}
          allAvailableMaps={allAvailableMaps}
          game={game}
          compact={ui.sequenceCompact}
          columns={ui.sequenceColumns}
          externalSequence={vetoSettings?.effectiveSequence}
          emptyMessage={
            !vetoLive && !vetoSettings?.effectiveSequence?.length
              ? 'Veto has not started yet.'
              : 'No veto actions recorded yet.'
          }
        />
      </div>
    </div>
  );

  const leftRail = (
    <div className="flex min-h-0 flex-col">
      <VetoHeader
        boText={boText}
        vetoStatus={veto.status}
        effectiveIsOrganizer={effectiveIsOrganizer}
        handleResetVeto={handleResetVeto}
        resetting={resetting}
        vetoId={readOnly ? undefined : veto.id}
        team1LinkToken={veto.team1_link_token}
        team2LinkToken={veto.team2_link_token}
        team1Name={team1Name}
        team2Name={team2Name}
        showShareLinks={showShareLinks && !readOnly}
        compact={ui.headerCompact}
      />

      {effectiveIsOrganizer && (
        <>
          <div className="my-2 h-px bg-white/[0.06]" />
          <VetoSettingsPanel
            matchId={matchId}
            vetoStatus={veto.status}
            team1Name={team1Name}
            team2Name={team2Name}
          />
        </>
      )}

      {layout === 'modal' && !isComplete && (
        <>
          <div className="my-3 h-px bg-white/[0.06]" />
          <div className="min-h-0 flex-1 overflow-hidden">
            {sequencePanel}
          </div>
        </>
      )}

      {showSelectedMapsInRail && (
        <>
          <div className="my-3 h-px bg-white/[0.06]" />
          <div className="hidden lg:block">
            {renderSelectedMapsPanel(true, 'mb-0', true)}
          </div>
        </>
      )}
    </div>
  );

  const teamRow = (
    <div className="mb-3 flex justify-center sm:mb-4">
      <VetoTeamDisplay
        team1Name={team1Name}
        team1Logo={team1Logo}
        team2Name={team2Name}
        team2Logo={team2Logo}
        activeSide={isComplete ? null : activeSide}
        currentAction={veto.current_action}
        completed={isComplete}
        bestOf={currentBestOf}
        compact={layout === 'modal'}
      />
    </div>
  );

  const mapPoolPanel = (
    <MapPool
      veto={veto}
      availableMaps={availableMaps}
      allAvailableMaps={allAvailableMaps}
      isUserTurn={isUserTurn}
      actionLoading={readOnly ? null : actionLoading}
      handleMapAction={noopMapAction}
      imagesLoaded={imagesLoaded}
      setImagesLoaded={setImagesLoaded}
      currentTeamName={currentTeamName}
      team1Name={team1Name}
      team2Name={team2Name}
      team1Id={team1Id}
      team2Id={team2Id}
      team1Logo={team1Logo}
      team2Logo={team2Logo}
      bestOf={currentBestOf}
      game={game}
      layoutMode={layout}
    />
  );

  const selectedMapsPanel = renderSelectedMapsPanel();

  const turnBar = !isComplete && vetoLive && veto.current_action ? (
    <motion.div
      key={`${veto.current_action_number}-${veto.current_team_id}-${veto.current_action}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={cn(
        'bg-transparent',
        layout === 'modal'
          ? 'rounded-md border border-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3'
          : 'border-t border-white/[0.06] px-3 py-3 sm:px-4 sm:py-3.5',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Current Turn</div>
          <div className={cn('mt-0.5 text-sm font-black tracking-tight', isUserTurn ? 'text-rose-300' : 'text-white')}>
            {isUserTurn ? 'Your turn' : `${currentTeamName}'s turn`}
          </div>
        </div>
        {veto.current_action && (
          <span className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest',
            getVetoActionClasses(veto.current_action),
          )}>
            {getVetoActionNoun(veto.current_action)}
          </span>
        )}
      </div>
    </motion.div>
  ) : null;

  const modalStatusBar = layout === 'modal' ? (
    <div className="mb-3 border-b border-white/[0.06] pb-3">
      <VetoTeamDisplay
        team1Name={team1Name}
        team1Logo={team1Logo}
        team2Name={team2Name}
        team2Logo={team2Logo}
        activeSide={isComplete ? null : activeSide}
        currentAction={veto.current_action}
        completed={isComplete}
        bestOf={currentBestOf}
        compact={true}
      />
    </div>
  ) : null;

  const stageContent = isComplete ? (
    <>
      <div className="min-w-0">{selectedMapsPanel}</div>
      {layout !== 'modal' && <div className="min-w-0">{sequencePanel}</div>}
    </>
  ) : (
    <>
      {layout === 'modal' ? (
        <>
          <div className="min-w-0">{mapPoolPanel}</div>
          <div className="min-w-0">{selectedMapsPanel}</div>
        </>
      ) : (
        <>
          {turnBar}
          <div className={ui.stageGrid}>
            <div className="min-w-0">{mapPoolPanel}</div>
            <div className="min-w-0">{sequencePanel}</div>
          </div>
          {showSelectedMapsInRail ? (
            <div className="min-w-0 lg:hidden">{selectedMapsPanel}</div>
          ) : (
            <div className="min-w-0">{selectedMapsPanel}</div>
          )}
        </>
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={ui.shell}
    >
      {layout === 'modal' ? modalStatusBar : teamRow}
      <div className={ui.grid}>
        <aside className={ui.rail}>
          {leftRail}
        </aside>
        <main className={ui.stage}>
          {stageContent}
        </main>
      </div>

      {!readOnly && (
        <VetoDialogs
          showRoleSwitchPrompt={showRoleSwitchPrompt && !suppressRoleSwitchPrompt}
          setShowRoleSwitchPrompt={setShowRoleSwitchPrompt}
          handleRoleSwitch={handleRoleSwitch}
          showBODialog={showBODialog}
          setShowBODialog={setShowBODialog}
          dialogStep={dialogStep}
          setDialogStep={setDialogStep}
          availableMaps={availableMaps}
          allAvailableMaps={allAvailableMaps}
          imagesLoaded={imagesLoaded}
          setImagesLoaded={setImagesLoaded}
          selectedBO={selectedBO}
          handleSetBO={handleSetBO}
          setDialogManuallyClosed={setDialogManuallyClosed}
          veto={veto}
          showSideDialog={showSideDialog}
          setShowSideDialog={setShowSideDialog}
          pendingMapId={pendingMapId}
          setPendingMapId={setPendingMapId}
          performMapAction={performMapAction}
          setActionLoading={noOp}
          team1Name={team1Name}
          team2Name={team2Name}
          game={game}
          bestOf={currentBestOf}
        />
      )}
    </motion.div>
  );
};
