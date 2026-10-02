import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getVetoFormat, isVetoLive, useMapVetoMachine, VetoService } from '@/hooks/useMapVetoMachine';
import { VetoHeader } from './map-veto/VetoHeader';
import { VetoTeamDisplay } from './map-veto/VetoTeamDisplay';
import { VetoSelectedMaps } from './map-veto/VetoSelectedMaps';
import { MapPool } from './map-veto/MapPool';
import { VetoDialogs } from './map-veto/VetoDialogs';
import { VetoSequence } from './map-veto/VetoSequence';
import { VetoSettingsPanel } from './map-veto/VetoSettingsPanel';
import { VetoTurnBanner } from './map-veto/VetoTurnBanner';
import { useVetoSettings } from '@/hooks/useVetoSettings';
import { useVetoHistory } from '@/hooks/useVetoHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
    vetoStatus: veto?.status ?? 'pending',
    enabled: Boolean(veto),
  });

  const isModal = layout === 'modal';
  const shellClass = cn(
    'w-full bg-background text-white',
    isModal && 'p-3 sm:p-4',
    layout === 'fullscreen' && 'min-h-screen px-4 py-5 lg:px-8 lg:py-8',
    layout === 'embedded' && 'mx-auto max-w-[1400px] p-3 sm:p-5 lg:p-6',
  );

  if (loading) {
    return (
      <div className={shellClass} data-testid="map-veto-loading">
        <div className="space-y-4">
          <Skeleton className="h-7 w-48 rounded-none bg-white/[0.06]" />
          <Skeleton className="h-20 w-full rounded-none bg-white/[0.06]" />
          <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="aspect-[16/10] w-full rounded-none bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!veto) {
    return (
      <div className={shellClass}>
        <div className="border border-dashed border-white/10 px-6 py-14 text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Map veto</p>
          <p className="mt-2 font-heading text-xl font-bold text-white">No veto for this match yet</p>
          <p className="mt-1 text-sm text-zinc-500">It appears here once the organizer opens it.</p>
        </div>
      </div>
    );
  }

  const effectiveIsOrganizer = isOrganizer && !readOnly;
  const isComplete = veto.status === 'completed';
  const vetoLive = isVetoLive(veto);
  const currentBestOf = veto.best_of || bestOf || 1;
  const currentTeamName = veto.current_team_id === veto.team1_id ? team1Name : team2Name;
  const activeSide = veto.current_team_id === veto.team1_id
    ? 'team1'
    : veto.current_team_id === veto.team2_id
      ? 'team2'
      : null;
  const totalSteps = vetoSettings?.effectiveSequence?.length
    || new VetoService(game, allAvailableMaps.length || undefined).getSequence(getVetoFormat(currentBestOf)).length;

  const sequenceProps = {
    veto,
    entries: vetoHistory,
    loading: vetoHistoryLoading,
    bestOf: currentBestOf,
    team1Name,
    team2Name,
    team1Id,
    team2Id,
    availableMaps,
    allAvailableMaps,
    game,
    externalSequence: vetoSettings?.effectiveSequence,
    team1Logo,
    team2Logo,
  };

  const lineup = (rail: boolean) => (
    <VetoSelectedMaps
      veto={veto}
      availableMaps={availableMaps}
      allAvailableMaps={allAvailableMaps}
      team1Name={team1Name}
      team2Name={team2Name}
      team1Id={team1Id}
      team2Id={team2Id}
      bestOf={currentBestOf}
      history={vetoHistory}
      game={game}
      rail={rail}
    />
  );

  const settingsPanel = effectiveIsOrganizer ? (
    <VetoSettingsPanel
      matchId={matchId}
      vetoStatus={veto.status}
      team1Name={team1Name}
      team2Name={team2Name}
    />
  ) : null;

  const completeStage = (
    <>
      {lineup(false)}
      <section aria-label="Veto recap">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">How the veto went</p>
        <VetoSequence {...sequenceProps} doneOnly variant="track" />
      </section>
    </>
  );

  const liveStage = (
    <>
      <VetoTurnBanner
        veto={veto}
        isUserTurn={isUserTurn}
        currentTeamName={currentTeamName}
        totalSteps={totalSteps}
        compact={isModal}
      />
      <VetoSequence {...sequenceProps} variant="track" />
      <div className={cn('grid gap-6', !isModal && 'lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]')}>
        <MapPool
          veto={veto}
          availableMaps={availableMaps}
          allAvailableMaps={allAvailableMaps}
          isUserTurn={isUserTurn}
          actionLoading={readOnly ? null : actionLoading}
          handleMapAction={readOnly ? noOp : handleMapAction}
          currentTeamName={currentTeamName}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Id={team1Id}
          team2Id={team2Id}
          bestOf={currentBestOf}
          game={game}
          layoutMode={layout}
          showInstruction={false}
        />
        <aside className="min-w-0 space-y-5">
          {lineup(true)}
          {settingsPanel}
        </aside>
      </div>
    </>
  );

  const waitingStage = (
    <>
      <div className="border-b border-white/[0.07] pb-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Not started</p>
        <p className="mt-1.5 font-heading text-2xl font-black tracking-tight text-zinc-300">
          {effectiveIsOrganizer ? 'Set the format to open the veto.' : 'The veto opens when the organizer sets the format.'}
        </p>
      </div>
      <VetoSequence {...sequenceProps} variant="track" emptyMessage="The veto order appears here once the format is set." />
      {settingsPanel}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className={shellClass}
    >
      <div className={cn('space-y-5', !isModal && 'sm:space-y-6')}>
        <VetoHeader
          boText={`BO${currentBestOf}`}
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
          compact={isModal}
        />
        <VetoTeamDisplay
          team1Name={team1Name}
          team1Logo={team1Logo}
          team2Name={team2Name}
          team2Logo={team2Logo}
          activeSide={isComplete || !vetoLive ? null : activeSide}
          currentAction={veto.current_action}
          completed={isComplete}
          bestOf={currentBestOf}
          compact={isModal}
        />
        {isComplete ? completeStage : vetoLive ? liveStage : waitingStage}
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
