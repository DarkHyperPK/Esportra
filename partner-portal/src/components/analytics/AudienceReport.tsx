import { Loader2, ShieldCheck } from 'lucide-react';
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
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a0a0c]">
      <header className="flex flex-col gap-4 border-b border-white/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Audience</h2>
          <p className="mt-1 text-sm text-zinc-400">Unique people reached during the selected period.</p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && <span className="text-xs text-zinc-400" aria-live="polite">Updating…</span>}
          <div className="flex rounded-lg border border-white/10 bg-black/30 p-1" role="group" aria-label="Audience period">
            {([7, 30, 90] as SponsorAnalyticsPeriod[]).map(value => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => onPeriodChange(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${period === value ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                {value} days
              </button>
            ))}
          </div>
        </div>
      </header>
      {isLoading
        ? <State text="Loading audience data…" spinning />
        : isError
          ? <State text="Audience data couldn’t be loaded. Existing performance data is unaffected." action="Retry" onAction={onRetry} />
          : !report
            ? null
            : report.status === 'empty'
              ? <State text="0 unique audience. No qualifying impressions were recorded in this period." />
              : <ReportBody report={report} />}
    </section>
  );
}

function ReportBody({ report }: { report: SponsorAudienceReport }) {
  return (
    <div>
      <div className="grid border-b border-white/5 lg:grid-cols-[1fr_1.5fr]">
        <div className="px-5 py-6 lg:border-r lg:border-white/5">
          <p className="text-xs font-medium text-zinc-400">Unique audience</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-white">{report.estimatedUniqueAudience?.toLocaleString() ?? '—'}</p>
          <p className="mt-2 text-xs text-zinc-500">{dateRange(report.window.startsOn, report.window.endsOnExclusive)}</p>
        </div>
        <div className="border-t border-white/5 px-5 py-5 lg:border-t-0">
          <p className="mb-3 text-xs font-medium text-zinc-400">Profile coverage</p>
          <Coverage label="Country" dimension={report.country} />
          <Coverage label="Age" dimension={report.age} />
        </div>
      </div>
      <div className="grid lg:grid-cols-2">
        <Distribution title="Countries" dimension={report.country} />
        <Distribution title="Age groups" dimension={report.age} age />
      </div>
      <details className="border-t border-white/5 px-5 py-4 text-sm text-zinc-400">
        <summary className="cursor-pointer font-medium text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">How audience reporting works</summary>
        <p className="mt-3 max-w-3xl leading-relaxed">Audience estimates are sponsor-scoped. Country and age are included only when available from a completed profile. Age is never inferred. Segment counts are exact, including small groups, and unknown values are not redistributed.</p>
      </details>
    </div>
  );
}

function Coverage({ label, dimension }: { label: string; dimension: SponsorAudienceDimension }) {
  const percentage = dimension.coveragePercent;
  return (
    <div className="mb-3 grid grid-cols-[72px_1fr_auto] items-center gap-3 text-xs last:mb-0">
      <span className="text-zinc-300">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-cyan-500" style={{ width: `${percentage ?? 0}%` }} />
      </div>
      <span className="min-w-24 text-right tabular-nums text-zinc-400">{percentage === null ? 'Withheld' : `${percentage}% known`}</span>
    </div>
  );
}

function Distribution({ title, dimension, age = false }: { title: string; dimension: SponsorAudienceDimension; age?: boolean }) {
  return (
    <section className="border-t border-white/5 px-5 py-5 lg:first:border-r lg:first:border-white/5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {dimension.status !== 'available'
        ? <p className="mt-5 text-sm text-zinc-500">There isn’t enough audience data to show this breakdown yet.</p>
        : (
          <div className="mt-4 divide-y divide-white/5">
            {dimension.segments.map(segment => (
              <div key={segment.key} className="grid grid-cols-[minmax(0,1fr)_80px_70px] items-center gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{age ? ageLabel(segment.key) : countryLabel(segment.key)}</p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-900">
                    <div className="h-full bg-cyan-500/70" style={{ width: `${segment.percentageOfKnown}%` }} />
                  </div>
                </div>
                <span className="text-right tabular-nums text-zinc-300">{segment.audience.toLocaleString()}</span>
                <span className="text-right tabular-nums text-zinc-500">{segment.percentageOfKnown}%</span>
              </div>
            ))}
          </div>
        )}
    </section>
  );
}

function State({ text, spinning = false, action, onAction }: { text: string; spinning?: boolean; action?: string; onAction?: () => void }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-5 py-8 text-center" aria-live="polite" aria-busy={spinning}>
      {spinning ? <Loader2 className="h-5 w-5 animate-spin text-zinc-500" /> : <ShieldCheck className="h-5 w-5 text-zinc-600" />}
      <p className="mt-3 max-w-lg text-sm text-zinc-400">{text}</p>
      {action && (
        <button type="button" onClick={onAction} className="mt-4 rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
          {action}
        </button>
      )}
    </div>
  );
}

const ageLabel = (key: string) => ({ '13_17': '13–17', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_54': '45–54', '55_plus': '55+' }[key] ?? key);
const countryLabel = (code: string) => {
  try { return `${new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code} · ${code}`; }
  catch { return code; }
};
const dateRange = (startsOn: string, endsOnExclusive: string) => {
  const start = new Date(`${startsOn}T00:00:00Z`);
  const end = new Date(`${endsOnExclusive}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 1);
  return `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
};
