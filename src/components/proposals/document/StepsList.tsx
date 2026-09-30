import type { ProposalStep } from '@/schemas/proposal';
import { BODY, NUMBER, TITLE } from './docStyles';

export function StepsList({ steps }: { steps: ProposalStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="pd-avoid grid gap-8 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
      {steps.map((step, i) => (
        <li key={`${step.title}-${i}`} className="border-t border-[color:var(--pd-strong-line)] pt-4">
          <span className={`${NUMBER} text-3xl text-[color:var(--pd-hint)]`}>{String(i + 1).padStart(2, '0')}</span>
          <h3 className={`${TITLE} mt-3 text-lg`}>{step.title}</h3>
          <p className={`${BODY} mt-2 text-sm`}>{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
