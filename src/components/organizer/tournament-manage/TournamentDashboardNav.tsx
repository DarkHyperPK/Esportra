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
  Radio,
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
  broadcast: Radio,
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
  return (
    <ArrowUpRight
      className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-zinc-400"
      aria-label="Opens another page"
    />
  );
}

/** One-line draft readiness, so the rail says what is left before publishing. */
function SetupStatus({ completionSummary }: { completionSummary: CompletionSummary }) {
  const missing = completionSummary.totalRequiredMissing;
  const ready = completionSummary.canPublish;
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 text-[12px]" role="status">
      <span
        aria-hidden
        className={ready ? 'h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400' : 'h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400'}
      />
      <span className="text-zinc-400">
        {ready
          ? 'Ready to publish'
          : missing > 0
            ? `${missing} required ${missing === 1 ? 'field' : 'fields'} left`
            : 'Finish setup to publish'}
      </span>
    </div>
  );
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
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => navigate('/organizer/dashboard?tab=tournaments')}
        className="flex h-11 items-center gap-2 border-b border-white/[0.06] px-4 text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.03] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All tournaments
      </button>

      {isDraft && <SetupStatus completionSummary={completionSummary} />}

      <div className="px-2 py-3">
        {groups.map((group, index) => (
          <nav
            key={group.id}
            aria-label={`${group.label} navigation`}
            className={index > 0 ? 'mt-3 border-t border-white/[0.06] pt-3' : undefined}
          >
            <p className="mb-1 px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              {group.label}
            </p>
            <div className="grid gap-0.5">
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
    </div>
  );
}
