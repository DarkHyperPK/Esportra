/**
 * OverviewPanel.tsx
 *
 * Reads top to bottom as: where are we → how are we doing → what needs me
 * → reference details → recent activity. All numbers come pre-derived from
 * useTournamentOverviewModel; this component only lays them out.
 */

import { useNavigate } from 'react-router-dom';
import type { DashboardParticipant, DashboardTournament } from '@/hooks/useTournamentDashboard';
import type { TournamentOverviewModel } from '@/hooks/useTournamentOverviewModel';
import type { AttentionItem } from '@/services/tournamentDashboard/attention';
import { AttentionList } from '../overview/AttentionList';
import { EventDetails } from '../overview/EventDetails';
import { KpiStrip } from '../overview/KpiStrip';
import { LifecycleTrack } from '../overview/LifecycleTrack';
import { RecentActivity } from '../overview/RecentActivity';

interface OverviewPanelProps {
  tournament: DashboardTournament;
  participants: DashboardParticipant[];
  model: TournamentOverviewModel;
  onNavigateTab: (tab: string) => void;
}

export function OverviewPanel({ tournament, participants, model, onNavigateTab }: OverviewPanelProps) {
  const navigate = useNavigate();

  const openItem = (item: AttentionItem) => {
    if (item.target === 'disputes') {
      navigate(`/organizer/tournament/${tournament.slug}/disputes`);
      return;
    }
    if (item.target === 'brackets') {
      navigate(`/tournaments/${tournament.slug}/brackets`);
      return;
    }
    onNavigateTab(item.target);
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <LifecycleTrack steps={model.steps} />
      <KpiStrip {...model.kpis} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <AttentionList items={model.attention} onOpen={openItem} />
        <EventDetails description={tournament.description} rows={model.details} />
      </div>
      <RecentActivity participants={participants} />
    </div>
  );
}
