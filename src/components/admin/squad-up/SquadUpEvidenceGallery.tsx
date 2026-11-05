import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { AdminReportDetail } from '@/schemas/squadUpAdmin';

type Evidence = AdminReportDetail['evidence'][number];

/** Proof screenshots. The URLs are private and expire after five minutes, so the page refetches them. */
export function SquadUpEvidenceGallery({ evidence }: { evidence: Evidence[] }) {
  const [open, setOpen] = useState<Evidence | null>(null);
  if (evidence.length === 0) return <p className="text-sm text-zinc-400">No screenshots attached.</p>;
  return (
    <>
      <ul className="grid grid-cols-3 gap-2" aria-label="Screenshots">
        {evidence.map((item, index) => (
          <li key={item.id}>
            {item.url ? (
              <button type="button" className="block aspect-video w-full overflow-hidden border border-white/[0.12]" aria-label={`Open screenshot ${index + 1}`} onClick={() => setOpen(item)}>
                <img src={item.url} alt={`Report screenshot ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ) : (
              <div className="grid aspect-video place-items-center border border-white/[0.12] text-xs text-zinc-500">Unavailable. Reload.</div>
            )}
          </li>
        ))}
      </ul>
      <Dialog open={!!open} onOpenChange={(next) => { if (!next) setOpen(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogTitle>Screenshot</DialogTitle>
          <DialogDescription className="sr-only">Full-size proof screenshot for this report.</DialogDescription>
          {open?.url && (
            <>
              <img src={open.url} alt="Report screenshot, full size" className="max-h-[70dvh] w-full object-contain" />
              <a className="inline-flex items-center gap-1 text-sm text-rose-400" href={open.url} target="_blank" rel="noopener noreferrer">
                Open in a new tab <ExternalLink size={12} aria-hidden />
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
