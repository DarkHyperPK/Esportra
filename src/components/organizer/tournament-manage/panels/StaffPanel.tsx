/**
 * StaffPanel.tsx
 *
 * Configuration panel for tournament staff.
 * Redirects to organization settings since staff is managed organization-wide.
 */

import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandButton,
} from '@/components/management/CommandSurface';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface StaffPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

export function StaffPanel({ tournament: _tournament, editableFields: _editableFields }: StaffPanelProps) {
  const navigate = useNavigate();

  return (
    <>
      <CommandHeader
        eyebrow="CONFIGURATION"
        title="Staff"
        description="Tournament staff access and permission management."
      />

      <CommandSection>
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center border border-white/10 text-rose-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="max-w-sm space-y-2">
            <h3 className="text-base font-bold text-white">Staff Managed at Organization Level</h3>
            <p className="text-sm text-zinc-400">
              Staff members are managed through your organization settings.
              Staff added to your organization automatically gain access to all your tournaments.
            </p>
          </div>
          <CommandButton
            variant="secondary"
            size="sm"
            slide
            onClick={() => navigate('/organizer/settings?tab=staff')}
          >
            <ExternalLink className="h-4 w-4" />
            Go to Organization Settings
          </CommandButton>
        </div>
      </CommandSection>
    </>
  );
}
