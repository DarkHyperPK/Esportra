import React, { useState } from 'react';
import JSZip from 'jszip';
import { auditLog } from '@/lib/auditLog';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Megaphone, Plus, CheckCircle,
    XCircle, User, Building2, Globe, Mail,
    Phone, Trash2, Edit,
    FileText, ExternalLink, Download, Loader2, ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ApiError, apiClient } from '@/lib/apiClient';
import { csvEscape } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { JackButton } from '@/components/ui/JackButton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useAdminSponsors, useAdminSponsorApplications, adminKeys } from '@/hooks/useAdminQueries';
import { Sponsor, useSponsorStats } from '@/hooks/useSponsors';
import { PartnerApplication } from '@/hooks/usePartnerApplication';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { PartnerAudienceDialog } from '@/components/admin/partners/PartnerAudienceDialog';

// Extended type for Application with ID and metadata
interface Application extends PartnerApplication {
    id: string;
    created_at: string;
    status: 'pending' | 'reviewed' | 'approved' | 'rejected';
    notes?: string;
}

interface PartnerInvitation {
    id: string;
    sponsorId: string;
    sponsorName: string;
    email: string;
    role: string;
    status: 'pending' | 'accepted' | 'revoked' | 'delivery_failed' | 'expired';
    createdAt: string;
    expiresAt: string;
    deliveredAt?: string;
    acceptedAt?: string;
}

const SponsorCard = ({
    sponsor,
    onEdit,
    onInvite,
    onDelete,
    onToggleActive,
    onDownload,
    onAudience,
}: {
    sponsor: Sponsor;
    onEdit: (s: Sponsor) => void;
    onInvite: (s: Sponsor) => void;
    onDelete: (id: string) => void;
    onToggleActive: (s: Sponsor) => void;
    onDownload: (s: Sponsor) => void;
    onAudience?: (s: Sponsor) => void;
}) => {
    const { data: stats } = useSponsorStats(sponsor.id);

    return (
        <div className={`group relative bg-[#0a0a0c] border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${sponsor.is_active ? 'border-zinc-800 hover:border-rose-500/50' : 'border-zinc-800/50 opacity-60 hover:opacity-100'}`}>
            {/* Status Banner */}
            <div className={`absolute top-0 left-0 w-full h-1 ${sponsor.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />

            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    {sponsor.logo_url ? (
                        <img src={sponsor.logo_url} loading="lazy" className="w-12 h-12 object-contain" />
                    ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: sponsor.accent_color }}>
                            {sponsor.name[0]}
                        </div>
                    )}
                    <div className="flex gap-1">
                        {onAudience && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-cyan-400" onClick={() => onAudience(sponsor)} title="Audience demographics">
                                <Globe className="w-4 h-4" />
                            </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => onInvite(sponsor)} title="Invite User">
                            <User className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => onEdit(sponsor)}>
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => onDelete(sponsor.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => onDownload(sponsor)} title="Download Assets">
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{sponsor.name}</h3>
                <a href={sponsor.website_url} target="_blank" className="text-xs text-zinc-500 hover:text-rose-500 flex items-center gap-1 mb-4">
                    <ExternalLink className="w-3 h-3" /> {(() => { try { return new URL(sponsor.website_url).hostname; } catch { return sponsor.website_url || 'N/A'; } })()}
                </a>

                {/* Metrics Section */}
                <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-white/5 mb-4 bg-white/5 rounded-lg px-2">
                    <div className="text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Views</p>
                        <p className="text-sm font-bold text-white">{stats?.impressions || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Clicks</p>
                        <p className="text-sm font-bold text-white">{stats?.clicks || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">CTR</p>
                        <p className="text-sm font-bold text-emerald-400">{stats?.ctr || '0%'}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    <Badge
                        variant="outline"
                        className={`capitalize ${sponsor.tier === 'radiant' ? 'border-amber-500/30 text-amber-500 bg-amber-500/5' :
                            sponsor.tier === 'ascendant' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' :
                                'border-zinc-500/30 text-zinc-500 bg-white/5'
                            }`}
                    >
                        {sponsor.tier || 'standard'}
                    </Badge>
                    <Badge variant="outline" className={`border-white/10 ${sponsor.is_active ? 'text-emerald-400 bg-emerald-500/5' : 'text-red-400 bg-red-500/5'}`}>
                        {sponsor.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-xs font-mono text-zinc-500">PRIORITY: {sponsor.priority}</span>
                    <Button
                        size="sm"
                        variant="outline"
                        className={`h-7 text-xs border-white/10 ${sponsor.is_active ? 'hover:bg-red-500/20 hover:text-red-400' : 'hover:bg-emerald-500/20 hover:text-emerald-400'}`}
                        onClick={() => onToggleActive(sponsor)}
                    >
                        {sponsor.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const SponsorManagement = () => {
    const { isSuperAdmin } = useAdminAccess();
    const [activeTab, setActiveTab] = useState<'applications' | 'sponsors' | 'invitations'>('applications');
    const queryClient = useQueryClient();
    const { data: applications = [] } = useAdminSponsorApplications();
    const { data: sponsors = [] } = useAdminSponsors();
    const {
        data: invitations = [],
        isLoading: invitationsLoading,
        isError: invitationsError,
        error: invitationsQueryError,
        refetch: refetchInvitations,
    } = useQuery({
        queryKey: adminKeys.sponsorInvitations(),
        queryFn: () => apiClient.get<PartnerInvitation[]>('/api/admin/sponsor-invitations'),
    });

    // Modals
    const [appModal, setAppModal] = useState<{ open: boolean; app: Application | null }>({ open: false, app: null });
    const [sponsorModal, setSponsorModal] = useState<{ open: boolean; sponsor: Partial<Sponsor> | null; isNew: boolean }>({ open: false, sponsor: null, isNew: true });
    const [inviteModal, setInviteModal] = useState<{ open: boolean; sponsor: Sponsor | null; email: string }>({ open: false, sponsor: null, email: '' });
    const [audienceSponsor, setAudienceSponsor] = useState<Sponsor | null>(null);

    // Stats derived from query data
    const stats = {
        pendingApps: applications.filter((a: any) => a.status === 'pending').length,
        activeSponsors: sponsors.filter((s: any) => s.is_active).length,
        totalRevenue: 0
    };

    // Mutations
    const updateAppStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: Application['status'] }) =>
            apiClient.patch(`/api/sponsors/applications/${id}`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsorApplications() });
        },
    });

    const saveSponsorMutation = useMutation({
        mutationFn: ({ id, payload, isNew }: { id?: string; payload: any; isNew: boolean }) =>
            isNew ? apiClient.post<any>('/api/sponsors', payload) : apiClient.put<any>(`/api/sponsors/${id}`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsors() });
        },
    });

    const deleteSponsorMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/sponsors/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsors() });
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            apiClient.put(`/api/sponsors/${id}`, { is_active: isActive }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsors() });
        },
    });

    const inviteUserMutation = useMutation({
        mutationFn: (data: { email: string; sponsorId: string }) =>
            apiClient.post<{ invitationId: string; requiresPasswordSetup: boolean }>(
                `/api/admin/sponsors/${data.sponsorId}/invitations`,
                { email: data.email, role: 'owner' },
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsors() });
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsorApplications() });
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsorInvitations() });
        },
    });

    const resendInvitationMutation = useMutation({
        mutationFn: (invitationId: string) =>
            apiClient.post(`/api/admin/sponsor-invitations/${invitationId}/resend`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.sponsorInvitations() }),
    });

    const revokeInvitationMutation = useMutation({
        mutationFn: (invitationId: string) =>
            apiClient.post(`/api/admin/sponsor-invitations/${invitationId}/revoke`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.sponsorInvitations() }),
    });

    const approveAppMutation = useMutation({
        mutationFn: (application: Application) =>
            apiClient.post<{ success: boolean; sponsorId: string; requiresPasswordSetup: boolean; companyName: string; contactEmail: string }>(
                `/api/sponsors/applications/${application.id}/approve`,
                { invitationEmail: application.contact_email, tier: application.partnership_tier },
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsors() });
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsorApplications() });
            queryClient.invalidateQueries({ queryKey: adminKeys.sponsorInvitations() });
        },
    });

    /* ─── Application Logic ─── */

    const handleUpdateAppStatus = async (id: string, status: Application['status']) => {
        try {
            await updateAppStatusMutation.mutateAsync({ id, status });
        } catch {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
            return;
        }

        const app = applications.find(a => a.id === id);
        await auditLog.log(status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'update', 'sponsor', id, app?.company_name || 'Unknown', { status });
        toast({ title: 'Status Updated', description: `Application marked as ${status}` });
        if (appModal.open) setAppModal({ open: false, app: null });
    };

    const handleApproveApplication = async (app: Application) => {
        try {
            const result = await approveAppMutation.mutateAsync(app);
            setAppModal({ open: false, app: null });

            const message = result.requiresPasswordSetup
                ? `Partner approved! An account setup invitation was sent to ${result.contactEmail}.`
                : `Partner approved! An invitation was sent to ${result.contactEmail}.`;

            toast({ title: 'Partner Approved', description: message });
            await auditLog.log('approve', 'sponsor', result.sponsorId, result.companyName, {
                applicationId: app.id,
                requiresPasswordSetup: result.requiresPasswordSetup,
            });
        } catch {
            toast({ title: 'Approval Failed', description: 'Could not approve application.', variant: 'destructive' });
        }
    };

    /* ─── Sponsor Logic (Main CRM) ─── */

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
            gallery_images: s.gallery_images || []
        };

        let sponsorData;

        try {
            sponsorData = await saveSponsorMutation.mutateAsync({ id: s.id, payload, isNew: sponsorModal.isNew });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
            return;
        }

        toast({ title: 'Success', description: `Sponsor ${sponsorModal.isNew ? 'created' : 'updated'} successfully.` });

        await auditLog.log(sponsorModal.isNew ? 'create' : 'update', 'sponsor', sponsorData?.id || '', s.name || 'Unknown', { tier: s.tier, is_active: s.is_active });
        setSponsorModal({ open: false, sponsor: null, isNew: true });
    };

    const handleDeleteSponsor = async (id: string) => {
        if (!confirm('Are you sure you want to delete this sponsor?')) return;
        const sponsor = sponsors.find(s => s.id === id);
        await deleteSponsorMutation.mutateAsync(id);
        await auditLog.log('delete', 'sponsor', id, sponsor?.name || 'Unknown');
        toast({ title: 'Deleted', description: 'Sponsor removed.' });
    };

    const toggleSponsorActive = async (sponsor: Sponsor) => {
        await toggleActiveMutation.mutateAsync({ id: sponsor.id, isActive: !sponsor.is_active });
        await auditLog.log('update', 'sponsor', sponsor.id, sponsor.name, { is_active: !sponsor.is_active, toggled: true });
    };

    const [inviteResult, setInviteResult] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

    const handleInviteUser = async () => {
        if (!inviteModal.email || !inviteModal.sponsor) return;
        try {
            const data = await inviteUserMutation.mutateAsync({
                email: inviteModal.email,
                sponsorId: inviteModal.sponsor.id,
            });

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
        toast({ title: 'Preparing Download', description: 'Gathering assets from storage...', duration: 10000 });

        try {
            const zip = new JSZip();
            const folderName = sponsor.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const rootFolder = zip.folder(`${folderName}_campaign_kit`);
            if (!rootFolder) throw new Error('Failed to create zip folder');

            const downloadFile = async (bucket: string, filePath: string, zipFolder: ReturnType<typeof zip.folder>) => {
                try {
                    const { data: blob, error } = await supabase.storage.from(bucket).download(filePath);
                    if (error) throw error;
                    if (blob && zipFolder) {
                        const fileName = filePath.split('/').pop() || filePath;
                        zipFolder.file(fileName, blob);
                    }
                } catch (err) {
                    console.error(`Failed to download ${bucket}/${filePath}:`, err);
                }
            };

            // Download all files from system.assets.partners
            const { data: partnerFiles } = await supabase.storage.from('system.assets.partners').list(sponsor.id);
            if (partnerFiles?.length) {
                await Promise.all(partnerFiles.map(f => downloadFile('system.assets.partners', `${sponsor.id}/${f.name}`, rootFolder)));
            }

            // Generate campaign manifest with all copy + URLs
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
                `Detail Deck: ${(sponsor as Record<string, unknown>).detail_deck_url || 'N/A'}`,
                '',
                '## Gallery Images',
                ...(sponsor.gallery_images?.map((url, i) => `  ${i + 1}. ${url}`) || ['  None']),
            ].join('\n');

            rootFolder.file('CAMPAIGN_MANIFEST.md', manifest);

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${folderName}_campaign_kit.zip`);

            toast({ title: 'Download Complete', description: 'Campaign kit downloaded with all assets and manifest.' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Could not generate campaign kit.';
            toast({ title: 'Download Failed', description: message, variant: 'destructive' });
        }
    };


    /* ─── UI Helpers ─── */

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            reviewed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
        };
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${styles[status] || styles.pending}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-rose-500" />
                        Sponsor CRM
                    </h1>
                    <p className="text-zinc-500 mt-1">Manage applications, partnerships, and assets.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-800 text-zinc-400 hover:text-white"
                        onClick={() => window.location.href = '/admin/tools/sponsor-ad-manager'}
                    >
                        Ad Placements
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-800 text-zinc-400 hover:text-white"
                        disabled={activeTab === 'invitations'}
                        onClick={() => {
                            const data = activeTab === 'sponsors' ? sponsors : applications;
                            if (!data.length) { toast({ title: 'Nothing to export', description: 'No data available.', variant: 'destructive' }); return; }
                            const csv = activeTab === 'sponsors'
                                ? [
                                    ['ID', 'Name', 'Tier', 'Active', 'Website', 'Priority', 'Created'],
                                    ...sponsors.map((s: any) => [s.id, s.name, s.tier, s.is_active, s.website_url, s.priority, s.created_at ? new Date(s.created_at).toLocaleDateString() : ''].map(csvEscape))
                                  ].map(row => row.join(',')).join('\n')
                                : [
                                    ['ID', 'Company', 'Website', 'Status', 'Submitted'],
                                    ...applications.map((a: any) => [a.id, a.company_name, a.company_website, a.status, a.created_at ? new Date(a.created_at).toLocaleDateString() : ''].map(csvEscape))
                                  ].map(row => row.join(',')).join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(url), 5000);
                            toast({ title: 'Export complete', description: `${activeTab === 'sponsors' ? 'Sponsors' : 'Applications'} CSV downloaded` });
                        }}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                    <div className="flex items-center bg-[#0a0a0c] border border-zinc-800 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('applications')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'applications' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                        >
                            Applications
                            {stats.pendingApps > 0 && <span className="ml-2 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">{stats.pendingApps}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('sponsors')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'sponsors' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                        >
                            Active Partners
                        </button>
                        <button
                            onClick={() => setActiveTab('invitations')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'invitations' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                        >
                            Invitations
                        </button>
                    </div>
                    {activeTab === 'sponsors' && (
                        <Button onClick={() => setSponsorModal({ open: true, isNew: true, sponsor: {} })} className="bg-rose-500 hover:bg-rose-600">
                            <Plus className="w-4 h-4 mr-2" /> Add Partner
                        </Button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {activeTab === 'applications' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Kanban / List for Applications */}
                        <div className="grid grid-cols-1 gap-4">
                            {applications.length === 0 ? (
                                <div className="text-center py-20 bg-[#0a0a0c] border border-white/5 rounded-2xl">
                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-zinc-600" />
                                    </div>
                                    <h3 className="text-white font-bold text-lg">No Applications Yet</h3>
                                    <p className="text-zinc-500">Wait for brands to submit via the Partners page.</p>
                                </div>
                            ) : (
                                applications.map((app) => (
                                    <div key={app.id} className="bg-[#0a0a0c] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors group">
                                        <div className="flex flex-col lg:flex-row justify-between gap-6">
                                            {/* Company Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-bold text-white">{app.company_name}</h3>
                                                    {getStatusBadge(app.status || 'pending')}
                                                    <span className="text-xs text-zinc-500 font-mono">{new Date(app.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-6 text-sm text-zinc-400 mb-4">
                                                    <a href={app.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-rose-500 transition-colors">
                                                        <Globe className="w-4 h-4" /> {app.company_website}
                                                    </a>
                                                    <span className="flex items-center gap-1.5">
                                                        <Building2 className="w-4 h-4" /> {app.industry} ({app.company_size})
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-zinc-900/50 rounded-lg text-sm text-zinc-300 font-light border border-white/5">
                                                    <span className="text-zinc-500 font-medium uppercase text-xs block mb-1">Message</span>
                                                    "{app.message || 'No message provided.'}"
                                                </div>
                                            </div>

                                            {/* Contact & Deal Info */}
                                            <div className="w-full lg:w-1/3 border-l border-white/5 lg:pl-6 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                                                        {app.contact_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-white text-sm font-medium">{app.contact_name}</p>
                                                        <p className="text-zinc-500 text-xs">{app.contact_title}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-zinc-400 flex items-center gap-2"><Mail className="w-3 h-3" /> {app.contact_email}</p>
                                                    {app.contact_phone && <p className="text-xs text-zinc-400 flex items-center gap-2"><Phone className="w-3 h-3" /> {app.contact_phone}</p>}
                                                </div>

                                                <div className="pt-3 border-t border-white/5 flex gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs uppercase ${app.partnership_tier === 'radiant' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                                                            app.partnership_tier === 'ascendant' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                                                                'bg-zinc-500/10 text-zinc-500 border-white/10'
                                                            }`}
                                                    >
                                                        {app.partnership_tier} Tier
                                                    </Badge>
                                                    {app.budget_range && <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                                        {app.budget_range}
                                                    </Badge>}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex lg:flex-col gap-2 justify-center">
                                                <Button
                                                    size="sm"
                                                    className="bg-zinc-800 hover:bg-zinc-700 text-white"
                                                    onClick={() => setAppModal({ open: true, app })}
                                                >
                                                    View Details
                                                </Button>
                                                {app.status !== 'approved' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={() => handleApproveApplication(app)}
                                                        disabled={approveAppMutation.isPending}
                                                    >
                                                        {approveAppMutation.isPending ? 'Approving...' : 'Approve'}
                                                    </Button>
                                                )}
                                                {app.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <Button size="icon" variant="ghost" onClick={() => handleUpdateAppStatus(app.id, 'reviewed')} title="Mark Reviewed">
                                                            <CheckCircle className="w-4 h-4 text-zinc-500 hover:text-blue-500" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" onClick={() => handleUpdateAppStatus(app.id, 'rejected')} title="Reject">
                                                            <XCircle className="w-4 h-4 text-zinc-500 hover:text-red-500" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                ) : activeTab === 'sponsors' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {/* Active Sponsors Grid */}
                        {sponsors.map((sponsor) => (
                            <SponsorCard
                                key={sponsor.id}
                                sponsor={sponsor}
                                onEdit={(s) => setSponsorModal({ open: true, isNew: false, sponsor: s })}
                                onInvite={(s) => setInviteModal({ open: true, sponsor: s, email: '' })}
                                onDelete={handleDeleteSponsor}
                                onToggleActive={toggleSponsorActive}
                                onDownload={handleDownloadAssets}
                                onAudience={isSuperAdmin ? setAudienceSponsor : undefined}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0c]"
                    >
                        {invitationsLoading ? (
                            <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading invitations</div>
                        ) : invitationsError ? (
                            <div className="py-16 text-center">
                                <p className="text-sm text-red-400">Invitation history could not be loaded.</p>
                                {invitationsQueryError instanceof ApiError && (
                                    <p className="mt-2 text-xs text-zinc-500">
                                        HTTP {invitationsQueryError.status}
                                    </p>
                                )}
                                <Button className="mt-4" variant="outline" onClick={() => void refetchInvitations()}>
                                    Retry
                                </Button>
                            </div>
                        ) : invitations.length === 0 ? (
                            <div className="py-16 text-center text-zinc-500">No partner invitations have been issued.</div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {invitations.map((invitation) => (
                                    <div key={invitation.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1.4fr_0.7fr_1fr_auto] lg:items-center">
                                        <div>
                                            <p className="font-semibold text-white">{invitation.sponsorName}</p>
                                            <p className="text-xs uppercase tracking-wider text-zinc-600">{invitation.role}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-300">{invitation.email}</p>
                                            <p className="text-xs text-zinc-600">Issued {new Date(invitation.createdAt).toLocaleString()}</p>
                                        </div>
                                        <Badge variant="outline" className="w-fit capitalize border-white/10 text-zinc-300">
                                            {invitation.status.replace('_', ' ')}
                                        </Badge>
                                        <div className="text-xs text-zinc-500">
                                            {invitation.status === 'accepted' && invitation.acceptedAt
                                                ? `Accepted ${new Date(invitation.acceptedAt).toLocaleString()}`
                                                : `Expires ${new Date(invitation.expiresAt).toLocaleString()}`}
                                        </div>
                                        <div className="flex gap-2">
                                            {invitation.status !== 'accepted' && (
                                                <Button size="sm" variant="outline" disabled={resendInvitationMutation.isPending} onClick={() => resendInvitationMutation.mutate(invitation.id)}>
                                                    Resend
                                                </Button>
                                            )}
                                            {['pending', 'delivery_failed'].includes(invitation.status) && (
                                                <Button size="sm" variant="ghost" className="text-red-400" disabled={revokeInvitationMutation.isPending} onClick={() => revokeInvitationMutation.mutate(invitation.id)}>
                                                    Revoke
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {isSuperAdmin && (
                <PartnerAudienceDialog
                    sponsor={audienceSponsor}
                    open={audienceSponsor !== null}
                    onOpenChange={(open) => { if (!open) setAudienceSponsor(null); }}
                />
            )}

            {/* Application Details Modal */}
            <Dialog open={appModal.open} onOpenChange={(open) => setAppModal({ ...appModal, open })}>
                <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Application Details</DialogTitle>
                        <DialogDescription>Submitted on {appModal.app?.created_at && new Date(appModal.app.created_at).toLocaleString()}</DialogDescription>
                    </DialogHeader>
                    {appModal.app && (
                        <div className="grid grid-cols-2 gap-8 py-4">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Company Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Name</span>
                                            <span className="text-white">{appModal.app.company_name}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Website</span>
                                            <a href={appModal.app.company_website} target="_blank" className="text-rose-400 hover:underline">{appModal.app.company_website}</a>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Industry</span>
                                            <span className="text-white">{appModal.app.industry}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Size</span>
                                            <span className="text-white capitalize">{appModal.app.company_size}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Proposal</h4>
                                    <div className="p-3 bg-zinc-900 rounded-lg text-zinc-300 text-sm italic">
                                        "{appModal.app.message}"
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Contact Point</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Name</span>
                                            <span className="text-white">{appModal.app.contact_name}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Title</span>
                                            <span className="text-white">{appModal.app.contact_title}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Email</span>
                                            <span className="text-white">{appModal.app.contact_email}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Phone</span>
                                            <span className="text-white">{appModal.app.contact_phone || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Metadata</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Source</span>
                                            <span className="text-white">{appModal.app.how_heard}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Tier</span>
                                            <span className={`capitalize font-bold ${appModal.app.partnership_tier === 'radiant' ? 'text-amber-500' :
                                                appModal.app.partnership_tier === 'ascendant' ? 'text-emerald-500' :
                                                    'text-zinc-500'
                                                }`}>
                                                {appModal.app.partnership_tier}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                            <span className="text-zinc-500">Budget</span>
                                            <span className="text-white">{appModal.app.budget_range?.replace(/_/g, ' ') || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                {appModal.app.partnership_goals && appModal.app.partnership_goals.length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Partnership Goals</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {appModal.app.partnership_goals.map((goal: string) => (
                                                <Badge key={goal} variant="outline" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/30 capitalize">
                                                    {goal.replace(/_/g, ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAppModal({ open: false, app: null })}>Close</Button>
                        {appModal.app?.status !== 'approved' && (
                            <>
                                <Button variant="outline" className="border-red-800 text-red-400 hover:bg-red-900/20" onClick={() => appModal.app && handleUpdateAppStatus(appModal.app.id, 'rejected')}>Reject</Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={approveAppMutation.isPending} onClick={() => appModal.app && handleApproveApplication(appModal.app)}>
                                    {approveAppMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Approving...</> : <><CheckCircle className="w-4 h-4 mr-2" /> Approve & Onboard</>}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sponsor Edit Modal - Simplified reuse of layout */}
            <Dialog open={sponsorModal.open} onOpenChange={(open) => setSponsorModal({ ...sponsorModal, open })}>
                <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-2xl max-h-[85vh] overflow-y-auto overscroll-contain" data-lenis-prevent>
                    <DialogHeader>
                        <DialogTitle>{sponsorModal.isNew ? 'New Partner' : 'Edit Partner'}</DialogTitle>
                    </DialogHeader>
                    {sponsorModal.sponsor && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 mb-1 block">Name</label>
                                    <Input value={sponsorModal.sponsor.name || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, name: e.target.value } })} className="bg-zinc-900" />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 mb-1 block">Website</label>
                                    <Input value={sponsorModal.sponsor.website_url || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, website_url: e.target.value } })} className="bg-zinc-900" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs uppercase text-zinc-500 mb-1 block">Tier</label>
                                <select
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-white text-sm"
                                    value={sponsorModal.sponsor.tier || 'standard'}
                                    onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, tier: e.target.value as any } })}
                                >
                                    <option value="diamond">Diamond</option>
                                    <option value="ascendant">Ascendant</option>
                                    <option value="radiant">Radiant</option>
                                </select>
                            </div>

                            {!sponsorModal.isNew && (
                                <div>
                                    <label className="text-xs uppercase text-zinc-500 mb-2 block">Ad Placements</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['homepage_ticker', 'sidebar_partner', 'wide_partner', 'card_badge', 'partner_logo', 'partner_showcase'].map(placement => (
                                            <label key={placement} className="flex items-center gap-2 p-2 rounded bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                                                <input
                                                    type="checkbox"
                                                    checked={sponsorModal.sponsor?.placement?.includes(placement)}
                                                    onChange={e => {
                                                        const current = sponsorModal.sponsor?.placement || [];
                                                        const updated = e.target.checked
                                                            ? [...current, placement]
                                                            : current.filter(p => p !== placement);
                                                        setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, placement: updated } });
                                                    }}
                                                    className="rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-rose-500"
                                                />
                                                <span className="text-sm text-zinc-300 capitalize">{placement.replace('_', ' ')}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!sponsorModal.isNew && (
                                <>
                                    <div>
                                        <label className="text-xs uppercase text-zinc-500 mb-1 block">Banner URL</label>
                                        <Input value={sponsorModal.sponsor.banner_image_url || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, banner_image_url: e.target.value } })} className="bg-zinc-900" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs uppercase text-zinc-500 mb-1 block">Color</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={sponsorModal.sponsor.accent_color || '#000000'} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, accent_color: e.target.value } })} className="h-9 w-9 bg-transparent border-0 cursor-pointer" />
                                                <Input value={sponsorModal.sponsor.accent_color || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, accent_color: e.target.value } })} className="bg-zinc-900 flex-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase text-zinc-500 mb-1 block">Priority</label>
                                            <Input type="number" value={sponsorModal.sponsor.priority || 0} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, priority: parseInt(e.target.value) } })} className="bg-zinc-900" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-zinc-500 mb-1 block">Tagline</label>
                                        <Input value={sponsorModal.sponsor.tagline || ''} onChange={e => setSponsorModal({ ...sponsorModal, sponsor: { ...sponsorModal.sponsor!, tagline: e.target.value } })} className="bg-zinc-900" />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-zinc-500 mb-1 block">Description</label>
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
            </Dialog >

            {/* Invite User Modal */}
            < Dialog open={inviteModal.open} onOpenChange={(open) => setInviteModal({ ...inviteModal, open })}>
                <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-md">
                    <DialogHeader>
                        <DialogTitle>Invite Account Owner</DialogTitle>
                        <DialogDescription>
                            Grant access to <strong>{inviteModal.sponsor?.name}</strong> dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-xs uppercase text-zinc-500 mb-1 block">Email Address</label>
                        <Input
                            value={inviteModal.email}
                            onChange={(e) => setInviteModal({ ...inviteModal, email: e.target.value })}
                            className="bg-zinc-900"
                            placeholder="partner@company.com"
                        />
                        <p className="text-xs text-zinc-500 mt-2">
                            If they don't have an account, they will receive an invite email.
                            If they do, they will be given access immediately.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setInviteModal({ open: false, sponsor: null, email: '' })}>Cancel</Button>
                        <Button className="bg-rose-500 hover:bg-rose-600" onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
                            {inviteUserMutation.isPending ? 'Sending...' : 'Send Invite'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Invite Result Modal (Systematic Link Success) */}
            <Dialog open={inviteResult.open} onOpenChange={(open) => setInviteResult({ ...inviteResult, open })}>
                <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            Systematic Link Completed
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {inviteResult.message}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-4">
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                            <p className="text-xs text-emerald-400 leading-relaxed font-medium">
                                Access will be granted only after the recipient accepts the email invitation.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <JackButton onClick={() => setInviteResult({ ...inviteResult, open: false })}>Done</JackButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default SponsorManagement;
