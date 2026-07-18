import { motion } from 'framer-motion';
import {
  Loader2,
  Trophy,
  Calendar,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { usePartnerData } from '@/hooks/usePartnerData';
import { useSponsorTournaments, type SponsorTournamentLink } from '@/hooks/useSponsorTournaments';

const SPONSOR_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  title_sponsor: { label: 'TITLE SPONSOR', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  event_sponsor: { label: 'EVENT SPONSOR', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  media_sponsor: { label: 'MEDIA SPONSOR', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
};

const ZONE_LABELS: Record<string, string> = {
  homepage_ticker: 'Homepage Ticker',
  sidebar_partner: 'Sidebar Partner',
  wide_partner: 'Wide Partner',
  card_badge: 'Card Badge',
  partner_logo: 'Partner Logo',
  partner_showcase: 'Showcase',
};

const Campaigns = () => {
  const { data: partnerData, isLoading: partnerLoading, error: partnerError } = usePartnerData();
  const sponsorId = partnerData?.sponsor?.id;
  const { data: tournaments = [], isLoading: tournamentsLoading, error: tournamentsError } = useSponsorTournaments(sponsorId);

  const isLoading = partnerLoading || tournamentsLoading;
  const error = partnerError || tournamentsError;

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
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  const active = tournaments.filter((t) => t.is_active);
  const inactive = tournaments.filter((t) => !t.is_active);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight">
          CAMPAIGN<span className="text-rose-500">_PLACEMENTS</span>
        </h2>
        <p className="text-zinc-500 text-sm mt-2 font-mono tracking-wider">
          TOURNAMENT_SPONSORSHIPS // {tournaments.length} linked
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
              <TournamentCard key={t.tournament_id} link={t} />
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
              <TournamentCard key={t.tournament_id} link={t} dimmed />
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
  const typeInfo = SPONSOR_TYPE_LABELS[link.sponsor_type] ?? SPONSOR_TYPE_LABELS.event_sponsor;
  const startDate = link.start_date ? new Date(link.start_date) : null;
  const statusColor =
    link.status === 'ongoing' ? 'text-emerald-400' :
    link.status === 'completed' ? 'text-zinc-500' :
    'text-blue-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10 ${
        dimmed ? 'opacity-50' : ''
      }`}
    >
      {/* Banner */}
      {link.tournament_banner && (
        <div className="h-28 relative overflow-hidden">
          <img
            src={link.tournament_banner}
            alt={link.title}
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
              {link.title || 'Untitled Tournament'}
            </h4>
            <div className="flex items-center gap-3 mt-1.5">
              {startDate && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {link.status && (
                <span className={`text-xs font-mono uppercase ${statusColor}`}>
                  {link.status}
                </span>
              )}
            </div>
          </div>
          <span className={`shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
        </div>

        {/* Placement Zones */}
        {link.placement_zones.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {link.placement_zones.map((zone) => (
              <span
                key={zone}
                className="px-2 py-0.5 text-[10px] font-mono bg-zinc-900 border border-zinc-800 rounded text-zinc-400"
              >
                {ZONE_LABELS[zone] || zone}
              </span>
            ))}
          </div>
        )}

        {/* Footer: linked date + view link */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-[10px] font-mono text-zinc-600">
            Linked {new Date(link.linked_at).toLocaleDateString()}
          </span>
          {link.slug && (
            <a
              href={`${import.meta.env.VITE_MAIN_APP_URL || 'https://esportra.com'}/tournaments/${link.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-rose-400 transition-colors"
            >
              View Tournament <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Campaigns;
