import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';
import { auditLog } from '@/lib/auditLog';
import { csvEscape } from '@/lib/exportUtils';
import { toast } from '@/components/ui/use-toast';
import { adminKeys, useAdminSponsors } from '@/hooks/useAdminQueries';
import type { Sponsor } from '@/hooks/useSponsors';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { PartnerAudienceDialog } from '@/components/admin/partners/PartnerAudienceDialog';
import {
  CommandButton,
  CommandIconButton,
  CommandSection,
  CommandSegmentedButton,
  CommandToolbar,
} from '@/components/management/CommandSurface';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';

type TierFilter = 'all' | 'radiant' | 'ascendant' | 'diamond' | 'partner' | 'standard';
type StatusFilter = 'all' | 'active' | 'inactive';

const TIER_BADGE: Record<string, string> = {
  radiant: 'border-white/40 bg-white/[0.06] text-white',
  ascendant: 'border-white/25 bg-white/[0.03] text-zinc-200',
  diamond: 'border-white/15 bg-transparent text-zinc-300',
  partner: 'border-white/10 bg-transparent text-zinc-400',
  standard: 'border-white/10 bg-transparent text-zinc-500',
};

const PartnersSection = () => {
  const { isSuperAdmin } = useAdminAccess();
  const qc = useQueryClient();
  const { data: sponsors = [] } = useAdminSponsors();

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sponsorModal, setSponsorModal] = useState<{ open: boolean; sponsor: Partial<Sponsor> | null; isNew: boolean }>({ open: false, sponsor: null, isNew: true });
  const [inviteModal, setInviteModal] = useState<{ open: boolean; sponsor: Sponsor | null; email: string }>({ open: false, sponsor: null, email: '' });
  const [inviteResult, setInviteResult] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [audienceSponsor, setAudienceSponsor] = useState<Sponsor | null>(null);
  const [downloadingFor, setDownloadingFor] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.sponsors() });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload, isNew }: { id?: string; payload: Partial<Sponsor>; isNew: boolean }) =>
      isNew
        ? apiClient.post<{ id?: string }>('/api/sponsors', payload)
        : apiClient.put<{ id?: string }>(`/api/sponsors/${id}`, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/sponsors/${id}`),
    onSuccess: invalidate,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.put(`/api/sponsors/${id}`, { is_active: isActive }),
    onSuccess: invalidate,
  });

  const inviteUserMutation = useMutation({
    mutationFn: (data: { email: string; sponsorId: string }) =>
      apiClient.post<{ invitationId: string; requiresPasswordSetup: boolean }>(
        `/api/admin/sponsors/${data.sponsorId}/invitations`,
        { email: data.email, role: 'owner' },
      ),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: adminKeys.sponsorApplications() });
      qc.invalidateQueries({ queryKey: adminKeys.sponsorInvitations() });
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sponsors
      .filter(s => (tierFilter === 'all' ? true : (s.tier || 'standard') === tierFilter))
      .filter(s => (statusFilter === 'all' ? true : statusFilter === 'active' ? s.is_active : !s.is_active))
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.website_url?.toLowerCase().includes(q));
  }, [sponsors, search, tierFilter, statusFilter]);

  const handleSaveSponsor = async () => {
    const s = sponsorModal.sponsor;
    if (!s?.name || !s?.website_url) {
      toast({ title: 'Validation Error', description: 'Name and Website URL are required.', variant: 'destructive' });
      return;
    }

    const payload = {
      name: s.name,
      tagline: s.tagline || null,
      description: s.description || null,
      website_url: s.website_url,
      banner_image_url: s.banner_image_url || null,
      accent_color: s.accent_color || '#8b5cf6',
      tier: s.tier || 'diamond',
      placement: s.placement || ['homepage_ticker'],
      cta_text: s.cta_text || 'Learn More',
      discount_text: s.discount_text || null,
      priority: s.priority || 0,
      is_active: s.is_active ?? true,
      logo_url: s.logo_url || null,
      gallery_images: s.gallery_images || [],
    };

    let saved: { id?: string } | undefined;
    try {
      saved = await saveMutation.mutateAsync({ id: s.id, payload, isNew: sponsorModal.isNew });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Save failed', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: `Sponsor ${sponsorModal.isNew ? 'created' : 'updated'} successfully.` });
    await auditLog.log(sponsorModal.isNew ? 'create' : 'update', 'sponsor', saved?.id || '', s.name || 'Unknown', { tier: s.tier, is_active: s.is_active });
    setSponsorModal({ open: false, sponsor: null, isNew: true });
  };

  const handleDeleteSponsor = async (sponsor: Sponsor) => {
    if (!window.confirm(`Delete ${sponsor.name}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(sponsor.id);
      await auditLog.log('delete', 'sponsor', sponsor.id, sponsor.name);
      toast({ title: 'Deleted', description: 'Sponsor removed.' });
    } catch {
      toast({ title: 'Error', description: 'Could not delete sponsor.', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (sponsor: Sponsor) => {
    try {
      await toggleActiveMutation.mutateAsync({ id: sponsor.id, isActive: !sponsor.is_active });
      await auditLog.log('update', 'sponsor', sponsor.id, sponsor.name, { is_active: !sponsor.is_active });
    } catch {
      toast({ title: 'Error', description: 'Could not update status.', variant: 'destructive' });
    }
  };

  const handleInviteUser = async () => {
    if (!inviteModal.email || !inviteModal.sponsor) return;
    try {
      const data = await inviteUserMutation.mutateAsync({ email: inviteModal.email, sponsorId: inviteModal.sponsor.id });
      setInviteResult({
        open: true,
        message: data.requiresPasswordSetup
          ? `An account setup invitation was sent to ${inviteModal.email}.`
          : `An invitation was sent to ${inviteModal.email}.`,
      });
      setInviteModal({ open: false, sponsor: null, email: '' });
    } catch {
      toast({ title: 'Invite Error', description: 'Failed to invite user', variant: 'destructive' });
    }
  };

  const handleDownloadAssets = async (sponsor: Sponsor) => {
    toast({ title: 'Preparing Download', description: 'Gathering assets from storage…', duration: 10000 });
    setDownloadingFor(sponsor.id);
    try {
      const zip = new JSZip();
      const folderName = sponsor.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const rootFolder = zip.folder(`${folderName}_campaign_kit`);
      if (!rootFolder) throw new Error('Failed to create zip folder');

      const downloadFile = async (bucket: string, filePath: string, zipFolder: InstanceType<typeof JSZip>) => {
        try {
          const { data: blob, error } = await supabase.storage.from(bucket).download(filePath);
          if (error) throw error;
          if (blob && zipFolder) zipFolder.file(filePath.split('/').pop() || filePath, blob);
        } catch (err) {
          console.error(`Failed to download ${bucket}/${filePath}:`, err);
        }
      };

      const { data: partnerFiles } = await supabase.storage.from('system.assets.partners').list(sponsor.id);
      if (partnerFiles?.length) {
        await Promise.all(partnerFiles.map(f => downloadFile('system.assets.partners', `${sponsor.id}/${f.name}`, rootFolder)));
      }

      const extended = sponsor as unknown as Record<string, unknown>;
      const manifest = [
        `# ${sponsor.name} — Campaign Kit`,
        `Generated: ${new Date().toISOString()}`,
        '',
        '## Company Info',
        `Name: ${sponsor.name}`,
        `Website: ${sponsor.website_url || 'N/A'}`,
        `Tier: ${sponsor.tier}`,
        '',
        '## Campaign Copy',
        `Tagline: ${sponsor.tagline || 'N/A'}`,
        `CTA: ${sponsor.cta_text || 'N/A'}`,
        `Discount: ${sponsor.discount_text || 'N/A'}`,
        `Description: ${sponsor.description || 'N/A'}`,
        '',
        '## Asset URLs',
        `Logo: ${sponsor.logo_url || 'N/A'}`,
        `Banner: ${sponsor.banner_image_url || 'N/A'}`,
        `Detail Deck: ${extended.detail_deck_url || 'N/A'}`,
        '',
        '## Gallery Images',
        ...(sponsor.gallery_images?.map((url, i) => `  ${i + 1}. ${url}`) || ['  None']),
      ].join('\n');

      rootFolder.file('CAMPAIGN_MANIFEST.md', manifest);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${folderName}_campaign_kit.zip`);
      toast({ title: 'Download Complete', description: 'Campaign kit downloaded with all assets and manifest.' });
    } catch (error) {
      toast({ title: 'Download Failed', description: error instanceof Error ? error.message : 'Could not generate campaign kit.', variant: 'destructive' });
    } finally {
      setDownloadingFor(null);
    }
  };

  return (
    <div className="space-y-5">
      <CommandToolbar>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search partners…"
              className="w-full rounded-none border border-white/10 bg-[#0a0a0c]/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto" data-lenis-prevent>
            {(['all', 'radiant', 'ascendant', 'diamond', 'partner', 'standard'] as TierFilter[]).map(t => (
              <CommandSegmentedButton key={t} active={tierFilter === t} onClick={() => setTierFilter(t)}>
                {t}
              </CommandSegmentedButton>
            ))}
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
              <CommandSegmentedButton key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s}
              </CommandSegmentedButton>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CommandButton
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!rows.length) { toast({ title: 'Nothing to export', variant: 'destructive' }); return; }
              const csv = [
                ['ID', 'Name', 'Tier', 'Active', 'Website', 'Priority'],
                ...rows.map(s => [s.id, s.name, s.tier, s.is_active, s.website_url, s.priority].map(csvEscape)),
              ].map(row => row.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `partners_export_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 5000);
              toast({ title: 'Export complete', description: `${rows.length} partners exported` });
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </CommandButton>
          <CommandButton size="sm" onClick={() => setSponsorModal({ open: true, isNew: true, sponsor: {} })}>
            <Plus className="h-4 w-4" /> Add Partner
          </CommandButton>
        </div>
      </CommandToolbar>

      <CommandSection className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Placements</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map(s => (
                <tr key={s.id} className={`text-zinc-300 transition-colors hover:bg-white/[0.03] ${!s.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" loading="lazy" className="h-8 w-8 border border-white/10 object-contain" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center border border-white/10 font-bold text-white" style={{ backgroundColor: s.accent_color }}>
                          {s.name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-white">{s.name}</p>
                        <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-mono text-[10px] text-zinc-600 transition-colors hover:text-rose-300">
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          {(() => { try { return new URL(s.website_url).hostname; } catch { return s.website_url || '—'; } })()}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${TIER_BADGE[(s.tier || 'standard')]}`}>
                      {s.tier || 'standard'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(s)}
                      className={`group flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        s.is_active
                          ? 'border-white/25 text-white hover:border-rose-500/50'
                          : 'border-white/10 text-zinc-500 hover:border-white/25'
                      }`}
                      title="Toggle activation"
                    >
                      <span className={`h-1.5 w-1.5 ${s.is_active ? 'bg-rose-500' : 'bg-zinc-700 group-hover:bg-zinc-500'}`} />
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{s.priority}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500">{(s.placement || []).length} zones</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {isSuperAdmin && (
                        <CommandIconButton label="Audience demographics" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setAudienceSponsor(s)}>
                          <Globe className="h-3.5 w-3.5" />
                        </CommandIconButton>
                      )}
                      <CommandIconButton label="Download campaign kit" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" disabled={downloadingFor === s.id} onClick={() => handleDownloadAssets(s)}>
                        {downloadingFor === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      </CommandIconButton>
                      <CommandIconButton label="Invite account owner" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setInviteModal({ open: true, sponsor: s, email: '' })}>
                        <User className="h-3.5 w-3.5" />
                      </CommandIconButton>
                      <CommandIconButton label="Edit partner" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => setSponsorModal({ open: true, isNew: false, sponsor: s })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </CommandIconButton>
                      <CommandIconButton label="Delete partner" variant="danger" className="h-8 w-8" onClick={() => handleDeleteSponsor(s)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </CommandIconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-14 text-center text-zinc-600">No partners match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CommandSection>

      {/* Audience */}
      {isSuperAdmin && (
        <PartnerAudienceDialog
          sponsor={audienceSponsor}
          open={audienceSponsor !== null}
          onOpenChange={open => { if (!open) setAudienceSponsor(null); }}
        />
      )}

      {/* Edit / create dialog */}
      <Dialog open={sponsorModal.open} onOpenChange={open => setSponsorModal({ ...sponsorModal, open })}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto overscroll-contain rounded-none border-white/10 bg-[#0a0a0c]" data-lenis-prevent>
          <DialogHeader>
            <DialogTitle>{sponsorModal.isNew ? 'New Partner' : 'Edit Partner'}</DialogTitle>
          </DialogHeader>
          {sponsorModal.sponsor && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <input value={sponsorModal.sponsor.name || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, name: e.target.value } })} className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
                </Field>
                <Field label="Website">
                  <input value={sponsorModal.sponsor.website_url || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, website_url: e.target.value } })} className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
                </Field>
              </div>

              <Field label="Tier">
                <select
                  className="w-full rounded-none border border-white/10 bg-black/60 p-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  value={sponsorModal.sponsor.tier || 'standard'}
                  onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, tier: e.target.value as Sponsor['tier'] } })}
                >
                  <option value="diamond">Diamond</option>
                  <option value="ascendant">Ascendant</option>
                  <option value="radiant">Radiant</option>
                </select>
              </Field>

              {!sponsorModal.isNew && (
                <>
                  <Field label="Ad Placements">
                    <div className="grid grid-cols-2 gap-2">
                      {['homepage_ticker', 'sidebar_partner', 'wide_partner', 'card_badge', 'partner_logo', 'partner_showcase'].map(placement => (
                        <label key={placement} className="flex cursor-pointer items-center gap-2 border border-white/10 bg-black/40 p-2 transition-colors hover:border-white/25">
                          <input
                            type="checkbox"
                            checked={!!sponsorModal.sponsor?.placement?.includes(placement)}
                            onChange={e => {
                              const current = sponsorModal.sponsor?.placement || [];
                              const updated = e.target.checked ? [...current, placement] : current.filter(p => p !== placement);
                              setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, placement: updated } });
                            }}
                            className="rounded-none border-white/20 bg-black accent-[#f43f5e]"
                          />
                          <span className="text-sm capitalize text-zinc-300">{placement.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Banner URL">
                    <input value={sponsorModal.sponsor.banner_image_url || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, banner_image_url: e.target.value } })} className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Color">
                      <div className="flex gap-2">
                        <input type="color" value={sponsorModal.sponsor.accent_color || '#000000'} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, accent_color: e.target.value } })} className="h-9 w-9 cursor-pointer border border-white/10 bg-transparent" />
                        <input value={sponsorModal.sponsor.accent_color || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, accent_color: e.target.value } })} className="w-full flex-1 rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
                      </div>
                    </Field>
                    <Field label="Priority">
                      <input type="number" value={sponsorModal.sponsor.priority || 0} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, priority: parseInt(e.target.value) } })} className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
                    </Field>
                  </div>
                  <Field label="Tagline">
                    <input value={sponsorModal.sponsor.tagline || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, tagline: e.target.value } })} className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
                  </Field>
                  <Field label="Description">
                    <input value={sponsorModal.sponsor.description || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, description: e.target.value } })} className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
                  </Field>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={() => setSponsorModal({ open: false, sponsor: null, isNew: true })}>Cancel</CommandButton>
            <CommandButton size="sm" onClick={handleSaveSponsor}>Save Partner</CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteModal.open} onOpenChange={open => setInviteModal({ ...inviteModal, open })}>
        <DialogContent className="max-w-md rounded-none border-white/10 bg-[#0a0a0c]">
          <DialogHeader>
            <DialogTitle>Invite Account Owner</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-zinc-400">Grant access to <strong className="text-white">{inviteModal.sponsor?.name}</strong> dashboard.</p>
          <div className="py-2">
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Email Address</p>
            <input
              value={inviteModal.email}
              onChange={e => setInviteModal({ ...inviteModal, email: e.target.value })}
              placeholder="partner@company.com"
              className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              NOTE — no account receives an invite email; an existing account gets access immediately.
            </p>
          </div>
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={() => setInviteModal({ open: false, sponsor: null, email: '' })}>Cancel</CommandButton>
            <CommandButton size="sm" disabled={inviteUserMutation.isPending} onClick={handleInviteUser}>
              {inviteUserMutation.isPending ? 'Sending…' : 'Send Invite'}
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite result dialog */}
      <Dialog open={inviteResult.open} onOpenChange={open => setInviteResult({ ...inviteResult, open })}>
        <DialogContent className="max-w-md rounded-none border-white/10 bg-[#0a0a0c]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-rose-400" /> Invitation Sent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-zinc-300">{inviteResult.message}</p>
            <p className="border-l-2 border-rose-500 pl-3 font-mono text-xs uppercase tracking-wider text-zinc-400">
              CAUTION — access activates only after the recipient accepts the invitation.
            </p>
          </div>
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={() => setInviteResult({ ...inviteResult, open: false })}>Done</CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      {children}
    </div>
  );
}

export default PartnersSection;
