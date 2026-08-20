import { motion } from 'framer-motion';
import {
  Loader2,
  Trophy,
  Calendar,
  ExternalLink,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  History,
} from 'lucide-react';
import { useSponsorTournaments, type SponsorTournamentLink } from '../hooks/useSponsorTournaments';
import { usePlacementAnalytics, useAnalyticsSummary } from '../hooks/usePlacementAnalytics';
import { usePlacementHistory, type HistoryEntry } from '../hooks/usePlacementHistory';

const ZONE_LABELS: Record<string, string> = {
  homepage_ticker: 'Homepage Ticker',
  sidebar_partner: 'Sidebar Partner',
  wide_partner: 'Wide Partner',
  card_badge: 'Card Badge',
  partner_logo: 'Partner Logo',
  partner_showcase: 'Showcase',
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Placed', color: 'text-emerald-400' },
  replaced: { label: 'Creative Replaced', color: 'text-blue-400' },
  removed_creative: { label: 'Creative Removed', color: 'text-amber-400' },
  removed: { label: 'Removed', color: 'text-red-400' },
  unassigned: { label: 'Unassigned', color: 'text-red-400' },
  expired: { label: 'Expired', color: 'text-zinc-400' },
  updated: { label: 'Updated', color: 'text-zinc-300' },
};

const Campaigns = () => {
  const { data: tournaments = [], isLoading, error, refetch } = useSponsorTournaments();
  const { data: summary } = useAnalyticsSummary(30);
  const { data: placementStats = [] } = usePlacementAnalytics(30);
  const { data: history = [] } = usePlacementHistory();

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

      {/* KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Impressions (30d)" value={summary.impressions.toLocaleString()} trend={summary.impressionsTrend} />
          <KpiCard label="Clicks (30d)" value={summary.clicks.toLocaleString()} trend={summary.clicksTrend} />
          <KpiCard label="CTR" value={`${summary.ctr.toFixed(1)}%`} />
        </div>
      )}

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

      {/* Per-Zone Analytics */}
      {placementStats.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              Performance by Zone (30d)
            </h3>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3 text-right">Impressions</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {placementStats.map((stat) => (
                  <tr key={stat.placement} className="text-zinc-300">
                    <td className="px-4 py-3 font-medium text-white">{ZONE_LABELS[stat.placement] || stat.placement}</td>
                    <td className="px-4 py-3 text-right font-mono">{stat.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{stat.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{stat.ctr.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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

      {/* History / Audit Log */}
      {history.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              Placement History
            </h3>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800">
            {history.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const KpiCard: React.FC<{ label: string; value: string; trend?: number }> = ({ label, value, trend }) => (
  <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-5">
    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
    <div className="flex items-end gap-2">
      <span className="text-2xl font-black text-white">{value}</span>
      {trend !== undefined && trend !== 0 && (
        <span className={`flex items-center gap-0.5 text-xs font-mono ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend).toFixed(0)}%
        </span>
      )}
    </div>
  </div>
);

const HistoryRow: React.FC<{ entry: HistoryEntry }> = ({ entry }) => {
  const actionMeta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'text-zinc-400' };
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold uppercase ${actionMeta.color}`}>{actionMeta.label}</span>
        <span className="text-xs text-zinc-400">
          {ZONE_LABELS[entry.placementZone] || entry.placementZone}
          {entry.slotNumber && ` · Slot ${entry.slotNumber}`}
        </span>
        {entry.tournamentName && <span className="text-xs text-zinc-500">— {entry.tournamentName}</span>}
      </div>
      <div className="text-right">
        <span className="text-[10px] text-zinc-500">{new Date(entry.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
        {entry.performedByName && <span className="text-[9px] text-zinc-600 ml-2">by {entry.performedByName}</span>}
      </div>
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
      {(link.bannerUrl || link.logoUrl) && (
        <div className="h-28 relative overflow-hidden">
          <img
            src={link.bannerUrl || link.logoUrl || ''}
            alt=""
            className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] to-transparent" />
        </div>
      )}

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-bold text-white truncate group-hover:text-rose-400 transition-colors">
              {link.tournamentId ? (
                <a href={`${import.meta.env.VITE_FRONTEND_URL || 'https://esportra.com'}/tournaments/${link.tournamentId}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {link.tournamentName || 'Tournament'}
                </a>
              ) : 'Global placement'}
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

        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 text-[10px] font-mono bg-zinc-900 border border-zinc-800 rounded text-zinc-400">{link.tournamentId ? 'Tournament' : 'Global'}</span>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-zinc-900 border border-zinc-800 rounded text-zinc-400">{ZONE_LABELS[link.placementZone] || link.placementZone}</span>
        </div>

        <div className="text-xs text-zinc-500">
          {link.startsAt ? new Date(link.startsAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Starts immediately'} → {link.endsAt ? new Date(link.endsAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'No end date'}
        </div>

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
