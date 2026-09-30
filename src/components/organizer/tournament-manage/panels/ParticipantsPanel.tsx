/**
 * ParticipantsPanel.tsx
 *
 * Participants panel for the tournament dashboard.
 * Shows registered teams/players with check-in status, pagination, and search.
 */

import { useState, useMemo } from 'react';
import {
  CommandHeader,
  CommandSection,
  CommandEmptyState,
} from '@/components/management/CommandSurface';
import { OrganizerTeamCard } from '@/components/organizer/OrganizerTeamCard';
import { MockModePanel } from '@/components/tournament/MockModePanel';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users, Search, LayoutGrid, List, Settings2 } from 'lucide-react';
import { CONTROL_CLASS, EYEBROW_CLASS, StatusPill } from '@/components/ui/kit';
import { CommandButton } from '@/components/management/CommandSurface';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { isParticipantCheckedIn } from '@/utils/brCheckIn';
import { useToast } from '@/hooks/use-toast';
import type { DashboardTournament, DashboardParticipant } from '@/hooks/useTournamentDashboard';

const PAGE_SIZE = 24;

interface ParticipantsPanelProps {
  tournament: DashboardTournament;
  participants: DashboardParticipant[];
  canActAsOwner: boolean;
  mockCount?: number;
  /** Refetch dashboard data after a change made here (e.g. a manual check-in). */
  onUpdate?: () => void;
}

/** Column count follows the number of stats so the strip never leaves a hole. */
const STAT_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

export function ParticipantsPanel({
  tournament,
  participants,
  canActAsOwner,
  mockCount = 0,
  onUpdate,
}: ParticipantsPanelProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [checkInFilter, setCheckInFilter] = useState<'all' | 'checked' | 'unchecked'>('all');
  const [managedParticipant, setManagedParticipant] = useState<DashboardParticipant | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [bulkCheckingIn, setBulkCheckingIn] = useState(false);
  const { toast } = useToast();

  const activeParticipants = useMemo(
    () =>
      participants.filter(
        (p) => p.status !== 'withdrawn' && p.status !== 'rejected' && p.status !== 'cancelled'
      ),
    [participants]
  );

  const checkInFiltered = useMemo(() => {
    if (checkInFilter === 'checked') return activeParticipants.filter((p) => !!p.checked_in_at);
    if (checkInFilter === 'unchecked') return activeParticipants.filter((p) => !p.checked_in_at);
    return activeParticipants;
  }, [activeParticipants, checkInFilter]);

  const filteredParticipants = useMemo(() => {
    if (!search.trim()) return checkInFiltered;
    const q = search.toLowerCase();
    return checkInFiltered.filter(
      (p) =>
        p.team_name?.toLowerCase().includes(q) ||
        p.gamer_tag?.toLowerCase().includes(q) ||
        p.user?.username?.toLowerCase().includes(q)
    );
  }, [checkInFiltered, search]);

  const totalPages = Math.max(1, Math.ceil(filteredParticipants.length / PAGE_SIZE));
  const pagedParticipants = filteredParticipants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rangeStart = filteredParticipants.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredParticipants.length);

  const checkedIn = useMemo(
    () => activeParticipants.filter((p) => isParticipantCheckedIn(p)).length,
    [activeParticipants]
  );

  const capacity = tournament.max_teams > 0
    ? `${activeParticipants.length} / ${tournament.max_teams}`
    : String(activeParticipants.length);

  const hasFee = Number(tournament.entry_fee) > 0;

  const checkInPill = (p: DashboardParticipant) => {
    if (!tournament.check_in_required) return null;
    return isParticipantCheckedIn(p)
      ? <StatusPill label="Checked in" tone="success" />
      : <StatusPill label="Not checked in" tone="neutral" />;
  };

  const paymentPill = (p: DashboardParticipant) => {
    if (!hasFee) return null;
    if (p.payment_status === 'pending') return <StatusPill label="Payment to review" tone="warning" />;
    if (p.payment_status === 'approved') return <StatusPill label="Paid" tone="success" />;
    if (p.payment_status === 'rejected') return <StatusPill label="Payment rejected" tone="critical" />;
    return null;
  };

  const renderStatusBadge = (participant: DashboardParticipant) => {
    const checkIn = checkInPill(participant);
    const payment = paymentPill(participant);
    if (!checkIn && !payment) return null;
    return <div className="flex flex-wrap gap-1">{checkIn}{payment}</div>;
  };

  const handleManualCheckIn = async () => {
    if (!managedParticipant) return;
    setCheckingIn(true);
    try {
      await apiClient.post(`/api/tournaments/${tournament.id}/participants/${managedParticipant.id}/check-in`, {});
      toast({ title: 'Checked in', description: `${managedParticipant.team_name ?? managedParticipant.gamer_tag ?? 'Participant'} is checked in.` });
      setManagedParticipant((prev) => prev ? { ...prev, checked_in_at: new Date().toISOString() } : null);
      onUpdate?.();
    } catch (err: any) {
      toast({ title: "Couldn't check them in", description: err.message, variant: 'destructive' });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleBulkCheckIn = async () => {
    setBulkCheckingIn(true);
    try {
      await Promise.all(
        filteredParticipants.map((p) =>
          apiClient.post(`/api/tournaments/${tournament.id}/participants/${p.id}/check-in`, {}).catch(() => null)
        )
      );
      onUpdate?.();
    } finally {
      setBulkCheckingIn(false);
    }
  };

  const parsedMembers = (p: DashboardParticipant): string[] => {
    if (!p.team_members) return [];
    try {
      const arr = JSON.parse(p.team_members);
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return p.team_members.split(',').map((m) => m.trim()).filter(Boolean);
    }
  };

  const getMemberCount = (p: DashboardParticipant): string => {
    if (p.participant_type === 'solo') return '1';
    if (!p.team_members) return '—';
    try {
      const parsed = JSON.parse(p.team_members);
      if (Array.isArray(parsed)) return String(parsed.length);
    } catch { /* not JSON */ }
    return '—';
  };

  const visibleStats = [
    { label: 'Registered', value: String(activeParticipants.length), show: true, warn: false },
    { label: 'Capacity', value: capacity, show: true, warn: tournament.max_teams > 0 && activeParticipants.length >= tournament.max_teams },
    { label: 'Checked in', value: String(checkedIn), show: Boolean(tournament.check_in_required), warn: false },
    { label: 'Mock teams', value: String(mockCount), show: mockCount > 0, warn: false },
  ].filter((stat) => stat.show);

  return (
    <>
      <CommandHeader
        eyebrow="Run"
        title="Participants"
        description="Everyone who has signed up: find a team, see their check-in and payment, and step in when needed."
      />

      <dl className={cn('grid gap-px border-b border-white/[0.07] bg-white/[0.06]', STAT_COLS[visibleStats.length] ?? STAT_COLS[4])}>
        {visibleStats.map((stat) => (
          <div key={stat.label} className="bg-card px-5 py-4 sm:px-6">
            <dt className={EYEBROW_CLASS}>{stat.label}</dt>
            <dd className={cn('mt-1 font-heading text-2xl font-black tabular-nums', stat.warn ? 'text-amber-200' : 'text-white')}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {/* Mock mode — only shown to owners on draft/test tournaments */}
      {canActAsOwner && (tournament.status === 'draft' || mockCount > 0) && (
        <CommandSection>
          <MockModePanel
            tournamentId={tournament.id}
            slug={tournament.slug}
            maxTeams={tournament.max_teams ?? 16}
            mockCount={mockCount}
          />
        </CommandSection>
      )}

      {/* Search + View toggle */}
      <CommandSection>
        {tournament.check_in_required && (() => {
          const windowMinutes = tournament.settings?.checkInWindowMinutes ?? tournament.check_in_window_minutes;
          return windowMinutes != null && windowMinutes > 0 ? (
            <p className="mb-3 text-sm text-zinc-400">Check-in window: {windowMinutes} min</p>
          ) : null;
        })()}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search teams or players"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search participants"
              className={cn(CONTROL_CLASS, 'pl-9')}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`flex h-10 w-10 items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`flex h-10 w-10 items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
        {tournament.check_in_required && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(['all', 'checked', 'unchecked'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setCheckInFilter(f); setPage(1); }}
                className={cn(
                  'h-8 rounded px-3 text-xs font-medium transition-colors',
                  checkInFilter === f
                    ? 'bg-white/15 text-white'
                    : 'bg-white/[0.04] text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                )}
              >
                {f === 'all' ? 'All' : f === 'checked' ? 'Checked in' : 'Not checked in'}
              </button>
            ))}
            {checkInFilter === 'unchecked' && filteredParticipants.length > 0 && canActAsOwner && (
              <CommandButton
                variant="secondary"
                size="sm"
                onClick={handleBulkCheckIn}
                disabled={bulkCheckingIn}
                className="ml-auto"
              >
                {bulkCheckingIn ? 'Checking in…' : `Check in all (${filteredParticipants.length})`}
              </CommandButton>
            )}
          </div>
        )}
      </CommandSection>

      {/* Participants */}
      <CommandSection>
        {filteredParticipants.length === 0 ? (
          <CommandEmptyState
            icon={<Users className="h-5 w-5" />}
            title={search ? `Nobody matches “${search}”` : 'No one has signed up yet'}
            description={
              search
                ? 'Try part of the team name or a player tag.'
                : tournament.status === 'draft'
                  ? 'Registration opens when you publish. Share the link once it is live.'
                  : 'New sign-ups appear here as they come in.'
            }
          />
        ) : (
          <div className="space-y-5">
            {filteredParticipants.length > PAGE_SIZE && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">
                  Showing {rangeStart}–{rangeEnd} of {filteredParticipants.length}
                </p>
              </div>
            )}

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pagedParticipants.map((participant) => (
                  <OrganizerTeamCard
                    key={participant.id}
                    participant={participant}
                    onManage={(p) => setManagedParticipant(p)}
                    renderStatusBadge={renderStatusBadge}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden border border-white/[0.06]">
                <table className="w-full">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Team or player</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Members</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Check-in</th>
                      {hasFee && (
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Payment</th>
                      )}
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Signed up</th>
                      <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {pagedParticipants.map((p) => (
                      <tr key={p.id} className="h-12 text-sm">
                        <td className="px-4">
                          <div className="flex items-center gap-2">
                            {p.team_logo ?? p.teams?.logo_url ? (
                              <img
                                src={(p.team_logo ?? p.teams?.logo_url)!}
                                alt=""
                                className="h-6 w-6 shrink-0 object-cover"
                              />
                            ) : (
                              <div className="h-6 w-6 shrink-0 bg-zinc-800" />
                            )}
                            <span className="truncate font-medium text-white">
                              {p.team_name ?? p.gamer_tag ?? p.user?.username ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 text-zinc-400">{getMemberCount(p)}</td>
                        <td className="px-4">{checkInPill(p) ?? <span className="text-zinc-600">—</span>}</td>
                        {hasFee && <td className="px-4">{paymentPill(p) ?? <span className="text-zinc-600">—</span>}</td>}
                        <td className="px-4 text-zinc-400">
                          {new Date(p.registered_at).toLocaleDateString()}
                        </td>
                        <td className="px-4">
                          <button
                            type="button"
                            onClick={() => setManagedParticipant(p)}
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">
                  Page {page} of {totalPages}
                </p>
                <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page > 1) setPage((p) => p - 1);
                        }}
                        className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        isActive
                        onClick={(e) => e.preventDefault()}
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      >
                        {page} / {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page < totalPages) setPage((p) => p + 1);
                        }}
                        className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </CommandSection>

      {/* Participant detail dialog */}
      <Dialog open={!!managedParticipant} onOpenChange={(open) => { if (!open) setManagedParticipant(null); }}>
        <DialogContent className="max-w-md border-white/10 bg-card text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">
              {managedParticipant?.team_name ?? managedParticipant?.gamer_tag ?? 'Participant'}
            </DialogTitle>
          </DialogHeader>
          {managedParticipant && (
            <div className="space-y-4">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                {renderStatusBadge(managedParticipant)}
              </div>

              {/* Members */}
              {managedParticipant.participant_type !== 'solo' && (
                <div className="space-y-1.5">
                  <p className={EYEBROW_CLASS}>Roster</p>
                  {parsedMembers(managedParticipant).length > 0 ? (
                    <ul className="space-y-1">
                      {parsedMembers(managedParticipant).map((m, i) => (
                        <li key={i} className="text-sm text-zinc-300">{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-500">No roster on file for this team.</p>
                  )}
                </div>
              )}

              {/* Registered */}
              <div className="space-y-0.5">
                <p className={EYEBROW_CLASS}>Signed up</p>
                <p className="text-sm text-zinc-300">{new Date(managedParticipant.registered_at).toLocaleString()}</p>
              </div>

              {/* Manual check-in */}
              {tournament.check_in_required && !isParticipantCheckedIn(managedParticipant) && canActAsOwner && (
                <div className="space-y-2 border-t border-white/[0.07] pt-4">
                  <p className="text-xs text-zinc-500">Use this if they told you they're here but couldn't check in themselves.</p>
                  <CommandButton variant="secondary" size="sm" onClick={handleManualCheckIn} disabled={checkingIn} className="w-full">
                    {checkingIn ? 'Checking in…' : 'Check them in'}
                  </CommandButton>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
