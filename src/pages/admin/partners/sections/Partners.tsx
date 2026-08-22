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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const TIER_BADGE: Record<string, string> = {
  radiant: 'border-amber-500/30 bg-amber-500/5 text-amber-500',
  ascendant: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500',
  diamond: 'border-sky-500/30 bg-sky-500/5 text-sky-400',
  partner: 'border-white/10 bg-white/5 text-zinc-400',
  standard: 'border-white/10 bg-white/5 text-zinc-400',
};

interface InviteResultState {
  open: boolean;
  message: string;
}

const PartnersSection = () => {
  const { isSuperAdmin } = useAdminAccess();
  const qc = useQueryClient();
  const { data: sponsors = [] } = useAdminSponsors();

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sponsorModal, setSponsorModal] = useState<{ open: boolean; sponsor: Partial<Sponsor> | null; isNew: boolean }>({ open: false, sponsor: null, isNew: true });
  const [inviteModal, setInviteModal] = useState<{ open: boolean; sponsor: Sponsor | null; email: string }>({ open: false, sponsor: null, email: '' });
  const [inviteResult, setInviteResult] = useState<InviteResultState>({ open: false, message: '' });
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-60">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search partners…"
              className="w-full rounded-lg border border-zinc-800 bg-black/40 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-zinc-600 focus:border-rose-500/40 focus:outline-none"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto" data-lenis-prevent>
            {(['all', 'radiant', 'ascendant', 'diamond', 'partner', 'standard'] as TierFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                  tierFilter === t ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                  statusFilter === s ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-800 text-zinc-400 hover:text-white"
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
            Export CSV
          </Button>
          <Button size="sm" className="bg-rose-500 hover:bg-rose-600" onClick={() => setSponsorModal({ open: true, isNew: true, sponsor: {} })}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Partner
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0c]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500">
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
                <tr key={s.id} className={`text-zinc-300 transition hover:bg-white/[0.03] ${!s.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" loading="lazy" className="h-8 w-8 rounded border border-zinc-800 object-contain" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded font-bold text-white" style={{ backgroundColor: s.accent_color }}>
                          {s.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{s.name}</p>
                        <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-rose-400">
                          <ExternalLink className="h-2.5 w-2.5" />
                          {(() => { try { return new URL(s.website_url).hostname; } catch { return s.website_url || '—'; } })()}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${TIER_BADGE[(s.tier || 'standard')]}`}>
                      {s.tier || 'standard'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(s)}
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase transition hover:brightness-125 ${
                        s.is_active ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-red-500/25 bg-red-500/10 text-red-400'
                      }`}
                      title="Toggle activation"
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{s.priority}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500">{(s.placement || []).length} zones</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {isSuperAdmin && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-cyan-400" title="Audience demographics" onClick={() => setAudienceSponsor(s)}>
                          <Globe className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-white" title="Download campaign kit" disabled={downloadingFor === s.id} onClick={() => handleDownloadAssets(s)}>
                        {downloadingFor === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-white" title="Invite account owner" onClick={() => setInviteModal({ open: true, sponsor: s, email: '' })}>
                        <User className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-white" title="Edit partner" onClick={() => setSponsorModal({ open: true, isNew: false, sponsor: s })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-red-500" title="Delete partner" onClick={() => handleDeleteSponsor(s)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
      </div>

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
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto overscroll-contain border-zinc-800 bg-[#0a0a0c]" data-lenis-prevent>
          <DialogHeader>
            <DialogTitle>{sponsorModal.isNew ? 'New Partner' : 'Edit Partner'}</DialogTitle>
          </DialogHeader>
          {sponsorModal.sponsor && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs uppercase text-zinc-500">Name</label>
                  <Input value={sponsorModal.sponsor.name || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, name: e.target.value } })} className="bg-zinc-900" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase text-zinc-500">Website</label>
                  <Input value={sponsorModal.sponsor.website_url || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, website_url: e.target.value } })} className="bg-zinc-900" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase text-zinc-500">Tier</label>
                <select
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-sm text-white"
                  value={sponsorModal.sponsor.tier || 'standard'}
                  onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, tier: e.target.value as Sponsor['tier'] } })}
                >
                  <option value="diamond">Diamond</option>
                  <option value="ascendant">Ascendant</option>
                  <option value="radiant">Radiant</option>
                </select>
              </div>

              {!sponsorModal.isNew && (
                <>
                  <div>
                    <label className="mb-2 block text-xs uppercase text-zinc-500">Ad Placements</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['homepage_ticker', 'sidebar_partner', 'wide_partner', 'card_badge', 'partner_logo', 'partner_showcase'].map(placement => (
                        <label key={placement} className="flex cursor-pointer items-center gap-2 rounded border border-zinc-800 bg-zinc-900 p-2 hover:border-zinc-700">
                          <input
                            type="checkbox"
                            checked={!!sponsorModal.sponsor?.placement?.includes(placement)}
                            onChange={e => {
                              const current = sponsorModal.sponsor?.placement || [];
                              const updated = e.target.checked ? [...current, placement] : current.filter(p => p !== placement);
                              setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, placement: updated } });
                            }}
                            className="rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-rose-500"
                          />
                          <span className="text-sm capitalize text-zinc-300">{placement.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase text-zinc-500">Banner URL</label>
                    <Input value={sponsorModal.sponsor.banner_image_url || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, banner_image_url: e.target.value } })} className="bg-zinc-900" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs uppercase text-zinc-500">Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={sponsorModal.sponsor.accent_color || '#000000'} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, accent_color: e.target.value } })} className="h-9 w-9 cursor-pointer border-0 bg-transparent" />
                        <Input value={sponsorModal.sponsor.accent_color || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, accent_color: e.target.value } })} className="flex-1 bg-zinc-900" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase text-zinc-500">Priority</label>
                      <Input type="number" value={sponsorModal.sponsor.priority || 0} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, priority: parseInt(e.target.value) } })} className="bg-zinc-900" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase text-zinc-500">Tagline</label>
                    <Input value={sponsorModal.sponsor.tagline || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, tagline: e.target.value } })} className="bg-zinc-900" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase text-zinc-500">Description</label>
                    <Input value={sponsorModal.sponsor.description || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, description: e.target.value } })} className="bg-zinc-900" />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSponsorModal({ open: false, sponsor: null, isNew: true })}>Cancel</Button>
            <Button className="bg-rose-500 hover:bg-rose-600" onClick={handleSaveSponsor}>Save Partner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteModal.open} onOpenChange={open => setInviteModal({ ...inviteModal, open })}>
        <DialogContent className="max-w-md border-zinc-800 bg-[#0a0a0c]">
          <DialogHeader>
            <DialogTitle>Invite Account Owner</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-zinc-500">Grant access to <strong className="text-zinc-300">{inviteModal.sponsor?.name}</strong> dashboard.</p>
          <div className="py-2">
            <label className="mb-1 block text-xs uppercase text-zinc-500">Email Address</label>
            <Input
              value={inviteModal.email}
              onChange={e => setInviteModal({ ...inviteModal, email: e.target.value })}
              className="bg-zinc-900"
              placeholder="partner@company.com"
            />
            <p className="mt-2 text-xs text-zinc-500">
              If they don't have an account they'll receive an invite email; if they do, access is granted immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteModal({ open: false, sponsor: null, email: '' })}>Cancel</Button>
            <Button className="bg-rose-500 hover:bg-rose-600" onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
              {inviteUserMutation.isPending ? 'Sending…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite result dialog */}
      <Dialog open={inviteResult.open} onOpenChange={open => setInviteResult({ ...inviteResult, open })}>
        <DialogContent className="max-w-md border-zinc-800 bg-[#0a0a0c]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" /> Invitation Sent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-zinc-300">{inviteResult.message}</p>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs font-medium leading-relaxed text-emerald-400">
                Access will be granted only after the recipient accepts the email invitation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteResult({ ...inviteResult, open: false })}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnersSection;
