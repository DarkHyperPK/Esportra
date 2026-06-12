import React from 'react';
import { Clock, Skull, Target, Trophy, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { EconomyTimelineEntry, RoundTimelineEntry } from '@/types/riotMatchDetails';

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

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Round timeline</p>
      <div className="flex flex-wrap gap-2">
        {rounds.map((round) => {
          const isBlueWin = round.winningTeam === 'Blue';
          const Icon = roundResultIcon(round.resultCode);
          return (
            <div
              key={round.round}
              title={round.resultCode || round.winningTeam}
              className={cn(
                'flex h-12 w-10 flex-col items-center justify-center gap-1 border',
                isBlueWin
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300',
              )}
            >
              <span className="text-[8px] font-bold opacity-70">{round.round}</span>
              <Icon className="h-3.5 w-3.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RiotEconomyChart: React.FC<{ economy: EconomyTimelineEntry[] }> = ({ economy }) => {
  if (!economy.length) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No economy timeline available.</p>
    );
  }

  const chartData = economy.map((entry) => ({
    round: entry.round,
    blueSpent: entry.blueSpent,
    redSpent: entry.redSpent,
  }));

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Economy by round</p>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="riotBlueEconomy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="riotRedEconomy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="round" stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
              itemStyle={{ fontSize: '10px', fontWeight: 700 }}
            />
            <Area type="monotone" dataKey="blueSpent" stroke="#3b82f6" strokeWidth={2} fill="url(#riotBlueEconomy)" name="Blue spent" />
            <Area type="monotone" dataKey="redSpent" stroke="#f43f5e" strokeWidth={2} fill="url(#riotRedEconomy)" name="Red spent" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
