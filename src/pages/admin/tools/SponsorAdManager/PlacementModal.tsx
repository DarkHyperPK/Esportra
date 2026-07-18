import React, { useState, useCallback } from 'react';
import { X, Upload, Link as LinkIcon } from 'lucide-react';
import { type Placement, type CreatePlacementPayload, type UpdatePlacementPayload, useUploadPlacementAsset } from '@/hooks/useAdminPlacements';
import { type PlacementZone, ZONE_META, zonesForTier } from './types';

interface Sponsor {
  id: string;
  name: string;
  tier: string;
  logo_url?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePlacementPayload | (UpdatePlacementPayload & { id: string })) => void;
  sponsors: Sponsor[];
  editing: Placement | null;
  defaultZone?: PlacementZone;
  defaultTournamentId?: string | null;
}

export const PlacementModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  sponsors,
  editing,
  defaultZone,
  defaultTournamentId,
}) => {
  const [sponsorId, setSponsorId] = useState(editing?.sponsorId ?? '');
  const [zone, setZone] = useState<string>(editing?.placementZone ?? defaultZone ?? '');
  const [bannerUrl, setBannerUrl] = useState(editing?.bannerUrl ?? '');
  const [logoUrl, setLogoUrl] = useState(editing?.logoUrl ?? '');
  const [headline, setHeadline] = useState(editing?.headline ?? '');
  const [ctaText, setCtaText] = useState(editing?.ctaText ?? '');
  const [ctaUrl, setCtaUrl] = useState(editing?.ctaUrl ?? '');
  const [priority, setPriority] = useState(editing?.priority ?? 0);
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);

  const upload = useUploadPlacementAsset();

  const selectedSponsor = sponsors.find(s => s.id === sponsorId);
  const allowedZones = selectedSponsor ? zonesForTier(selectedSponsor.tier) : [];

  const handleFileUpload = useCallback(async (file: File, target: 'banner' | 'logo') => {
    const url = await upload.mutateAsync(file);
    if (target === 'banner') setBannerUrl(url);
    else setLogoUrl(url);
  }, [upload]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      onSubmit({ id: editing.id, bannerUrl: bannerUrl || null, logoUrl: logoUrl || null, headline: headline || null, ctaText: ctaText || null, ctaUrl: ctaUrl || null, priority, isActive });
    } else {
      onSubmit({ sponsorId, tournamentId: defaultTournamentId ?? null, placementZone: zone, bannerUrl: bannerUrl || null, logoUrl: logoUrl || null, headline: headline || null, ctaText: ctaText || null, ctaUrl: ctaUrl || null, priority, isActive });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white">{editing ? 'Edit Placement' : 'Assign Placement'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded"><X className="w-5 h-5 text-zinc-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!editing && (
            <>
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Sponsor</label>
                <select
                  value={sponsorId}
                  onChange={e => { setSponsorId(e.target.value); setZone(''); }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                  required
                >
                  <option value="">Select sponsor...</option>
                  {sponsors.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.tier})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Placement Zone</label>
                <select
                  value={zone}
                  onChange={e => setZone(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                  required
                  disabled={!sponsorId}
                >
                  <option value="">Select zone...</option>
                  {allowedZones.map(z => (
                    <option key={z} value={z}>{ZONE_META[z].label} — {ZONE_META[z].description}</option>
                  ))}
                </select>
                {sponsorId && allowedZones.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">No zones available for this sponsor's tier.</p>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <MediaInput label="Banner Image" value={bannerUrl} onChange={setBannerUrl} onFileUpload={f => handleFileUpload(f, 'banner')} uploading={upload.isPending} />
            <MediaInput label="Logo Image" value={logoUrl} onChange={setLogoUrl} onFileUpload={f => handleFileUpload(f, 'logo')} uploading={upload.isPending} />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="Optional headline text"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">CTA Text</label>
              <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Learn more" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">CTA URL</label>
              <input type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">Priority</label>
              <input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded border-zinc-700" />
                <span className="text-sm text-zinc-300">Active</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={!editing && (!sponsorId || !zone)} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors">
              {editing ? 'Save Changes' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MediaInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFileUpload: (f: File) => void;
  uploading: boolean;
}> = ({ label, value, onChange, onFileUpload, uploading }) => (
  <div>
    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 block">{label}</label>
    <div className="flex gap-1">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-2 top-2.5 w-3 h-3 text-zinc-600" />
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="URL or upload"
          className="w-full bg-zinc-800 border border-zinc-700 rounded pl-7 pr-3 py-2 text-xs text-white"
        />
      </div>
      <label className={`flex items-center justify-center w-9 h-9 bg-zinc-800 border border-zinc-700 rounded cursor-pointer hover:bg-zinc-700 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        <Upload className="w-3.5 h-3.5 text-zinc-400" />
        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFileUpload(f); }} />
      </label>
    </div>
    {value && (
      <img src={value} alt="Preview" className="mt-2 h-12 w-auto object-contain rounded border border-zinc-800" />
    )}
  </div>
);
