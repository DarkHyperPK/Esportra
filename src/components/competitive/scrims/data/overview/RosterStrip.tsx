import { Link, useSearchParams } from 'react-router-dom';
import { useValorantAgents } from '@/hooks/useValorantCatalog';
import { resolveAgent } from '@/lib/valorantAgents';
import { formatNumber, formatPct } from '@/services/scrimData/format';
import type { TeamRatings } from '@/schemas/scrimReport';
import type { TeamReportBody } from '@/types/scrimReport';
import { ratingBreakdown } from '@/services/scrimInsights/rating';

type Player = TeamReportBody['players'][number];

function Card({ p, rating, href }: { p: Player; rating: TeamRatings['players'][number]['rating'] | undefined; href: string }) {
  const { data: agents } = useValorantAgents();
  const main = p.agents[0]?.agent?.toLowerCase();
  const portrait = main ? agents?.[main]?.fullPortrait : undefined;
  const value = rating?.value;
  return (
    <Link to={href} title={rating && value != null ? ratingBreakdown(rating) : 'A rating needs 3 maps.'}
      className="group relative block aspect-[4/5] max-h-[260px] overflow-hidden rounded-xl border border-white/[0.05] bg-gradient-to-b from-white/[0.04] to-[#0b0b0e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
      {portrait && <img src={portrait} alt="" loading="lazy" className="absolute inset-0 h-full w-full origin-top scale-[1.3] object-cover object-top opacity-70 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0 motion-reduce:transition-none" />}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute left-3 top-3">
        <p className="font-heading text-[28px] font-black leading-none tabular-nums text-white">{value == null ? '—' : Math.round(value)}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{value == null ? '3 maps needed' : 'Rating'}</p>
        {rating?.change != null && rating.change !== 0 && (
          <p className={rating.change > 0 ? 'font-mono text-[11px] text-emerald-300' : 'font-mono text-[11px] text-rose-400'}>{rating.change > 0 ? '▲' : '▼'} {Math.abs(Math.round(rating.change))}</p>
        )}
      </div>
      <div className="absolute inset-x-3 bottom-3">
        <p className="truncate font-heading text-[15px] font-bold text-white">{p.name ?? 'Player'}</p>
        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-white/55">{`${formatNumber(p.acs, 0)} ACS · ${formatPct(p.kast)} KAST · ${p.maps} maps`}</p>
        <div className="mt-1.5 flex gap-1">
          {p.agents.slice(0, 3).map((a) => {
            const ag = resolveAgent(a.agent);
            return ag ? <img key={a.agent} src={ag.iconUrl} alt={ag.displayName} title={`${ag.displayName} · ${a.maps} maps`} className="h-[22px] w-[22px] rounded-md border border-white/10 bg-black/40" loading="lazy" /> : null;
          })}
        </div>
      </div>
    </Link>
  );
}

/** The roster as portrait cards: each player's main agent, their rating and how they got it. A card opens that player's report. */
export function RosterStrip({ players, ratings }: { players: Player[]; ratings: TeamRatings | undefined }) {
  const [params] = useSearchParams();
  const hrefFor = (userId: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', 'player-reports');
    next.set('player', userId);
    return `?${next.toString()}`;
  };
  if (players.length === 0) return null;
  const sorted = [...players].sort((a, b) => (ratings?.players.find((r) => r.userId === b.userId)?.rating.value ?? -1) - (ratings?.players.find((r) => r.userId === a.userId)?.rating.value ?? -1));
  return (
    <section aria-label="Roster" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
      {sorted.map((p) => <Card key={p.userId} p={p} rating={ratings?.players.find((r) => r.userId === p.userId)?.rating} href={hrefFor(p.userId)} />)}
    </section>
  );
}
