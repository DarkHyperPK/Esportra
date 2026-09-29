import React from 'react';
import { StandingsPanel } from '@/components/organizer/tournament-manage/panels/StandingsPanel';
import type { Tournament } from '@/types/tournament';

interface OrganizerStandingsTabProps {
    tournament: Pick<Tournament, 'id' | 'prize_pool' | 'currency'>;
    locked?: boolean;
}

/** Kept for the legacy TournamentManage page; the dashboard renders StandingsPanel directly. */
export const OrganizerStandingsTab: React.FC<OrganizerStandingsTabProps> = ({ tournament, locked }) => (
    <StandingsPanel tournament={tournament} locked={locked} />
);
