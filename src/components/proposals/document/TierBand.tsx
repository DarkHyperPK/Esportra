import { CAPTION, DISPLAY, NUMBER } from './docStyles';

interface TierBandProps {
  caption: string;
  name: string;
  summary: string;
  price?: { currency: string; amount: number };
  leadIn?: string;
  points: string[];
}

/**
 * The featured tier, set apart as a full-width band with the 45° notch.
 * Used once per document: it is the exclusive, top-of-ladder offer.
 */
export function TierBand({ caption, name, summary, price, leadIn, points }: TierBandProps) {
  const shown = points.filter((p) => p.trim());
  return (
    <article className="pd-notch pd-avoid bg-[color:var(--pd-strong-line)] p-px">
      <div className="pd-notch grid gap-8 bg-[color:var(--pd-panel)] p-6 md:grid-cols-[0.85fr_1.4fr] md:gap-12 md:p-10 print:grid-cols-[0.85fr_1.4fr] print:gap-8 print:p-6">
        <div>
          <p className={CAPTION}>{caption}</p>
          <h3 className={`${DISPLAY} mt-3 text-5xl leading-none md:text-6xl print:text-5xl`}>{name}</h3>
          {summary && <p className="mt-4 max-w-xs text-[15px] leading-snug text-[color:var(--pd-muted)]">{summary}</p>}
          {price && (
            <div className="mt-8 print:mt-4"> 
              <p className={CAPTION}>{price.currency}</p>
              <p className={`${NUMBER} text-5xl leading-none print:text-4xl`}>{price.amount.toLocaleString('en-US')}</p>
            </div>
          )}
        </div>
        <div className="md:border-l md:border-[color:var(--pd-line)] md:pl-12 print:border-l print:border-[color:var(--pd-line)] print:pl-10">
          {leadIn && <p className={`${CAPTION} mb-5`}>{leadIn}</p>}
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 print:grid-cols-2 print:gap-y-2.5">
            {shown.map((point, i) => (
              <li key={`${i}-${point}`} className="border-t border-[color:var(--pd-line)] pt-3 text-[15px] leading-snug text-[color:var(--pd-ink)] print:pt-2 print:text-[13px]">
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
