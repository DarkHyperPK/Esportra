import { useState, useCallback, useEffect } from 'react';
import { X, Upload, Link as LinkIcon } from 'lucide-react';
import { type Placement, type CreatePlacementPayload, type UpdatePlacementPayload, useUploadPlacementAsset } from '@/hooks/useAdminPlacements';
import { type PlacementZone, ZONE_META, MEDIA_FIELD_LABELS, zonesForTier, displayTier } from './types';
import { useToast } from '@/hooks/use-toast';

interface Sponsor {
 id: string;
 name: string;
 tier: string;
 logo_url?: string;
}

interface Tournament {
 id: string;
 name: string;
}

interface Props {
 open: boolean;
 onClose: () => void;
 onSubmit: (payload: CreatePlacementPayload | (UpdatePlacementPayload & { id: string })) => void;
 sponsors: Sponsor[];
 tournaments: Tournament[];
 editing: Placement | null;
 lockedSponsorId?: string;
 lockedZone?: PlacementZone;
 lockedTournamentId?: string | null;
 lockedSlotNumber?: number;
}

export const PlacementModal: React.FC<Props> = ({
 open,
 onClose,
 onSubmit,
 sponsors,
 tournaments,
 editing,
 lockedSponsorId,
 lockedZone,
 lockedTournamentId,
 lockedSlotNumber,
}) => {
 const [sponsorId, setSponsorId] = useState(editing?.sponsorId ?? lockedSponsorId ?? '');
 const [zone, setZone] = useState<string>(editing?.placementZone ?? lockedZone ?? '');
 const [tournamentId, setTournamentId] = useState<string>(editing?.tournamentId ?? lockedTournamentId ?? '');
 const [bannerUrl, setBannerUrl] = useState(editing?.bannerUrl ?? '');
 const [logoUrl, setLogoUrl] = useState(editing?.logoUrl ?? '');
 const [bannerAssetId, setBannerAssetId] = useState<string | null>(editing?.bannerAssetId ?? null);
 const [logoAssetId, setLogoAssetId] = useState<string | null>(editing?.logoAssetId ?? null);
 const [headline, setHeadline] = useState(editing?.headline ?? '');
 const [description, setDescription] = useState(editing?.description ?? '');
 const [ctaText, setCtaText] = useState(editing?.ctaText ?? '');
 const [ctaUrl, setCtaUrl] = useState(editing?.ctaUrl ?? '');
 const [priority, setPriority] = useState(editing?.priority ?? 0);
 const [isActive, setIsActive] = useState(editing?.isActive ?? true);
 const [slotNumber, setSlotNumber] = useState(editing?.slotNumber ?? lockedSlotNumber ?? 1);
 const [startsAt, setStartsAt] = useState(editing?.startsAt?.slice(0, 16) ?? '');
 const [endsAt, setEndsAt] = useState(editing?.endsAt?.slice(0, 16) ?? '');

 useEffect(() => {
  if (!open) return;
  setSponsorId(editing?.sponsorId ?? lockedSponsorId ?? '');
  setZone(editing?.placementZone ?? lockedZone ?? '');
  setTournamentId(editing?.tournamentId ?? lockedTournamentId ?? '');
  setSlotNumber(editing?.slotNumber ?? lockedSlotNumber ?? 1);
  setBannerUrl(editing?.bannerUrl ?? '');
  setLogoUrl(editing?.logoUrl ?? '');
  setBannerAssetId(editing?.bannerAssetId ?? null);
  setLogoAssetId(editing?.logoAssetId ?? null);
  setHeadline(editing?.headline ?? '');
  setDescription(editing?.description ?? '');
  setCtaText(editing?.ctaText ?? '');
  setCtaUrl(editing?.ctaUrl ?? '');
  setPriority(editing?.priority ?? 0);
  setIsActive(editing?.isActive ?? true);
  setStartsAt(editing?.startsAt?.slice(0, 16) ?? '');
  setEndsAt(editing?.endsAt?.slice(0, 16) ?? '');
 }, [editing, lockedSlotNumber, lockedSponsorId, lockedTournamentId, lockedZone, open]);

 const upload = useUploadPlacementAsset();
 const { toast } = useToast();

 const selectedSponsor = sponsors.find(s => s.id === sponsorId);
 const allowedZones = selectedSponsor ? zonesForTier(selectedSponsor.tier) : [];
 const activeZone = (zone || lockedZone) as PlacementZone | undefined;
 const zoneMeta = activeZone ? ZONE_META[activeZone] : null;

 const handleFileUpload = useCallback(async (file: File, target: 'banner' | 'logo') => {
  if (!activeZone) return;
  try {
   const asset = await upload.mutateAsync({ file, zone: activeZone, assetRole: target });
   if (target === 'banner') { setBannerUrl(asset.url); setBannerAssetId(asset.assetId); }
   else { setLogoUrl(asset.url); setLogoAssetId(asset.assetId); }
  } catch (err: any) {
   const message = err?.body?.error || err?.message || 'Upload failed. Check image dimensions and format.';
   toast({ title: 'Creative upload failed', description: message, variant: 'destructive' });
  }
 }, [activeZone, upload, toast]);

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (editing) {
   onSubmit({
    id: editing.id,
    bannerUrl: bannerUrl || null,
    bannerAssetId,
    logoUrl: logoUrl || null,
    logoAssetId,
    headline: headline || null,
    description: description || null,
    ctaText: ctaText || null,
    ctaUrl: ctaUrl || null,
    priority,
    isActive,
    startsAt: startsAt ? new Date(startsAt).toISOString() : null,
    endsAt: endsAt ? new Date(endsAt).toISOString() : null,
   });
  } else {
   const isGlobal = zoneMeta?.isGlobal;
   onSubmit({
    sponsorId,
    tournamentId: isGlobal ? null : (tournamentId || null),
    placementZone: zone as PlacementZone,
    slotNumber,
    bannerUrl: bannerUrl || null,
    bannerAssetId,
    logoUrl: logoUrl || null,
    logoAssetId,
    headline: headline || null,
    description: description || null,
    ctaText: ctaText || null,
    ctaUrl: ctaUrl || null,
    priority,
    isActive,
    startsAt: startsAt ? new Date(startsAt).toISOString() : null,
    endsAt: endsAt ? new Date(endsAt).toISOString() : null,
   });
  }
 };

 if (!open) return null;

 const showSponsorPicker = !editing && !lockedSponsorId;
 const showZonePicker = !editing && !lockedZone;
 const showTournamentPicker = !editing && !lockedTournamentId && zoneMeta && !zoneMeta.isGlobal;

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
   <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
    <div className="flex items-center justify-between p-5 border-b border-zinc-800">
     <div>
      <h3 className="text-lg font-bold text-white">{editing ? 'Edit Placement' : 'Assign Placement'}</h3>
      {lockedZone && <p className="text-xs text-zinc-500 mt-0.5">{ZONE_META[lockedZone].label} — {ZONE_META[lockedZone].description}</p>}
     </div>
     <button onClick={onClose} className="p-1 hover:bg-zinc-800 "><X className="w-5 h-5 text-zinc-400" /></button>
    </div>

    <form onSubmit={handleSubmit} className="p-5 space-y-4">
     {/* Sponsor picker (only when not locked) */}
     {showSponsorPicker && (
      <div>
       <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Sponsor</label>
       <select
        value={sponsorId}
        onChange={e => { setSponsorId(e.target.value); if (!lockedZone) setZone(''); }}
        className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-sm text-white"
        required
       >
        <option value="">Select sponsor...</option>
        {sponsors.filter(s => {
         if (!lockedZone) return true;
         return zonesForTier(s.tier).includes(lockedZone);
        }).map(s => (
         <option key={s.id} value={s.id}>{s.name} ({displayTier(s.tier)})</option>
        ))}
       </select>
      </div>
     )}

     {/* Locked sponsor display */}
     {lockedSponsorId && selectedSponsor && (
      <div className="flex items-center gap-3 px-3 py-2 bg-zinc-800/50 border border-zinc-800 ">
       {selectedSponsor.logo_url && <img src={selectedSponsor.logo_url} alt="" className="h-5 w-auto" />}
       <span className="text-sm text-white font-medium">{selectedSponsor.name}</span>
       <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-700  text-zinc-400">{displayTier(selectedSponsor.tier)}</span>
      </div>
     )}

     {/* Zone picker (only when not locked) */}
     {showZonePicker && sponsorId && (
      <div>
       <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Placement Zone</label>
       <select
        value={zone}
        onChange={e => setZone(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-sm text-white"
        required
       >
        <option value="">Select zone...</option>
        {allowedZones.map(z => (
         <option key={z} value={z}>{ZONE_META[z].label}</option>
        ))}
       </select>
      </div>
     )}

     {/* Tournament picker (only for non-global zones when not locked) */}
     {showTournamentPicker && (
      <div>
       <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Tournament</label>
       <select
        value={tournamentId}
        onChange={e => setTournamentId(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-sm text-white"
        required
       >
        <option value="">Select tournament...</option>
        {tournaments.map(t => (
         <option key={t.id} value={t.id}>{t.name}</option>
        ))}
       </select>
      </div>
     )}

     {/* Slot */}
     {zoneMeta && !editing && !lockedSlotNumber && (
      <div>
       <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Slot</label>
       <select value={slotNumber} onChange={event => setSlotNumber(Number(event.target.value))} className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-xs text-white">
        {Array.from({ length: zoneMeta.maxSlots }, (_, index) => <option key={index + 1} value={index + 1}>Slot {index + 1}</option>)}
       </select>
      </div>
     )}

     {/* Creative upload */}
     {zoneMeta && (
      <div className="space-y-3 pt-2 border-t border-zinc-800">
       <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Upload Ad Creative</p>
       {zoneMeta.mediaFields.includes('logo') && (
        <MediaInput
         label={MEDIA_FIELD_LABELS.logo}
         value={logoUrl}
         onFileUpload={f => handleFileUpload(f, 'logo')}
         uploading={upload.isPending}
        />
       )}
       {(zoneMeta.mediaFields.includes('banner') || zoneMeta.mediaFields.includes('tall_banner')) && (
        <MediaInput
         label={zoneMeta.mediaFields.includes('tall_banner') ? MEDIA_FIELD_LABELS.tall_banner : MEDIA_FIELD_LABELS.banner}
         value={bannerUrl}
         onFileUpload={f => handleFileUpload(f, 'banner')}
         uploading={upload.isPending}
        />
       )}
      </div>
     )}

     {/* Copy */}
     {zoneMeta && (
      <div className="space-y-3 pt-2 border-t border-zinc-800">
       <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Copy (optional)</p>
       <div>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Headline</label>
        <input
         type="text"
         value={headline}
         onChange={e => setHeadline(e.target.value)}
         maxLength={120}
         placeholder="Bold partner headline..."
         className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-sm text-white placeholder:text-zinc-600"
        />
       </div>
       <div>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Description</label>
        <textarea
         value={description}
         onChange={e => setDescription(e.target.value)}
         maxLength={2000}
         rows={4}
         placeholder="Write comprehensive partner copy shown on the Partners page..."
         className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none"
        />
       </div>
       <div className="grid grid-cols-2 gap-3">
        <div>
         <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">CTA Text</label>
         <input
          type="text"
          value={ctaText}
          onChange={e => setCtaText(e.target.value)}
          maxLength={60}
          placeholder="VISIT_SITE"
          className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-sm text-white placeholder:text-zinc-600"
         />
        </div>
        <div>
         <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">CTA URL</label>
         <input
          type="url"
          value={ctaUrl}
          onChange={e => setCtaUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-sm text-white placeholder:text-zinc-600"
         />
        </div>
       </div>
      </div>
     )}

     {/* Schedule (time-limited ads) */}
     {zoneMeta && (
      <div className="space-y-3 pt-2 border-t border-zinc-800">
       <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Schedule (optional)</p>
       <div className="grid grid-cols-2 gap-3">
        <div>
         <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Starts</label>
         <input type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-xs text-white" />
        </div>
        <div>
         <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Ends</label>
         <input type="datetime-local" value={endsAt} onChange={event => setEndsAt(event.target.value)} className="w-full bg-zinc-800 border border-zinc-700  px-3 py-2 text-xs text-white" />
        </div>
       </div>
      </div>
     )}

     {/* Footer */}
     <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
      <label className="flex items-center gap-2 cursor-pointer">
       <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className=" border-zinc-700" />
       <span className="text-xs text-zinc-400">Active</span>
      </label>
      <div className="flex gap-3">
       <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
       <button
        type="submit"
        disabled={!editing && (!sponsorId || !(zone || lockedZone) || (!zoneMeta?.isGlobal && !tournamentId && !lockedTournamentId))}
        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium  transition-colors"
       >
        {editing ? 'Save' : 'Assign'}
       </button>
      </div>
     </div>
    </form>
   </div>
  </div>
 );
};

const MediaInput: React.FC<{
 label: string;
 value: string;
 onFileUpload: (f: File) => void;
 uploading: boolean;
}> = ({ label, value, onFileUpload, uploading }) => (
 <div>
  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">{label}</label>
  <div className="flex gap-1">
   <div className="relative flex-1">
    <LinkIcon className="absolute left-2 top-2.5 w-3 h-3 text-zinc-600" />
    <input type="text" value={value} readOnly placeholder="Upload a validated creative →" className="w-full bg-zinc-800 border border-zinc-700  pl-7 pr-3 py-2 text-xs text-zinc-400" />
   </div>
   <label className={`flex items-center justify-center w-9 h-9 bg-zinc-800 border border-zinc-700  cursor-pointer hover:bg-zinc-700 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
    <Upload className="w-3.5 h-3.5 text-zinc-400" />
    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileUpload(f); e.target.value = ''; }} />
   </label>
  </div>
  {value && (
   <img src={value} alt="Preview" className="mt-2 h-16 w-auto object-contain  border border-zinc-800" />
  )}
 </div>
);
