import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, Target } from 'lucide-react';
import { RoundEventLog, type DebugRoundEventLogRound } from '@/components/debug/RoundEventLog';
import { cn } from '@/lib/utils';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import type { RiotMapPoint, RiotPlayerLocation, RiotRoundResult } from '@/types/riotMatchDetails';

const OFFICIAL_SPIKE_ICON_URL = 'https://media.valorant-api.com/buddies/0ec28d81-498c-af58-722c-baa60a84151c/displayicon.png';

export interface ValorantMapMetadata {
  displayName?: string;
  displayIcon?: string;
  listViewIcon?: string;
  mapUrl?: string;
  xMultiplier?: number;
  yMultiplier?: number;
  xScalarToAdd?: number;
  yScalarToAdd?: number;
}

interface AgentMetadata {
  displayIcon?: string;
  displayName?: string;
  abilities?: AbilityMetadata[];
}

interface AbilityMetadata {
  slot?: string;
  displayIcon?: string;
  displayName?: string;
}

type DamageAssetKind = 'weapon' | 'ability';

interface DamageAssetMetadata {
  displayIcon?: string;
  displayName?: string;
  kind: DamageAssetKind;
}

interface RiotTimelineMapProps {
  matchData: EnrichedRiotMatchData;
  targetPuuid: string;
  mapData: ValorantMapMetadata | null;
  agents: Record<string, AgentMetadata>;
  teamALabel?: string;
  teamBLabel?: string;
  displayTeamASide?: 'Blue' | 'Red';
}

type TimelineActionType = 'kill' | 'plant';

interface TimelineParticipant {
  puuid: string;
  location: RiotMapPoint;
  viewRadians?: number;
  role: 'killer' | 'victim' | 'nearby' | 'spike';
}

interface TimelineAction {
  id: string;
  type: TimelineActionType;
  round: number;
  timeMillis: number;
  actorPuuid?: string | null;
  targetPuuid?: string | null;
  location?: RiotMapPoint | null;
  site?: string | null;
  label: string;
  detail?: string;
  weaponKey?: string | null;
  weaponLabel?: string;
  damageTypeKey?: string | null;
  participants: TimelineParticipant[];
}

function getRoundNumber(round: RiotRoundResult, index: number): number {
  return typeof round.roundNum === 'number' ? round.roundNum + 1 : index + 1;
}

function formatTime(ms?: number): string {
  const safeMs = Math.max(0, ms ?? 0);
  const seconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function normalizeAssetToken(value?: string | null): string | null {
  if (!value) return null;
  const raw = value.split('/').pop()?.split('.').shift() ?? value;
  return raw
    .trim()
    .replace(/^EEquippableCategory::/i, '')
    .replace(/^EAresItemType::/i, '')
    .replace(/^EAbilitySlot::/i, '')
    .replace(/^EAresAbilitySlot::/i, '')
    .toLowerCase();
}

function compactAssetToken(value?: string | null): string | null {
  const normalized = normalizeAssetToken(value);
  if (!normalized) return null;
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  return compact || null;
}

function isUuidLike(value?: string | null): boolean {
  const compact = compactAssetToken(value);
  return Boolean(compact && /^[0-9a-f]{32}$/i.test(compact));
}

function weaponLookupKeys(value?: string | null): string[] {
  const normalized = normalizeAssetToken(value);
  const compact = compactAssetToken(value);
  return Array.from(new Set([normalized, compact].filter((key): key is string => Boolean(key))));
}

function abilitySlotAliases(value?: string | null): string[] {
  const compact = compactAssetToken(value);
  if (!compact) return [];

  const aliases: Record<string, string[]> = {
    grenade: ['grenade', 'abilitygrenade', 'c', 'basic1'],
    ability1: ['ability1', 'abilityone', 'q', 'basic2'],
    ability2: ['ability2', 'abilitytwo', 'e', 'signature'],
    ultimate: ['ultimate', 'x', 'ult'],
  };

  return Object.entries(aliases)
    .filter(([slot, values]) => compact === slot.toLowerCase() || values.includes(compact))
    .map(([slot]) => slot);
}

function agentAbilityDamageAliases(agent: AgentMetadata | undefined, ability: AbilityMetadata): string[] {
  const agentName = compactAssetToken(agent?.displayName);
  const abilityName = compactAssetToken(ability.displayName);
  const aliases = [
    agentName && abilityName ? `${agentName}${abilityName}` : null,
    abilityName,
  ].filter((value): value is string => Boolean(value));

  if (agentName === 'chamber' && abilityName === 'headhunter') {
    aliases.push(
      // Riot MatchDto can report Chamber's Headhunter as this agent-weapon damageItem.
      '856d9a7e4b86dc3715dc9d889c37cb90',
      'chamberpistol',
      'chambergun',
    );
  }

  if (agentName === 'chamber' && abilityName === 'tourdeforce') {
    aliases.push(
      'chambersniper',
      'chamberrifle',
      'tourdeforcesniper',
      'sniper',
    );
  }

  return aliases;
}

function buildAbilityMap(agent?: AgentMetadata): Record<string, DamageAssetMetadata> {
  const map: Record<string, DamageAssetMetadata> = {};
  agent?.abilities?.forEach((ability) => {
    const metadata: DamageAssetMetadata = {
      displayIcon: ability.displayIcon,
      displayName: ability.displayName,
      kind: 'ability',
    };

    [
      ability.slot,
      ability.displayName,
      ...(abilitySlotAliases(ability.slot)),
      ...agentAbilityDamageAliases(agent, ability),
    ].forEach((value) => {
      weaponLookupKeys(value).forEach((key) => {
        map[key] = metadata;
      });
    });
  });
  return map;
}

function buildAgentAbilityMaps(agents: Record<string, AgentMetadata>): Record<string, Record<string, DamageAssetMetadata>> {
  return Object.fromEntries(
    Object.entries(agents).map(([agentId, agent]) => [agentId, buildAbilityMap(agent)]),
  );
}

function formatWeaponLabel(damageType?: string | null, damageItem?: string | null): string {
  const item = normalizeAssetToken(damageItem);
  const type = normalizeAssetToken(damageType);
  const value = (item && !isUuidLike(item) ? item : null)
    || (type && !isUuidLike(type) ? type : null)
    || 'weapon';
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isFinitePoint(point?: RiotMapPoint | null): point is RiotMapPoint {
  return Boolean(
    point
    && Number.isFinite(point.x)
    && Number.isFinite(point.y),
  );
}

function isUsablePoint(point?: RiotMapPoint | null): point is RiotMapPoint {
  return isFinitePoint(point) && !(Math.abs(point.x) < 1 && Math.abs(point.y) < 1);
}

function getParticipantLocation(participants: TimelineParticipant[], puuid?: string | null): RiotMapPoint | null {
  if (!puuid) return null;
  return participants.find((participant) => participant.puuid === puuid)?.location ?? null;
}

function resolveEventLocation(
  primary: RiotMapPoint | null | undefined,
  participants: TimelineParticipant[],
  focalPuuid?: string | null,
): RiotMapPoint | null {
  if (isUsablePoint(primary)) return primary;
  const participantPoint = getParticipantLocation(participants, focalPuuid);
  return isUsablePoint(participantPoint) ? participantPoint : null;
}

function mapParticipants(
  locations: RiotPlayerLocation[] | undefined,
  killer?: string | null,
  victim?: string | null,
): TimelineParticipant[] {
  const byPuuid = new Map<string, TimelineParticipant>();

  locations?.forEach((entry) => {
    if (!entry.puuid || !isUsablePoint(entry.location)) return;
    byPuuid.set(entry.puuid, {
      puuid: entry.puuid,
      location: entry.location,
      viewRadians: entry.viewRadians,
      role: entry.puuid === killer ? 'killer' : entry.puuid === victim ? 'victim' : 'nearby',
    });
  });

  return Array.from(byPuuid.values());
}

function buildTimelineActions(roundResults: RiotRoundResult[]): TimelineAction[] {
  return roundResults.flatMap((round, index) => {
    const roundNumber = getRoundNumber(round, index);
    const actions: TimelineAction[] = [];
    round.playerStats?.forEach((playerStat) => {
      playerStat.kills?.forEach((kill, killIndex) => {
        const killer = kill.killer || playerStat.puuid;
        const victim = kill.victim;
        if (!killer || !victim || killer === victim) return;
        let participants = mapParticipants(kill.playerLocations, killer, victim);
        const victimLocation = resolveEventLocation(kill.victimLocation, participants, victim);

        if (victimLocation && !participants.some((participant) => participant.puuid === victim)) {
          participants = [
            ...participants,
            {
              puuid: victim,
              location: victimLocation,
              role: 'victim',
            },
          ];
        }

        actions.push({
          id: `r${roundNumber}-kill-${playerStat.puuid}-${killIndex}`,
          type: 'kill',
          round: roundNumber,
          timeMillis: kill.roundTime ?? kill.timeSinceRoundStartMillis ?? 0,
          actorPuuid: killer,
          targetPuuid: victim,
          location: victimLocation,
          label: 'Elimination',
          detail: formatWeaponLabel(kill.finishingDamage?.damageType, kill.finishingDamage?.damageItem),
          weaponKey: normalizeAssetToken(kill.finishingDamage?.damageItem),
          weaponLabel: formatWeaponLabel(kill.finishingDamage?.damageType, kill.finishingDamage?.damageItem),
          damageTypeKey: normalizeAssetToken(kill.finishingDamage?.damageType),
          participants,
        });
      });
    });

    const hasPlant = (round.plantRoundTime ?? 0) > 0 && isUsablePoint(round.plantLocation);

    if (hasPlant) {
      actions.push({
        id: `r${roundNumber}-plant`,
        type: 'plant',
        round: roundNumber,
        timeMillis: round.plantRoundTime ?? 0,
        actorPuuid: round.bombPlanter,
        location: round.plantLocation,
        site: round.plantSite,
        label: 'Spike planted',
        detail: round.plantSite ? `Site ${round.plantSite}` : undefined,
        participants: mapParticipants(round.plantPlayerLocations).map((entry) => ({ ...entry, role: 'spike' })),
      });
    }

    return actions.sort((a, b) => a.timeMillis - b.timeMillis);
  });
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function projectPoint(point: RiotMapPoint, mapData: ValorantMapMetadata | null): { left: number; top: number } | null {
  if (
    !mapData
    || typeof mapData.xMultiplier !== 'number'
    || typeof mapData.yMultiplier !== 'number'
    || typeof mapData.xScalarToAdd !== 'number'
    || typeof mapData.yScalarToAdd !== 'number'
  ) {
    return null;
  }

  const left = (point.y * mapData.xMultiplier + mapData.xScalarToAdd) * 100;
  const top = (point.x * mapData.yMultiplier + mapData.yScalarToAdd) * 100;

  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  if (left < -5 || left > 105 || top < -5 || top > 105) return null;
  return { left: clampPercent(left), top: clampPercent(top) };
}

function projectPointRaw(point: RiotMapPoint, mapData: ValorantMapMetadata | null): { left: number; top: number } | null {
  if (
    !mapData
    || typeof mapData.xMultiplier !== 'number'
    || typeof mapData.yMultiplier !== 'number'
    || typeof mapData.xScalarToAdd !== 'number'
    || typeof mapData.yScalarToAdd !== 'number'
  ) {
    return null;
  }

  const left = (point.y * mapData.xMultiplier + mapData.xScalarToAdd) * 100;
  const top = (point.x * mapData.yMultiplier + mapData.yScalarToAdd) * 100;

  return Number.isFinite(left) && Number.isFinite(top) ? { left, top } : null;
}

function projectViewRotationDegrees(
  origin: RiotMapPoint,
  viewRadians: number | undefined,
  mapData: ValorantMapMetadata | null,
): number | null {
  if (typeof viewRadians !== 'number' || !Number.isFinite(viewRadians)) return null;

  const from = projectPointRaw(origin, mapData);
  if (!from) return null;

  const forward = projectPointRaw({
    x: origin.x + Math.cos(viewRadians) * 1000,
    y: origin.y + Math.sin(viewRadians) * 1000,
  }, mapData);
  if (!forward) return null;

  const dx = forward.left - from.left;
  const dy = forward.top - from.top;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001)) return null;
  return Math.atan2(dy, dx) * (180 / Math.PI) + 90;
}

function buildWeaponMap(items: Array<{ uuid?: string; displayName?: string; displayIcon?: string }>): Record<string, DamageAssetMetadata> {
  const map: Record<string, DamageAssetMetadata> = {};
  items.forEach((item) => {
    const values = [item.uuid, item.displayName].filter(Boolean) as string[];
    values.forEach((value) => {
      weaponLookupKeys(value).forEach((key) => {
        map[key] = {
          displayIcon: item.displayIcon,
          displayName: item.displayName,
          kind: 'weapon',
        };
      });
    });
  });
  return map;
}

function resolveDamageAssetMetadata(
  weapons: Record<string, DamageAssetMetadata>,
  actorAbilityMap: Record<string, DamageAssetMetadata> | undefined,
  weaponKey?: string | null,
  damageTypeKey?: string | null,
): DamageAssetMetadata | undefined {
  const abilityMap = actorAbilityMap ?? {};
  const itemKeys = weaponLookupKeys(weaponKey);
  const typeKeys = weaponLookupKeys(damageTypeKey);

  const abilityFromItem = itemKeys.reduce<DamageAssetMetadata | undefined>(
    (match, key) => match ?? abilityMap[key],
    undefined,
  );
  if (abilityFromItem) return abilityFromItem;

  const abilityFromSlot = [...itemKeys, ...typeKeys, ...abilitySlotAliases(weaponKey), ...abilitySlotAliases(damageTypeKey)]
    .reduce<DamageAssetMetadata | undefined>((match, key) => match ?? abilityMap[key], undefined);
  if (abilityFromSlot) return abilityFromSlot;

  const weaponFromItem = itemKeys.reduce<DamageAssetMetadata | undefined>(
    (match, key) => match ?? weapons[key],
    undefined,
  );
  if (weaponFromItem) return weaponFromItem;

  return undefined;
}

function cleanDamageAssetLabel(asset?: DamageAssetMetadata, fallback?: string): string | null {
  const label = asset?.displayName || fallback;
  if (!label || isUuidLike(label) || label.toLowerCase() === 'weapon') return null;
  return label;
}

function _getPlayerName(player?: { gameName?: string; tagLine?: string }): string {
  if (!player?.gameName) return 'Unknown';
  return player.tagLine ? `${player.gameName}#${player.tagLine}` : player.gameName;
}

const _AgentPortrait: React.FC<{
  icon?: string;
  name: string;
  side?: string;
  roleLabel?: string;
  tone?: 'killer' | 'victim' | 'neutral';
}> = ({ icon, name, side, roleLabel, tone = 'neutral' }) => (
  <div className="min-w-0">
    {roleLabel ? (
      <div
        className={cn(
          'mb-1 text-center text-[8px] font-black uppercase tracking-widest',
          tone === 'killer' ? 'text-emerald-300' : 'text-rose-300',
        )}
      >
        {roleLabel}
      </div>
    ) : null}
    {icon ? (
      <img
        src={icon}
        alt=""
        className={cn(
          'mx-auto h-12 w-12 rounded-full object-cover drop-shadow-lg',
          tone === 'killer' && 'ring-2 ring-emerald-300',
          tone === 'victim' && 'ring-2 ring-rose-300',
        )}
        loading="lazy"
      />
    ) : (
      <Crosshair className="mx-auto h-8 w-8 text-zinc-500" />
    )}
    <div className="mt-1 truncate text-center text-[10px] font-bold text-zinc-200">{name}</div>
    {side ? <div className="truncate text-center text-[8px] uppercase tracking-wider text-zinc-600">{side}</div> : null}
  </div>
);

function formatDistanceLabel(
  first?: RiotMapPoint | null,
  second?: RiotMapPoint | null,
): string {
  if (!isFinitePoint(first) || !isFinitePoint(second)) return '';
  const distance = Math.hypot(first.x - second.x, first.y - second.y);
  if (!Number.isFinite(distance) || distance <= 0) return '';
  return `${Math.round(distance / 100)}m`;
}

function resolveExactSnapshotParticipants(
  action: TimelineAction | null,
  roundActions: TimelineAction[],
): TimelineParticipant[] {
  if (!action) return [];

  const byPuuid = new Map<string, TimelineParticipant>();
  roundActions
    .filter((entry) => entry.round === action.round && entry.timeMillis === action.timeMillis)
    .flatMap((entry) => entry.participants)
    .forEach((participant) => {
      byPuuid.set(participant.puuid, {
        ...participant,
        role: 'nearby',
      });
    });

  action.participants.forEach((participant) => {
    byPuuid.set(participant.puuid, participant);
  });

  return Array.from(byPuuid.values());
}

const PlayerFovCone: React.FC<{
  location: RiotMapPoint;
  point: { left: number; top: number };
  viewRadians?: number;
  mapData: ValorantMapMetadata | null;
}> = ({ location, point, viewRadians, mapData }) => {
  const degrees = projectViewRotationDegrees(location, viewRadians, mapData);
  if (degrees === null) return null;

  return (
    <div
      className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 opacity-55 transition-all duration-300 ease-out"
      style={{
        left: `${point.left}%`,
        top: `${point.top}%`,
        transform: `translate(-50%, -50%) rotate(${degrees}deg)`,
      }}
    >
      <div className="h-full w-full bg-cyan-300/20 blur-[0.5px] [clip-path:polygon(50%_50%,18%_0,82%_0)]" />
    </div>
  );
};

const AgentMapMarker: React.FC<{
  icon?: string;
  point: { left: number; top: number };
  role: 'killer' | 'victim' | 'neutral';
  teamTone: 'ally' | 'enemy' | 'neutral';
  isFocused: boolean;
  isDimmed: boolean;
}> = ({ icon, point, role, teamTone, isFocused, isDimmed }) => (
  <div
    className={cn(
      'absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out',
      isFocused ? 'z-20' : 'z-10',
    )}
    style={{ left: `${point.left}%`, top: `${point.top}%` }}
  >
    <div
      className={cn(
        'relative flex h-[18px] w-[18px] items-center justify-center rounded-full shadow-sm transition-all duration-300 ease-out',
        teamTone === 'ally' && 'ring-2 ring-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.55)]',
        teamTone === 'enemy' && 'ring-2 ring-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.55)]',
        teamTone === 'neutral' && 'opacity-75 ring-1 ring-white/30',
        isFocused && 'scale-110 brightness-125 saturate-150',
        isDimmed && 'scale-95 opacity-35 brightness-75 saturate-50',
      )}
    >
      {icon ? (
        <img src={icon} alt="" loading="lazy" className="h-full w-full rounded-full object-cover" />
      ) : (
        <Crosshair className="h-3 w-3 text-zinc-300" />
      )}
      {role === 'victim' ? (
        <span className="pointer-events-none absolute inset-[-6px] z-30 drop-shadow-[0_0_8px_rgba(248,113,113,1)]">
          <span className="absolute left-1/2 top-1/2 h-[3px] w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-red-400" />
          <span className="absolute left-1/2 top-1/2 h-[3px] w-8 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-red-400" />
        </span>
      ) : null}
    </div>
  </div>
);

const WeaponBadge: React.FC<{ weapon?: DamageAssetMetadata; label?: string }> = ({ weapon, label }) => {
  const cleanLabel = cleanDamageAssetLabel(weapon, label);

  return (
    <div className="relative flex min-w-0 items-center justify-center" title={cleanLabel ?? undefined}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
      {weapon?.displayIcon ? (
        <img
          src={weapon.displayIcon}
          alt={cleanLabel || ''}
          className={cn(
            'relative z-10 h-5 max-w-[72px] object-contain brightness-125 contrast-125 drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]',
            weapon.kind === 'ability' && 'max-w-6 rounded-sm',
          )}
          loading="lazy"
        />
      ) : (
        <span className="relative z-10 inline-flex h-5 min-w-5 items-center justify-center text-zinc-300/80">
          {cleanLabel ? (
            <span className="bg-[#101820] px-1 font-mono text-[8px] font-black uppercase tracking-wider">
              {cleanLabel}
            </span>
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
        </span>
      )}
    </div>
  );
};

const SpikeBadge: React.FC<{ icon?: string | null }> = ({ icon }) => {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center">
      <div className="absolute inset-1 rounded-full bg-amber-300/20 blur-md" />
      {icon ? (
        <img
          src={icon}
          alt=""
          className="relative z-10 max-h-8 max-w-8 object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.45)]"
          loading="lazy"
        />
      ) : (
        <div className="relative z-10 h-7 w-6 drop-shadow-[0_0_12px_rgba(251,191,36,0.45)]">
          <div className="absolute left-1/2 top-0 h-3 w-5 -translate-x-1/2 rounded-t-full border border-amber-100/80" />
          <div className="absolute bottom-0 left-1/2 h-5 w-4 -translate-x-1/2 bg-gradient-to-b from-slate-300 to-zinc-800 [clip-path:polygon(50%_0,100%_22%,82%_100%,18%_100%,0_22%)]" />
          <div className="absolute bottom-1 left-1/2 h-3 w-1 -translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_8px_rgba(125,211,252,0.95)]" />
        </div>
      )}
    </div>
  );
};

export const RiotTimelineMap: React.FC<RiotTimelineMapProps> = ({
  matchData,
  targetPuuid,
  mapData,
  agents,
  teamALabel,
  teamBLabel,
  displayTeamASide,
}) => {
  const [weapons, setWeapons] = useState<Record<string, DamageAssetMetadata>>({});

  useEffect(() => {
    let cancelled = false;

    fetch('https://valorant-api.com/v1/weapons')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data?.data)) return;
        setWeapons(buildWeaponMap(data.data));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const actions = useMemo(
    () => buildTimelineActions(matchData.roundResults ?? []),
    [matchData.roundResults],
  );

  const rounds = useMemo(
    () => Array.from(new Set(actions.map((action) => action.round))).sort((a, b) => a - b),
    [actions],
  );
  const roundLogRounds = useMemo<DebugRoundEventLogRound[]>(
    () => {
      const fromResults = (matchData.roundResults ?? []).map((round, index) => ({
        round: getRoundNumber(round, index),
        winningTeam: round.winningTeam,
        resultCode: round.roundResultCode,
        result: round.roundResult,
        plantSite: round.plantSite,
      }));

      return fromResults.length
        ? fromResults
        : rounds.map((round) => ({ round }));
    },
    [matchData.roundResults, rounds],
  );

  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!rounds.length) {
      setActiveRound(null);
      setSelectedActionId(null);
      return;
    }

    setActiveRound((current) => (current && rounds.includes(current) ? current : rounds[0]));
  }, [rounds]);

  const roundActions = useMemo(
    () => actions
      .filter((action) => action.round === activeRound)
      .sort((a, b) => a.timeMillis - b.timeMillis),
    [actions, activeRound],
  );

  useEffect(() => {
    if (!roundActions.length) {
      setSelectedActionId(null);
      return;
    }

    setSelectedActionId((current) => (
      current && roundActions.some((action) => action.id === current) ? current : roundActions[0].id
    ));
  }, [roundActions]);

  const playersByPuuid = useMemo(() => {
    const map = new Map(matchData.players.map((player) => [player.puuid, player]));
    return map;
  }, [matchData.players]);

  const targetTeamId = playersByPuuid.get(targetPuuid)?.teamId;
  const opponentTeamId = matchData.teams.find((team) => team.teamId !== targetTeamId)?.teamId;
  const logTeamAId = displayTeamASide ?? targetTeamId;
  const logTeamBId = displayTeamASide
    ? (displayTeamASide === 'Blue' ? 'Red' : 'Blue')
    : opponentTeamId;
  const agentAbilityMaps = useMemo(() => buildAgentAbilityMaps(agents), [agents]);
  const selectRound = (round: number) => {
    setActiveRound(round);
    const firstAction = actions
      .filter((action) => action.round === round)
      .sort((a, b) => a.timeMillis - b.timeMillis)[0];
    setSelectedActionId(firstAction?.id ?? null);
  };
  const previewAction = roundActions.find((action) => action.id === selectedActionId)
    ?? roundActions[0]
    ?? null;
  const previewPoint = previewAction?.location && isFinitePoint(previewAction.location)
    ? projectPoint(previewAction.location, mapData)
    : null;
  const previewKillerParticipant = previewAction?.participants.find((participant) => participant.role === 'killer');
  const _previewVictimParticipant = previewAction?.participants.find((participant) => participant.role === 'victim');
  const activeSpikeAction = previewAction
    ? roundActions
      .filter((action) => action.type === 'plant' && action.timeMillis <= previewAction.timeMillis)
      .at(-1)
    : null;
  const activeSpikePoint = activeSpikeAction?.location && isFinitePoint(activeSpikeAction.location)
    ? projectPoint(activeSpikeAction.location, mapData)
    : null;

  const selectedAction = previewAction;
  const selectedPoint = previewPoint;
  const focusedPuuids = useMemo(() => {
    const focus = new Set<string>();
    if (previewAction?.actorPuuid) focus.add(previewAction.actorPuuid);
    if (previewAction?.targetPuuid) focus.add(previewAction.targetPuuid);
    return focus;
  }, [previewAction?.actorPuuid, previewAction?.targetPuuid]);
  const exactSnapshotParticipants = useMemo(
    () => resolveExactSnapshotParticipants(previewAction, roundActions),
    [previewAction, roundActions],
  );
  const selectedMainParticipant = previewAction?.type === 'kill'
    ? previewKillerParticipant
    : exactSnapshotParticipants.find((participant) => participant.puuid === targetPuuid)
      ?? exactSnapshotParticipants[0];
  const selectedMainPoint = selectedMainParticipant
    ? projectPoint(selectedMainParticipant.location, mapData)
    : null;
  const mapParticipantsForAction = exactSnapshotParticipants
    .map((participant) => ({
      participant,
      point: projectPoint(participant.location, mapData),
      player: playersByPuuid.get(participant.puuid),
    }))
    .filter((entry): entry is {
      participant: TimelineParticipant;
      point: { left: number; top: number };
      player: EnrichedRiotMatchData['players'][number] | undefined;
    } => Boolean(entry.point)) ?? [];

  const mapImage = mapData?.displayIcon;

  if (!actions.length) {
    return (
      <div className="flex min-h-[280px] items-center justify-center border border-white/10 bg-zinc-950/60 p-8 text-center">
        <div>
          <Target className="mx-auto h-8 w-8 text-zinc-700" />
          <p className="mt-3 text-sm font-semibold text-zinc-400">No location timeline available.</p>
          <p className="mt-1 text-xs text-zinc-600">
            The enriched Riot payload did not include kill or spike location events for this match.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-4">
      <div className="min-w-0 overflow-hidden border border-white/5 bg-[#07111a] shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-[linear-gradient(90deg,#2a4054,#172636)] px-4 py-2.5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-100/85">Event Log</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Click an action to stage the minimap
            </p>
          </div>
          <p className="text-xs font-black text-white">{mapData?.displayName || 'Valorant map'}</p>
        </div>

        <RoundEventLog
          rounds={roundLogRounds}
          teamAId={logTeamAId}
          teamBId={logTeamBId}
          teamALabel={teamALabel}
          teamBLabel={teamBLabel}
          activeRound={activeRound}
          onSelectRound={selectRound}
          teamAScore={matchData.teams.find((team) => team.teamId === logTeamAId)?.roundsWon}
          teamBScore={matchData.teams.find((team) => team.teamId === logTeamBId)?.roundsWon}
          className="border-x-0 border-b-0 border-t-0 shadow-none"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="min-w-0 overflow-hidden border border-white/5 bg-[#07111a] shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
        <div className="max-h-[620px] overflow-y-auto">
          <div className="space-y-1">
          {roundActions.map((action) => {
            const actor = action.actorPuuid ? playersByPuuid.get(action.actorPuuid) : undefined;
            const target = action.targetPuuid ? playersByPuuid.get(action.targetPuuid) : undefined;
            const actorAgent = actor?.characterId ? agents[String(actor.characterId).toLowerCase()] : undefined;
            const targetAgent = target?.characterId ? agents[String(target.characterId).toLowerCase()] : undefined;
            const actorAbilityMap = actor?.characterId ? agentAbilityMaps[String(actor.characterId).toLowerCase()] : undefined;
            const weapon = resolveDamageAssetMetadata(weapons, actorAbilityMap, action.weaponKey, action.damageTypeKey);
            const isKill = action.type === 'kill';
            const isSelected = selectedAction?.id === action.id;
            const killerParticipant = action.participants.find((participant) => participant.role === 'killer');
            const victimParticipant = action.participants.find((participant) => participant.role === 'victim');
            const distanceLabel = formatDistanceLabel(killerParticipant?.location, victimParticipant?.location);
            const perspective = isKill && targetTeamId
              ? actor?.teamId === targetTeamId
                ? 'ally'
                : target?.teamId === targetTeamId
                  ? 'enemy'
                  : 'neutral'
              : 'neutral';

            return (
              <button
                key={action.id}
                type="button"
                onClick={() => setSelectedActionId(action.id)}
                onFocus={() => setSelectedActionId(action.id)}
                className={cn(
                  'group relative grid min-h-[46px] w-full grid-cols-[2.25rem_2.9rem_minmax(4.75rem,1fr)_2.9rem_2.25rem] items-center gap-2 overflow-hidden border-0 border-b border-black/35 px-2 py-1.5 text-left transition-all duration-200 ease-out',
                  perspective === 'ally' && 'bg-[linear-gradient(90deg,rgba(20,184,166,0.62),rgba(17,74,74,0.88))] hover:brightness-110',
                  perspective === 'enemy' && 'bg-[linear-gradient(90deg,rgba(136,19,55,0.9),rgba(58,12,28,0.96))] hover:brightness-110',
                  perspective === 'neutral' && (isKill
                    ? 'bg-[linear-gradient(90deg,#152435,#0d1722)] hover:brightness-110'
                    : 'bg-[linear-gradient(90deg,rgba(251,191,36,0.24),rgba(46,38,18,0.9))] hover:brightness-110'),
                  isSelected && 'z-10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.32),0_0_24px_rgba(255,255,255,0.08)] brightness-110',
                )}
              >
                <span className={cn(
                  'absolute inset-y-0 left-0 w-1',
                  perspective === 'ally' && 'bg-teal-200',
                  perspective === 'enemy' && 'bg-rose-300',
                  perspective === 'neutral' && (isKill ? 'bg-slate-400' : 'bg-amber-200'),
                )} />
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.12),transparent_38%)]" />
                {isKill ? (
                  <>
                    {actorAgent?.displayIcon ? (
                      <img src={actorAgent.displayIcon} alt="" loading="lazy" className="relative z-10 h-8 w-8 object-cover shadow-[0_0_12px_rgba(0,0,0,0.45)]" />
                    ) : (
                      <Crosshair className="relative z-10 h-5 w-5 text-zinc-400" />
                    )}
                    <span className="relative z-10 font-mono text-[10px] font-black text-white/95">{formatTime(action.timeMillis)}</span>
                    <div className="relative z-10 flex min-w-0 justify-center">
                      <WeaponBadge weapon={weapon} label={action.weaponLabel} />
                    </div>
                    <span className="relative z-10 text-right font-mono text-[10px] font-black text-white/75">{distanceLabel || '-'}</span>
                    {targetAgent?.displayIcon ? (
                      <img src={targetAgent.displayIcon} alt="" loading="lazy" className="relative z-10 h-8 w-8 object-cover opacity-95 shadow-[0_0_12px_rgba(0,0,0,0.45)]" />
                    ) : (
                      <Crosshair className="relative z-10 h-5 w-5 text-zinc-400" />
                    )}
                  </>
                ) : (
                  <>
                    <SpikeBadge icon={OFFICIAL_SPIKE_ICON_URL} />
                    <span className="relative z-10 font-mono text-[10px] font-black text-white">{formatTime(action.timeMillis)}</span>
                    <span className="relative z-10 min-w-0 truncate text-xs font-black uppercase tracking-wide text-amber-100">Spike Planted</span>
                    <span className="relative z-10 text-right text-[10px] font-black uppercase tracking-wide text-amber-100/80">
                      {action.site ? `Site ${action.site}` : 'Spike'}
                    </span>
                    <span />
                  </>
                )}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      <div className="min-w-0 bg-[#0e1a24]">
        <div className="flex items-center justify-between border-b border-white/5 bg-[#263b4d] px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200/80">Player Positions</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300/60">Show everyone</p>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[620px] overflow-hidden bg-[#101922]">
          {mapImage ? (
            <img
              src={mapImage}
              alt={mapData?.displayName ? `${mapData.displayName} tactical map` : 'Valorant tactical map'}
              className="absolute inset-0 h-full w-full object-contain opacity-80"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-zinc-600">
              Official tactical map unavailable for this match.
            </div>
          )}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(0,0,0,0.28)_70%)]" />

          {selectedMainPoint && selectedMainParticipant?.viewRadians !== undefined ? (
            <PlayerFovCone
              location={selectedMainParticipant.location}
              point={selectedMainPoint}
              viewRadians={selectedMainParticipant.viewRadians}
              mapData={mapData}
            />
          ) : null}

          {mapParticipantsForAction
            .slice()
            .sort((a, b) => {
              const weight = (role: TimelineParticipant['role']) => (role === 'nearby' || role === 'spike' ? 0 : 1);
              return weight(a.participant.role) - weight(b.participant.role);
            })
            .map(({ participant, point, player }) => {
              const agent = player?.characterId ? agents[String(player.characterId).toLowerCase()] : undefined;
              const role = participant.role === 'killer'
                ? 'killer'
                : participant.role === 'victim'
                  ? 'victim'
                  : 'neutral';
              const teamTone = targetTeamId && player?.teamId
                ? player.teamId === targetTeamId
                  ? 'ally'
                  : 'enemy'
                : 'neutral';
              const isFocused = focusedPuuids.has(participant.puuid);
              const isDimmed = focusedPuuids.size > 0 && !isFocused;

              return (
                <AgentMapMarker
                  key={participant.puuid}
                  icon={agent?.displayIcon}
                  point={point}
                  role={role}
                  teamTone={teamTone}
                  isFocused={isFocused}
                  isDimmed={isDimmed}
                />
              );
            })}

          {selectedAction?.type === 'kill' && activeSpikePoint ? (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 opacity-80"
              style={{ left: `${activeSpikePoint.left}%`, top: `${activeSpikePoint.top}%` }}
            >
              <div className="relative scale-75">
                <SpikeBadge icon={OFFICIAL_SPIKE_ICON_URL} />
                <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                  Spike planted
                </div>
              </div>
            </div>
          ) : null}

          {selectedAction?.type === 'plant' && selectedPoint ? (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${selectedPoint.left}%`, top: `${selectedPoint.top}%` }}
            >
              <div className="relative">
                <SpikeBadge icon={OFFICIAL_SPIKE_ICON_URL} />
                <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-amber-200/40" />
                <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                  Spike planted
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
    </div>
  );
};
