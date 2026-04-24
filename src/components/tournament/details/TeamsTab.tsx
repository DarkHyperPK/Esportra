import React, { useEffect, useMemo, useState } from 'react';
import { PublicTeamCard } from '@/components/tournament/PublicTeamCard';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';

interface TeamsTabProps {
    participants: any[]; // enriched participants
}

const TEAMS_PAGE_SIZE = 24;

export const TeamsTab: React.FC<TeamsTabProps> = ({ participants }) => {
    const [page, setPage] = useState(1);
    const teamParticipants = useMemo(
        () => participants.filter((participant) => participant.participant_type === 'team'),
        [participants]
    );
    const totalPages = Math.max(1, Math.ceil(teamParticipants.length / TEAMS_PAGE_SIZE));
    const pagedParticipants = useMemo(() => {
        const start = (page - 1) * TEAMS_PAGE_SIZE;
        return teamParticipants.slice(start, start + TEAMS_PAGE_SIZE);
    }, [page, teamParticipants]);
    const rangeStart = teamParticipants.length === 0 ? 0 : ((page - 1) * TEAMS_PAGE_SIZE) + 1;
    const rangeEnd = Math.min(page * TEAMS_PAGE_SIZE, teamParticipants.length);

    useEffect(() => {
        setPage(1);
    }, [teamParticipants.length]);

    useEffect(() => {
        setPage((current) => Math.min(current, totalPages));
    }, [totalPages]);

    return (
        <>
            {teamParticipants.length === 0 ? (
                <div className="min-h-[400px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-[#121214]">
                    <p className="text-gray-500 font-mono text-sm tracking-widest">NO_TEAMS_REGISTERED</p>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {pagedParticipants.map((participant) => (
                            <PublicTeamCard
                                key={participant.id}
                                participant={participant}
                                renderStatusBadge={(p) => (
                                    <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${p.status === 'checked_in' || p.checked_in_at
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                        }`}>
                                        {p.status === 'checked_in' || p.checked_in_at ? 'Ready' : 'Registered'}
                                    </div>
                                )}
                            />
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-zinc-500">
                                Showing {rangeStart}-{rangeEnd} of {teamParticipants.length} teams
                            </p>
                            <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#teams"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                if (page > 1) {
                                                    setPage((current) => current - 1);
                                                }
                                            }}
                                            className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink
                                            href="#teams"
                                            isActive
                                            onClick={(event) => event.preventDefault()}
                                            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                                        >
                                            {page} / {totalPages}
                                        </PaginationLink>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#teams"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                if (page < totalPages) {
                                                    setPage((current) => current + 1);
                                                }
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
        </>
    );
};
