/** Small print: one quiet line per term, under the prices they qualify. */
export function TermsList({ terms }: { terms: string[] }) {
  const shown = terms.filter((t) => t.trim());
  if (shown.length === 0) return null;
  return (
    <ul className="pd-avoid space-y-1">
      {shown.map((term, i) => (
        <li key={`${i}-${term}`} className="text-[11px] leading-relaxed text-[color:var(--pd-hint)]">{term}</li>
      ))}
    </ul>
  );
}
