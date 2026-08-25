import { useEffect, useState } from 'react';
import { Plus, Eye, Upload, Link as LinkIcon } from 'lucide-react';
import { useTournamentPlacements, useCreatePlacement, useUploadPlacementAsset, type Placement } from '@/hooks/useAdminPlacements';
import { ZONE_META, type PlacementZone, displayTier, zonesForTier, MEDIA_FIELD_LABELS } from './types';
import { PlacementCard } from './PlacementCard';
import { ResolvePlacementDialog } from './ResolvePlacementDialog';

interface Tournament { id: string; name: string; }
interface Sponsor { id: string; name: string; tier: string; logo_url?: string; }

interface Props {
 tournaments: Tournament[];
 sponsors: Sponsor[];
 onEdit: (placement: Placement) => void;
 onDelete: (id: string) => void;
 onReplace?: (placement: Placement) => void;
 onRemove?: (placement: Placement) => void;
 onUnassign?: (placement: Placement) => void;
 onPreview: (tournamentId: string) => void;
}

const TOURNAMENT_ZONES: PlacementZone[] = ['sidebar_partner', 'wide_partner', 'partner_logo', 'card_badge'];

export const TournamentView: React.FC<Props> = ({ tournaments, sponsors, onEdit, onDelete, onReplace, onRemove, onUnassign, onPreview }) => {
 const [selectedId, setSelectedId] = useState(tournaments[0]?.id ?? '');
 const { data: placements = [], isLoading } = useTournamentPlacements(selectedId);
 const [assigningZone, setAssigningZone] = useState<PlacementZone | null>(null);
 const [assigningSlot, setAssigningSlot] = useState<number | null>(null);
 const [resolvingPlacement, setResolvingPlacement] = useState<Placement | null>(null);

 useEffect(() => {
  if (!selectedId && tournaments.length > 0) setSelectedId(tournaments[0].id);
 }, [selectedId, tournaments]);

 const placementsByZone = (zone: string) => placements.filter(p => p.placementZone === zone);

 return (
  <div className="space-y-6">
   <div className="flex items-center gap-4">
    <select
     value={selectedId}
     onChange={e => { setSelectedId(e.target.value); setAssigningZone(null); setAssigningSlot(null); }}
     className="flex-1 bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white"
    >
     <option value="">Select tournament...</option>
     {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
    {selectedId && (
     <button onClick={() => onPreview(selectedId)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors">
      <Eye className="w-4 h-4" /> Preview
     </button>
    )}
   </div>

   {!selectedId && <div className="text-center py-16 text-zinc-600 text-sm">Select a tournament to manage its ad placements.</div>}
   {selectedId && isLoading && <div className="text-center py-16 text-zinc-600 text-sm">Loading...</div>}

   {selectedId && !isLoading && TOURNAMENT_ZONES.map(zone => {
    const meta = ZONE_META[zone];
    const zonePlacements = placementsByZone(zone);
    const validPlacements = zonePlacements.filter(placement =>
     placement.lifecycle !== 'review'
     && placement.slotNumber !== null
     && placement.slotNumber >= 1
     && placement.slotNumber <= meta.maxSlots);
    const reviewPlacements = zonePlacements.filter(placement => !validPlacements.includes(placement));
    const occupiedSlots = new Map(validPlacements.map(placement => [placement.slotNumber, placement]));

    return (
     <div key={zone} className="bg-zinc-900/50 border border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-4">
       <div>
        <h4 className="text-sm font-bold text-white">{meta.label}</h4>
        <p className="text-xs text-zinc-500">{meta.description} · {validPlacements.length}/{meta.maxSlots} reserved{reviewPlacements.length > 0 ? ` · ${reviewPlacements.length} needs review` : ''}</p>
       </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
       {Array.from({ length: meta.maxSlots }, (_, index) => {
        const slotNumber = index + 1;
        const placement = occupiedSlots.get(slotNumber);
        return (
         <div key={slotNumber} className="min-w-0">
          <div className="mb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600">Slot {slotNumber}</div>
          {placement ? (
           <PlacementCard placement={placement} onEdit={onEdit} onDelete={onDelete} onReplace={onReplace} onRemove={onRemove} onUnassign={onUnassign} />
          ) : (
           <button
            onClick={() => { setAssigningZone(zone); setAssigningSlot(slotNumber); }}
            className="flex aspect-video w-full items-center justify-center gap-1.5 border border-dashed border-zinc-700 bg-zinc-950/50 text-xs text-zinc-500 transition-colors hover:border-zinc-500 hover:text-white"
           >
            <Plus className="h-3.5 w-3.5" /> Assign sponsor
           </button>
          )}
         </div>
        );
       })}
      </div>

      {/* Inline assign form */}
      {assigningZone === zone && assigningSlot && (
       <InlineAssignForm
        zone={zone}
        slotNumber={assigningSlot}
        tournamentId={selectedId}
        sponsors={sponsors}
        onClose={() => { setAssigningZone(null); setAssigningSlot(null); }}
       />
      )}

      {reviewPlacements.length > 0 && (
       <div className="mt-4 border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">Needs Review</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
         {reviewPlacements.map(placement => <div key={placement.id}><PlacementCard placement={placement} onEdit={onEdit} onDelete={onDelete} onReplace={onReplace} onRemove={onRemove} onUnassign={onUnassign} /><button onClick={() => setResolvingPlacement(placement)} className="mt-2 w-full  border border-amber-500/30 px-3 py-1.5 text-xs text-amber-400">Resolve</button></div>)}
        </div>
       </div>
      )}
     </div>
    );
   })}
   <ResolvePlacementDialog placement={resolvingPlacement} tournaments={tournaments} onClose={() => setResolvingPlacement(null)} />
  </div>
 );
};

const InlineAssignForm: React.FC<{
 zone: PlacementZone;
 slotNumber: number;
 tournamentId: string;
 sponsors: Sponsor[];
 onClose: () => void;
}> = ({ zone, slotNumber, tournamentId, sponsors, onClose }) => {
 const meta = ZONE_META[zone];
 const eligibleSponsors = sponsors.filter(s => zonesForTier(s.tier).includes(zone));

 const [sponsorId, setSponsorId] = useState('');
 const [bannerUrl, setBannerUrl] = useState('');
 const [logoUrl, setLogoUrl] = useState('');
 const [bannerAssetId, setBannerAssetId] = useState<string | null>(null);
 const [logoAssetId, setLogoAssetId] = useState<string | null>(null);
 const [startsAt, setStartsAt] = useState('');
 const [endsAt, setEndsAt] = useState('');
 const [uploadError, setUploadError] = useState('');

 const createMutation = useCreatePlacement();
 const upload = useUploadPlacementAsset();

 const handleFileUpload = async (file: File, target: 'banner' | 'logo') => {
  setUploadError('');
  try {
   const asset = await upload.mutateAsync({ file, zone, assetRole: target });
   if (target === 'banner') { setBannerUrl(asset.url); setBannerAssetId(asset.assetId); }
   else { setLogoUrl(asset.url); setLogoAssetId(asset.assetId); }
  } catch (err: any) {
   setUploadError(err?.body?.error || err?.message || 'Upload failed. Check image dimensions and format.');
  }
 };

 const hasRequiredMedia = meta.mediaFields.includes('logo') ? !!logoUrl : !!bannerUrl;

 const handleSubmit = () => {
  if (!sponsorId || !hasRequiredMedia) return;
  createMutation.mutate({
   sponsorId,
   tournamentId,
   placementZone: zone,
   slotNumber,
   bannerUrl: bannerUrl || null,
   bannerAssetId,
   logoUrl: logoUrl || null,
   logoAssetId,
   isActive: true,
   startsAt: startsAt ? new Date(startsAt).toISOString() : null,
   endsAt: endsAt ? new Date(endsAt).toISOString() : null,
  }, { onSuccess: () => onClose() });
 };

 return (
  <div className="border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
   <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-zinc-300">Assign to {meta.label} · Slot {slotNumber}</span>
    <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white">Cancel</button>
   </div>

   <select value={sponsorId} onChange={e => setSponsorId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700  px-3 py-2 text-sm text-white">
    <option value="">Select sponsor...</option>
    {eligibleSponsors.map(s => <option key={s.id} value={s.id}>{s.name} ({displayTier(s.tier)})</option>)}
   </select>

   {sponsorId && (
    <>
     {/* Zone-specific media */}
     {meta.mediaFields.includes('logo') && (
      <MediaRow label={MEDIA_FIELD_LABELS.logo} value={logoUrl} onUpload={f => handleFileUpload(f, 'logo')} uploading={upload.isPending} />
     )}
     {(meta.mediaFields.includes('banner') || meta.mediaFields.includes('tall_banner')) && (
      <MediaRow label={meta.mediaFields.includes('tall_banner') ? MEDIA_FIELD_LABELS.tall_banner : MEDIA_FIELD_LABELS.banner} value={bannerUrl} onUpload={f => handleFileUpload(f, 'banner')} uploading={upload.isPending} />
     )}

     {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

     <div className="grid grid-cols-2 gap-2">
      <div>
       <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Starts (optional)</label>
       <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700  px-3 py-1.5 text-xs text-white" />
      </div>
      <div>
       <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Ends (optional)</label>
       <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700  px-3 py-1.5 text-xs text-white" />
      </div>
     </div>

     <button onClick={handleSubmit} disabled={createMutation.isPending || !hasRequiredMedia} className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium  transition-colors">
      {createMutation.isPending ? 'Assigning...' : !hasRequiredMedia ? 'Upload media to assign' : 'Assign Sponsor'}
     </button>
    </>
   )}
  </div>
 );
};

const MediaRow: React.FC<{
 label: string;
 value: string;
 onUpload: (f: File) => void;
 uploading: boolean;
}> = ({ label, value, onUpload, uploading }) => (
 <div>
  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">{label}</label>
  <div className="flex gap-1">
   <div className="relative flex-1">
    <LinkIcon className="absolute left-2 top-2 w-3 h-3 text-zinc-600" />
    <input type="text" value={value} readOnly placeholder="Upload a validated creative →" className="w-full bg-zinc-900 border border-zinc-700  pl-7 pr-3 py-1.5 text-xs text-zinc-400" />
   </div>
   <label className={`flex items-center justify-center w-8 h-8 bg-zinc-900 border border-zinc-700  cursor-pointer hover:bg-zinc-700 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
    <Upload className="w-3 h-3 text-zinc-400" />
    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
   </label>
  </div>
  {value && <img src={value} alt="Preview" className="mt-1.5 h-10 w-auto object-contain  border border-zinc-800" />}
 </div>
);
