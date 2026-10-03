import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';

interface Props {
  team1Name: string;
  team2Name: string;
  team1Score: number | null;
  team2Score: number | null;
  mapName: string | null;
  uncertain: boolean;
  onChange: (team: 'team1' | 'team2', value: number | null) => void;
}

function ScoreInput({ label, value, leading, uncertain, onChange }: {
  label: string;
  value: number | null;
  leading: boolean;
  uncertain: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <input
      aria-label={`${label} rounds`}
      inputMode="numeric"
      value={value ?? ''}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 2);
        onChange(digits === '' ? null : Number(digits));
      }}
      className={cn(
        'w-[2.6ch] bg-transparent text-center font-heading text-5xl font-black tabular-nums tracking-tight outline-none sm:text-6xl',
        'border-b-2 border-transparent transition-colors focus-visible:border-rose-400',
        leading ? 'text-white' : 'text-zinc-500',
        uncertain && 'border-amber-400/70',
      )}
    />
  );
}

/** The hero: the round score as a versus lockup. Winner reads white, the other side grey, never red. */
export function ScoreboardOcrScoreHeader({ team1Name, team2Name, team1Score, team2Score, mapName, uncertain, onChange }: Props) {
  const t1Leads = (team1Score ?? 0) > (team2Score ?? 0);
  const t2Leads = (team2Score ?? 0) > (team1Score ?? 0);
  return (
    <div className="relative border border-white/[0.07] bg-card/70 px-5 py-4">
      <span className="absolute left-0 top-0 h-full w-[2px] bg-rose-500" aria-hidden />
      <p className={EYEBROW_CLASS}>
        Read from screenshot{mapName ? ` · ${mapName}` : ''}
      </p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className={cn('truncate text-right font-heading text-base font-bold sm:text-lg', t1Leads ? 'text-white' : 'text-zinc-400')}>
          {team1Name}
        </p>
        <div className="flex items-center gap-2">
          <ScoreInput label={team1Name} value={team1Score} leading={t1Leads} uncertain={uncertain} onChange={(v) => onChange('team1', v)} />
          <span className="font-heading text-3xl font-black text-zinc-600" aria-hidden>:</span>
          <ScoreInput label={team2Name} value={team2Score} leading={t2Leads} uncertain={uncertain} onChange={(v) => onChange('team2', v)} />
        </div>
        <p className={cn('truncate font-heading text-base font-bold sm:text-lg', t2Leads ? 'text-white' : 'text-zinc-400')}>
          {team2Name}
        </p>
      </div>
      {uncertain && (
        <p className="mt-2 text-center text-xs text-amber-200">Check the score — we could not read it with confidence.</p>
      )}
    </div>
  );
}
