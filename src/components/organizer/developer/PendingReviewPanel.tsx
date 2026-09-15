import { Clock } from 'lucide-react';
import { CommandPanel } from '@/components/management/CommandSurface';
import { type DevAccessRequest } from '@/hooks/useDeveloperApi';

interface PendingReviewPanelProps {
  accessRequest: DevAccessRequest;
}

/**
 * Shown in the live keys section when an access request is pending review.
 */
export function PendingReviewPanel({ accessRequest }: PendingReviewPanelProps) {
  const submittedDate = new Date(accessRequest.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <CommandPanel className="border-blue-500/25 bg-blue-950/10">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-blue-500/35 bg-blue-950/20">
          <Clock className="h-5 w-5 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-blue-400">
            Under Review
          </p>
          <h3 className="mt-1 text-base font-black uppercase text-white">
            Application Under Review
          </h3>
          <p className="mt-2 text-sm text-blue-200/70">
            Your application is being reviewed. You will receive an email when your
            application is processed.
          </p>

          <div className="mt-4 space-y-3 border border-blue-500/15 bg-blue-950/10 p-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Submitted
              </p>
              <p className="mt-0.5 text-sm text-zinc-300">{submittedDate}</p>
            </div>
            {accessRequest.intended_use && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Intended Use
                </p>
                <p className="mt-0.5 text-sm text-zinc-300">{accessRequest.intended_use}</p>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-blue-300/60">
            Typical review time: 2 business days.
          </p>
        </div>
      </div>
    </CommandPanel>
  );
}
