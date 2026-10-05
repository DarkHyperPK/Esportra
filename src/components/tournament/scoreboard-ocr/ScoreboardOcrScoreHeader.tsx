import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import EntityAvatar from '@/components/ui/EntityAvatar';

interface Props {
  team1Name: string;
  team2Name: string;
  teamLogos?: Partial<Record<'team1' | 'team2', string>>;
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
        'w-[2.6ch] bg-transparent text-center font-heading text-3xl font-black tabular-nums tracking-tight outline-none sm:text-4xl',
        'border-b-2 border-transparent transition-colors focus-visible:border-rose-400',
        leading ? 'text-white' : 'text-zinc-500',
        uncertain && 'border-amber-400/70',
      )}
    />
  );
}

function TeamName({ name, logo, leading, align }: { name: string; logo?: string; leading: boolean; align: 'left' | 'right' }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', align === 'right' && 'flex-row-reverse text-right')}>
      <EntityAvatar src={logo} name={name} type="team" size="h-7 w-7" className="hidden rounded-none sm:flex" />
      <p className={cn('line-clamp-2 min-w-0 font-heading text-sm font-bold leading-tight [overflow-wrap:normal] sm:text-base', leading ? 'text-white' : 'text-zinc-400')}>
        {name}
      </p>
    </div>
  );
}

/** The hero: the round score as a versus lockup. Winner reads white, the other side grey, never red. */
export function ScoreboardOcrScoreHeader({ team1Name, team2Name, teamLogos, team1Score, team2Score, mapName, uncertain, onChange }: Props) {
  const t1Leads = (team1Score ?? 0) > (team2Score ?? 0);
  const t2Leads = (team2Score ?? 0) > (team1Score ?? 0);
  return (
    <div className="relative border border-white/[0.07] bg-card/70 px-4 py-2.5">
      <span className="absolute left-0 top-0 h-full w-[2px] bg-rose-500" aria-hidden />
      <p className={EYEBROW_CLASS}>
        Read from screenshot{mapName ? ` · ${mapName}` : ''}
      </p>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <TeamName name={team1Name} logo={teamLogos?.team1} leading={t1Leads} align="right" />
        <div className="flex items-center gap-2">
          <ScoreInput label={team1Name} value={team1Score} leading={t1Leads} uncertain={uncertain} onChange={(v) => onChange('team1', v)} />
          <span className="font-heading text-2xl font-black text-zinc-600" aria-hidden>:</span>
          <ScoreInput label={team2Name} value={team2Score} leading={t2Leads} uncertain={uncertain} onChange={(v) => onChange('team2', v)} />
        </div>
        <TeamName name={team2Name} logo={teamLogos?.team2} leading={t2Leads} align="left" />
      </div>
    </div>
  );
}
