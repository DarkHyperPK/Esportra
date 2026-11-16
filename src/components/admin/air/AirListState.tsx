export function AirListState({ loading, error, empty, emptyText }: { loading: boolean; error: unknown; empty: boolean; emptyText: string }) {
  if (loading) return <div className="border border-white/10 bg-[#111114] p-6 text-sm text-zinc-500">Loading…</div>;
  if (error) return <div className="border border-rose-500/30 bg-rose-950/20 p-6 text-sm text-rose-200">This list could not be loaded. Try again in a moment.</div>;
  if (empty) return <div className="border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">{emptyText}</div>;
  return null;
}
