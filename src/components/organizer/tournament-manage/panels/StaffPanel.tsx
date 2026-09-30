/**
 * StaffPanel.tsx
 *
 * Configuration panel for tournament staff.
 * Redirects to organization settings since staff is managed organization-wide.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandButton,
} from '@/components/management/CommandSurface';

export function StaffPanel() {
  const navigate = useNavigate();
  const { slug: tournamentSlug } = useParams<{ slug: string }>();

  return (
    <>
      <CommandHeader
        eyebrow="Configure"
        title="Staff"
        description="Staff belong to your organization and can help run every tournament you host."
      />

      <CommandSection>
        <div className="flex max-w-xl items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-white/[0.04] text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-zinc-300">
              Add or remove staff, and choose what each person can do (scores, teams, brackets, announcements, disputes), from your organization settings.
              Changes apply to this tournament straight away.
            </p>
            <CommandButton
              variant="secondary"
              size="sm"
              onClick={() =>
                navigate(
                  `/organizer/settings?tab=staff${tournamentSlug ? `&returnFrom=/organizer/tournament/${tournamentSlug}` : ''}`,
                )
              }
            >
              Manage staff
              <ExternalLink className="h-4 w-4" aria-hidden />
            </CommandButton>
            <p className="text-zinc-500 text-sm mt-2">
              You'll be returned here after managing staff.
            </p>
          </div>
        </div>
      </CommandSection>
    </>
  );
}
