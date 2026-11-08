import React from 'react';
import { cn } from '@/lib/utils';

interface VetoTossScreenProps {
    status: 'pending_toss' | 'toss_choice_pending';
    isOrganizer: boolean;
    isTossWinner: boolean;
    winnerTeamName: string;
    opponentTeamName: string;
    tossLoading: boolean;
    onToss: () => void;
    onTossChoice: (goFirst: boolean) => void;
}

export const VetoTossScreen: React.FC<VetoTossScreenProps> = ({
    status,
    isOrganizer,
    isTossWinner,
    winnerTeamName,
    opponentTeamName,
    tossLoading,
    onToss,
    onTossChoice,
}) => {
    if (status === 'pending_toss') {
        return (
            <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-zinc-800/60 bg-[#0e0e10] px-6 py-10 sm:px-10">
                <CoinIcon className="h-14 w-14 text-zinc-400" />
                <div className="text-center">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                        Coin Toss
                    </p>
                    <p className="mt-2 font-heading text-xl font-black tracking-tight text-white">
                        {isOrganizer ? 'Flip the coin to decide who goes first.' : 'Waiting for the organizer to flip the coin.'}
                    </p>
                </div>
                {isOrganizer && (
                    <button
                        onClick={onToss}
                        disabled={tossLoading}
                        className={cn(
                            'w-full max-w-xs rounded-xl bg-rose-500 px-6 py-3 font-heading text-sm font-bold tracking-wide text-white transition-colors',
                            'hover:bg-rose-600 active:bg-rose-700',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                    >
                        {tossLoading ? 'Flipping…' : 'Flip Coin'}
                    </button>
                )}
            </div>
        );
    }

    // toss_choice_pending
    if (isTossWinner) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-zinc-800/60 bg-[#0e0e10] px-6 py-10 sm:px-10">
                <CoinIcon className="h-14 w-14 animate-toss-reveal text-rose-400" />
                <div className="text-center">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                        You won the toss!
                    </p>
                    <p className="mt-2 font-heading text-xl font-black tracking-tight text-white">
                        <span className="text-rose-400">{winnerTeamName}</span> won the coin toss.
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">Choose who acts first in the veto.</p>
                </div>
                <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
                    <button
                        onClick={() => onTossChoice(true)}
                        disabled={tossLoading}
                        className={cn(
                            'flex-1 rounded-xl bg-rose-500 px-5 py-3 font-heading text-sm font-bold tracking-wide text-white transition-colors',
                            'hover:bg-rose-600 active:bg-rose-700',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                    >
                        {tossLoading ? '…' : "We'll go first"}
                    </button>
                    <button
                        onClick={() => onTossChoice(false)}
                        disabled={tossLoading}
                        className={cn(
                            'flex-1 rounded-xl border border-zinc-700 px-5 py-3 font-heading text-sm font-bold tracking-wide text-zinc-200 transition-colors',
                            'hover:border-zinc-500 hover:text-white',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                    >
                        {tossLoading ? '…' : `Let ${opponentTeamName} go first`}
                    </button>
                </div>
            </div>
        );
    }

    // Toss loser — waiting
    return (
        <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-zinc-800/60 bg-[#0e0e10] px-6 py-10 sm:px-10">
            <CoinIcon className="h-14 w-14 animate-pulse text-zinc-500" />
            <div className="text-center">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                    Coin Toss Result
                </p>
                <p className="mt-2 font-heading text-xl font-black tracking-tight text-white">
                    <span className="text-rose-400">{winnerTeamName}</span> won the toss.
                </p>
                <p className="mt-1 text-sm text-zinc-400">Waiting for them to decide who goes first…</p>
            </div>
        </div>
    );
};

const CoinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
    >
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="1.5" />
        <line x1="24" y1="14" x2="24" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="30" x2="24" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 20h4a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);
