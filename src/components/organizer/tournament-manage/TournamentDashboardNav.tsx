/**
 * TournamentDashboardNav.tsx
 *
 * Rail content for the tournament dashboard: back link, then the grouped
 * nav built by `buildDashboardNav`. Items that leave the page carry an
 * arrow or a count; configuration items carry their setup state in drafts.
 */

import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Calendar,
  CreditCard,
  FileText,
  Gamepad2,
  GitBranch,
  Layers,
  LayoutDashboard,
  Mail,
  Megaphone,
  Palette,
  Scale,
  Settings,
  ShieldBan,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CompletionSummary } from '@/hooks/useCompletionState';
import type {
  DashboardNavGroup,
  DashboardNavItem,
  DashboardSectionId,
} from '@/services/tournamentDashboard/dashboardNav';
import { TournamentNavItem } from './TournamentNavItem';
import { CompletionBadge } from './CompletionBadge';

interface TournamentDashboardNavProps {
  groups: DashboardNavGroup[];
  activeTab: DashboardSectionId;
  onTabChange: (tab: string) => void;
  completionSummary: CompletionSummary;
  isDraft: boolean;
}

const ICONS: Record<DashboardNavItem['id'], React.ElementType> = {
  overview: LayoutDashboard,
  participants: Users,
  payments: CreditCard,
  'format-stages': Layers,
  brackets: GitBranch,
  games: Gamepad2,
  schedule: Calendar,
  standings: Trophy,
  invitations: Mail,
  announcements: Megaphone,
  bans: ShieldBan,
  disputes: Scale,
  'basic-info': FileText,
  branding: Palette,
  'prize-payouts': Banknote,
  registration: UserPlus,
  staff: ShieldCheck,
  settings: Settings,
};

function LinkMarker({ badge }: { badge?: number }) {
  if (badge) {
    return (
      <span
        className="inline-flex h-4 min-w-4 items-center justify-center bg-amber-400 px-1 font-mono text-[10px] font-bold leading-none text-matte-black"
        aria-label={`${badge} pending`}
      >
        {badge > 9 ? '9+' : badge}
      </span>
    );
  }
  return <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600" aria-label="Opens another page" />;
}

export function TournamentDashboardNav({
  groups,
  activeTab,
  onTabChange,
  completionSummary,
  isDraft,
}: TournamentDashboardNavProps) {
  const navigate = useNavigate();

  const rightElementFor = (item: DashboardNavItem) => {
    if (item.kind === 'link') return <LinkMarker badge={item.badge} />;
    const panelState = completionSummary.panels[item.id];
    if (!panelState) return undefined;
    return (
      <CompletionBadge
        requiredMissing={panelState.requiredMissing.length}
        recommendedMissing={panelState.recommendedMissing.length}
        isPublished={!isDraft}
      />
    );
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/organizer/dashboard?tab=tournaments')}
        className="mb-5 flex items-center gap-1.5 px-3 text-xs text-zinc-500 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All tournaments
      </button>

      {groups.map((group) => (
        <nav key={group.id} aria-label={`${group.label} navigation`} className="mb-5 last:mb-0">
          <p className="mb-1.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            {group.label}
          </p>
          <div className="grid gap-px">
            {group.items.map((item) => (
              <TournamentNavItem
                key={item.id}
                icon={ICONS[item.id]}
                label={item.label}
                active={item.kind === 'tab' && item.id === activeTab}
                onClick={() => (item.kind === 'link' ? navigate(item.href) : onTabChange(item.id))}
                rightElement={rightElementFor(item)}
              />
            ))}
          </div>
        </nav>
      ))}
    </div>
  );
}
