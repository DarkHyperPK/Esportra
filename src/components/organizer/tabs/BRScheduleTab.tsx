import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { BRStageScheduleSection } from '@/components/organizer/br/BRStageScheduleSection';
import type { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface BRScheduleTabProps {
  tournamentId: string;
  stages: TournamentStage[];
  registeredUnitCount?: number;
  onUpdate: () => void;
}

export const BRScheduleTab: React.FC<BRScheduleTabProps> = ({
  tournamentId,
  stages,
  registeredUnitCount = 0,
  onUpdate,
}) => {
  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-[#0a0a0c]/90 rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-rose-400" />
            BR Scheduling
          </CardTitle>
          <p className="text-sm text-zinc-400">
            Round schedules, stage windows, and match start times.
            Seed participants in Stages; run matches in Games.
          </p>
        </CardHeader>
      </Card>

      {sortedStages.length === 0 ? (
        <Card className="border-dashed border-white/10 bg-[#0a0a0c]/70 rounded-3xl">
          <CardContent className="p-10 text-center text-sm text-zinc-500">
            Add a stage in the Stages tab before configuring schedules.
          </CardContent>
        </Card>
      ) : (
        sortedStages.map((stage) => (
          <Card key={stage.id} className="border-white/10 bg-[#0a0a0c]/90 rounded-3xl">
            <CardContent className="p-6 sm:p-8">
              <BRStageScheduleSection
                stage={stage}
                tournamentId={tournamentId}
                allStages={sortedStages}
                registeredUnitCount={registeredUnitCount}
                onUpdate={onUpdate}
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default BRScheduleTab;
