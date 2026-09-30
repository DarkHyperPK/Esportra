import type { CSSProperties, ReactNode } from 'react';
import { CAPTION } from './docStyles';

export interface Step {
  key: string;
  caption: string;
  name: string;
  /** Hero line: the price, or nothing for value-quoted tiers. */
  price?: { currency: string; amount: number };
  summary?: string;
  lead?: string;
  points: string[];
  /** The top step: inverted to white, notched. */
  top: boolean;
}

const RATIOS = [0.62, 0.74, 0.87, 1, 1, 1];

function Card({ step, children }: { step: Step; children: ReactNode }) {
  const surface = step.top
    ? 'pd-notch bg-[color:var(--pd-ink)] text-[color:var(--pd-bg)]'
    : 'pd-cut border border-[color:var(--pd-strong-line)] bg-[color:var(--pd-panel)] text-[color:var(--pd-ink)]';
  return <div className={`flex flex-1 flex-col p-5 md:p-6 print:p-4 ${surface}`}>{children}</div>;
}

/**
 * Packages as a staircase: each tier stands taller than the one before, so the
 * climb reads before a word does. The top step is inverted: white speaks.
 */
export function Staircase({ steps }: { steps: Step[] }) {
  const offset = Math.max(0, 4 - steps.length);
  return (
    <div className="pd-avoid flex flex-col gap-3 [--h:560px] sm:flex-row sm:items-end print:flex-row print:items-end print:[--h:600px]">
      {steps.map((step, i) => (
        <div
          key={step.key}
          style={{ '--r': RATIOS[i + offset] ?? 1 } as CSSProperties}
          className="pd-drop flex flex-1 flex-col sm:min-h-[calc(var(--h)*var(--r))] print:min-h-[calc(var(--h)*var(--r))]"
        >
          <Card step={step}>
            <p className={`${CAPTION} ${step.top ? '!text-[color:var(--pd-bg)] opacity-60' : ''}`}>{step.caption}</p>
            <h3 className="mt-2 font-heading text-2xl font-extrabold tracking-[-0.03em] md:text-3xl print:text-2xl">{step.name}</h3>
            {step.price && (
              <p className="mt-4 font-heading text-3xl font-extrabold tabular-nums leading-none tracking-tight md:text-4xl print:text-[1.7rem]">
                {step.price.amount.toLocaleString('en-US')}
                <span className="ml-1.5 align-top font-mono text-[10px] font-semibold tracking-[0.2em] opacity-60">{step.price.currency}</span>
              </p>
            )}
            {step.summary && <p className="mt-3 text-[13px] leading-snug opacity-70">{step.summary}</p>}
            <ul className="mt-auto space-y-2 border-t border-current/15 pt-4 [border-color:color-mix(in_srgb,currentColor_18%,transparent)]">
              {step.lead && <li className="text-[12px] leading-snug opacity-55">{step.lead}</li>}
              {step.points.filter((p) => p.trim()).map((point, j) => (
                <li key={`${j}-${point}`} className="text-[13px] leading-snug print:text-[12px]">{point}</li>
              ))}
            </ul>
          </Card>
        </div>
      ))}
    </div>
  );
}
