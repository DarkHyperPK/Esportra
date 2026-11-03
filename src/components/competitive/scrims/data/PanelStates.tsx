import { InlineNotice } from '@/components/ui/kit';

export function PanelSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading competitive record">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-none bg-white/[0.07]" />)}
      </div>
      <div className="h-40 animate-pulse rounded-none bg-white/[0.07]" />
    </div>
  );
}

export function PanelMessage({ children }: { children: string }) {
  return <p className="rounded-none border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">{children}</p>;
}

export function PanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <InlineNotice tone="critical" action={
      <button type="button" onClick={onRetry}
        className="min-h-[32px] rounded-none border border-white/15 px-3 text-[12px] text-zinc-200 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
        Try again
      </button>
    }>
      The competitive record could not be loaded.
    </InlineNotice>
  );
}
