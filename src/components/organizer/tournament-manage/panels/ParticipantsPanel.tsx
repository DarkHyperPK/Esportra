/**
 * ParticipantsPanel.tsx
 *
 * Participants panel for the tournament dashboard.
 * Shows registered teams/players with check-in status, pagination, and search.
 * Extracted from TournamentManage.tsx participants tab.
 */

import { useState, useMemo } from 'react';
import {
  CommandHeader,
  CommandSection,
  CommandEmptyState,
  CommandMetric,
} from '@/components/management/CommandSurface';
import { OrganizerTeamCard } from '@/components/organizer/OrganizerTeamCard';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Users, Search } from 'lucide-react';
import type { DashboardTournament, DashboardParticipant } from '@/hooks/useTournamentDashboard';

const PAGE_SIZE = 24;

interface ParticipantsPanelProps {
  tournament: DashboardTournament;
  participants: DashboardParticipant[];
  canActAsOwner: boolean;
}

export function ParticipantsPanel({
  tournament,
  participants,
}: ParticipantsPanelProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Filter active participants
  const activeParticipants = useMemo(
    () =>
      participants.filter(
        (p) => p.status !== 'withdrawn' && p.status !== 'rejected' && p.status !== 'cancelled'
      ),
    [participants]
  );

  // Apply search filter
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

  const renderStatusBadge = (participant: DashboardParticipant) => {
    if (participant.status === 'checked_in') {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Checked In
        </span>
      );
    }
    if (participant.status === 'registered') {
      return (
        <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Registered
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <CommandHeader
        eyebrow="OPERATIONS"
        title="Participants"
        description="Review registered teams, check-in status, and participant details."
      />

      {/* Quick metrics */}
      <div className="grid grid-cols-3 gap-3">
        <CommandMetric
          label="Registered"
          value={activeParticipants.length}
          icon={<Users className="h-4 w-4" />}
          tone="neutral"
        />
        <CommandMetric
          label="Checked In"
          value={checkedIn}
          tone={
            tournament.check_in_required && activeParticipants.length > 0 && checkedIn === activeParticipants.length
              ? 'success'
              : 'neutral'
          }
        />
        <CommandMetric
          label="Capacity"
          value={tournament.max_teams > 0 ? `${activeParticipants.length}/${tournament.max_teams}` : 'Open'}
          tone={tournament.max_teams > 0 && activeParticipants.length >= tournament.max_teams ? 'warning' : 'neutral'}
        />
      </div>

      {/* Search */}
      <CommandSection>
        <div className="relative">
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
      </CommandSection>

      {/* Participants grid */}
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
            {/* Pagination info */}
            {filteredParticipants.length > PAGE_SIZE && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Showing {rangeStart}–{rangeEnd} of {filteredParticipants.length}
                </p>
              </div>
            )}

            {/* Team cards grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedParticipants.map((participant) => (
                <OrganizerTeamCard
                  key={participant.id}
                  participant={participant}
                  onManage={() => {}} // Noop — manage from Teams page
                  renderStatusBadge={renderStatusBadge}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500">
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
