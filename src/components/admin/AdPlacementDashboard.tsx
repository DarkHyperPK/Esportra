import { useState } from 'react';
import { Search, Trophy, ChevronRight, Megaphone, Loader2 } from 'lucide-react';
import { useAdminTournaments } from '@/hooks/useAdminQueries';
import TournamentSponsorManager from './TournamentSponsorManager';

const AdPlacementDashboard = () => {
    const { data: tournaments, isLoading, error } = useAdminTournaments();
    const [search, setSearch] = useState('');
    const [selectedTournament, setSelectedTournament] = useState<{ id: string; name: string } | null>(null);

    const filtered = (tournaments ?? []).filter((t: any) =>
        (t.name || t.title || '').toLowerCase().includes(search.toLowerCase())
    );

    if (selectedTournament) {
        return (
            <div>
                <button
                    onClick={() => setSelectedTournament(null)}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4 transition-colors"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to tournaments
                </button>
                <TournamentSponsorManager
                    tournamentId={selectedTournament.id}
                    tournamentName={selectedTournament.name}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Megaphone className="w-6 h-6 text-rose-400" />
                    Ad Placement Manager
                </h2>
                <p className="text-zinc-400 mt-1">Assign sponsors to tournaments and manage placement zones</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tournaments..."
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                />
            </div>

            {/* States */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
            )}

            {error && (
                <div className="text-center py-12">
                    <p className="text-red-400 mb-2">Failed to load tournaments</p>
                    <p className="text-zinc-500 text-sm">{(error as Error).message}</p>
                </div>
            )}

            {!isLoading && !error && filtered.length === 0 && (
                <div className="text-center py-12">
                    <Trophy className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">{search ? 'No tournaments match your search' : 'No tournaments found'}</p>
                </div>
            )}

            {/* Tournament Grid */}
            {!isLoading && !error && filtered.length > 0 && (
                <div className="grid gap-3">
                    {filtered.map((t: any) => {
                        const name = t.name || t.title || 'Untitled';
                        const status = t.status || 'draft';
                        const statusColors: Record<string, string> = {
                            draft: 'bg-zinc-700 text-zinc-300',
                            published: 'bg-blue-900/50 text-blue-300',
                            registration_open: 'bg-emerald-900/50 text-emerald-300',
                            registration_closed: 'bg-amber-900/50 text-amber-300',
                            in_progress: 'bg-rose-900/50 text-rose-300',
                            completed: 'bg-zinc-800 text-zinc-400',
                        };

                        return (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTournament({ id: t.id, name })}
                                className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800/60 rounded-xl hover:border-zinc-700 hover:bg-zinc-900 transition-all text-left group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                    <Trophy className="w-5 h-5 text-zinc-400 group-hover:text-rose-400 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{name}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {t.game || 'No game'} • {t.start_date ? new Date(t.start_date).toLocaleDateString() : 'No date'}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColors[status] || statusColors.draft}`}>
                                    {status.replace(/_/g, ' ')}
                                </span>
                                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdPlacementDashboard;
