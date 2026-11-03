import { rateText, roundClock } from '@/services/scrimInsights/present';
import { summariseSpike } from '@/services/scrimInsights/spike';
import type { InsightsReport, Rate } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 border-b border-white/5 py-1.5"><dt className="text-zinc-400">{label}</dt><dd className="tabular-nums text-zinc-100">{value}</dd></div>;
}

const bySite = (rows: Array<{ site: string; won: Rate }>) => rows.map((s) => `${s.site} ${s.won.count}/${s.won.of}`).join(' · ');

/** Do you get the plant down and hold it, and do you retake when they plant? One verdict first, the numbers behind it after. */
export function SpikePanel({ report }: { report: InsightsReport }) {
  const s = summariseSpike(report);
  return (
    <ReportSection title="Spike" note="Attack: rounds where the spike went down and what happened next. Defense: the opponent's plants and your retakes. Times run from the start of the round.">
      <p className="text-[14px] text-white">{s.verdict}</p>
      <div className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
        <dl aria-label="Attack">
          <Line label="Spike planted" value={rateText(s.planted)} />
          <Line label="Lost without a plant" value={rateText(s.lostWithoutPlant)} />
          <Line label="Won once planted" value={rateText(s.postPlant)} />
          {s.postPlantBySite.length > 0 && <Line label="By site" value={bySite(s.postPlantBySite)} />}
          <Line label="Average plant time" value={roundClock(s.avgPlantMs)} />
        </dl>
        <dl aria-label="Defense">
          <Line label="Won before a plant" value={rateText(s.stoppedBeforePlant)} />
          <Line label="Retook after a plant" value={rateText(s.retake)} />
          {s.retakeBySite.length > 0 && <Line label="By site" value={bySite(s.retakeBySite)} />}
        </dl>
      </div>
    </ReportSection>
  );
}
