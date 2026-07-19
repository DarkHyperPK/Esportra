import { useState } from 'react';
import { Plus, Eye, Upload, Link as LinkIcon } from 'lucide-react';
import { useTournamentPlacements, useCreatePlacement, useUploadPlacementAsset, type Placement } from '@/hooks/useAdminPlacements';
import { ZONE_META, type PlacementZone, displayTier, zonesForTier, MEDIA_FIELD_LABELS } from './types';
import { PlacementCard } from './PlacementCard';

interface Tournament { id: string; name: string; }
interface Sponsor { id: string; name: string; tier: string; logo_url?: string; }

interface Props {
  tournaments: Tournament[];
  sponsors: Sponsor[];
  onEdit: (placement: Placement) => void;
  onDelete: (id: string) => void;
  onPreview: (tournamentId: string) => void;
}

const TOURNAMENT_ZONES: PlacementZone[] = ['sidebar_partner', 'wide_partner', 'partner_logo'];

export const TournamentView: React.FC<Props> = ({ tournaments, sponsors, onEdit, onDelete, onPreview }) => {
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id ?? '');
  const { data: placements = [], isLoading } = useTournamentPlacements(selectedId);
  const [assigningZone, setAssigningZone] = useState<PlacementZone | null>(null);

  const placementsByZone = (zone: string) => placements.filter(p => p.placementZone === zone);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); setAssigningZone(null); }}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white"
        >
          <option value="">Select tournament...</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {selectedId && (
          <button onClick={() => onPreview(selectedId)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors">
            <Eye className="w-4 h-4" /> Preview
          </button>
        )}
      </div>

      {!selectedId && <div className="text-center py-16 text-zinc-600 text-sm">Select a tournament to manage its ad placements.</div>}
      {selectedId && isLoading && <div className="text-center py-16 text-zinc-600 text-sm">Loading...</div>}

      {selectedId && !isLoading && TOURNAMENT_ZONES.map(zone => {
        const meta = ZONE_META[zone];
        const zonePlacements = placementsByZone(zone);
        const slotsRemaining = meta.maxSlots - zonePlacements.length;

        return (
          <div key={zone} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">{meta.label}</h4>
                <p className="text-xs text-zinc-500">{meta.description} · {zonePlacements.length}/{meta.maxSlots} filled</p>
              </div>
              {slotsRemaining > 0 && assigningZone !== zone && (
                <button onClick={() => setAssigningZone(zone)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors">
                  <Plus className="w-3 h-3" /> Assign
                </button>
              )}
            </div>

            {/* Existing placements */}
            {zonePlacements.length > 0 && (
              <div className={`grid gap-3 mb-3 ${zone === 'partner_logo' ? 'grid-cols-4' : 'grid-cols-2'}`}>
                {zonePlacements.map(p => <PlacementCard key={p.id} placement={p} onEdit={onEdit} onDelete={onDelete} />)}
              </div>
            )}

            {/* Inline assign form */}
            {assigningZone === zone && (
              <InlineAssignForm
                zone={zone}
                tournamentId={selectedId}
                sponsors={sponsors}
                onClose={() => setAssigningZone(null)}
              />
            )}

            {zonePlacements.length === 0 && assigningZone !== zone && (
              <div className="border border-dashed border-zinc-800 rounded-lg py-6 text-center text-xs text-zinc-600">
                No sponsors assigned.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const InlineAssignForm: React.FC<{
  zone: PlacementZone;
  tournamentId: string;
  sponsors: Sponsor[];
  onClose: () => void;
}> = ({ zone, tournamentId, sponsors, onClose }) => {
  const meta = ZONE_META[zone];
  const eligibleSponsors = sponsors.filter(s => zonesForTier(s.tier).includes(zone));

  const [sponsorId, setSponsorId] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  const createMutation = useCreatePlacement();
  const upload = useUploadPlacementAsset();

  const handleFileUpload = async (file: File, target: 'banner' | 'logo') => {
    const url = await upload.mutateAsync(file);
    if (target === 'banner') setBannerUrl(url);
    else setLogoUrl(url);
  };

  const handleSubmit = () => {
    if (!sponsorId) return;
    createMutation.mutate({
      sponsorId,
      tournamentId,
      placementZone: zone,
      bannerUrl: bannerUrl || null,
      logoUrl: logoUrl || null,
      ctaUrl: ctaUrl || null,
      isActive: true,
    }, { onSuccess: () => onClose() });
  };

  return (
    <div className="border border-zinc-700 bg-zinc-800/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">Assign to {meta.label}</span>
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white">Cancel</button>
      </div>

      <select value={sponsorId} onChange={e => setSponsorId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white">
        <option value="">Select sponsor...</option>
        {eligibleSponsors.map(s => <option key={s.id} value={s.id}>{s.name} ({displayTier(s.tier)})</option>)}
      </select>

      {sponsorId && (
        <>
          {/* Zone-specific media */}
          {meta.mediaFields.includes('logo') && (
            <MediaRow label={MEDIA_FIELD_LABELS.logo} value={logoUrl} onChange={setLogoUrl} onUpload={f => handleFileUpload(f, 'logo')} uploading={upload.isPending} />
          )}
          {(meta.mediaFields.includes('banner') || meta.mediaFields.includes('tall_banner')) && (
            <MediaRow label={meta.mediaFields.includes('tall_banner') ? MEDIA_FIELD_LABELS.tall_banner : MEDIA_FIELD_LABELS.banner} value={bannerUrl} onChange={setBannerUrl} onUpload={f => handleFileUpload(f, 'banner')} uploading={upload.isPending} />
          )}

          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Link URL (optional)</label>
            <input type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://sponsor-website.com" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white" />
          </div>

          <button onClick={handleSubmit} disabled={createMutation.isPending} className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors">
            {createMutation.isPending ? 'Assigning...' : 'Assign Sponsor'}
          </button>
        </>
      )}
    </div>
  );
};

const MediaRow: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUpload: (f: File) => void;
  uploading: boolean;
}> = ({ label, value, onChange, onUpload, uploading }) => (
  <div>
    <label className="text-[10px] text-zinc-500 uppercase mb-1 block">{label}</label>
    <div className="flex gap-1">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-2 top-2 w-3 h-3 text-zinc-600" />
        <input type="url" value={value} onChange={e => onChange(e.target.value)} placeholder="URL or upload →" className="w-full bg-zinc-900 border border-zinc-700 rounded pl-7 pr-3 py-1.5 text-xs text-white" />
      </div>
      <label className={`flex items-center justify-center w-8 h-8 bg-zinc-900 border border-zinc-700 rounded cursor-pointer hover:bg-zinc-700 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        <Upload className="w-3 h-3 text-zinc-400" />
        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      </label>
    </div>
    {value && <img src={value} alt="Preview" className="mt-1.5 h-10 w-auto object-contain rounded border border-zinc-800" />}
  </div>
);
