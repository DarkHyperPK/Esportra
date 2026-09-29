/**
 * OverviewPanel.tsx
 *
 * Reads top to bottom as: where are we → how are we doing → what needs me
 * → live matches → reference details → recent activity. All numbers come
 * pre-derived from useTournamentOverviewModel; this component only lays them out.
 */

import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import type { DashboardParticipant, DashboardTournament } from '@/hooks/useTournamentDashboard';
import type { TournamentOverviewModel } from '@/hooks/useTournamentOverviewModel';
import type { AttentionItem } from '@/services/tournamentDashboard/attention';
import { ReadOnlyMatchCard } from '@/components/bracket/ReadOnlyMatchCard';
import { useActiveMatches } from '@/hooks/useActiveMatches';
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
  const isOngoing = tournament.status === 'ongoing';
  const { data: activeMatches } = useActiveMatches(tournament.id, isOngoing);

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

      {/* Active Matches — visible only when tournament is ongoing */}
      {isOngoing && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-rose-400" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-400">
              Live Matches
            </p>
          </div>
          {activeMatches && activeMatches.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeMatches.map((m) => (
                <div key={m.id} className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                    {m.stage_name}
                  </span>
                  <ReadOnlyMatchCard
                    match={{
                      id: m.id,
                      status: m.status,
                      team1_score: m.team1_score,
                      team2_score: m.team2_score,
                      team1: {
                        id: m.team1_id,
                        name: m.team1_name ?? undefined,
                        seed: m.team1_seed,
                        logo_url: m.team1_logo,
                      },
                      team2: {
                        id: m.team2_id,
                        name: m.team2_name ?? undefined,
                        seed: m.team2_seed,
                        logo_url: m.team2_logo,
                      },
                      round_index: m.round_index,
                      match_number: m.match_number,
                      scheduled_time: m.scheduled_time,
                    }}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No matches currently in progress.</p>
          )}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <AttentionList items={model.attention} onOpen={openItem} />
        <EventDetails description={tournament.description} rows={model.details} />
      </div>
      <RecentActivity participants={participants} />
    </div>
  );
}
