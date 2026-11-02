/** Loading placeholder with the same anatomy as ScrimOpponentCard, so the grid does not jump. */
export function ScrimOpponentCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-white/[0.06] bg-card" aria-hidden="true">
      <div className="relative h-[136px] bg-white/[0.04]">
        <div className="absolute inset-x-4 bottom-3 flex items-end gap-3">
          <div className="h-14 w-14 rounded-full bg-white/[0.08]" />
          <div className="space-y-2 pb-1">
            <div className="h-4 w-32 bg-white/[0.08]" />
            <div className="h-3 w-20 bg-white/[0.05]" />
          </div>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="h-9 w-full bg-white/[0.04]" />
        <div className="h-5 w-48 bg-white/[0.04]" />
        <div className="flex gap-1">{Array.from({ length: 7 }, (_, i) => <div key={i} className="h-[22px] w-[22px] bg-white/[0.04]" />)}</div>
        <div className="flex gap-2 pt-2">
          <div className="h-11 flex-1 bg-white/[0.04]" />
          <div className="h-11 flex-1 bg-white/[0.08]" />
        </div>
      </div>
    </div>
  );
}
