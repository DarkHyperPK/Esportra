/** The "////" mark from the Genesis identity. */
export function Slashes({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex gap-1 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="block h-4 w-2 -skew-x-[30deg] bg-[color:var(--pd-cue)]" />
      ))}
    </span>
  );
}
