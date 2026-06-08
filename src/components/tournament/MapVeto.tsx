import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMapVetoMachine } from '@/hooks/useMapVetoMachine';
import { VetoHeader } from './map-veto/VetoHeader';
import { VetoTeamDisplay } from './map-veto/VetoTeamDisplay';
import { VetoSelectedMaps } from './map-veto/VetoSelectedMaps';
import { MapPool } from './map-veto/MapPool';
import { VetoDialogs } from './map-veto/VetoDialogs';
import { VetoSequence } from './map-veto/VetoSequence';
import { useVetoHistory } from '@/hooks/useVetoHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getVetoActionClasses, getVetoActionNoun } from './map-veto/vetoActionPresentation';

interface MapVetoProps {
  matchId: string;
  tournamentId: string;
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
    if (veto.current_team_id === veto.team1_id && isTeam1Captain) return true;
    if (veto.current_team_id === veto.team2_id && isTeam2Captain) return true;
    return false;
  }, [veto, isTeam1Captain, isTeam2Captain, readOnly]);

  const isModal = layout === 'modal';
  const isFullscreen = layout === 'fullscreen';
  const isEmbedded = layout === 'embedded';
  const isWideLayout = isModal || isFullscreen;

  if (loading) {
    return (
      <div className={cn(
        'w-full',
        isFullscreen && 'min-h-screen px-4 py-4 lg:px-8 lg:py-6',
        isModal && 'h-full min-h-0 p-3 lg:p-4',
        isEmbedded && 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8',
      )}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 bg-white/10" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-lg bg-white/10" />
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
  const currentBestOf = veto.best_of || bestOf || 1;
  const boText = `BO${currentBestOf}`;
  const currentTeamName = veto.current_team_id === veto.team1_id ? team1Name : team2Name;
  const noopMapAction = readOnly ? noOp : handleMapAction;
  const activeSide = veto.current_team_id === veto.team1_id
    ? 'team1'
    : veto.current_team_id === veto.team2_id
      ? 'team2'
      : null;

  const leftRail = (
    <div className={cn(
      'flex flex-col gap-3 min-h-0',
      isWideLayout && 'lg:overflow-y-auto lg:pr-1',
    )}>
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
        compact={isWideLayout}
      />

      <VetoTeamDisplay
        team1Name={team1Name}
        team1Logo={team1Logo}
        team2Name={team2Name}
        team2Logo={team2Logo}
        activeSide={isComplete ? null : activeSide}
        currentAction={veto.current_action}
        completed={isComplete}
        bestOf={currentBestOf}
        compact={isWideLayout}
      />
    </div>
  );

  const selectedMapsPanel = (
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
      compact={isWideLayout && !isComplete}
      className="mb-0"
    />
  );

  const sequencePanel = (variant: 'side' | 'recap') => (
    <div className={cn(
      'min-h-0 rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4',
      variant === 'recap' && 'bg-gradient-to-b from-white/[0.04] to-black/30',
    )}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black text-white/60 uppercase tracking-widest">
            Veto Sequence
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {isComplete ? 'Final ban/pick recap' : 'Live turn order'}
          </div>
        </div>
        {!isComplete && veto.current_action && (
          <span className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest',
            getVetoActionClasses(veto.current_action),
          )}>
            {getVetoActionNoun(veto.current_action)}
          </span>
        )}
      </div>
      <div className={cn(
        variant === 'side' && isWideLayout && 'max-h-[calc(100vh-260px)] overflow-y-auto pr-1',
      )}>
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
          compact={variant === 'side'}
          columns={variant === 'recap'}
        />
      </div>
    </div>
  );

  const mapPanel = (
    <div className={cn(
      'flex flex-col gap-4 min-h-0 min-w-0',
      isModal && 'pb-2',
    )}>
      {!isComplete && (
        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Current Turn</div>
              <div className={cn('mt-0.5 text-sm font-black', isUserTurn ? 'text-rose-200' : 'text-white')}>
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
        </div>
      )}
      {isComplete ? (
        <div className="flex min-h-0 flex-col gap-4">
          <div className="min-w-0">{selectedMapsPanel}</div>
          <div className="min-w-0">{sequencePanel('recap')}</div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_430px]">
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
            <div className="min-w-0">{sequencePanel('side')}</div>
          </div>
          <div className="min-w-0">
            <div className="min-w-0">{selectedMapsPanel}</div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'w-full font-heading bg-[#09090b]',
        isFullscreen && 'min-h-screen px-4 py-4 lg:px-8 lg:py-6',
        isModal && 'flex h-full min-h-0 flex-col overflow-hidden p-3 lg:p-4',
        isEmbedded && 'max-w-[1400px] mx-auto p-2 sm:p-4 lg:p-6',
      )}
    >
      <div className={cn(
        'min-h-0 flex-1',
        isModal && 'overflow-y-auto overscroll-contain pr-1',
        isWideLayout && 'grid lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)] gap-4 lg:gap-6',
        isEmbedded && 'flex flex-col xl:grid xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-5 gap-4',
        !isWideLayout && isEmbedded && 'overflow-y-auto',
      )}>
        <div className={cn(
          isWideLayout && 'order-2 lg:order-1 lg:sticky lg:top-0 lg:self-start',
          isEmbedded && 'order-2 xl:order-1',
        )}>
          {leftRail}
        </div>
        <div className={cn(
          isWideLayout && 'order-1 lg:order-2 min-w-0',
          isEmbedded && 'order-1 xl:order-2',
        )}>
          {mapPanel}
        </div>
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
