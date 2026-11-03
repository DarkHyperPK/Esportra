import { EYEBROW_CLASS, StatusPill, type Tone } from '@/components/ui/kit';
import { formatPct } from '@/services/scrimData/format';
import { rangeText } from '@/services/scrimData/presentation';
import type { TeamRecord } from '@/types/scrimData';
import { StatTile } from './StatTile';

const FORM_TONE: Record<'W' | 'L' | 'D', Tone> = { W: 'success', L: 'critical', D: 'neutral' };
const FORM_LABEL = { W: 'Win', L: 'Loss', D: 'Draw' } as const;

interface Props {
  record: TeamRecord;
  form: Array<'W' | 'L' | 'D'>;
}

/** The team's scrim record: results from every confirmed map, whatever data each one carries. */
export function RecordSummary({ record: r, form }: Props) {
  const rounds = r.roundsWon + r.roundsLost;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Maps" value={String(r.games)} hint="Confirmed scrim maps" />
        <StatTile label="Win rate" value={formatPct(r.winRatePct)} hint={`${r.wins} won · ${r.losses} lost${r.draws ? ` · ${r.draws} drawn` : ''} · plausible range ${rangeText(r.winLowPct, r.winHighPct)}`} />
        <StatTile label="Round win rate" value={formatPct(r.roundWinRatePct)} hint={`${r.roundsWon} won of ${rounds} rounds`} />
      </div>
      {form.length > 0 && (
        <div className="flex items-center gap-2" aria-label={`Recent form, newest first: ${form.map((f) => FORM_LABEL[f]).join(', ')}`}>
          <span className={EYEBROW_CLASS}>Recent form</span>
          {form.map((f, i) => <StatusPill key={i} label={FORM_LABEL[f]} tone={FORM_TONE[f]} />)}
        </div>
      )}
    </div>
  );
}
