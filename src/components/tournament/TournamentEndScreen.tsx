import React from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Swords, Calendar, Loader2 } from 'lucide-react';

type EndState = 'winner' | 'runner_up' | 'eliminated' | 'waiting' | 'no_match';

interface TournamentEndScreenProps {
    state: EndState;
    exitRoundName?: string;
    tournamentStatus?: string;
    slug?: string;
    onNavigate: (path: string) => void;
}

const TournamentEndScreen: React.FC<TournamentEndScreenProps> = ({ state, exitRoundName, tournamentStatus, slug, onNavigate }) => {
    if (state === 'winner') {
        return (
            <div className="py-6 text-center">
                <div className="relative inline-block mb-5">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center transform rotate-12 shadow-2xl border border-emerald-400/50">
                        <Trophy className="w-10 h-10 text-white transform -rotate-12" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-1 uppercase">Tournament Champions!</h2>
                <p className="text-emerald-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">You have claimed the victory</p>
                <p className="text-emerald-100/70 text-sm max-w-xs mx-auto">Your team has emerged victorious across the entire bracket.</p>
            </div>
        );
    }

    if (state === 'runner_up') {
        return (
            <div className="py-6 text-center">
                <div className="relative inline-block mb-5">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-slate-400 to-slate-600 rounded-2xl flex items-center justify-center transform rotate-12 shadow-2xl border border-slate-400/50">
                        <Trophy className="w-10 h-10 text-slate-100 transform -rotate-12" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-1 uppercase">Tournament Runners-Up</h2>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em] mb-4">A hard-fought journey</p>
                <p className="text-slate-300/70 text-sm max-w-xs mx-auto">You navigated through the bracket to the very end. An incredible performance.</p>
            </div>
        );
    }

    if (state === 'eliminated') {
        return (
            <div className="py-8 px-4 text-center">
                <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-rose-500/10 blur-3xl rounded-full" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-2xl flex items-center justify-center shadow-2xl border border-zinc-600/30">
                        <Swords className="w-10 h-10 text-zinc-400" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Eliminated</h2>
                <p className="text-rose-400/80 text-xs font-semibold uppercase tracking-[0.2em] mb-4">Your run has ended</p>
                <div className="max-w-sm mx-auto space-y-3">
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Your team gave it everything. Every match played was a step forward — take pride in the battles fought.
                    </p>
                    {exitRoundName && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 rounded-lg border border-zinc-800 text-xs text-zinc-500">
                            <span>Exited at {exitRoundName}</span>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex gap-3 justify-center">
                    <button type="button" size="sm" onClick={() => onNavigate(`/tournaments/${slug}`)}>
                        View Tournament
                    </button>
                    <button type="button" size="sm" onClick={() => onNavigate('/tournaments')}>
                        Find More Tournaments
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'waiting') {
        return (
            <div className="text-center">
                <div className="w-12 h-12 bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                    <Calendar className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-base font-medium text-white mb-1">Waiting for Next Round</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                    {exitRoundName ? `Completed ${exitRoundName}. Waiting for next round pairings.` : 'Waiting for next round pairings.'}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800 text-xs text-zinc-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking for updates…
                </div>
            </div>
        );
    }

    // no_match
    return (
        <div className="py-12 px-4 text-center">
            <Trophy className="w-8 h-8 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-1">
                {tournamentStatus === 'draft' ? 'Bracket in Preparation' : 'No Active Match'}
            </h2>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-5">
                {tournamentStatus === 'draft'
                    ? 'The organizer is still finalizing the bracket.'
                    : 'No active matches in this round. Stay tuned!'}
            </p>
            <button type="button" size="sm" onClick={() => onNavigate(`/tournaments/${slug}`)}>
                Return to Tournament
            </button>
        </div>
    );
};

export default TournamentEndScreen;
