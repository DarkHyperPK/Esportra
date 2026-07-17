import { useState } from 'react';
import { BarChart, MousePointerClick, Eye, TrendingUp, Loader2, Globe, Fingerprint } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePartnerData } from '@/hooks/usePartnerData';
import { useSponsorStats } from '@/hooks/useSponsors';
import { useSponsorAudienceReport } from '@/hooks/useSponsorAudienceReport';
import { AudienceReport } from '@/components/analytics/AudienceReport';
import type { SponsorAnalyticsPeriod } from '@/types/sponsorAnalytics';
import { normalizeTier } from '@/utils/permissions';

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
    const { data: stats, isLoading: isStatsLoading } = useSponsorStats(sponsor?.id || '');
    const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [audiencePeriod, setAudiencePeriod] = useState<SponsorAnalyticsPeriod>(30);

    // Use real historical data from hook
    const historyData = partnerData?.history || [];

    // Format dates for display (e.g., "Feb 12")
    // Aggregation logic for different ranges
    const getChartData = () => {
        if (range === 'daily') {
            // Show only last 14 days for a clean daily view
            return historyData.slice(-14).map(d => ({
                label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                impressions: d.impressions,
                uniqueImpressions: d.uniqueImpressions,
                clicks: d.clicks
            }));
        }

        if (range === 'weekly') {
            const weeks: ChartDataPoint[] = [];
            // Chunk history into 7-day blocks
            for (let i = 0; i < historyData.length; i += 7) {
                const chunk = historyData.slice(i, i + 7);
                if (chunk.length === 0) continue;

                const impressions = chunk.reduce((sum, d) => sum + d.impressions, 0);
                const uniqueImpressions = chunk.reduce((sum, d) => sum + d.uniqueImpressions, 0);
                const clicks = chunk.reduce((sum, d) => sum + d.clicks, 0);

                // Use the starting date of the week as label
                const startDate = new Date(chunk[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                weeks.push({ label: `W${weeks.length + 1} (${startDate})`, impressions, uniqueImpressions, clicks });
            }
            return weeks.slice(-8); // Show last 8 weeks
        }

        if (range === 'monthly') {
            // Group by month name
            const monthlyMap = new Map<string, ChartDataPoint>();
            historyData.forEach(d => {
                const date = new Date(d.date);
                const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

                if (!monthlyMap.has(monthKey)) {
                    monthlyMap.set(monthKey, { label: monthKey, impressions: 0, uniqueImpressions: 0, clicks: 0 });
                }
                const current = monthlyMap.get(monthKey)!;
                current.impressions += d.impressions;
                current.uniqueImpressions += d.uniqueImpressions;
                current.clicks += d.clicks;
            });
            return Array.from(monthlyMap.values());
        }

        return [];
    };

    const chartData = getChartData();

    // Auto-scale: use actual data max with a small minimum so bars are always visible
    const maxImpressions = chartData.length > 0
        ? Math.max(...chartData.map(d => d.impressions), 10)
        : 10;

    // Harden tier mapping
    const normalizedTier = normalizeTier(sponsor?.tier);
    const isRadiant = normalizedTier === 'radiant';
    const isAscendant = normalizedTier === 'ascendant';
    const isPartnerTier = normalizedTier === 'partner';
    const audienceReport = useSponsorAudienceReport(audiencePeriod, isRadiant && !!sponsor);

    // Normalized tier name for display
    const displayTier = isRadiant ? 'Radiant' : isAscendant ? 'Ascendant' : 'Partner';

    if (isPartnerLoading || isStatsLoading) {
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
        return (
            <div className="text-center text-zinc-500 py-20">
                Sponsor profile not found.
            </div>
        );
    }

    // GATING: Partner Tier has no analytics access
    if (isPartnerTier) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center space-y-8">
                <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-10 h-10 text-blue-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-semibold text-white mb-3">Analytics are not included in your plan</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Your brand remains featured in the global logo ticker. <br />
                    </p>
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

    // Default to 0 if no stats
    const displayStats = {
        impressions: stats?.impressions || 0,
        uniqueImpressions: partnerData?.stats?.uniqueImpressions || 0,
        clicks: stats?.clicks || 0,
        ctr: stats?.ctr || '0.0',
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-white mb-2">Analytics</h1>
                <div className="flex items-center gap-3">
                    <p className="text-zinc-400 text-sm">Understand how audiences engage with your placements.</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${isRadiant ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        isAscendant ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            'bg-pink-500/10 text-pink-500 border-white/10'
                        }`}>
                        {displayTier} plan
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    label="Impressions"
                    value={displayStats.impressions.toLocaleString()}
                    icon={Eye}
                    trend="All time"
                    color="text-blue-500"
                    borderColor="group-hover:border-blue-500/30"
                />
                <MetricCard
                    label="Daily unique impressions"
                    value={displayStats.uniqueImpressions.toLocaleString()}
                    icon={Fingerprint}
                    trend="Daily"
                    color="text-cyan-500"
                    borderColor="group-hover:border-cyan-500/30"
                />
                <MetricCard
                    label="Clicks"
                    value={displayStats.clicks.toLocaleString()}
                    icon={MousePointerClick}
                    trend="All time"
                    color="text-rose-500"
                    borderColor="group-hover:border-rose-500/30"
                />
                <MetricCard
                    label="Click-through rate"
                    value={`${displayStats.ctr}%`}
                    icon={TrendingUp}
                    trend="All time"
                    color="text-emerald-500"
                    borderColor="group-hover:border-emerald-500/30"
                />
            </div>

            {/* Chart Section */}
            <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-white" />
                        Performance over time
                    </h3>
                    <div className="flex bg-black/50 rounded-lg p-1 gap-1">
                        <button
                            onClick={() => setRange('daily')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${range === 'daily' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => (isRadiant || isAscendant) && setRange('weekly')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${range === 'weekly' ? 'bg-white/10 text-white' : (isRadiant || isAscendant) ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-700 cursor-not-allowed'
                                }`}
                            title={!(isRadiant || isAscendant) ? 'Ascendant tier required' : ''}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => isRadiant && setRange('monthly')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${range === 'monthly' ? 'bg-white/10 text-white' : isRadiant ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-700 cursor-not-allowed'
                                }`}
                            title={!isRadiant ? 'Radiant tier required' : ''}
                        >
                            Monthly
                        </button>
                    </div>
                </div>

                {/* Chart Data Rendering */}
                {chartData.length > 0 ? (
                    <>
                        {/* Legend */}
                        <div className="flex items-center gap-6 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-zinc-700" />
                                <span className="text-[10px] font-mono text-zinc-500">GROSS</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-cyan-500" />
                                <span className="text-[10px] font-mono text-zinc-500">UNIQUE</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-rose-500/40" />
                                <span className="text-[10px] font-mono text-zinc-500">CLICKS</span>
                            </div>
                        </div>
                        <div className="h-64 flex justify-between gap-3">
                            {chartData.map((data, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full">
                                    <div className="w-full relative h-full flex items-end gap-[2px]">
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] py-1.5 px-3 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-white/10">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-zinc-400">{data.impressions} Gross</span>
                                                <span className="text-cyan-400">{data.uniqueImpressions} Unique</span>
                                                <span className="text-rose-400">{data.clicks} Clicks</span>
                                            </div>
                                        </div>

                                        {/* Gross Impressions Bar */}
                                        <div
                                            className="flex-1 bg-zinc-800 rounded-t-sm relative group-hover:bg-zinc-700 transition-colors overflow-hidden"
                                            style={{ height: `${Math.max((data.impressions / maxImpressions) * 100, 4)}%` }}
                                        >
                                            {/* Clicks overlay on gross bar */}
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-rose-500/40"
                                                style={{ height: `${data.impressions > 0 ? Math.min((data.clicks / data.impressions) * 100, 100) : 0}%` }}
                                            />
                                        </div>

                                        {/* Unique Impressions Bar */}
                                        <div
                                            className="flex-1 bg-cyan-500/60 rounded-t-sm group-hover:bg-cyan-500/80 transition-colors"
                                            style={{ height: `${Math.max((data.uniqueImpressions / maxImpressions) * 100, 2)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-600 whitespace-nowrap">{data.label}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-white/10 rounded-xl">
                        <BarChart className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs font-mono uppercase tracking-widest">No tracking data available yet</p>
                    </div>
                )}
            </div>

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

            {/* Ascendant Tier Upgrade Prompt for Demographics */}
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

// Helper Component for KPI Cards
const MetricCard = ({ label, value, icon: Icon, trend, color, borderColor }: MetricCardProps) => (
    <div className={`p-6 rounded-2xl bg-[#0a0a0c] border border-white/5 group hover:border-opacity-100 transition-all duration-300 ${borderColor}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-black/50 ${color.replace('text-', 'bg-')}/10`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-xs font-bold border border-emerald-500/20">
                {trend}
            </span>
        </div>
        <div className="text-zinc-500 text-[10px] font-mono tracking-widest mb-1">{label}</div>
        <div className="text-3xl font-black text-white">{value}</div>
    </div>
);

export default Analytics;
