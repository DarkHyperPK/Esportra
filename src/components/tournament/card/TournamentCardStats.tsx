interface Stat {
  label: string;
  value: string;
  /** Small inline suffix after the value, e.g. "/ 64". */
  unit?: string;
  /** Second line under the value, e.g. the start time or currency. */
  sub?: string;
  /** 0–100; draws the fill bar under the value. */
  fill?: number | null;
}

/** The scoreboard: three facts people compare across cards. */
export function TournamentCardStats({ stats }: { stats: [Stat, Stat, Stat] }) {
  return (
    <dl className="mt-3.5 grid grid-cols-[1.25fr_1fr_0.9fr] gap-px bg-white/[0.07] shadow-[0_0_0_1px_rgba(255,255,255,0.07)]">
      {stats.map((s) => (
        <div key={s.label} className="min-w-0 bg-[#111114] px-2.5 py-2.5 sm:px-3">
          <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">{s.label}</dt>
          <dd className="mt-1 truncate font-heading text-base font-black leading-tight tabular-nums tracking-tight text-white">
            {s.value}
            {s.unit ? <span className="ml-1 font-sans text-[11px] font-medium tracking-normal text-zinc-500">{s.unit}</span> : null}
          </dd>
          {s.fill != null ? (
            <div className="mt-2 h-0.5 bg-white/[0.08]" role="presentation">
              <div className="h-full bg-white" style={{ width: `${s.fill}%` }} />
            </div>
          ) : (
            <dd className="mt-0.5 h-4 truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{s.sub}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}
