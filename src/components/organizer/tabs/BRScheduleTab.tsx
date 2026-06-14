import React from 'react';
import { BRStageScheduleSection } from '@/components/organizer/br/BRStageScheduleSection';
import type { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface BRScheduleTabProps {
  tournamentId: string;
  tournamentStartDate?: string | null;
  tournamentEndDate?: string | null;
  stages: TournamentStage[];
  registeredUnitCount?: number;
  onUpdate: () => void;
}

export const BRScheduleTab: React.FC<BRScheduleTabProps> = ({
  tournamentId,
  tournamentStartDate,
  tournamentEndDate,
  stages,
  registeredUnitCount = 0,
  onUpdate,
}) => {
  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);

  if (sortedStages.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-12 text-center">
        Add a stage first.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {sortedStages.map((stage) => (
        <BRStageScheduleSection
          key={stage.id}
          stage={stage}
          tournamentId={tournamentId}
          tournamentStartDate={tournamentStartDate}
          tournamentEndDate={tournamentEndDate}
          allStages={sortedStages}
          registeredUnitCount={registeredUnitCount}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};

export default BRScheduleTab;
