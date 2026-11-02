import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameTab } from '@/services/scrimGameTabs';
import type { ScrimGameStatus } from '@/types/competitive';

const DOT: Record<ScrimGameStatus, string> = {
  reported: 'bg-amber-300',
  confirmed: 'bg-emerald-400',
  disputed: 'bg-red-400',
  resolved: 'bg-sky-300',
};

interface Props {
  tabs: GameTab[];
  active: number;
  onSelect: (gameNumber: number) => void;
}

/** One tab per map of the series. A map opens once the one before it is settled. */
export function ScrimGameTabs({ tabs, active, onSelect }: Props) {
  return (
    <div role="tablist" aria-label="Maps of the series" className="flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const selected = tab.gameNumber === active;
        return (
          <button
            key={tab.gameNumber}
            type="button"
            role="tab"
            id={`game-tab-${tab.gameNumber}`}
            aria-selected={selected}
            aria-controls={`game-panel-${tab.gameNumber}`}
            aria-disabled={!tab.unlocked}
            title={tab.lockedReason ?? undefined}
            onClick={() => tab.unlocked && onSelect(tab.gameNumber)}
            className={cn(
              'inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-lg border px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
              selected ? 'border-white/30 bg-white/[0.12] text-white' : 'border-white/[0.08] text-white/60',
              tab.unlocked ? 'hover:bg-white/[0.08] hover:text-white' : 'cursor-not-allowed text-white/30',
            )}
          >
            {tab.unlocked ? (
              tab.game && <span className={cn('h-2 w-2 rounded-full', DOT[tab.game.status])} aria-hidden />
            ) : (
              <Lock className="h-3.5 w-3.5" aria-hidden />
            )}
            Game {tab.gameNumber}
            {tab.game && (
              <span className="font-mono text-[12px] tabular-nums text-white/55">
                {tab.game.team1Score}–{tab.game.team2Score}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
