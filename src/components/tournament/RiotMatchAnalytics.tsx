import React, { useEffect, useMemo, useState } from 'react';
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
import type { EconomyTimelineEntry, RoundTimelineEntry, WeaponSummaryEntry } from '@/types/riotMatchDetails';
import { resolveRoundResultCode } from '@/types/riotMatchDetails';

const roundResultIcon = (code?: string | null) => {
  if (code === 'Elimination') return Skull;
  if (code === 'Detonate') return Target;
  if (code === 'Defuse') return Zap;
  if (code === 'TimeOut') return Clock;
  return Trophy;
};

interface WeaponMetadata {
  displayIcon?: string;
  displayName?: string;
}

function normalizeAssetToken(value?: string | null): string | null {
  if (!value) return null;
  const raw = value.split('/').pop()?.split('.').shift() ?? value;
  return raw
    .trim()
    .replace(/^EEquippableCategory::/i, '')
    .replace(/^EAresItemType::/i, '')
    .toLowerCase();
}

function compactAssetToken(value?: string | null): string | null {
  const normalized = normalizeAssetToken(value);
  if (!normalized) return null;
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  return compact || null;
}

function assetLookupKeys(value?: string | null): string[] {
  const normalized = normalizeAssetToken(value);
  const compact = compactAssetToken(value);
  return Array.from(new Set([normalized, compact].filter((key): key is string => Boolean(key))));
}

function isUuidLike(value?: string | null): boolean {
  const compact = compactAssetToken(value);
  return Boolean(compact && /^[0-9a-f]{32}$/i.test(compact));
}

function formatWeaponFallback(value: string): string {
  const normalized = normalizeAssetToken(value) ?? value.toLowerCase();
  if (isUuidLike(normalized)) return 'Unknown weapon';
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildWeaponMetadataMap(items: Array<{ uuid?: string; displayName?: string; displayIcon?: string }>): Record<string, WeaponMetadata> {
  const map: Record<string, WeaponMetadata> = {};
  items.forEach((item) => {
    const metadata = {
      displayIcon: item.displayIcon,
      displayName: item.displayName,
    };

    [item.uuid, item.displayName].forEach((value) => {
      assetLookupKeys(value).forEach((key) => {
        map[key] = metadata;
      });
    });
  });
  return map;
}

function resolveWeaponMetadata(
  metadata: Record<string, WeaponMetadata>,
  value: string,
): WeaponMetadata | undefined {
  return assetLookupKeys(value).reduce<WeaponMetadata | undefined>(
    (match, key) => match ?? metadata[key],
    undefined,
  );
}

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
          const resultCode = resolveRoundResultCode(round);
          const Icon = roundResultIcon(resultCode);
          const title = [resultCode, round.plantSite ? `Site ${round.plantSite}` : null]
            .filter(Boolean)
            .join(' · ') || round.winningTeam;

          return (
            <div
              key={round.round}
              title={title}
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

interface RiotEconomyChartProps {
  economy: EconomyTimelineEntry[];
  teamALabel?: string;
  teamBLabel?: string;
  teamAColor?: string;
  teamBColor?: string;
}

export const RiotEconomyChart: React.FC<RiotEconomyChartProps> = ({
  economy,
  teamALabel = 'Blue',
  teamBLabel = 'Red',
  teamAColor = '#3b82f6',
  teamBColor = '#f43f5e',
}) => {
  if (!economy.length) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No economy timeline available.</p>
    );
  }

  const hasLoadout = economy.some((entry) => (entry.blueLoadout ?? 0) > 0 || (entry.redLoadout ?? 0) > 0);
  const chartData = economy.map((entry) => ({
    round: entry.round,
    blueSpent: entry.blueSpent,
    redSpent: entry.redSpent,
    blueLoadout: entry.blueLoadout ?? 0,
    redLoadout: entry.redLoadout ?? 0,
  }));

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Economy by round</p>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="riotBlueEconomy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={teamAColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={teamAColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="riotRedEconomy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={teamBColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={teamBColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="round" stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
              itemStyle={{ fontSize: '10px', fontWeight: 700 }}
            />
            <Area type="monotone" dataKey="blueSpent" stroke={teamAColor} strokeWidth={2} fill="url(#riotBlueEconomy)" name={`${teamALabel} spent`} />
            <Area type="monotone" dataKey="redSpent" stroke={teamBColor} strokeWidth={2} fill="url(#riotRedEconomy)" name={`${teamBLabel} spent`} />
            {hasLoadout ? (
              <>
                <Area type="monotone" dataKey="blueLoadout" stroke={teamAColor} strokeWidth={1.5} strokeDasharray="4 4" fill="none" name={`${teamALabel} loadout`} />
                <Area type="monotone" dataKey="redLoadout" stroke={teamBColor} strokeWidth={1.5} strokeDasharray="4 4" fill="none" name={`${teamBLabel} loadout`} />
              </>
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const RiotWeaponSummaries: React.FC<{ weapons: WeaponSummaryEntry[] }> = ({ weapons }) => {
  const [weaponMetadata, setWeaponMetadata] = useState<Record<string, WeaponMetadata>>({});

  useEffect(() => {
    let cancelled = false;

    fetch('https://valorant-api.com/v1/weapons')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.data)) {
          setWeaponMetadata(buildWeaponMetadataMap(data.data));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedWeapons = useMemo(
    () => weapons.map((entry) => {
      const metadata = resolveWeaponMetadata(weaponMetadata, entry.weapon);
      return {
        ...entry,
        displayName: metadata?.displayName ?? formatWeaponFallback(entry.weapon),
        displayIcon: metadata?.displayIcon,
      };
    }),
    [weaponMetadata, weapons],
  );

  if (!weapons.length) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No weapon usage data available.</p>
    );
  }

  const maxCount = Math.max(...resolvedWeapons.map((entry) => entry.roundCount));

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Weapon usage</p>
      <div className="space-y-2">
        {resolvedWeapons.slice(0, 8).map((entry) => (
          <div key={entry.weapon} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {entry.displayIcon ? (
                    <img
                      src={entry.displayIcon}
                      alt=""
                      loading="lazy"
                      className="h-5 w-14 flex-shrink-0 object-contain object-left brightness-125"
                    />
                  ) : null}
                  <span className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-200">
                    {entry.displayName}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">{entry.roundCount} rounds</span>
              </div>
              <div className="h-1.5 overflow-hidden bg-zinc-900">
                <div
                  className="h-full bg-rose-500/70"
                  style={{ width: `${Math.max(8, (entry.roundCount / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
