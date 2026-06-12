import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, Target } from 'lucide-react';
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
}

interface WeaponMetadata {
  displayIcon?: string;
  displayName?: string;
}

interface RiotTimelineMapProps {
  matchData: EnrichedRiotMatchData;
  targetPuuid: string;
  mapData: ValorantMapMetadata | null;
  agents: Record<string, AgentMetadata>;
}

type TimelineActionType = 'kill' | 'plant';
type ValorantTeamId = 'Blue' | 'Red';
type TeamSide = 'attack' | 'defense';

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
  participants: TimelineParticipant[];
}

function getRoundNumber(round: RiotRoundResult, index: number): number {
  return typeof round.roundNum === 'number' ? round.roundNum + 1 : index + 1;
}

function isValorantTeamId(value?: string | null): value is ValorantTeamId {
  return value === 'Blue' || value === 'Red';
}

function getRoundSideSegment(round: number): 'first' | 'second' | 'ot-attack-red' | 'ot-attack-blue' {
  if (round <= 12) return 'first';
  if (round <= 24) return 'second';
  return round % 2 === 1 ? 'ot-attack-red' : 'ot-attack-blue';
}

function getOppositeTeam(team: ValorantTeamId): ValorantTeamId {
  return team === 'Red' ? 'Blue' : 'Red';
}

function getFallbackAttackingTeam(round: number): ValorantTeamId {
  if (round <= 12) return 'Red';
  if (round <= 24) return 'Blue';
  return round % 2 === 1 ? 'Red' : 'Blue';
}

function resolveAttackingTeamBySegment(
  roundResults: RiotRoundResult[],
  playersByPuuid: Map<string, EnrichedRiotMatchData['players'][number]>,
): Record<string, ValorantTeamId> {
  const segmentAttackers: Record<string, ValorantTeamId> = {};

  roundResults.forEach((round, index) => {
    if (!round.bombPlanter) return;
    const planterTeam = playersByPuuid.get(round.bombPlanter)?.teamId;
    if (!isValorantTeamId(planterTeam)) return;
    const roundNumber = getRoundNumber(round, index);
    segmentAttackers[getRoundSideSegment(roundNumber)] = planterTeam;
  });

  if (segmentAttackers.first && !segmentAttackers.second) {
    segmentAttackers.second = getOppositeTeam(segmentAttackers.first);
  }
  if (segmentAttackers.second && !segmentAttackers.first) {
    segmentAttackers.first = getOppositeTeam(segmentAttackers.second);
  }

  return segmentAttackers;
}

function getRoundSideInfo(
  round: number,
  teamId: string | undefined,
  segmentAttackers: Record<string, ValorantTeamId>,
): { side: TeamSide | null; attackingTeam: ValorantTeamId; defendingTeam: ValorantTeamId } {
  const segment = getRoundSideSegment(round);
  const attackingTeam = segmentAttackers[segment] ?? getFallbackAttackingTeam(round);
  const defendingTeam = getOppositeTeam(attackingTeam);

  return {
    side: teamId === attackingTeam ? 'attack' : teamId === defendingTeam ? 'defense' : null,
    attackingTeam,
    defendingTeam,
  };
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
  return raw.replace(/^EEquippableCategory::/i, '').replace(/^EAresItemType::/i, '').toLowerCase();
}

function formatWeaponLabel(damageType?: string | null, damageItem?: string | null): string {
  const item = normalizeAssetToken(damageItem);
  const type = normalizeAssetToken(damageType);
  const value = item || type || 'weapon';
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
        const participants = mapParticipants(kill.playerLocations, killer, victim);

        actions.push({
          id: `r${roundNumber}-kill-${playerStat.puuid}-${killIndex}`,
          type: 'kill',
          round: roundNumber,
          timeMillis: kill.roundTime ?? kill.timeSinceRoundStartMillis ?? 0,
          actorPuuid: killer,
          targetPuuid: victim,
          location: resolveEventLocation(kill.victimLocation, participants, victim),
          label: 'Elimination',
          detail: formatWeaponLabel(kill.finishingDamage?.damageType, kill.finishingDamage?.damageItem),
          weaponKey: normalizeAssetToken(kill.finishingDamage?.damageItem),
          weaponLabel: formatWeaponLabel(kill.finishingDamage?.damageType, kill.finishingDamage?.damageItem),
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
  toward?: RiotMapPoint | null,
): number | null {
  if (typeof viewRadians !== 'number' || !Number.isFinite(viewRadians)) return null;

  const from = projectPointRaw(origin, mapData);
  if (!from) return null;

  const candidates = [
    { x: Math.cos(viewRadians), y: Math.sin(viewRadians) },
    { x: Math.sin(viewRadians), y: Math.cos(viewRadians) },
    { x: -Math.cos(viewRadians), y: -Math.sin(viewRadians) },
    { x: -Math.sin(viewRadians), y: -Math.cos(viewRadians) },
  ]
    .map((vector) => {
      const forward = projectPointRaw({
        x: origin.x + vector.x * 1000,
        y: origin.y + vector.y * 1000,
      }, mapData);
      if (!forward) return null;
      const dx = forward.left - from.left;
      const dy = forward.top - from.top;
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001)) return null;
      return Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    })
    .filter((value): value is number => value !== null);

  if (!candidates.length) return null;

  if (toward && isFinitePoint(toward)) {
    const target = projectPointRaw(toward, mapData);
    if (target) {
      const desired = Math.atan2(target.top - from.top, target.left - from.left) * (180 / Math.PI) + 90;
      return candidates.reduce((best, candidate) => {
        const bestDelta = Math.abs((((best - desired) % 360) + 540) % 360 - 180);
        const candidateDelta = Math.abs((((candidate - desired) % 360) + 540) % 360 - 180);
        return candidateDelta < bestDelta ? candidate : best;
      });
    }
  }

  return candidates[0];
}

function buildWeaponMap(items: Array<{ uuid?: string; displayName?: string; displayIcon?: string }>): Record<string, WeaponMetadata> {
  const map: Record<string, WeaponMetadata> = {};
  items.forEach((item) => {
    const values = [item.uuid, item.displayName].filter(Boolean) as string[];
    values.forEach((value) => {
      map[normalizeAssetToken(value) ?? value.toLowerCase()] = {
        displayIcon: item.displayIcon,
        displayName: item.displayName,
      };
    });
  });
  return map;
}

function getPlayerName(player?: { gameName?: string; tagLine?: string }): string {
  if (!player?.gameName) return 'Unknown';
  return player.tagLine ? `${player.gameName}#${player.tagLine}` : player.gameName;
}

const AgentPortrait: React.FC<{
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
  toward?: RiotMapPoint | null;
}> = ({ location, point, viewRadians, mapData, toward }) => {
  const degrees = projectViewRotationDegrees(location, viewRadians, mapData, toward);
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
}> = ({ icon, point, role, teamTone }) => (
  <div
    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
    style={{ left: `${point.left}%`, top: `${point.top}%` }}
  >
    <div
      className={cn(
        'relative flex h-[18px] w-[18px] items-center justify-center rounded-full shadow-sm',
        teamTone === 'ally' && 'ring-1 ring-emerald-300/85 shadow-emerald-400/30',
        teamTone === 'enemy' && 'ring-1 ring-rose-300/90 shadow-rose-400/30',
        teamTone === 'neutral' && 'opacity-75 ring-1 ring-white/30',
        role === 'killer' && 'scale-110 ring-2 ring-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.65)]',
        role === 'victim' && 'scale-110 ring-2 ring-rose-200 shadow-[0_0_14px_rgba(251,113,133,0.7)]',
      )}
    >
      {icon ? (
        <img src={icon} alt="" loading="lazy" className="h-full w-full rounded-full object-cover" />
      ) : (
        <Crosshair className="h-3 w-3 text-zinc-300" />
      )}
      {role === 'victim' ? (
        <span className="pointer-events-none absolute inset-[-5px] z-20 drop-shadow-[0_0_7px_rgba(248,113,113,1)]">
          <span className="absolute left-1/2 top-1/2 h-[3px] w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-red-400" />
          <span className="absolute left-1/2 top-1/2 h-[3px] w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-red-400" />
        </span>
      ) : null}
    </div>
  </div>
);

const WeaponBadge: React.FC<{ weapon?: WeaponMetadata; label?: string }> = ({ weapon, label }) => (
  <div className="flex min-w-0 items-center justify-center">
    {weapon?.displayIcon ? (
      <img
        src={weapon.displayIcon}
        alt={weapon.displayName || label || ''}
        className="h-5 max-w-16 object-contain brightness-125 drop-shadow"
        loading="lazy"
      />
    ) : (
      <Crosshair className="h-4 w-4 text-zinc-300" />
    )}
  </div>
);

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

export const RiotTimelineMap: React.FC<RiotTimelineMapProps> = ({ matchData, targetPuuid, mapData, agents }) => {
  const [weapons, setWeapons] = useState<Record<string, WeaponMetadata>>({});

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

  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!rounds.length) {
      setActiveRound(null);
      setSelectedActionId(null);
      setHoveredActionId(null);
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
  const attackingTeamsBySegment = useMemo(
    () => resolveAttackingTeamBySegment(matchData.roundResults ?? [], playersByPuuid),
    [matchData.roundResults, playersByPuuid],
  );
  const previewAction = roundActions.find((action) => action.id === hoveredActionId)
    ?? roundActions.find((action) => action.id === selectedActionId)
    ?? roundActions[0]
    ?? null;
  const previewPoint = previewAction?.location && isFinitePoint(previewAction.location)
    ? projectPoint(previewAction.location, mapData)
    : null;
  const previewKillerParticipant = previewAction?.participants.find((participant) => participant.role === 'killer');
  const previewVictimParticipant = previewAction?.participants.find((participant) => participant.role === 'victim');
  const previewKillerPoint = previewKillerParticipant
    ? projectPoint(previewKillerParticipant.location, mapData)
    : null;
  const previewVictimPoint = previewVictimParticipant
    ? projectPoint(previewVictimParticipant.location, mapData)
    : previewAction?.type === 'kill'
      ? previewPoint
      : null;
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
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Timeline</p>
            <p className="mt-1 text-sm font-bold text-white">{mapData?.displayName || 'Valorant map'}</p>
          </div>
        </div>

        <div className="scroller-hide flex gap-2 overflow-x-auto pb-1">
          {rounds.map((round) => {
            const sideInfo = getRoundSideInfo(round, targetTeamId, attackingTeamsBySegment);
            const sideLabel = sideInfo.side === 'attack' ? 'ATK' : sideInfo.side === 'defense' ? 'DEF' : '--';
            const isAttack = sideInfo.side === 'attack';

            return (
              <button
                key={round}
                type="button"
                onClick={() => setActiveRound(round)}
                title={`Round ${round}: ${sideInfo.attackingTeam} attack, ${sideInfo.defendingTeam} defend`}
                className={cn(
                  'min-w-[88px] border px-2 py-2 text-left transition-colors',
                  activeRound === round
                    ? isAttack
                      ? 'border-amber-300 bg-amber-300/15 text-amber-100'
                      : 'border-cyan-300 bg-cyan-300/15 text-cyan-100'
                    : 'border-white/10 bg-zinc-950 text-zinc-500 hover:border-white/20 hover:text-zinc-200',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-black">R{round}</span>
                  <span
                    className={cn(
                      'font-mono text-[10px] font-black',
                      isAttack ? 'text-amber-200' : 'text-cyan-200',
                    )}
                  >
                    {sideLabel}
                  </span>
                </div>
                <div className="mt-1 truncate text-[8px] font-bold uppercase tracking-wide text-white/45">
                  {sideInfo.attackingTeam} ATK · {sideInfo.defendingTeam} DEF
                </div>
              </button>
            );
          })}
        </div>

        <div className="max-h-[520px] overflow-y-auto pr-1">
          <div className="space-y-1">
          {roundActions.map((action) => {
            const actor = action.actorPuuid ? playersByPuuid.get(action.actorPuuid) : undefined;
            const target = action.targetPuuid ? playersByPuuid.get(action.targetPuuid) : undefined;
            const actorAgent = actor?.characterId ? agents[String(actor.characterId).toLowerCase()] : undefined;
            const targetAgent = target?.characterId ? agents[String(target.characterId).toLowerCase()] : undefined;
            const weapon = action.weaponKey ? weapons[action.weaponKey] : undefined;
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
                onMouseEnter={() => setHoveredActionId(action.id)}
                onMouseLeave={() => setHoveredActionId(null)}
                className={cn(
                  'grid min-h-10 w-full grid-cols-[2rem_3.1rem_minmax(4.25rem,1fr)_3.2rem_2rem] items-center gap-2 border px-2 py-1.5 text-left transition-[background-color,border-color,outline-color,box-shadow] duration-200 ease-out',
                  perspective === 'ally' && 'border-emerald-300/20 bg-emerald-400/35 hover:bg-emerald-400/45',
                  perspective === 'enemy' && 'border-rose-300/20 bg-rose-500/35 hover:bg-rose-500/45',
                  perspective === 'neutral' && (isKill
                    ? 'border-white/10 bg-zinc-900/80 hover:bg-zinc-800/90'
                    : 'border-amber-200/20 bg-amber-300/20 hover:bg-amber-300/30'),
                  isSelected && 'outline outline-1 outline-white/35',
                )}
              >
                {isKill ? (
                  <>
                    {actorAgent?.displayIcon ? (
                      <img src={actorAgent.displayIcon} alt="" loading="lazy" className="h-7 w-7 rounded-sm object-cover" />
                    ) : (
                      <Crosshair className="h-5 w-5 text-zinc-400" />
                    )}
                    <span className="font-mono text-[10px] font-black text-white">{formatTime(action.timeMillis)}</span>
                    <div className="flex min-w-0 justify-center">
                      <WeaponBadge weapon={weapon} label={action.weaponLabel} />
                    </div>
                    <span className="text-right font-mono text-[10px] font-black text-white/75">{distanceLabel || '-'}</span>
                    {targetAgent?.displayIcon ? (
                      <img src={targetAgent.displayIcon} alt="" loading="lazy" className="h-7 w-7 rounded-sm object-cover" />
                    ) : (
                      <Crosshair className="h-5 w-5 text-zinc-400" />
                    )}
                  </>
                ) : (
                  <>
                    <SpikeBadge icon={OFFICIAL_SPIKE_ICON_URL} />
                    <span className="font-mono text-[10px] font-black text-white">{formatTime(action.timeMillis)}</span>
                    <span className="min-w-0 truncate text-xs font-black uppercase tracking-wide text-amber-100">Planted</span>
                    <span className="text-right text-[10px] font-black uppercase tracking-wide text-amber-100/80">
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

      <div className="min-w-0">
        <div className="relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden border border-white/10 bg-[#101319]">
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
              toward={previewVictimParticipant?.location}
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

              return (
                <AgentMapMarker
                  key={participant.puuid}
                  icon={agent?.displayIcon}
                  point={point}
                  role={role}
                  teamTone={teamTone}
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
  );
};
