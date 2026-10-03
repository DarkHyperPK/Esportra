import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Eye, Info, Trash2, Trophy } from 'lucide-react';
import { CommandButton, CommandIconButton } from '@/components/management/CommandSurface';
import { TONE_TEXT } from '@/components/ui/kit';
import { TournamentCardMedia } from '@/components/tournament/card/TournamentCardMedia';
import { TournamentCardStats } from '@/components/tournament/card/TournamentCardStats';
import { useAdmin } from '@/hooks/useAdmin';
import { useRole } from '@/hooks/useRole';
import { trackClick, trackImpression } from '@/hooks/useSponsors';
import { cn } from '@/lib/utils';
import type { TournamentCardBadge } from '@/types/tournament';
import {
  compactMoney, contextLine, fillPercent, isPaidEntry, primaryAction, startLabel, statusMeta,
  type ContextIcon, type TournamentCardMode,
} from '@/utils/tournamentCardModel';

const REGION_LABELS: Record<string, string> = {
  'na-east': 'NA East', 'na-west': 'NA West', latam: 'LATAM', eu: 'EU', me: 'ME', sea: 'SEA', oce: 'OCE', africa: 'Africa', global: 'Global',
};

const ICONS: Record<ContextIcon, React.ComponentType<{ className?: string }> | null> = {
  clock: Clock, trophy: Trophy, alert: AlertTriangle, info: Info, check: CheckCircle2, live: null,
};

export interface TournamentCardProps {
  id: string;
  name: string;
  game: string;
  slug: string;
  status: string;
  max_participants: number;
  current_participants: number | undefined;
  prize_pool?: string | null;
  entry_fee?: string | null;
  currency?: string;
  is_online?: boolean | null;
  image_url?: string | null;
  start_date?: string;
  registration_deadline?: string | null;
  team_size?: number;
  region?: string;
  organizer_name?: string;
  organizer_id?: string;
  user_id?: string;
  currentUserId?: string;
  winner_name?: string;
  card_badge?: TournamentCardBadge | null;
  registrationData?: { id: string } | null;
  /** "manage" shows owner actions; "browse" (default) shows the player action. */
  mode?: TournamentCardMode;
  checked_in_count?: number | null;
  pending_payments?: number | null;
  /** Skip loading game art for very long lists. */
  lite?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Accepted for older call sites; the card derives date and venue from start_date and is_online. */
  date?: string;
  time?: string;
  venue?: string | null;
  end_date?: string;
}

/**
 * The one tournament card used everywhere: Browse, Manage, org profiles.
 * Same anatomy for every viewer; only the context line and actions change.
 */
const TournamentCardInner: React.FC<TournamentCardProps> = (p) => {
  const cardRef = useRef<HTMLElement>(null);
  const { currentRole } = useRole();
  const admin = useAdmin();
  const ownerId = p.organizer_id || p.user_id;
  const ownsIt = (currentRole === 'organizer' && !!p.currentUserId && p.currentUserId === ownerId) || admin.hasPermission('tournaments:edit');
  const mode: TournamentCardMode = p.mode ?? (ownsIt ? 'manage' : 'browse');
  const publicPath = `/tournaments/${p.slug || p.id}`;
  const managePath = `/organizer/tournament/${p.slug || p.id}`;

  useEffect(() => {
    const badge = p.card_badge;
    if (!badge || !cardRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        trackImpression(badge.sponsorId, 'card_badge', p.id);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [p.card_badge, p.id]);

  const input = {
    mode, status: p.status, start_date: p.start_date, registration_deadline: p.registration_deadline,
    max_participants: p.max_participants || 0, current_participants: p.current_participants ?? 0, team_size: p.team_size,
    prize_pool: p.prize_pool, entry_fee: p.entry_fee, currency: p.currency, winner_name: p.winner_name,
    isRegistered: Boolean(p.registrationData), checked_in_count: p.checked_in_count, pending_payments: p.pending_payments,
  };
  const status = statusMeta(p.status, p.registration_deadline);
  const start = startLabel(p.start_date);
  const prize = compactMoney(p.prize_pool, p.currency);
  const ctx = contextLine(input);
  const action = primaryAction(input);
  const CtxIcon = ICONS[ctx.icon];
  const chips = [p.is_online === false ? 'LAN' : 'Online', ...(isPaidEntry(p.entry_fee) ? ['Paid'] : [])];
  const meta = [p.region && REGION_LABELS[p.region], mode === 'manage' ? null : p.organizer_name && `by ${p.organizer_name}`].filter(Boolean);

  return (
    <article
      ref={cardRef}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden bg-[#111114] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none',
        'after:pointer-events-none after:absolute after:inset-0 after:z-20 after:transition-shadow',
        p.selected ? 'after:shadow-[inset_0_0_0_1px_rgba(244,63,94,0.75)]' : 'after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]',
      )}
    >
      <TournamentCardMedia
        name={p.name} game={p.game} imageUrl={p.image_url} status={status} chips={chips} loadGameArt={!p.lite}
        selectable={p.selectable} selected={p.selected} onToggleSelect={() => p.onToggleSelect?.(p.id)}
      />

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          <span className="text-zinc-300">{p.game}</span>
          {meta.map((m) => <span key={String(m)}> · {m}</span>)}
        </p>
        <h3 className="mt-1.5 line-clamp-2 min-h-[2.4em] font-heading text-xl font-bold leading-[1.2] tracking-tight text-white">
          <Link
            to={mode === 'manage' ? managePath : publicPath}
            className="after:absolute after:inset-0 after:z-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-white/40"
          >
            {p.name}
          </Link>
        </h3>

        <TournamentCardStats
          stats={[
            { label: 'Starts', value: start.value, sub: start.sub },
            { label: 'Teams', value: String(input.current_participants), unit: input.max_participants ? `/ ${input.max_participants}` : undefined, fill: fillPercent(input.current_participants, input.max_participants) },
            { label: 'Prize', value: prize.value, sub: prize.unit },
          ]}
        />

        <p className="mt-3 flex min-h-[18px] items-start gap-2 text-[12.5px] leading-[18px] text-zinc-400">
          {CtxIcon ? <CtxIcon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', TONE_TEXT[ctx.tone])} /> : <span aria-hidden className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
          <span className="line-clamp-2">
            {ctx.segments.map((s, i) => <span key={i} className={s.strong ? 'font-semibold text-white' : undefined}>{s.text}</span>)}
          </span>
        </p>

        {p.card_badge && (
          <a
            href={p.card_badge.ctaUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => p.card_badge && trackClick(p.card_badge.sponsorId, 'card_badge', p.id)}
            className="relative z-10 mt-2 inline-flex w-fit items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500"
          >
            Partner <img src={p.card_badge.logoUrl} alt="" className="h-4 w-auto object-contain" />
          </a>
        )}

        <div className="relative z-10 mt-auto flex items-center gap-2 pt-3.5">
          {action.kind === 'registered' ? (
            <span className="inline-flex h-10 flex-1 items-center gap-2 bg-emerald-500/[0.08] px-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.25)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Registered
            </span>
          ) : (
            <CommandButton asChild variant={action.emphasis} size="sm" slide className="h-10 flex-1">
              <Link to={action.to === 'manage' ? managePath : publicPath}>{action.label}</Link>
            </CommandButton>
          )}
          {mode === 'manage' && (
            <Link
              to={publicPath}
              aria-label="View public page"
              title="View public page"
              className="inline-flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.03] text-zinc-300 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <Eye className="h-4 w-4" aria-hidden />
            </Link>
          )}
          {mode === 'manage' && p.onDelete && (
            <CommandIconButton variant="ghost" label={`Delete ${p.name}`} className="h-10 w-10" onClick={() => p.onDelete?.(p.id)}>
              <Trash2 aria-hidden />
            </CommandIconButton>
          )}
        </div>
      </div>
    </article>
  );
};

export const TournamentCard = React.memo(TournamentCardInner);
