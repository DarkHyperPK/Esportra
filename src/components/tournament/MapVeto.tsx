import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMapVetoMachine } from '@/hooks/useMapVetoMachine';
import { VetoHeader } from './map-veto/VetoHeader';
import { VetoTeamDisplay } from './map-veto/VetoTeamDisplay';
import { VetoSelectedMaps } from './map-veto/VetoSelectedMaps';
import { VetoTurnIndicator } from './map-veto/VetoTurnIndicator';
import { MapPool } from './map-veto/MapPool';
import { VetoDialogs } from './map-veto/VetoDialogs';
import { VetoHistoryTimeline } from './map-veto/VetoHistoryTimeline';
import { useVetoHistory } from '@/hooks/useVetoHistory';
import { Skeleton } from '@/components/ui/skeleton';

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
    if (!veto) return false;
    // Use IDs from the veto object itself to ensure consistency
    if (veto.current_team_id === veto.team1_id && isTeam1Captain) return true;
    if (veto.current_team_id === veto.team2_id && isTeam2Captain) return true;
    return false;
  }, [veto, isTeam1Captain, isTeam2Captain]);

  // Loading State
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          <Skeleton className="h-12 w-48 bg-white/10" />
          <div className="flex justify-between items-center px-12">
            <Skeleton className="h-24 w-24 rounded-full bg-white/10" />
            <Skeleton className="h-8 w-12 bg-white/10" />
            <Skeleton className="h-24 w-24 rounded-full bg-white/10" />
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State (No Veto Found)
  if (!veto) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">No Veto Found</h2>
          <p className="text-gray-400">Waiting for organizer to initialize the veto...</p>
        </div>
      </div>
    );
  }

  const effectiveIsOrganizer = isOrganizer; // Simplify for prop passing
  // Use best_of from DB (now INTEGER) as source of truth, fallback to prop, then default to 1
  const currentBestOf = veto.best_of || bestOf || 1;
  const boText = `BO${currentBestOf}`;

  const currentTeamName = veto.current_team_id === veto.team1_id ? team1Name : team2Name;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-[1400px] mx-auto p-2 sm:p-4 lg:p-6 xl:p-8 font-heading"
    >

      <VetoHeader
        boText={boText}
        vetoStatus={veto.status}
        effectiveIsOrganizer={effectiveIsOrganizer}
        handleResetVeto={handleResetVeto}
        resetting={resetting}
        vetoId={veto.id}
        team1LinkToken={veto.team1_link_token}
        team2LinkToken={veto.team2_link_token}
        team1Name={team1Name}
        team2Name={team2Name}
      />

      <VetoTeamDisplay
        team1Name={team1Name}
        team1Logo={team1Logo}
        team2Name={team2Name}
        team2Logo={team2Logo}
      />

      <VetoSelectedMaps
        veto={veto}
        availableMaps={availableMaps}
        team1Name={team1Name}
        team2Name={team2Name}
        team1Id={team1Id}
        team2Id={team2Id}
        imagesLoaded={imagesLoaded}
        setImagesLoaded={setImagesLoaded}
        bestOf={currentBestOf}
        game={game}
      />

      <VetoTurnIndicator
        veto={veto}
        isUserTurn={isUserTurn}
        currentTeamName={currentTeamName}
        bestOf={currentBestOf}
      />

      <div className="mb-8">
        <div className="text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-widest mb-3 px-2 sm:px-0">
          Veto History
        </div>
        <VetoHistoryTimeline entries={vetoHistory} loading={vetoHistoryLoading} />
      </div>

      <MapPool
        veto={veto}
        availableMaps={availableMaps}
        isUserTurn={isUserTurn}
        actionLoading={actionLoading}
        handleMapAction={handleMapAction}
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
      />

      <VetoDialogs
        showRoleSwitchPrompt={showRoleSwitchPrompt}
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
        setActionLoading={noOp} // Not used in dialog directly for setting loading, but passed for prop compatibility if needed
        team1Name={team1Name}
        team2Name={team2Name}
        game={game}
        bestOf={currentBestOf}
      />
    </motion.div>
  );
};


