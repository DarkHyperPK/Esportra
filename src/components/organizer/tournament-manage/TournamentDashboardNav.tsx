/**
 * TournamentDashboardNav.tsx
 *
 * Rail content for the tournament dashboard.
 * Includes: tournament identity, operations nav, configuration nav, publish button, back link.
 */

import { ArrowLeft, ExternalLink } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Trophy,
  Calendar,
  Gamepad2,
  Megaphone,
  ShieldBan,
  Scale,
  CreditCard,
  FileText,
  Layers,
  Palette,
  Banknote,
  UserPlus,
  ShieldCheck,
  Settings,
  Mail,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';
import type { CompletionSummary } from '@/hooks/useCompletionState';
import { TournamentNavItem } from './TournamentNavItem';
import { CompletionBadge } from './CompletionBadge';

interface TournamentDashboardNavProps {
  tournament: DashboardTournament;
  activeTab: string;
  onTabChange: (tab: string) => void;
  completionSummary: CompletionSummary;
  permissions: {
    canManageTeams: boolean;
    canAssistDisputes: boolean;
    canSendAnnouncements: boolean;
    canEditBracket: boolean;
    canManageStaff: boolean;
    canActAsOwner: boolean;
  };
  isBattleRoyale: boolean;
}

const OPERATIONS_NAV = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'participants', label: 'Participants', icon: Users },
  { value: 'brackets', label: 'Brackets', icon: GitBranch, external: true },
  { value: 'standings', label: 'Standings', icon: Trophy },
  { value: 'schedule', label: 'Schedule', icon: Calendar },
  { value: 'games', label: 'Games', icon: Gamepad2, brOnly: true },
  { value: 'invitations', label: 'Invitations', icon: Mail },
  { value: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'canSendAnnouncements' },
  { value: 'bans', label: 'Bans', icon: ShieldBan, permission: 'canManageTeams' },
  { value: 'disputes', label: 'Disputes', icon: Scale, external: true, permission: 'canAssistDisputes' },
  { value: 'payments', label: 'Payments', icon: CreditCard },
];

const CONFIGURATION_NAV = [
  { value: 'basic-info', label: 'Basic Info', icon: FileText },
  { value: 'format-stages', label: 'Format & Stages', icon: Layers },
  { value: 'branding', label: 'Branding', icon: Palette },
  { value: 'prize-payouts', label: 'Prize & Payouts', icon: Banknote },
  { value: 'registration', label: 'Registration', icon: UserPlus },
{ value: 'staff', label: 'Staff', icon: ShieldCheck, permission: 'canManageStaff' },
  { value: 'settings', label: 'Settings', icon: Settings },
];

export function TournamentDashboardNav({
  tournament,
  activeTab,
  onTabChange,
  completionSummary,
  permissions,
  isBattleRoyale,
}: TournamentDashboardNavProps) {
  const navigate = useNavigate();

  // Status badge rendering
  const getStatusBadge = () => {
    const statusConfig: Record<string, { bg: string; border: string; text: string; dot?: boolean }> = {
      draft: { bg: 'bg-zinc-800', border: 'border-zinc-600', text: 'text-zinc-300' },
      published: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
      open: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: true },
      ongoing: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-300', dot: true },
      completed: { bg: 'bg-zinc-700/50', border: 'border-zinc-600', text: 'text-zinc-400' },
    };

    const config = statusConfig[tournament.status] || statusConfig.draft;

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest',
          config.bg,
          config.border,
          config.text
        )}
      >
        {config.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
        {tournament.status}
      </span>
    );
  };

  // Filter operations nav by permissions
  const visibleOperations = OPERATIONS_NAV.filter((item) => {
    if (item.brOnly && !isBattleRoyale) return false;
    if (item.permission && !permissions[item.permission as keyof typeof permissions]) return false;
    return true;
  });

  // Filter configuration nav by permissions
  const visibleConfiguration = CONFIGURATION_NAV.filter((item) => {
    if (item.permission && !permissions[item.permission as keyof typeof permissions]) return false;
    if (!permissions.canActAsOwner) return false; // All config requires owner access
    return true;
  });

  const handleItemClick = (item: { value: string; external?: boolean }) => {
    if (item.external) {
      if (item.value === 'brackets') {
        navigate(`/tournaments/${tournament.slug}/brackets`);
      } else if (item.value === 'disputes') {
        navigate(`/organizer/tournament/${tournament.slug}/disputes`);
      }
    } else {
      onTabChange(item.value);
    }
  };

  const isPublished = tournament.status !== 'draft';

  return (
    <div className="space-y-2">
      {/* Tournament Identity Block */}
      <div className="flex items-center gap-2 pb-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/10 bg-black">
          {tournament.logo_url ? (
            <img src={tournament.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Trophy className="h-4 w-4 text-rose-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">{tournament.name}</p>
          <div className="mt-1">{getStatusBadge()}</div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-2">
        {/* Operations Section */}
        <p className="mb-1 px-1 font-mono text-[8px] font-bold uppercase tracking-[0.3em] text-rose-500/50">
          OPERATIONS
        </p>
        <div role="navigation" aria-label="Operations navigation" className="grid gap-0.5">
          {visibleOperations.map((item) => (
            <TournamentNavItem
              key={item.value}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.value}
              onClick={() => handleItemClick(item)}
              rightElement={
                item.external ? (
                  <ExternalLink className="h-3 w-3 text-zinc-500" />
                ) : undefined
              }
              external={item.external}
            />
          ))}
        </div>

        {/* Configuration Section */}
        {visibleConfiguration.length > 0 && (
          <>
            <div className="mt-2 border-t border-white/10 pt-2">
              <p className="mb-1 px-1 font-mono text-[8px] font-bold uppercase tracking-[0.3em] text-rose-500/50">
                CONFIGURATION
              </p>
              <div role="navigation" aria-label="Configuration navigation" className="grid gap-0.5">
                {visibleConfiguration.map((item, index) => {
                  const panelState = completionSummary.panels[item.value];
                  return (
                    <TournamentNavItem
                      key={item.value}
                      icon={item.icon}
                      label={item.label}
                      active={activeTab === item.value}
                      onClick={() => onTabChange(item.value)}
                      rightElement={
                        panelState ? (
                          <CompletionBadge
                            requiredMissing={panelState.requiredMissing.length}
                            recommendedMissing={panelState.recommendedMissing.length}
                            isPublished={isPublished}
                            delay={index * 0.03}
                          />
                        ) : undefined
                      }
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Back to Tournaments Link */}
        <div className="mt-3 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => navigate('/organizer/dashboard?tab=tournaments')}
            className="flex items-center gap-1.5 text-[10px] text-zinc-500 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            All Tournaments
          </button>
        </div>
      </div>
    </div>
  );
}
