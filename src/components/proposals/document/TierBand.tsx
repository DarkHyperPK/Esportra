import { CAPTION, DISPLAY, NUMBER } from './docStyles';

interface TierBandProps {
  caption: string;
  name: string;
  summary: string;
  price?: { currency: string; amount: number };
  points: string[];
}

/** The featured tier: a lifted band with the 45° notch, the document's one rare moment. */
export function TierBand({ caption, name, summary, price, points }: TierBandProps) {
  const shown = points.filter((p) => p.trim());
  return (
    <article className="pd-notch pd-avoid bg-[color:var(--pd-strong-line)] p-px">
      <div className="pd-notch grid gap-8 bg-[color:var(--pd-panel)] p-8 md:grid-cols-[1fr_1.3fr] md:p-10 print:grid-cols-[1fr_1.3fr] print:p-7">
        <div>
          <p className={CAPTION}>{caption}</p>
          <h3 className={`${DISPLAY} mt-3 text-5xl uppercase leading-none tracking-[-0.03em] md:text-6xl`}>{name}</h3>
          {summary && <p className="mt-3 text-[14px] text-[color:var(--pd-muted)]">{summary}</p>}
          {price && (
            <p className={`${NUMBER} mt-8 text-5xl leading-none`}>
              <span className="mr-2 align-top font-mono text-xs font-semibold tracking-[0.2em] text-[color:var(--pd-hint)]">{price.currency}</span>
              {price.amount.toLocaleString('en-US')}
            </p>
          )}
        </div>
        <ul className="space-y-3 self-end print:space-y-2">
          {shown.map((point, i) => (
            <li key={`${i}-${point}`} className="border-t border-[color:var(--pd-line)] pt-3 text-[15px] leading-snug text-[color:var(--pd-ink)] print:pt-2 print:text-[14px]">
              {point}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
