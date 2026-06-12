import React, { useState } from 'react';
import { Clock, Skull, Target, Trophy, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { EconomyTimelineEntry, RoundTimelineEntry, WeaponSummaryEntry } from '@/types/riotMatchDetails';
import {
  resolveDisplayRound,
  resolveRoundResultCode,
  resolveWeaponLabel,
} from '@/types/riotMatchDetails';

const roundResultIcon = (code?: string | null) => {
  if (code === 'Elimination') return Skull;
  if (code === 'Detonate') return Target;
  if (code === 'Defuse') return Zap;
  if (code === 'TimeOut') return Clock;
  return Trophy;
};

export const RiotRoundTimeline: React.FC<{ rounds: RoundTimelineEntry[] }> = ({ rounds }) => {
  if (!rounds.length) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No round timeline available.</p>
    );
  }

  const blueWins = rounds.filter((r) => r.winningTeam === 'Blue').length;
  const redWins = rounds.length - blueWins;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Round timeline</p>
        <div className="flex gap-4 font-mono text-[10px] uppercase tracking-wider">
          <span className="text-blue-400">Blue {blueWins}</span>
          <span className="text-rose-400">Red {redWins}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rounds.map((round, index) => {
          const isBlueWin = round.winningTeam === 'Blue';
          const displayRound = resolveDisplayRound(round);
          const resultCode = resolveRoundResultCode(round);
          const Icon = roundResultIcon(resultCode);
          const title = [round.displayResult || resultCode, round.plantSite ? `Site ${round.plantSite}` : null]
            .filter(Boolean)
            .join(' · ') || round.winningTeam;

          return (
            <div
              key={`${displayRound}-${index}`}
              title={title}
              className={cn(
                'flex h-11 w-9 flex-col items-center justify-center gap-0.5 rounded-sm border transition-transform hover:scale-105',
                isBlueWin
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                  : 'border-rose-500/50 bg-rose-500/15 text-rose-300',
              )}
            >
              <span className="text-[8px] font-bold opacity-80">{displayRound}</span>
              <Icon className="h-3 w-3" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

type EconomyMetric = 'spent' | 'loadout';

export const RiotEconomyChart: React.FC<{ economy: EconomyTimelineEntry[] }> = ({ economy }) => {
  const [metric, setMetric] = useState<EconomyMetric>('spent');

  if (!economy.length) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No economy timeline available.</p>
    );
  }

  const hasLoadout = economy.some((entry) => (entry.blueLoadout ?? 0) > 0 || (entry.redLoadout ?? 0) > 0);
  const chartData = economy.map((entry) => ({
    round: entry.round,
    blue: metric === 'spent' ? entry.blueSpent : (entry.blueLoadout ?? 0),
    red: metric === 'spent' ? entry.redSpent : (entry.redLoadout ?? 0),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Economy by round</p>
        {hasLoadout ? (
          <div className="flex gap-1 rounded-sm border border-white/10 p-0.5">
            {(['spent', 'loadout'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMetric(mode)}
                className={cn(
                  'px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors',
                  metric === mode ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="round" stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
              itemStyle={{ fontSize: '10px', fontWeight: 700 }}
            />
            <Line type="monotone" dataKey="blue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Blue" />
            <Line type="monotone" dataKey="red" stroke="#f43f5e" strokeWidth={2} dot={false} name="Red" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const RiotWeaponSummaries: React.FC<{ weapons: WeaponSummaryEntry[] }> = ({ weapons }) => {
  if (!weapons.length) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No weapon usage data available.</p>
    );
  }

  const maxCount = Math.max(...weapons.map((entry) => entry.roundCount));

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Weapon usage</p>
      <div className="space-y-2">
        {weapons.slice(0, 10).map((entry) => {
          const label = resolveWeaponLabel(entry);
          return (
            <div key={entry.weapon} className="flex items-center gap-3">
              {entry.displayIcon ? (
                <img src={entry.displayIcon} alt="" className="h-8 w-8 shrink-0 object-contain opacity-90" loading="lazy" />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded bg-zinc-900" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-semibold text-zinc-200">{label}</span>
                  <span className="shrink-0 font-mono text-[10px] text-zinc-500">{entry.roundCount} rounds</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-rose-500/70"
                    style={{ width: `${Math.max(8, (entry.roundCount / maxCount) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** @deprecated use RiotEconomyChart with spent/loadout toggle */
export const RiotEconomyAreaChart: React.FC<{ economy: EconomyTimelineEntry[] }> = ({ economy }) => {
  if (!economy.length) return null;
  const chartData = economy.map((entry) => ({
    round: entry.round,
    blueSpent: entry.blueSpent,
    redSpent: entry.redSpent,
  }));
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area type="monotone" dataKey="blueSpent" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
          <Area type="monotone" dataKey="redSpent" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
