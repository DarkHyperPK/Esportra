export function AirPager({ page, hasMore, onPage }: { page: number; hasMore: boolean; onPage: (page: number) => void }) {
  if (page === 1 && !hasMore) return null;
  const button = 'border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-40';
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <button type="button" className={button} disabled={page === 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="font-mono text-[10px] text-zinc-500">Page {page}</span>
      <button type="button" className={button} disabled={!hasMore} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}
