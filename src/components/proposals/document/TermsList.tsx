import { CAPTION } from './docStyles';

export function TermsList({ terms }: { terms: string[] }) {
  const shown = terms.filter((t) => t.trim());
  if (shown.length === 0) return null;
  return (
    <div className="pd-avoid">
      <p className={`${CAPTION} mb-4`}>Terms</p>
      <ul className="space-y-2">
        {shown.map((term, i) => (
          <li key={`${i}-${term}`} className="flex gap-3 text-[13px] leading-relaxed text-[color:var(--pd-muted)]">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 bg-[color:var(--pd-hint)]" />
            {term}
          </li>
        ))}
      </ul>
    </div>
  );
}
