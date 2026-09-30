import { Crown, Gem, Medal, Trophy, type LucideIcon } from 'lucide-react';

export interface TierCardData {
  key: string;
  name: string;
  price?: string;
  lead?: string;
  summary?: string;
  points: string[];
  featured: boolean;
}

/** Medal ladder from the Genesis original: silver, gold, platinum, then the crown for the top tier. */
const MEDALS: Array<{ icon: LucideIcon; tone: string }> = [
  { icon: Medal, tone: 'text-zinc-300' },
  { icon: Medal, tone: 'text-amber-400' },
  { icon: Gem, tone: 'text-sky-200' },
  { icon: Trophy, tone: 'text-amber-300' },
];

export function TierCard({ tier, index }: { tier: TierCardData; index: number }) {
  const medal = tier.featured ? { icon: Crown, tone: 'text-[color:var(--pd-cue)]' } : MEDALS[index] ?? MEDALS[0];
  const Icon = medal.icon;
  return (
    <article className={`pd-avoid pd-cut-frame flex p-px ${tier.featured ? 'pd-lift bg-[color:var(--pd-cue)]' : 'bg-[color:var(--pd-line)]'}`}>
      <div className={`pd-cut-frame flex flex-1 flex-col p-5 print:p-4 ${tier.featured ? 'bg-[color:var(--pd-panel-lit)]' : 'bg-[color:var(--pd-panel)]'}`}>
        <div className="flex flex-col items-center border-b border-[color:var(--pd-soft-line)] pb-4 text-center">
          <Icon className={`h-9 w-9 ${medal.tone}`} aria-hidden />
          <h3 className={`mt-3 text-xl font-bold uppercase tracking-[0.06em] ${tier.featured ? 'text-[color:var(--pd-cue)]' : 'text-[color:var(--pd-ink)]'}`}>{tier.name}</h3>
          {tier.price && <p className="mt-1 text-2xl font-bold tabular-nums tracking-wide text-[color:var(--pd-ink)] print:text-xl">{tier.price}</p>}
          {tier.summary && <p className="mt-2 text-[14px] font-medium leading-snug text-[color:var(--pd-muted)]">{tier.summary}</p>}
        </div>
        {tier.lead && <p className="mt-4 text-center text-[14px] font-bold uppercase tracking-[0.06em] text-[color:var(--pd-cue)]">{tier.lead}</p>}
        <ul className="mt-4 space-y-2.5">
          {tier.points.filter((p) => p.trim()).map((point, i) => (
            <li key={`${i}-${point}`} className="flex gap-2 text-[14px] font-medium leading-snug text-[color:var(--pd-label)] print:text-[13px]">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-[color:var(--pd-cue)]" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
