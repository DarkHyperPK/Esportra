export function AirTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-white/10 bg-[#111114]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">{children}</tbody>
      </table>
    </div>
  );
}
