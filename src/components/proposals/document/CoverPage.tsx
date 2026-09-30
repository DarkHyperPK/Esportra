import { Landmark, Trophy } from 'lucide-react';
import type { Proposal } from '@/schemas/proposal';
import { brandLabel, fillTokens, joinFacts } from '@/services/proposals/format';
import { Page } from './Page';
import { Title } from './Title';

const BADGE_ICONS = [Landmark, Trophy, Trophy];

/** A chevron echoing the Genesis cover art, drawn in line so it stays sharp at any size. */
function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 400 700" className="pointer-events-none absolute -right-10 top-[18%] -z-10 h-[62%] opacity-80" fill="none">
      <path d="M380 20 L140 350 L380 680" stroke="var(--pd-cue)" strokeWidth="2" />
      <path d="M400 80 L200 350 L400 620" stroke="var(--pd-cue)" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d="M400 150 L260 350 L400 550" stroke="var(--pd-cue)" strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}

export function CoverPage({ doc, title, facts }: { doc: Proposal; title: string; facts: string[] }) {
  const badges = doc.badges.filter((b) => b.value.trim());
  return (
    <Page anchor="cover">
      <Chevron />
      <div className="flex flex-1 flex-col">
        <span className="w-fit rounded-full border border-[color:var(--pd-cue)] px-4 py-1.5 text-[13px] font-bold uppercase tracking-[0.2em] text-[color:var(--pd-ink)]">
          Proposal for {brandLabel(doc)} · ’{doc.preparedOn.slice(2, 4)}
        </span>
        <div className="mt-8">
          <Title doc={doc} text={title} size="cover" as="h1" />
        </div>
        <div className="mt-10 max-w-md border-t border-[color:var(--pd-line)] pt-5">
          <p className="text-xl font-medium leading-snug text-[color:var(--pd-label)]">{fillTokens(doc.coverLine, doc)}</p>
          {facts.length > 0 && <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.22em] text-[color:var(--pd-cue)]">{joinFacts(facts)}</p>}
        </div>
        {badges.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-x-10 gap-y-5 border-t border-[color:var(--pd-line)] pt-6">
            {badges.map((badge, i) => {
              const Icon = BADGE_ICONS[i] ?? Trophy;
              return (
                <div key={`${badge.value}-${i}`} className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center border border-[color:var(--pd-line)] [clip-path:polygon(0_0,100%_0,100%_75%,75%_100%,0_100%)]">
                    <Icon className="h-6 w-6 text-[color:var(--pd-cue)]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--pd-hint)]">{badge.label}</p>
                    <p className="text-[15px] font-bold uppercase tracking-[0.06em] text-[color:var(--pd-ink)]">{badge.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
