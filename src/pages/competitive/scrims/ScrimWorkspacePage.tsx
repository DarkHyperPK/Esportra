import { useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Timer,
  Search,
  Settings,
} from 'lucide-react';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { InlineNotice, StatusPill } from '@/components/ui/kit';
import { CtaButton, DangerButton, OutlineButton } from '@/components/ui/button';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useScrimListings,
  useMyOffers,
  useTeamScrimSessions,
  useAcceptOffer,
  useDeclineOffer,
  useWithdrawOffer,
  usePendingReceivedOffers,
} from '@/hooks/competitive/useScrims';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { WorkspaceNewListingForm } from '@/components/competitive/scrims/WorkspaceNewListingForm';
import { WorkspaceListingCard, SCRIM_CARD_CLASS, SCRIM_EYEBROW } from '@/components/competitive/scrims/WorkspaceListingCard';
import {
  findOverlappingListings,
  formatPreferredDays,
  bestOfLabel,
} from '@/services/scrimUtils';
import type { ScrimOffer, ScrimSession } from '@/types/competitive';
import { ApiError, getApiErrorMessage } from '@/lib/apiClient';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TeamSummary {
  id: string;
  name: string;
  logo_url?: string | null;
  primary_game_slug?: string | null;
}

type SessionFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

// ── Offer tone map ─────────────────────────────────────────────────────────────

const OFFER_TONE = {
  pending: 'neutral',
  accepted: 'success',
  declined: 'neutral',
  withdrawn: 'neutral',
  expired: 'neutral',
} as const;

// ── Session row constants ──────────────────────────────────────────────────────

const STATUS_BORDER: Record<string, string> = {
  scheduled: 'border-l-rose-500',
  in_progress: 'border-l-rose-500',
  completed: 'border-l-emerald-500',
  cancelled: 'border-l-white/20',
  disputed: 'border-l-amber-500',
};

const STATUS_CHIP: Record<string, string> = {
  scheduled: 'bg-rose-500/15 text-rose-400',
  in_progress: 'bg-rose-500/20 text-rose-300',
  completed: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-white/[0.06] text-white/30',
  disputed: 'bg-amber-500/15 text-amber-400',
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'UPCOMING',
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  disputed: 'DISPUTED',
};

const GAME_GRADIENT: Record<string, string> = {
  valorant: 'from-rose-950/70 to-black/90',
  'counter-strike': 'from-sky-950/70 to-black/90',
  'league-of-legends': 'from-blue-950/70 to-black/90',
  default: 'from-white/[0.04] to-black/90',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return '';
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  if (d > 0) return `Starts in ${d}d ${h}h`;
  if (h > 0) return `Starts in ${h}h`;
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `Starts in ${m}m`;
}

function formatSessionDate(iso: string | null): string {
  if (!iso) return 'Date TBD';
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} • ${time}`;
}

function formatProposedSlot(offer: ScrimOffer): string {
  if (!offer.proposedAt) return 'No time proposed';
  const d = new Date(offer.proposedAt);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} ${date} · ${time}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TeamBubble({ logo, name }: { logo?: string | null; name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-black/50 text-[10px] font-bold text-white/55">
      {logo ? (
        <img src={logo} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

function ScrimSessionRow({ session, teamId }: { session: ScrimSession; teamId: string }) {
  const catalog = useGameCatalogContext();
  const iAmTeam1 = session.team1Id === teamId;
  const myName = (iAmTeam1 ? session.team1Name : session.team2Name) ?? 'My Team';
  const myLogo = (iAmTeam1 ? session.team1Logo : session.team2Logo) ?? null;
  const oppName = (iAmTeam1 ? session.team2Name : session.team1Name) ?? 'Opponent';
  const oppLogo = (iAmTeam1 ? session.team2Logo : session.team1Logo) ?? null;
  const catalogGame = catalog.games.find((g) => g.slug === session.gameSlug);
  const relTime = session.status === 'scheduled' ? formatRelativeTime(session.scheduledAt) : '';
  const gradient = GAME_GRADIENT[session.gameSlug ?? ''] ?? GAME_GRADIENT.default;
  const border = STATUS_BORDER[session.status] ?? 'border-l-white/10';
  const chip = STATUS_CHIP[session.status] ?? 'bg-white/[0.06] text-white/30';
  const chipLabel = STATUS_LABEL[session.status] ?? session.status.toUpperCase();

  const isActive = session.status === 'scheduled' || session.status === 'in_progress';

  return (
    <div
      className={`flex items-stretch min-h-[80px] overflow-hidden rounded-xl border border-white/[0.12] border-l-[3px] bg-[#131418] transition-colors hover:bg-[#17181d] ${border}`}
    >
      {/* Game thumbnail */}
      <div className={`w-[72px] shrink-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        {session.gameSlug ? (
          <GameLogoImage
            gameName={session.gameSlug}
            catalogLogo={catalogGame?.logo}
            catalogIcon={catalogGame?.icon}
            className="h-7 w-7 object-contain opacity-75"
          />
        ) : (
          <span className="font-mono text-[9px] text-white/20">—</span>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${chip}`}
          >
            {chipLabel}
          </span>
          <span className="truncate text-[15px] font-bold text-white">vs {oppName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-white/40">
          {catalogGame && session.gameSlug && (
            <GameLogoImage
              gameName={session.gameSlug}
              catalogLogo={catalogGame.logo}
              catalogIcon={catalogGame.icon}
              className="h-3.5 w-3.5 object-contain"
            />
          )}
          <span>{catalogGame?.name ?? session.gameSlug ?? 'Scrim'}</span>
          <span className="text-white/20">|</span>
          <span>5v5</span>
          <span className="text-white/20">|</span>
          <span>{bestOfLabel(session.bestOf ?? null)}</span>
          <span className="text-white/15">·</span>
          <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
          <span className="tabular-nums">{formatSessionDate(session.scheduledAt)}</span>
        </div>
      </div>

      {/* VS logos */}
      <div className="hidden items-center gap-3 border-l border-white/[0.05] px-5 md:flex shrink-0">
        <TeamBubble logo={myLogo} name={myName} />
        <span className="font-mono text-[11px] font-bold text-white/20">VS</span>
        <TeamBubble logo={oppLogo} name={oppName} />
      </div>

      {/* Right: time + actions */}
      <div className="flex shrink-0 items-center gap-3 border-l border-white/[0.05] px-4">
        {relTime && (
          <span className="hidden items-center gap-1.5 tabular-nums text-[12px] text-white/35 lg:flex">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {relTime}
          </span>
        )}
        <Link
          to={`/competitive/scrims/sessions/${session.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-[12px] font-medium text-white/55 transition-colors hover:border-white/20 hover:text-white"
        >
          {session.status === 'completed' || session.status === 'disputed'
            ? 'View Results →'
            : 'View Details →'}
        </Link>
        {isActive && (
          <Link
            to={`/competitive/scrims/sessions/${session.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-[12px] font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Manage
          </Link>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  iconClass,
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  iconClass: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.12] bg-[#131418] px-5 py-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-[22px] font-bold tabular-nums leading-none text-white [font-family:var(--font-heading)]">
          {value}
        </p>
        <p className="mt-1 text-[12px] text-white/40">{label}</p>
      </div>
    </div>
  );
}

function ReceivedOfferCard({ offer }: { offer: ScrimOffer }) {
  const acceptMutation = useAcceptOffer(offer.id);
  const declineMutation = useDeclineOffer(offer.id);
  const catalog = useGameCatalogContext();
  const isPending = acceptMutation.isPending || declineMutation.isPending;
  const catalogGame = catalog.games.find((g) => g.slug === offer.listingGameSlug);
  const initials = (offer.offeringTeamName ?? 'TM').slice(0, 2).toUpperCase();
  const [apiError, setApiError] = useState('');
  const [accepting, setAccepting] = useState(false);
  // Pre-fill with the offered team's proposed time if available
  const [scheduledAt, setScheduledAt] = useState<string>(
    offer.proposedAt ? new Date(offer.proposedAt).toISOString().slice(0, 16) : '',
  );

  const handleAccept = useCallback(async () => {
    setApiError('');
    try {
      await acceptMutation.mutateAsync(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : undefined);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setApiError('Only a team captain or manager can accept offers.');
      } else if (err instanceof ApiError && err.status === 409) {
        setApiError(getApiErrorMessage(err, 'This slot has just been booked. Please select another time.'));
      } else if (err instanceof ApiError && err.status === 400) {
        setApiError(getApiErrorMessage(err, 'The selected time is outside the listing\'s availability window.'));
      } else {
        setApiError(getApiErrorMessage(err, 'Could not accept offer. Try again.'));
      }
    }
  }, [acceptMutation, scheduledAt]);

  const handleDecline = useCallback(async () => {
    setApiError('');
    try {
      await declineMutation.mutateAsync();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setApiError('Only a team captain or manager can decline offers.');
      } else {
        setApiError(getApiErrorMessage(err, 'Could not decline offer. Try again.'));
      }
    }
  }, [declineMutation]);

  const hasDays = (offer.listingPreferredDays?.length ?? 0) > 0;
  const hasWindow = !!(offer.listingPreferredTimeStart && offer.listingPreferredTimeEnd);

  type MemberPreview = { username: string; avatar_seed: string | null; rank_tier_key: string | null };
  const members: MemberPreview[] = (() => {
    try { return offer.offeringMembersPreview ? JSON.parse(offer.offeringMembersPreview) : []; }
    catch { return []; }
  })();

  return (
    <div className={`${SCRIM_CARD_CLASS} border-rose-500/25 p-3.5 space-y-2.5`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.1] bg-black/40 text-[10px] font-semibold text-white/60">
          {offer.offeringTeamLogo ? (
            <img src={offer.offeringTeamLogo} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            initials
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <p className="truncate text-[13.5px] font-semibold text-white">
              {offer.offeringTeamName ?? offer.offeringTeamId.slice(0, 8)}
            </p>
            {offer.offeringTeamTag && (
              <span className="shrink-0 text-[11px] text-white/40">[{offer.offeringTeamTag}]</span>
            )}
          </div>
          <p className={`${SCRIM_EYEBROW} mt-0.5`}>
            {catalogGame?.name ?? offer.listingGameSlug?.toUpperCase() ?? 'Scrim'} · wants a scrim
          </p>
        </div>
        <StatusPill label={offer.status} tone={OFFER_TONE[offer.status]} />
      </div>

      {/* Team snapshot */}
      {(members.length > 0 || (offer.offeringActiveMemberCount ?? 0) > 0) && (
        <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className={SCRIM_EYEBROW}>Roster</p>
            <span className="text-[11px] text-white/35 tabular-nums">
              {offer.offeringActiveMemberCount ?? members.length} players
              {(offer.offeringScrimsCompleted ?? 0) > 0 && (
                <> · {offer.offeringScrimsCompleted} scrims</>
              )}
            </span>
          </div>
          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {members.map((m, i) => {
                const mi = (m.username ?? '?').slice(0, 2).toUpperCase();
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.07] text-[9px] font-semibold text-white/60">
                      {mi}
                    </span>
                    <span className="text-[11.5px] text-white/70">{m.username}</span>
                    {m.rank_tier_key && (
                      <span className="rounded bg-white/[0.05] px-1 py-px font-mono text-[9px] uppercase tracking-[0.1em] text-white/35">
                        {m.rank_tier_key}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-1.5 text-[12px] font-medium tabular-nums text-white/70">
        <CalendarClock className="h-3.5 w-3.5 text-white/35" aria-hidden />
        {formatProposedSlot(offer)}
      </div>
      {offer.notes && (
        <p className="line-clamp-2 text-[12px] italic text-white/40">"{offer.notes}"</p>
      )}

      {/* Time picker — expands when accepting */}
      {accepting && (
        <div className="space-y-2 rounded-xl border border-white/[0.08] bg-black/30 p-3">
          {(hasDays || hasWindow) && (
            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">Listing availability</p>
              <div className="flex flex-wrap gap-1.5">
                {hasDays && (
                  <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/50">
                    {formatPreferredDays(offer.listingPreferredDays!).join(' / ')}
                  </span>
                )}
                {hasWindow && (
                  <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/50">
                    {offer.listingPreferredTimeStart} – {offer.listingPreferredTimeEnd}
                    {offer.listingTimezone ? ` (${offer.listingTimezone})` : ''}
                  </span>
                )}
              </div>
            </div>
          )}
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">Confirm time</p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-[13px] text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
            />
          </div>
        </div>
      )}

      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      {offer.status === 'pending' && (
        <div className="flex gap-2 pt-0.5">
          {accepting ? (
            <>
              <CtaButton
                size="sm"
                onClick={handleAccept}
                disabled={isPending}
                className="h-8 rounded-lg px-4 text-[12px] font-semibold"
              >
                {acceptMutation.isPending ? '…' : 'Confirm scrim'}
              </CtaButton>
              <OutlineButton
                size="sm"
                onClick={() => { setAccepting(false); setApiError(''); }}
                disabled={isPending}
                className="h-8 rounded-lg px-3 text-[12px]"
              >
                Back
              </OutlineButton>
            </>
          ) : (
            <>
              <CtaButton
                size="sm"
                onClick={() => setAccepting(true)}
                disabled={isPending}
                className="h-8 rounded-lg px-4 text-[12px] font-semibold"
              >
                Accept
              </CtaButton>
              <OutlineButton
                size="sm"
                onClick={handleDecline}
                disabled={isPending}
                className="h-8 rounded-lg px-3 text-[12px]"
              >
                {declineMutation.isPending ? '…' : 'Decline'}
              </OutlineButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function OutgoingOfferCard({ offer }: { offer: ScrimOffer }) {
  const withdrawMutation = useWithdrawOffer(offer.id);
  const catalog = useGameCatalogContext();
  const catalogGame = catalog.games.find((g) => g.slug === offer.listingGameSlug);
  const [apiError, setApiError] = useState('');

  const handleWithdraw = useCallback(async () => {
    setApiError('');
    try {
      await withdrawMutation.mutateAsync();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setApiError('Only a team captain or manager can withdraw this offer.');
      } else {
        setApiError(getApiErrorMessage(err, 'Could not withdraw offer. Try again.'));
      }
    }
  }, [withdrawMutation]);

  return (
    <div className={`${SCRIM_CARD_CLASS} p-3.5 space-y-2.5`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-black/40">
          {offer.listingGameSlug ? (
            <GameLogoImage
              gameName={offer.listingGameSlug}
              catalogLogo={catalogGame?.logo}
              catalogIcon={catalogGame?.icon}
              className="h-6 w-6 object-contain"
            />
          ) : (
            <span className="font-mono text-[9px] text-white/30">—</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-white">
            {offer.listingTeamName ?? offer.listingId.slice(0, 8)}
          </p>
          <p className={`${SCRIM_EYEBROW} mt-0.5`}>Your request · waiting on them</p>
        </div>
        <StatusPill label={offer.status} tone={OFFER_TONE[offer.status]} />
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-1.5 text-[12px] font-medium tabular-nums text-white/70">
        <CalendarClock className="h-3.5 w-3.5 text-white/35" aria-hidden />
        {formatProposedSlot(offer)}
      </div>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      {offer.status === 'pending' && (
        <div className="flex justify-end pt-0.5">
          <DangerButton
            size="sm"
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
            className="h-8 rounded-lg px-3 text-[12px]"
          >
            {withdrawMutation.isPending ? '…' : 'Withdraw'}
          </DangerButton>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ScrimWorkspacePage() {
  const [searchParams] = useSearchParams();
  const [showNewListing, setShowNewListing] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all');
  const [sessionSearch, setSessionSearch] = useState('');
  const prefersReducedMotion = useReducedMotion();

  const teamsQuery = useMyTeamsSummary();
  const teams = (teamsQuery.data ?? []) as TeamSummary[];

  const urlTeamId = searchParams.get('team_id');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const resolvedTeamId = selectedTeamId || urlTeamId || teams[0]?.id || '';
  const activeTeam = teams.find((t) => t.id === resolvedTeamId) ?? teams[0] ?? null;

  const catalog = useGameCatalogContext();
  const [selectedGame, setSelectedGame] = useState<string>('');
  const gameSlug = selectedGame || activeTeam?.primary_game_slug || catalog.games[0]?.slug || null;

  function handleGameChange(slug: string) {
    setSelectedGame(slug);
    const match = teams.find((t) => t.primary_game_slug === slug);
    if (match) setSelectedTeamId(match.id);
  }

  const listingsQuery = useScrimListings(resolvedTeamId);
  const myOffersQuery = useMyOffers(resolvedTeamId);
  const sessionsQuery = useTeamScrimSessions(resolvedTeamId);

  const listings = useMemo(() => listingsQuery.data ?? [], [listingsQuery.data]);
  const myOffers = myOffersQuery.data ?? [];
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  const listingOverlaps = useMemo(() => {
    const overlaps = findOverlappingListings(listings);
    const labels = new Map<string, string[]>();
    for (const [id, otherIds] of overlaps) {
      labels.set(
        id,
        otherIds.map((otherId) => {
          const other = listings.find((l) => l.id === otherId);
          if (!other) return 'another listing';
          const days = formatPreferredDays(other.preferredDays).join('/');
          return days ? `${days} listing` : 'another listing';
        }),
      );
    }
    return labels;
  }, [listings]);

  const { offers: pendingReceivedOffers } = usePendingReceivedOffers(listings);

  // Session stat card counts
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const upcomingCount = sessions.filter((s) => s.status === 'scheduled').length;
  const ongoingCount = sessions.filter((s) => s.status === 'in_progress').length;
  const cancelledCount = sessions.filter((s) => s.status === 'cancelled').length;

  const FILTER_TABS: { key: SessionFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Scrims', count: sessions.length },
    { key: 'upcoming', label: 'Upcoming', count: upcomingCount + ongoingCount },
    { key: 'completed', label: 'Completed', count: completedCount },
    { key: 'cancelled', label: 'Cancelled', count: cancelledCount },
  ];

  const filteredSessions = useMemo(() => {
    let result = [...sessions];
    if (sessionFilter === 'upcoming') {
      result = result.filter((s) => s.status === 'scheduled' || s.status === 'in_progress');
    } else if (sessionFilter === 'completed') {
      result = result.filter((s) => s.status === 'completed');
    } else if (sessionFilter === 'cancelled') {
      result = result.filter((s) => s.status === 'cancelled');
    }
    if (sessionSearch.trim()) {
      const q = sessionSearch.toLowerCase();
      result = result.filter(
        (s) =>
          (s.team1Name ?? '').toLowerCase().includes(q) ||
          (s.team2Name ?? '').toLowerCase().includes(q) ||
          (s.gameSlug ?? '').toLowerCase().includes(q),
      );
    }
    return result.sort(
      (a, b) =>
        new Date(b.scheduledAt ?? 0).getTime() - new Date(a.scheduledAt ?? 0).getTime(),
    );
  }, [sessions, sessionFilter, sessionSearch]);

  return (
    <CompetitivePageShell>
      {teamsQuery.isLoading && (
        <div className="animate-pulse space-y-4 px-4 py-8">
          <div className="h-8 w-48 bg-white/[0.06]" />
          <div className="h-4 w-64 bg-white/[0.04]" />
        </div>
      )}

      {!teamsQuery.isLoading && !resolvedTeamId && (
        <div className="px-6 py-8">
          <InlineNotice tone="neutral">You need to be on a team to use Scrims.</InlineNotice>
        </div>
      )}

      {!teamsQuery.isLoading && resolvedTeamId && (
        <div className="min-h-[100dvh]">

          {/* ── Context bar ─────────────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-4 px-6 py-4 border-b border-white/[0.08]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.1] bg-white/[0.06] text-[10px] font-bold text-white/40">
              {activeTeam?.logo_url ? (
                <img src={activeTeam.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
              ) : (
                (activeTeam?.name ?? '??').slice(0, 2).toUpperCase()
              )}
            </span>

            {teams.length > 1 ? (
              <Select value={resolvedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger
                  aria-label="Select team"
                  className="h-auto border-none bg-transparent px-0 py-0 shadow-none focus:ring-0 [font-family:var(--font-heading)] max-w-[200px] truncate text-[18px] font-bold text-white/90"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="truncate [font-family:var(--font-heading)] text-[18px] font-bold text-white/90">
                {activeTeam?.name ?? '—'}
              </p>
            )}

            {catalog.games.length > 1 ? (
              <Select value={gameSlug ?? ''} onValueChange={handleGameChange}>
                <SelectTrigger
                  aria-label="Select game"
                  className="h-auto w-auto rounded-full border-none bg-white/[0.08] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-widest text-white/50 shadow-none focus:ring-0"
                >
                  <SelectValue placeholder="Game" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.games.map((g) => (
                    <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : gameSlug ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-white/[0.08] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-widest text-white/50">
                {catalog.games.find((g) => g.slug === gameSlug)?.name ?? gameSlug.toUpperCase()}
              </span>
            ) : null}

            <div className="flex-1" />

            <CtaButton
              onClick={() => setShowNewListing(true)}
              className="h-9 shrink-0 px-4 text-[13px] font-semibold shadow-[0_0_18px_rgba(225,29,72,0.35)] hover:shadow-[0_0_24px_rgba(225,29,72,0.45)] transition-shadow"
            >
              + New Scrim
            </CtaButton>
          </div>

          {/* Mobile context bar */}
          <div className="flex flex-col gap-2 px-4 py-3 border-b border-white/[0.08] lg:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.1] bg-white/[0.06] text-[9px] font-bold text-white/40">
                {activeTeam?.logo_url ? (
                  <img src={activeTeam.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
                ) : (
                  (activeTeam?.name ?? '??').slice(0, 2).toUpperCase()
                )}
              </span>
              {teams.length > 1 ? (
                <Select value={resolvedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger
                    aria-label="Select team"
                    className="h-auto min-w-0 border-none bg-transparent px-0 py-0 shadow-none focus:ring-0 [font-family:var(--font-heading)] truncate text-[16px] font-bold text-white/90"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="min-w-0 truncate [font-family:var(--font-heading)] text-[16px] font-bold text-white/90">
                  {activeTeam?.name ?? '—'}
                </p>
              )}
            </div>
            <CtaButton
              onClick={() => setShowNewListing(true)}
              className="h-9 w-full text-[13px] font-semibold shadow-[0_0_18px_rgba(225,29,72,0.35)] hover:shadow-[0_0_24px_rgba(225,29,72,0.45)] transition-shadow"
            >
              + New Scrim
            </CtaButton>
          </div>

          {/* ── Hero section ────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden border-b border-white/[0.07] bg-[#0d0e12]">
            {/* Subtle right-side gradient accent */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-rose-500/[0.05] to-transparent"
              aria-hidden
            />
            <div className="relative z-10 flex items-start justify-between px-6 py-8">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <span
                    className="text-[38px] font-black leading-none text-rose-500 [font-family:var(--font-heading)]"
                    aria-hidden
                  >
                    /
                  </span>
                  <h1 className="text-[30px] font-bold leading-tight text-white [font-family:var(--font-heading)]">
                    Manage Scrims
                  </h1>
                </div>
                <p className="max-w-sm text-[14px] text-white/40">
                  Create, manage and track your scrims all in one place.
                </p>
              </div>
            </div>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 border-b border-white/[0.07] px-6 py-4 lg:grid-cols-4">
            <StatCard
              icon={CalendarDays}
              value={sessionsQuery.isLoading ? '—' : sessions.length}
              label="Total Scrims"
              iconClass="bg-rose-500/15 text-rose-400"
            />
            <StatCard
              icon={CheckCircle2}
              value={sessionsQuery.isLoading ? '—' : completedCount}
              label="Completed"
              iconClass="bg-emerald-500/15 text-emerald-400"
            />
            <StatCard
              icon={Clock}
              value={sessionsQuery.isLoading ? '—' : upcomingCount}
              label="Upcoming"
              iconClass="bg-amber-500/15 text-amber-400"
            />
            <StatCard
              icon={Timer}
              value={sessionsQuery.isLoading ? '—' : ongoingCount}
              label="Ongoing"
              iconClass="bg-white/[0.08] text-white/50"
            />
          </div>

          {/* ── Attention strip (pending received offers) ────────────────────── */}
          <AnimatePresence>
            {pendingReceivedOffers.length > 0 && (
              <motion.section
                key="attention-strip"
                aria-label="Pending offers"
                initial={prefersReducedMotion ? false : { opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="border-l-[3px] border-rose-500 bg-rose-500/[0.04] px-6 py-4"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {pendingReceivedOffers.map((offer) => (
                    <ReceivedOfferCard key={offer.id} offer={offer} />
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* ── Filter tabs + search ─────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-6 py-3">
            <div className="flex items-center">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSessionFilter(tab.key)}
                  className={`relative px-3.5 pb-3 pt-2 text-[13px] font-medium transition-colors ${
                    sessionFilter === tab.key
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/65'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 text-[11px] tabular-nums ${
                      sessionFilter === tab.key ? 'text-white/55' : 'text-white/25'
                    }`}
                  >
                    {tab.count}
                  </span>
                  {sessionFilter === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" aria-hidden />
              <input
                type="search"
                placeholder="Search scrims..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="h-8 w-44 rounded-lg border border-white/[0.1] bg-white/[0.04] pl-8 pr-3 text-[13px] text-white placeholder:text-white/25 focus:border-white/20 focus:outline-none"
              />
            </div>
          </div>

          {/* ── Session list ─────────────────────────────────────────────────── */}
          <div className="space-y-2 px-6 py-4">
            {sessionsQuery.isLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[80px] rounded-xl border border-white/[0.06] bg-white/[0.02]" />
                ))}
              </div>
            ) : sessionsQuery.isError ? (
              <div className="space-y-2 py-4">
                <p className="text-[13px] text-white/40">Could not load sessions.</p>
                <button
                  type="button"
                  onClick={() => sessionsQuery.refetch()}
                  className="border border-white/[0.08] px-4 py-2 text-[13px] text-white/55 transition-colors hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[14px] text-white/35">
                  {sessionSearch.trim()
                    ? 'No scrims match your search.'
                    : sessionFilter !== 'all'
                    ? `No ${sessionFilter} scrims yet.`
                    : 'No scrims yet. Post a listing to start finding opponents.'}
                </p>
              </div>
            ) : (
              filteredSessions.map((s) => (
                <ScrimSessionRow key={s.id} session={s} teamId={resolvedTeamId} />
              ))
            )}
          </div>

          {/* ── Active Listings ──────────────────────────────────────────────── */}
          <div className="border-t border-white/[0.07] px-6 py-6">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">
              ACTIVE LISTINGS
            </h2>
            {listingsQuery.isLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-[88px] border border-white/[0.06] bg-white/[0.04]" />
                ))}
              </div>
            ) : listingsQuery.isError ? (
              <div className="space-y-2 py-4">
                <p className="text-[13px] text-white/40">Could not load listings.</p>
                <button
                  type="button"
                  onClick={() => listingsQuery.refetch()}
                  className="border border-white/[0.08] px-4 py-2 text-[13px] text-white/55 transition-colors hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : listings.length === 0 ? (
              <div className="py-4">
                <p className="text-[14px] text-white/40">
                  No active listings. Post one to start finding scrims.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {listings.map((l) => (
                  <WorkspaceListingCard
                    key={l.id}
                    listing={l}
                    overlappingWith={listingOverlaps.get(l.id) ?? []}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Outgoing Offers ──────────────────────────────────────────────── */}
          {(myOffersQuery.isLoading || myOffers.length > 0) && (
            <div className="border-t border-white/[0.07] px-6 pb-12 pt-6">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">
                OUTGOING OFFERS
              </h2>
              {myOffersQuery.isLoading ? (
                <div className="animate-pulse grid gap-3 xl:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-[72px] rounded-2xl border border-white/[0.06] bg-white/[0.04]" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {myOffers.map((offer) => (
                    <OutgoingOfferCard key={offer.id} offer={offer} />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
      {/* New listing modal */}
      <Dialog open={showNewListing} onOpenChange={setShowNewListing}>
        <DialogContent className="p-0 gap-0 max-w-xl rounded-2xl border-white/[0.1] overflow-y-auto max-h-[90vh]">
          <DialogTitle className="sr-only">New scrim listing</DialogTitle>
          <WorkspaceNewListingForm
            teamId={resolvedTeamId}
            gameSlug={gameSlug}
            onSuccess={() => setShowNewListing(false)}
            onCancel={() => setShowNewListing(false)}
          />
        </DialogContent>
      </Dialog>
    </CompetitivePageShell>
  );
}
