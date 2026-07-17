import { Globe2, Loader2, ShieldCheck, Users } from 'lucide-react';
import type { SponsorAnalyticsPeriod, SponsorAudienceDimension, SponsorAudienceReport } from '@/types/sponsorAnalytics';

interface Props {
  report?: SponsorAudienceReport;
  period: SponsorAnalyticsPeriod;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onPeriodChange: (period: SponsorAnalyticsPeriod) => void;
  onRetry: () => void;
}

export function AudienceReport({ report, period, isLoading, isError, isFetching, onPeriodChange, onRetry }: Props) {
  return (
    <section className="rounded-3xl border border-white/5 bg-[#0a0a0c] p-6 md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">
            <Users className="h-4 w-4" /> Audience profile
          </div>
          <h2 className="mt-2 text-2xl font-black italic text-white">PRIVACY_SAFE_REACH</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">Estimated unique visitors exposed to your placements. Unknown values are retained as coverage gaps, never redistributed.</p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-black/40 p-1" role="group" aria-label="Audience period">
          {([7, 30, 90] as SponsorAnalyticsPeriod[]).map(value => (
            <button key={value} type="button" onClick={() => onPeriodChange(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${period === value ? 'bg-cyan-500/15 text-cyan-300' : 'text-zinc-500 hover:text-white'}`}>
              {value}D
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <State icon={Loader2} text="Calculating privacy-safe audience…" spinning />
        : isError ? <State icon={ShieldCheck} text="Audience report is temporarily unavailable." action="Retry" onAction={onRetry} />
        : !report ? null
        : report.status === 'empty' ? <State icon={Users} text="No qualifying impressions were recorded in this period." />
        : report.status === 'suppressed' ? <State icon={ShieldCheck} text={`At least ${report.privacy.minimumAudience} unique visitors are required before demographics can be shown.`} />
        : (
          <div className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="Estimated unique audience" value={report.estimatedUniqueAudience?.toLocaleString() ?? '—'} />
              <Metric label="Country coverage" value={formatCoverage(report.country.coveragePercent)} />
              <Metric label="Age coverage" value={formatCoverage(report.age.coveragePercent)} />
            </div>
            {isFetching && <p className="text-xs font-mono text-cyan-400">UPDATING_REPORT…</p>}
            <div className="grid gap-5 lg:grid-cols-2">
              <Distribution icon={Globe2} title="Audience by country" dimension={report.country} />
              <Distribution icon={Users} title="Age distribution" dimension={report.age} age />
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-xs leading-relaxed text-zinc-500">
              <span className="font-bold text-zinc-300">Methodology:</span> audience IDs are sponsor-scoped and expire after the reporting horizon. Segments below {report.privacy.minimumAudience} visitors are suppressed. Age comes only from completed profiles; anonymous visitors never receive an inferred age.
            </div>
          </div>
        )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/5 bg-black/25 p-5"><p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-2 text-3xl font-black text-white">{value}</p></div>;
}

function Distribution({ icon: Icon, title, dimension, age = false }: { icon: typeof Globe2; title: string; dimension: SponsorAudienceDimension; age?: boolean }) {
  if (dimension.status !== 'available') return <div className="rounded-2xl border border-white/5 p-6"><h3 className="font-bold text-white">{title}</h3><p className="mt-6 text-sm text-zinc-600">Not enough publishable data for this dimension.</p></div>;
  return (
    <div className="rounded-2xl border border-white/5 p-6">
      <h3 className="flex items-center gap-2 font-bold text-white"><Icon className="h-4 w-4 text-cyan-400" />{title}</h3>
      <div className="mt-5 space-y-4">
        {dimension.segments.map(segment => (
          <div key={segment.key}>
            <div className="mb-1 flex justify-between text-xs"><span className="font-mono text-zinc-300">{age ? ageLabel(segment.key) : countryLabel(segment.key)}</span><span className="text-zinc-500">{segment.percentageOfKnown}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${segment.percentageOfKnown}%` }} /></div>
          </div>
        ))}
      </div>
      {dimension.suppressedSegmentCount > 0 && <p className="mt-4 text-[10px] text-zinc-600">{dimension.suppressedSegmentCount} small segment(s) suppressed.</p>}
    </div>
  );
}

function State({ icon: Icon, text, spinning = false, action, onAction }: { icon: typeof Users; text: string; spinning?: boolean; action?: string; onAction?: () => void }) {
  return <div className="flex min-h-56 flex-col items-center justify-center text-center"><Icon className={`h-7 w-7 text-zinc-600 ${spinning ? 'animate-spin' : ''}`} /><p className="mt-4 max-w-md text-sm text-zinc-500">{text}</p>{action && <button type="button" onClick={onAction} className="mt-4 text-sm font-bold text-rose-400">{action}</button>}</div>;
}

const formatCoverage = (value: number | null) => value === null ? 'Suppressed' : `${value}%`;
const ageLabel = (key: string) => ({ '13_17': '13–17', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_54': '45–54', '55_plus': '55+' }[key] ?? key);
const countryLabel = (code: string) => {
  try { return `${new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code} · ${code}`; }
  catch { return code; }
};
