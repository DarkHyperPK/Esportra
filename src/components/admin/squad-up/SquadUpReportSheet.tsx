import { formatDistanceToNow } from 'date-fns';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { InlineNotice } from '@/components/ui/kit';
import { useResolveSquadUpReport, useSquadUpAdminReport } from '@/hooks/competitive/useSquadUpAdmin';
import { reasonLabel } from '@/schemas/squadUpReport';
import { SquadUpEvidenceGallery } from './SquadUpEvidenceGallery';
import { SquadUpResolveForm } from './SquadUpResolveForm';

interface SquadUpReportSheetProps {
  reportId: string | null;
  canManage: boolean;
  canSuspend: boolean;
  onClose: () => void;
}

export function SquadUpReportSheet({ reportId, canManage, canSuspend, onClose }: SquadUpReportSheetProps) {
  const detail = useSquadUpAdminReport(reportId);
  const resolve = useResolveSquadUpReport();
  const data = detail.data;
  const report = data?.report;
  const snapshot = report?.snapshot ?? {};
  const riotId = typeof snapshot.riot_id === 'string' ? snapshot.riot_id : null;

  return (
    <Sheet open={!!reportId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetTitle>{report ? `Report: ${reasonLabel(report.reason)}` : 'Report'}</SheetTitle>
        <SheetDescription className="sr-only">Review the report, its proof, and decide what to do.</SheetDescription>
        {detail.isLoading && <p className="mt-4 text-sm text-zinc-400" role="status">Loading report…</p>}
        {detail.isError && <InlineNotice tone="critical" title="Report could not load">Try again in a moment.</InlineNotice>}
        {data && report && (
          <div className="mt-4 space-y-5 text-sm">
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              <dt className="text-zinc-400">Reported</dt><dd>{report.reportedUsername ?? report.reportedId}{riotId && <span className="text-zinc-400"> · {riotId}</span>}</dd>
              <dt className="text-zinc-400">Reporter</dt><dd>{report.reporterUsername ?? 'Deleted account'}</dd>
              <dt className="text-zinc-400">Sent</dt><dd>{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })} · from {report.context === 'match' ? 'a match' : 'the deck'}</dd>
              <dt className="text-zinc-400">Their record</dt><dd>{data.history.length} other report{data.history.length === 1 ? '' : 's'}, {data.restrictions.length} active restriction{data.restrictions.length === 1 ? '' : 's'}</dd>
            </dl>
            <section aria-label="Description"><h3 className="mb-1 font-semibold text-white">What the reporter said</h3>
              <p className="whitespace-pre-wrap text-zinc-200">{report.details || 'No description.'}</p>
              {report.proofLink && <p className="mt-1"><a className="text-rose-400 underline" href={report.proofLink} target="_blank" rel="noopener noreferrer">Proof link</a></p>}
            </section>
            <section aria-label="Screenshots"><h3 className="mb-2 font-semibold text-white">Screenshots</h3><SquadUpEvidenceGallery evidence={data.evidence} /></section>
            {data.history.length > 0 && (
              <section aria-label="Earlier reports"><h3 className="mb-1 font-semibold text-white">Earlier reports on this player</h3>
                <ul className="space-y-1 text-zinc-300">{data.history.map((row) => (
                  <li key={row.id}>{reasonLabel(row.reason)} · {row.resolution ?? row.status} · {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}</li>
                ))}</ul>
              </section>
            )}
            {report.status === 'resolved' ? (
              <InlineNotice tone="success" title={`Resolved: ${report.resolution}`}>
                {report.resolvedByUsername ? `By ${report.resolvedByUsername}. ` : ''}{report.resolutionNote}
              </InlineNotice>
            ) : (
              <SquadUpResolveForm canManage={canManage} canSuspend={canSuspend} pending={resolve.isPending}
                error={resolve.isError ? resolve.error.message : undefined}
                onResolve={(input) => resolve.mutate({ id: report.id, input }, { onSuccess: onClose })} />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
