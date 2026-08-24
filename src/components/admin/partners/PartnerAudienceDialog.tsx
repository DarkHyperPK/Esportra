import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAdminSponsorAudience } from '@/hooks/useAdminSponsorAudience';
import type { Sponsor } from '@/hooks/useSponsors';
import type { SponsorAnalyticsPeriod, SponsorAudienceDimension } from '@/types/sponsorAnalytics';

interface Props {
 sponsor: Sponsor | null;
 open: boolean;
 onOpenChange: (open: boolean) => void;
}

export function PartnerAudienceDialog({ sponsor, open, onOpenChange }: Props) {
 const [period, setPeriod] = useState<SponsorAnalyticsPeriod>(30);
 const report = useAdminSponsorAudience(sponsor?.id, period, open);

 useEffect(() => setPeriod(30), [sponsor?.id]);

 return (
  <Dialog open={open} onOpenChange={onOpenChange}>
   <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto border-zinc-800 bg-[#0a0a0c] text-white" data-lenis-prevent>
    <DialogHeader>
     <DialogTitle>{sponsor?.name} audience demographics</DialogTitle>
     <DialogDescription>Super-admin view of exact aggregate audience data.</DialogDescription>
    </DialogHeader>
    <div className="flex gap-2">
     {([7, 30, 90] as SponsorAnalyticsPeriod[]).map(value => <Button key={value} size="sm" variant={period === value ? 'default' : 'outline'} onClick={() => setPeriod(value)}>{value} days</Button>)}
    </div>
    {report.isLoading ? <State text="Loading audience report…" />
     : report.isError ? <State text="Audience report could not be loaded." action={() => void report.refetch()} />
     : !report.data ? null
     : report.data.status === 'empty' ? <State text="0 unique audience. No qualifying impressions in this period." />
     : <div className="space-y-6">
       <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Estimated unique audience" value={report.data.estimatedUniqueAudience?.toLocaleString() ?? '—'} />
        <Metric label="Country coverage" value={coverage(report.data.country)} />
        <Metric label="Age coverage" value={coverage(report.data.age)} />
       </div>
       <div className="grid gap-5 md:grid-cols-2">
        <Dimension title="Country" dimension={report.data.country} />
        <Dimension title="Age" dimension={report.data.age} />
       </div>
       <p className="border border-white/5 p-4 text-xs text-zinc-500">Segment counts are exact, including small groups. Unknown is coverage only and is never redistributed.</p>
      </div>}
   </DialogContent>
  </Dialog>
 );
}

const Metric = ({ label, value }: { label: string; value: string }) => <div className="border border-white/5 p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
const State = ({ text, action }: { text: string; action?: () => void }) => <div className="py-16 text-center text-zinc-500"><p>{text}</p>{action && <Button className="mt-4" variant="outline" onClick={action}>Retry</Button>}</div>;
const coverage = (dimension: SponsorAudienceDimension) => dimension.coveragePercent === null ? 'Not available' : `${dimension.coveragePercent}%`;
function Dimension({ title, dimension }: { title: string; dimension: SponsorAudienceDimension }) {
 return <div className="border border-white/5 p-5"><h3 className="font-bold">{title}</h3>{dimension.segments.length === 0 ? <p className="mt-5 text-sm text-zinc-600">No publishable segments.</p> : <div className="mt-4 space-y-3">{dimension.segments.map(segment => <div key={segment.key} className="flex justify-between text-sm"><span>{segment.key}</span><span className="text-zinc-500">{segment.percentageOfKnown}%</span></div>)}</div>}</div>;
}
