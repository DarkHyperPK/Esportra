import { useState } from 'react';
import {
    BarChart as BarChartIcon,
    MousePointerClick,
    Eye,
    TrendingUp,
    TrendingDown,
    Loader2,
    Globe,
    Fingerprint,
    BarChart3,
    Layers,
    Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { usePartnerData } from '@/hooks/usePartnerData';
import { useSponsorAudienceReport } from '@/hooks/useSponsorAudienceReport';
import { AudienceReport } from '@/components/analytics/AudienceReport';
import { usePlacementAnalytics, useAnalyticsSummary } from '@/hooks/usePlacementAnalytics';
import { useSlotAnalytics } from '@/hooks/useSlotAnalytics';
import type { SponsorAnalyticsPeriod } from '@/types/sponsorAnalytics';
import { normalizeTier } from '@/utils/permissions';

const ZONE_LABELS: Record<string, string> = {
    homepage_ticker: 'Homepage Ticker',
    sidebar_partner: 'Sidebar Partner',
    wide_partner: 'Wide Partner',
    card_badge: 'Card Badge',
    partner_logo: 'Partner Logo',
    partner_showcase: 'Showcase',
};

const DAY_OPTIONS = [7, 30, 90] as const;
type Days = (typeof DAY_OPTIONS)[number];

const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

interface ChartDataPoint {
    label: string;
    impressions: number;
    uniqueImpressions: number;
    clicks: number;
}

interface MetricCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend: string;
    color: string;
    borderColor: string;
}

const Analytics = () => {
    const { data: partnerData, isLoading: isPartnerLoading } = usePartnerData();
    const sponsor = partnerData?.sponsor;
    const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [audiencePeriod, setAudiencePeriod] = useState<SponsorAnalyticsPeriod>(30);
    const [days, setDays] = useState<Days>(30);

    const normalizedTier = normalizeTier(sponsor?.tier);
    const isRadiant = normalizedTier === 'radiant';
    const isAscendant = normalizedTier === 'ascendant';
    const isPartnerTier = normalizedTier === 'partner';
    const isAscendantPlus = isAscendant || isRadiant;

    const { data: summary } = useAnalyticsSummary(days);
    const { data: placementStats = [] } = usePlacementAnalytics(days);
    const { data: slotStats } = useSlotAnalytics(days);
    const audienceReport = useSponsorAudienceReport(audiencePeriod, isRadiant && !!sponsor);

    const historyData = partnerData?.history || [];

    const getChartData = (): ChartDataPoint[] => {
        if (range === 'daily') {
            return historyData.slice(-14).map(d => ({
                label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                impressions: d.impressions,
                uniqueImpressions: d.uniqueImpressions,
                clicks: d.clicks,
            }));
        }
        if (range === 'weekly') {
            const weeks: ChartDataPoint[] = [];
            for (let i = 0; i < historyData.length; i += 7) {
                const chunk = historyData.slice(i, i + 7);
                if (chunk.length === 0) continue;
                const startDate = new Date(chunk[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                weeks.push({
                    label: `W${weeks.length + 1} (${startDate})`,
                    impressions: chunk.reduce((s, d) => s + d.impressions, 0),
                    uniqueImpressions: chunk.reduce((s, d) => s + d.uniqueImpressions, 0),
                    clicks: chunk.reduce((s, d) => s + d.clicks, 0),
                });
            }
            return weeks.slice(-8);
        }
        if (range === 'monthly') {
            const map = new Map<string, ChartDataPoint>();
            historyData.forEach(d => {
                const key = new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                if (!map.has(key)) map.set(key, { label: key, impressions: 0, uniqueImpressions: 0, clicks: 0 });
                const cur = map.get(key)!;
                cur.impressions += d.impressions;
                cur.uniqueImpressions += d.uniqueImpressions;
                cur.clicks += d.clicks;
            });
            return Array.from(map.values());
        }
        return [];
    };

    const chartData = getChartData();
    const displayTier = isRadiant ? 'Radiant' : isAscendant ? 'Ascendant' : 'Partner';

    if (isPartnerLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                    <p className="text-sm text-zinc-400">Loading analytics…</p>
                </div>
            </div>
        );
    }

    if (!sponsor) {
        return <div className="text-center text-zinc-500 py-20">Sponsor profile not found.</div>;
    }

    if (isPartnerTier) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center space-y-8">
                <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-10 h-10 text-blue-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-semibold text-white mb-3">Analytics are not included in your plan</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">Your brand remains featured in the global logo ticker.</p>
                </div>
                <div className="p-6 bg-[#0a0a0c] border border-blue-500/10 rounded-2xl">
                    <p className="text-xs text-white font-bold mb-2 uppercase italic tracking-widest">Upgrade recommended</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Upgrade to <span className="text-emerald-500 font-bold">ASCENDANT</span> to unlock impression tracking and performance analytics.
                    </p>
                </div>
            </div>
        );
    }

    const displayStats = {
        impressions: partnerData?.stats?.impressions ?? 0,
        uniqueImpressions: partnerData?.stats?.uniqueImpressions ?? 0,
        clicks: partnerData?.stats?.clicks ?? 0,
        ctr: partnerData?.stats?.ctr ?? 0,
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-semibold text-white mb-2">Analytics</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-zinc-400 text-sm">Understand how audiences engage with your placements.</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${isRadiant ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : isAscendant ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-pink-500/10 text-pink-500 border-white/10'}`}>
                            {displayTier} plan
                        </span>
                    </div>
                </div>
                {/* Days selector for period-aware sections */}
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 self-center">
                    {DAY_OPTIONS.map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${days === d ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* All-time KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard label="Impressions" value={displayStats.impressions.toLocaleString()} icon={Eye} trend="All time" color="text-blue-500" borderColor="group-hover:border-blue-500/30" />
                <MetricCard label="Daily unique impressions" value={displayStats.uniqueImpressions.toLocaleString()} icon={Fingerprint} trend="Daily" color="text-cyan-500" borderColor="group-hover:border-cyan-500/30" />
                <MetricCard label="Clicks" value={displayStats.clicks.toLocaleString()} icon={MousePointerClick} trend="All time" color="text-rose-500" borderColor="group-hover:border-rose-500/30" />
                <MetricCard label="Click-through rate" value={`${displayStats.ctr.toFixed(2)}%`} icon={TrendingUp} trend="All time" color="text-emerald-500" borderColor="group-hover:border-emerald-500/30" />
            </div>

            {/* Historical BarChart */}
            <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold flex items-center gap-2">
                        <BarChartIcon className="w-5 h-5 text-white" />
                        Performance over time
                    </h3>
                    <div className="flex bg-black/50 rounded-lg p-1 gap-1">
                        <button onClick={() => setRange('daily')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${range === 'daily' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Daily</button>
                        <button onClick={() => (isRadiant || isAscendant) && setRange('weekly')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${range === 'weekly' ? 'bg-white/10 text-white' : (isRadiant || isAscendant) ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-700 cursor-not-allowed'}`} title={!(isRadiant || isAscendant) ? 'Ascendant tier required' : ''}>Weekly</button>
                        <button onClick={() => isRadiant && setRange('monthly')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${range === 'monthly' ? 'bg-white/10 text-white' : isRadiant ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-700 cursor-not-allowed'}`} title={!isRadiant ? 'Radiant tier required' : ''}>Monthly</button>
                    </div>
                </div>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={256}>
                        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barGap={2} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#a1a1aa' }} itemStyle={{ color: '#e4e4e7' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="impressions" name="Gross" fill="#3f3f46" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="uniqueImpressions" name="Unique" fill="#22d3ee" opacity={0.7} radius={[2, 2, 0, 0]} />
                            <Bar dataKey="clicks" name="Clicks" fill="#f43f5e" opacity={0.6} radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-white/10 rounded-xl">
                        <BarChartIcon className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs font-mono uppercase tracking-widest">No tracking data available yet</p>
                    </div>
                )}
            </div>

            {/* Period KPI summary */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <PeriodKpiCard label={`Impressions (${days}d)`} value={summary.impressions.toLocaleString()} trend={summary.impressionsTrend} />
                    <PeriodKpiCard label={`Clicks (${days}d)`} value={summary.clicks.toLocaleString()} trend={summary.clicksTrend} />
                    <PeriodKpiCard label={`CTR (${days}d)`} value={`${summary.ctr.toFixed(1)}%`} />
                </div>
            )}

            {/* Per-Zone Analytics (ascendant+) */}
            {isAscendantPlus && placementStats.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Performance by Zone ({days}d)</h3>
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

            {/* Per-Slot Breakdown */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Per-Placement Breakdown ({days}d)</h3>
                </div>
                {!isAscendantPlus ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 flex flex-col items-center gap-3 text-center">
                        <Lock className="w-6 h-6 text-zinc-600" />
                        <p className="text-sm font-bold text-zinc-400">Ascendant tier required</p>
                        <p className="text-xs text-zinc-600 max-w-sm">Upgrade to Ascendant to unlock per-tournament impression and click attribution across all your placements.</p>
                    </div>
                ) : slotStats === null ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">Could not load slot data.</div>
                ) : slotStats && slotStats.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Tournament</th>
                                    <th className="px-4 py-3">Zone</th>
                                    <th className="px-4 py-3 text-right">Impressions</th>
                                    <th className="px-4 py-3 text-right">Clicks</th>
                                    <th className="px-4 py-3 text-right">CTR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {slotStats.map((s) => (
                                    <tr key={`${s.tournamentId ?? 'global'}-${s.placementZone}`} className="text-zinc-300">
                                        <td className="px-4 py-3 font-medium text-white">
                                            {s.tournamentId ? s.tournamentName || 'Unknown' : (
                                                <span className="text-violet-400 font-mono text-[10px] uppercase tracking-widest">Global</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-400">{ZONE_LABELS[s.placementZone] || s.placementZone}</td>
                                        <td className="px-4 py-3 text-right font-mono">{fmt(s.impressions)}</td>
                                        <td className="px-4 py-3 text-right font-mono">{fmt(s.clicks)}</td>
                                        <td className="px-4 py-3 text-right font-mono">{s.ctr.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">No slot data for this period yet.</div>
                )}
            </section>

            {/* Audience Demographics (radiant) */}
            {isRadiant && (
                <AudienceReport
                    report={audienceReport.data}
                    period={audiencePeriod}
                    isLoading={audienceReport.isLoading}
                    isError={audienceReport.isError}
                    isFetching={audienceReport.isFetching}
                    onPeriodChange={setAudiencePeriod}
                    onRetry={() => void audienceReport.refetch()}
                />
            )}

            {/* Demographics upgrade prompt (ascendant) */}
            {isAscendant && (
                <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-8">
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
                        <div className="p-4 rounded-full bg-zinc-900 border border-white/5">
                            <Globe className="w-8 h-8 text-zinc-700" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white uppercase italic tracking-tighter">DEMOGRAPHICS_LOCKED</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1">
                                Country and age‑group breakdowns are available to <span className="text-amber-500 font-bold">RADIANT</span> partners only.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricCard = ({ label, value, icon: Icon, trend, color, borderColor }: MetricCardProps) => (
    <div className={`p-6 rounded-2xl bg-[#0a0a0c] border border-white/5 group hover:border-opacity-100 transition-all duration-300 ${borderColor}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-black/50 ${color.replace('text-', 'bg-')}/10`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-xs font-bold border border-emerald-500/20">{trend}</span>
        </div>
        <div className="text-zinc-500 text-[10px] font-mono tracking-widest mb-1">{label}</div>
        <div className="text-3xl font-black text-white">{value}</div>
    </div>
);

const PeriodKpiCard: React.FC<{ label: string; value: string; trend?: number }> = ({ label, value, trend }) => (
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

export default Analytics;
