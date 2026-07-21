import { motion } from 'framer-motion';
import {
  Loader2,
  Trophy,
  Calendar,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { useSponsorTournaments, type SponsorTournamentLink } from '@/hooks/useSponsorTournaments';

const ZONE_LABELS: Record<string, string> = {
  homepage_ticker: 'Homepage Ticker',
  sidebar_partner: 'Sidebar Partner',
  wide_partner: 'Wide Partner',
  card_badge: 'Card Badge',
  partner_logo: 'Partner Logo',
  partner_showcase: 'Showcase',
};

const Campaigns = () => {
  const { data: tournaments = [], isLoading, error, refetch } = useSponsorTournaments();

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-zinc-500">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
        <p className="font-mono text-xs tracking-widest uppercase animate-pulse">Loading_Campaigns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">CAMPAIGNS_LOAD_FAILED</h3>
          <p className="text-zinc-500 max-w-md mx-auto mb-6">
            Could not load your campaign placements. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  const active = tournaments.filter((placement) => placement.lifecycle === 'live');
  const inactive = tournaments.filter((placement) => placement.lifecycle !== 'live');

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight">
          CAMPAIGN<span className="text-rose-500">_PLACEMENTS</span>
        </h2>
        <p className="text-zinc-500 text-sm mt-2 font-mono tracking-wider">
          SPONSOR_PLACEMENTS // {tournaments.length} linked
        </p>
      </div>

      {/* Active Campaigns */}
      {active.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              Active Placements ({active.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {active.map((t) => (
              <TournamentCard key={t.id} link={t} />
            ))}
          </div>
        </section>
      ) : (
        <div className="p-12 rounded-2xl border border-dashed border-zinc-800 text-center">
          <Trophy className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-400 mb-2">No Active Campaigns</h3>
          <p className="text-zinc-600 text-sm max-w-md mx-auto">
            When an Esportra admin links your brand to a tournament, your active campaign placements will appear here.
          </p>
        </div>
      )}

      {/* Inactive / Past */}
      {inactive.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-600">
            Past / Inactive ({inactive.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {inactive.map((t) => (
              <TournamentCard key={t.id} link={t} dimmed />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const TournamentCard: React.FC<{
  link: SponsorTournamentLink;
  dimmed?: boolean;
}> = ({ link, dimmed }) => {
  const startDate = link.startsAt ? new Date(link.startsAt) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10 ${
        dimmed ? 'opacity-50' : ''
      }`}
    >
      {/* Banner */}
      {(link.bannerUrl || link.logoUrl) && (
        <div className="h-28 relative overflow-hidden">
          <img
            src={link.bannerUrl || link.logoUrl || ''}
            alt={link.headline || link.tournamentName || 'Campaign creative'}
            className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] to-transparent" />
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Title + Type Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-bold text-white truncate group-hover:text-rose-400 transition-colors">
              {link.tournamentName || 'Global placement'}
            </h4>
            <div className="flex items-center gap-3 mt-1.5">
              {startDate && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              <span className="text-xs font-mono uppercase text-zinc-400">{link.lifecycle}</span>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg text-rose-400 bg-rose-500/10 border-rose-500/20">
            Slot {link.slotNumber || 'Review'}
          </span>
        </div>

        {/* Placement Zones */}
        <div className="flex flex-wrap gap-1.5"><span className="px-2 py-0.5 text-[10px] font-mono bg-zinc-900 border border-zinc-800 rounded text-zinc-400">{link.tournamentId ? 'Tournament' : 'Global'}</span><span className="px-2 py-0.5 text-[10px] font-mono bg-zinc-900 border border-zinc-800 rounded text-zinc-400">{ZONE_LABELS[link.placementZone] || link.placementZone}</span>{link.reviewReason && <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 rounded text-amber-400">{link.reviewReason.replace('_', ' ')}</span>}</div>

        <div className="text-xs text-zinc-500">{link.startsAt ? new Date(link.startsAt).toLocaleDateString() : 'Starts immediately'} → {link.endsAt ? new Date(link.endsAt).toLocaleDateString() : 'No end date'}</div>
        {link.ctaUrl && <a href={link.ctaUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:text-rose-300">{link.ctaText || 'Open campaign destination'}</a>}

        {/* Footer: linked date + view link */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-[10px] font-mono text-zinc-600">
            Linked {new Date(link.createdAt).toLocaleDateString()}
          </span>
          {link.tournamentId && <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500"><ExternalLink className="w-3 h-3" /> Tournament placement</span>}
        </div>
      </div>
    </motion.div>
  );
};

export default Campaigns;
