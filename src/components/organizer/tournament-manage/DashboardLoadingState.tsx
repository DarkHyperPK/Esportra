import { CommandShell } from '@/components/management/CommandSurface';

/** Mirrors the real layout (rail, header, panel) so nothing jumps when data lands. */
export function DashboardLoadingState() {
  const block = 'animate-pulse bg-white/[0.04]';
  return (
    <CommandShell>
      <div className="grid gap-3 px-4 py-3 md:grid-cols-[240px_minmax(0,1fr)] xl:pr-6" aria-busy="true" aria-label="Loading tournament">
        <div className="hidden space-y-2 border border-white/[0.07] p-3 md:block">
          {Array.from({ length: 10 }, (_, i) => <div key={i} className={`${block} h-8`} />)}
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-4 pb-5">
            <div className={`${block} h-14 w-14`} />
            <div className="flex-1 space-y-3">
              <div className={`${block} h-3 w-40`} />
              <div className={`${block} h-9 w-2/3 max-w-xl`} />
              <div className={`${block} h-3 w-56`} />
            </div>
          </div>
          <div className={`${block} h-10`} />
          <div className={`${block} h-36`} />
          <div className="grid gap-4 xl:grid-cols-2">
            <div className={`${block} h-64`} />
            <div className={`${block} h-64`} />
          </div>
        </div>
      </div>
    </CommandShell>
  );
}
