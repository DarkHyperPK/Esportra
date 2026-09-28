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
import { Input } from '@/components/ui/input';
import { Users, Search, LayoutGrid, List } from 'lucide-react';
import type { DashboardTournament, DashboardParticipant } from '@/hooks/useTournamentDashboard';

const PAGE_SIZE = 24;

interface ParticipantsPanelProps {
  tournament: DashboardTournament;
  participants: DashboardParticipant[];
  canActAsOwner: boolean;
  mockCount?: number;
}

export function ParticipantsPanel({
  tournament,
  participants,
  canActAsOwner,
  mockCount = 0,
}: ParticipantsPanelProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const activeParticipants = useMemo(
    () =>
      participants.filter(
        (p) => p.status !== 'withdrawn' && p.status !== 'rejected' && p.status !== 'cancelled'
      ),
    [participants]
  );

  const filteredParticipants = useMemo(() => {
    if (!search.trim()) return activeParticipants;
    const q = search.toLowerCase();
    return activeParticipants.filter(
      (p) =>
        p.team_name?.toLowerCase().includes(q) ||
        p.gamer_tag?.toLowerCase().includes(q) ||
        p.user?.username?.toLowerCase().includes(q)
    );
  }, [activeParticipants, search]);

  const totalPages = Math.max(1, Math.ceil(filteredParticipants.length / PAGE_SIZE));
  const pagedParticipants = filteredParticipants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rangeStart = filteredParticipants.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredParticipants.length);

  const checkedIn = useMemo(
    () => activeParticipants.filter((p) => p.status === 'checked_in').length,
    [activeParticipants]
  );

  const capacity = tournament.max_teams > 0
    ? `${activeParticipants.length} / ${tournament.max_teams}`
    : String(activeParticipants.length);

  const hasFee = Number(tournament.entry_fee) > 0;

  const renderStatusBadge = (participant: DashboardParticipant) => {
    const checkInBadge =
      participant.status === 'checked_in' ? (
        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Checked In
        </span>
      ) : participant.status === 'registered' ? (
        <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Registered
        </span>
      ) : null;

    const paymentBadge =
      hasFee && participant.payment_status === 'pending' ? (
        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
          Payment Pending
        </span>
      ) : hasFee && participant.payment_status === 'approved' ? (
        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Paid
        </span>
      ) : hasFee && participant.payment_status === 'rejected' ? (
        <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
          Payment Rejected
        </span>
      ) : null;

    if (!checkInBadge && !paymentBadge) return null;
    if (!paymentBadge) return checkInBadge;
    if (!checkInBadge) return paymentBadge;
    return <div className="flex flex-wrap gap-1">{checkInBadge}{paymentBadge}</div>;
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

  return (
    <>
      <CommandHeader
        eyebrow="OPERATIONS"
        title="Participants"
        description="Review registered teams, check-in status, and participant details."
      />

      {/* Flat stat bar */}
      <div className="flex flex-wrap divide-x divide-white/[0.06] border-b border-white/[0.06]">
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Registered</span>
          <span className="text-base font-bold text-white">{activeParticipants.length}</span>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Capacity</span>
          <span className={`text-base font-bold ${tournament.max_teams > 0 && activeParticipants.length >= tournament.max_teams ? 'text-amber-300' : 'text-white'}`}>
            {capacity}
          </span>
        </div>
        {tournament.check_in_required && (
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Checked In</span>
            <span className={`text-base font-bold ${activeParticipants.length > 0 && checkedIn === activeParticipants.length ? 'text-emerald-300' : 'text-white'}`}>
              {checkedIn}
            </span>
          </div>
        )}
        {mockCount > 0 && (
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Mock Teams</span>
            <span className="text-base font-bold text-zinc-400">{mockCount}</span>
          </div>
        )}
      </div>

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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search by team or player name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border-white/10 bg-black/30 pl-9 text-white placeholder:text-zinc-600"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CommandSection>

      {/* Participants */}
      <CommandSection>
        {filteredParticipants.length === 0 ? (
          <CommandEmptyState
            icon={<Users className="h-5 w-5" />}
            title={search ? 'No matches found' : 'No participants yet'}
            description={
              search
                ? 'Try a different search term.'
                : 'Participants will appear here once they register.'
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
                    onManage={() => {}}
                    renderStatusBadge={renderStatusBadge}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden border border-white/[0.06]">
                <table className="w-full">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th className="px-4 py-2 text-left font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Team / Player</th>
                      <th className="px-4 py-2 text-left font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Members</th>
                      <th className="px-4 py-2 text-left font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Check-in</th>
                      {hasFee && (
                        <th className="px-4 py-2 text-left font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Payment</th>
                      )}
                      <th className="px-4 py-2 text-left font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Registered</th>
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
                                className="h-6 w-6 shrink-0 rounded-sm object-cover"
                              />
                            ) : (
                              <div className="h-6 w-6 shrink-0 rounded-sm bg-zinc-800" />
                            )}
                            <span className="truncate font-medium text-white">
                              {p.team_name ?? p.gamer_tag ?? p.user?.username ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 text-zinc-400">{getMemberCount(p)}</td>
                        <td className="px-4">
                          {p.status === 'checked_in' ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Checked In</span>
                          ) : p.status === 'registered' ? (
                            <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Registered</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        {hasFee && (
                          <td className="px-4">
                            {p.payment_status === 'pending' ? (
                              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Payment Pending</span>
                            ) : p.payment_status === 'approved' ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Paid</span>
                            ) : p.payment_status === 'rejected' ? (
                              <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">Payment Rejected</span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 text-zinc-400">
                          {new Date(p.registered_at).toLocaleDateString()}
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
    </>
  );
}
