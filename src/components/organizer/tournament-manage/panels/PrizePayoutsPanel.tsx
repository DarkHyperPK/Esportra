/**
 * PrizePayoutsPanel.tsx
 *
 * Configuration panel for prize pool and payout distribution.
 * Wraps the existing PrizeDistributionTab with CommandHeader.
 */

import {
  CommandHeader,
} from '@/components/management/CommandSurface';
import { PrizeDistributionTab } from '@/components/organizer/PrizeDistributionTab';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface PrizePayoutsPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

export function PrizePayoutsPanel({ tournament }: PrizePayoutsPanelProps) {
  return (
    <>
      <CommandHeader
        eyebrow="CONFIGURATION"
        title="Prize & Payouts"
        description="Configure prize pool and manage payout distribution to winners."
      />

      <PrizeDistributionTab tournament={tournament} />
    </>
  );
}
