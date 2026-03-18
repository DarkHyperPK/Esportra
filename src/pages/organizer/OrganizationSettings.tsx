'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Upload, Save, Loader2, ExternalLink, Globe, Twitter, Instagram, Youtube, Link2, CheckCircle, Trophy, Users, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { Trash2, ImageIcon, Folder, Plus, ArrowLeft, MoreVertical, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import OrganizationStaffManager from '@/components/organizer/OrganizationStaffManager';

interface Organization {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    banner_url: string | null;
    description: string | null;
    social_links: {
        website?: string;
        twitter?: string;
        instagram?: string;
        youtube?: string;
        discord?: string;
    };
    is_verified: boolean;
    created_at: string;
}

interface Album {
    id: string;
    organization_id: string;
    title: string;
    description: string | null;
    created_at: string;
    cover_url?: string | null;
}

interface OrgStats {
    totalTournaments: number;
    totalParticipants: number;
    activeTournaments: number;
}

const OrganizationSettings: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [stats, setStats] = useState<OrgStats>({ totalTournaments: 0, totalParticipants: 0, activeTournaments: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [socialLinks, setSocialLinks] = useState({
        website: '',
        twitter: '',
        instagram: '',
        youtube: '',
        discord: '',
    });
    const [mediaItems, setMediaItems] = useState<any[]>([]);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    // Album State
    const [albums, setAlbums] = useState<Album[]>([]);
    const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
    const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
    const [newAlbumTitle, setNewAlbumTitle] = useState('');
    const [newAlbumDesc, setNewAlbumDesc] = useState('');
    const [creatingAlbum, setCreatingAlbum] = useState(false);

    // Branding confirmation state
    const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
    const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(null);
    const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
    const [pendingBannerPreview, setPendingBannerPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    // Track whether form fields differ from saved organization data
    const hasUnsavedChanges = organization ? (
        name !== organization.name ||
        slug !== organization.slug ||
        (description || '') !== (organization.description || '') ||
        (logoUrl || '') !== (organization.logo_url || '') ||
        (bannerUrl || '') !== (organization.banner_url || '') ||
        JSON.stringify(socialLinks) !== JSON.stringify(organization.social_links || {})
    ) : (name.trim() !== '' || description.trim() !== '');

    useEffect(() => {
        if (user?.id) {
            fetchOrganization();
        }
    }, [user?.id]);

    const fetchOrganization = async () => {
        try {
            // The API returns the org the current user owns or is staff of
            const data = await apiClient.get<Organization | null>('/api/organizations/mine');

            if (data) {
                setOrganization(data);
                setName(data.name);
                setSlug(data.slug);
                setDescription(data.description || '');
                setLogoUrl(data.logo_url || '');
                setBannerUrl(data.banner_url || '');
                setSocialLinks(data.social_links || {});
                fetchAlbums(data.id);
                fetchMedia(data.id, null); // Fetch root media initially
                fetchStats(data.id); // Fetch stats using org ID
            }
        } catch (error: any) {
            console.error('Error fetching organization:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlbums = async (orgId: string) => {
        try {
            const data = await apiClient.get<any[]>(`/api/organizations/${orgId}/albums`);
            const albumsWithCovers = (data || []).map((album: any) => ({
                ...album,
                cover_url: album.cover_url || album.media?.[0]?.url || null,
            }));
            setAlbums(albumsWithCovers);
        } catch (error) {
            console.error('Error fetching albums:', error);
        }
    };

    const fetchStats = async (orgId?: string) => {
        if (!orgId) return;
        try {
            const data = await apiClient.get<OrgStats>(`/api/organizations/${orgId}/stats`);
            setStats(data || { totalTournaments: 0, totalParticipants: 0, activeTournaments: 0 });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchMedia = async (orgId: string, albumId: string | null = null) => {
        try {
            const params = albumId ? `?albumId=${albumId}` : '';
            const data = await apiClient.get<any[]>(`/api/organizations/${orgId}/media${params}`);
            if (data) setMediaItems(data);
        } catch (error) {
            console.error('Error fetching media:', error);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleNameChange = (value: string) => {
        setName(value);
        if (!organization) {
            setSlug(generateSlug(value));
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !slug.trim()) {
            toast({ title: 'Error', description: 'Name and slug are required.', variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            const orgData = {
                name: name.trim(),
                slug: slug.trim(),
                description: description.trim() || null,
                logoUrl: logoUrl.trim() || null,
                bannerUrl: bannerUrl.trim() || null,
                socialLinks: socialLinks,
            };

            if (organization) {
                await apiClient.put(`/api/organizations/${organization.id}`, orgData);
                toast({ title: 'Success', description: 'Organization updated successfully!' });
            } else {
                const data = await apiClient.post<Organization>('/api/organizations', orgData);
                setOrganization(data);
                toast({ title: 'Success', description: 'Organization created successfully!' });
            }

            fetchOrganization();
        } catch (error: any) {
            console.error('Error saving organization:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingLogoFile(file);
        setPendingLogoPreview(URL.createObjectURL(file));
        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    const confirmLogoUpload = async () => {
        if (!pendingLogoFile) return;
        setUploadingLogo(true);
        try {
            const fileExt = pendingLogoFile.name.split('.').pop();
            const fileName = `${user?.id}/org-logo.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('organizer-media')
                .upload(fileName, pendingLogoFile, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('organizer-media')
                .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;
            setLogoUrl(publicUrl);

            if (organization?.id) {
                await apiClient.put(`/api/organizations/${organization.id}/logo`, { url: publicUrl });
            }

            toast({ title: 'Logo saved!' });
        } catch (error: any) {
            toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        } finally {
            setUploadingLogo(false);
            cancelLogoPreview();
        }
    };

    const cancelLogoPreview = () => {
        if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
        setPendingLogoFile(null);
        setPendingLogoPreview(null);
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingBannerFile(file);
        setPendingBannerPreview(URL.createObjectURL(file));
        e.target.value = '';
    };

    const confirmBannerUpload = async () => {
        if (!pendingBannerFile) return;
        setUploadingBanner(true);
        try {
            const fileExt = pendingBannerFile.name.split('.').pop();
            const fileName = `${user?.id}/org-banner.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('organizer-media')
                .upload(fileName, pendingBannerFile, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('organizer-media')
                .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;
            setBannerUrl(publicUrl);

            if (organization?.id) {
                await apiClient.put(`/api/organizations/${organization.id}/banner`, { url: publicUrl });
            }

            toast({ title: 'Banner saved!' });
        } catch (error: any) {
            toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        } finally {
            setUploadingBanner(false);
            cancelBannerPreview();
        }
    };

    const cancelBannerPreview = () => {
        if (pendingBannerPreview) URL.revokeObjectURL(pendingBannerPreview);
        setPendingBannerFile(null);
        setPendingBannerPreview(null);
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !organization) return;

        setUploadingMedia(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${organization.id}/media_${Date.now()}_${i}.${fileExt}`;

                // Upload to storage
                const { error: uploadError } = await supabase.storage
                    .from('organizer-media')
                    .upload(fileName, file); // Standard upload

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('organizer-media')
                    .getPublicUrl(fileName);

                // Insert to DB
                await apiClient.post(`/api/organizations/${organization.id}/media`, {
                    url: publicUrl,
                    type: file.type.startsWith('video') ? 'video' : 'image',
                    caption: file.name,
                    albumId: activeAlbum?.id || null
                });
            }
            toast({ title: 'Success', description: 'Media uploaded successfully' });
            fetchMedia(organization.id, activeAlbum?.id || null);
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to upload media', variant: 'destructive' });
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleDeleteMedia = async (id: string, url: string) => {
        try {
            // Extract path and delete from storage could be added here if needed
            // For now just delete record
            await apiClient.delete(`/api/organizations/${organization!.id}/media/${id}`);
            if (organization) fetchMedia(organization.id, activeAlbum?.id || null);
            toast({ title: 'Deleted', description: 'Media removed.' });
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
        }
    };

    const handleCreateAlbum = async () => {
        if (!newAlbumTitle.trim() || !organization) return;

        setCreatingAlbum(true);
        try {
            const data = await apiClient.post<Album>(`/api/organizations/${organization.id}/albums`, {
                title: newAlbumTitle.trim(),
                description: newAlbumDesc.trim() || null,
            });

            setAlbums([data, ...albums]);
            setNewAlbumTitle('');
            setNewAlbumDesc('');
            setIsCreateAlbumOpen(false);
            toast({ title: 'Success', description: 'Album created.' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setCreatingAlbum(false);
        }
    };

    const handleDeleteAlbum = async (albumId: string) => {
        // Rely on CASCADE delete for media
        try {
            await apiClient.delete(`/api/organizations/${organization!.id}/albums/${albumId}`);
            setAlbums(albums.filter(a => a.id !== albumId));
            if (activeAlbum?.id === albumId) setActiveAlbum(null);
            toast({ title: 'Deleted', description: 'Album removed.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete album.', variant: 'destructive' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 className="h-10 w-10 animate-spin text-esports-accent" />
                    <span className="text-gray-400">Loading organization...</span>
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3 font-heading">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-esports-purple/20 to-esports-accent/20 border border-white/10">
                            <Building2 className="h-6 w-6 text-esports-accent" />
                        </div>
                        <span className="text-gradient bg-gradient-to-r from-white to-gray-400">
                            Organization Settings
                        </span>
                    </h2>
                    <p className="text-gray-400 mt-2">
                        {organization
                            ? 'Manage your organization profile displayed on tournaments.'
                            : 'Create your organization to display your brand on tournaments.'}
                    </p>
                </div>
                {organization && (
                    <Button
                        variant="outline"
                        onClick={() => window.open(`/org/${organization.slug}`, '_blank')}
                        className="gap-2 border-white/10 hover:bg-white/5 hover:border-esports-accent/50 transition-all"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View Public Profile
                    </Button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl p-6 border border-white/5 bg-gradient-to-br from-esports-purple/10 to-transparent backdrop-blur-sm"
                >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-esports-purple/20 rounded-full blur-2xl" />
                    <Trophy className="h-8 w-8 text-esports-purple mb-3" />
                    <div className="text-3xl font-bold font-heading">{stats.totalTournaments}</div>
                    <div className="text-gray-400 text-sm">Total Tournaments</div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl p-6 border border-white/5 bg-gradient-to-br from-esports-accent/10 to-transparent backdrop-blur-sm"
                >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-esports-accent/20 rounded-full blur-2xl" />
                    <Users className="h-8 w-8 text-esports-accent mb-3" />
                    <div className="text-3xl font-bold font-heading">{stats.totalParticipants}</div>
                    <div className="text-gray-400 text-sm">Total Participants</div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl p-6 border border-white/5 bg-gradient-to-br from-esports-green/10 to-transparent backdrop-blur-sm"
                >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-esports-green/20 rounded-full blur-2xl" />
                    <Calendar className="h-8 w-8 text-esports-green mb-3" />
                    <div className="text-3xl font-bold font-heading">{stats.activeTournaments}</div>
                    <div className="text-gray-400 text-sm">Active Tournaments</div>
                </motion.div>
            </div>

            {/* Banner & Logo Preview */}
            <Card className="overflow-hidden border-white/5 bg-gradient-to-br from-[#0a0a0c] to-[#050507]">
                <div
                    className="h-36 bg-gradient-to-r from-esports-purple/30 via-esports-accent/20 to-esports-blue/30 relative group"
                    style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent" />

                    {/* Preview only — no interactive upload here */}

                    <div className="absolute bottom-0 left-6 translate-y-1/2">
                        <Avatar className="h-24 w-24 border-4 border-[#050507] shadow-xl ring-2 ring-esports-accent/30">
                            <AvatarImage src={logoUrl} />
                            <AvatarFallback className="bg-gradient-to-br from-esports-purple to-esports-accent text-2xl font-bold">
                                {name ? name[0].toUpperCase() : 'O'}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    {organization?.is_verified && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-esports-accent/20 border border-esports-accent/50 text-esports-accent text-sm z-20">
                            <CheckCircle className="h-4 w-4" />
                            Verified
                        </div>
                    )}
                </div>
                <CardContent className="pt-16 pb-6">
                    <h3 className="text-xl font-bold font-heading">{name || 'Your Organization'}</h3>
                    <p className="text-gray-500 text-sm">@{slug || 'your-slug'}</p>
                </CardContent>
            </Card>

            {/* Basic Info */}
            <Card className="border-white/5 bg-gradient-to-br from-[#0a0a0c] to-[#050507]">
                <CardHeader>
                    <CardTitle className="font-heading">Basic Information</CardTitle>
                    <CardDescription>This is how your organization will appear on tournaments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-gray-300">Organization Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Esportra Gaming"
                                className="bg-white/5 border-white/10 focus:border-esports-accent focus:ring-esports-accent/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-gray-300">URL Slug *</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 text-sm">/org/</span>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                                    placeholder="esportra-gaming"
                                    className="bg-white/5 border-white/10 focus:border-esports-accent focus:ring-esports-accent/20"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-gray-300">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell players about your organization..."
                            className="bg-white/5 border-white/10 focus:border-esports-accent focus:ring-esports-accent/20 min-h-[120px]"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Branding */}
            <Card className="border-white/5 bg-gradient-to-br from-[#0a0a0c] to-[#050507]">
                <CardHeader>
                    <CardTitle className="font-heading">Branding</CardTitle>
                    <CardDescription>Upload your organization logo and banner.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label className="text-gray-300">Logo</Label>
                            <div className="flex items-center gap-6">
                                <Avatar className="h-20 w-20 border-2 border-white/10">
                                    <AvatarImage src={logoUrl} />
                                    <AvatarFallback className="bg-gradient-to-br from-esports-purple to-esports-accent text-xl">
                                        {name ? name[0].toUpperCase() : 'O'}
                                    </AvatarFallback>
                                </Avatar>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    <Button variant="outline" size="sm" asChild className="border-white/10 hover:bg-white/5 hover:border-esports-accent/50">
                                        <span>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Logo
                                        </span>
                                    </Button>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">Recommended: 200x200px, PNG or JPG</p>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-gray-300">Banner</Label>
                            <label className="cursor-pointer block">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleBannerUpload}
                                    className="hidden"
                                />
                                <div
                                    className="h-24 rounded-xl bg-gradient-to-r from-esports-purple/20 to-esports-accent/20 border border-white/10 flex items-center justify-center overflow-hidden relative group hover:border-rose-500/50 transition-all"
                                    style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                                >
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="flex items-center gap-2 text-white text-sm font-medium">
                                            <Edit2 className="h-4 w-4" />
                                            {bannerUrl ? 'Change Banner' : 'Upload Banner'}
                                        </div>
                                    </div>
                                    {!bannerUrl && <span className="text-gray-500 text-sm group-hover:opacity-0 transition-opacity">1200 x 300 recommended</span>}
                                </div>
                            </label>
                            <p className="text-xs text-gray-500">Click to upload or change banner</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logo Confirmation Dialog */}
            <Dialog open={!!pendingLogoPreview} onOpenChange={(open) => { if (!open) cancelLogoPreview(); }}>
                <DialogContent className="sm:max-w-md bg-[#0a0a0c] border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>Confirm Logo</DialogTitle>
                        <DialogDescription>Preview your new logo before saving.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-6">
                        <Avatar className="h-32 w-32 border-2 border-white/10">
                            <AvatarImage src={pendingLogoPreview || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-esports-purple to-esports-accent text-3xl">
                                {name ? name[0].toUpperCase() : 'O'}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button variant="outline" onClick={cancelLogoPreview} className="border-white/10 hover:bg-white/5">
                            Cancel
                        </Button>
                        <Button onClick={confirmLogoUpload} disabled={uploadingLogo} className="bg-esports-accent hover:bg-esports-accent/80">
                            {uploadingLogo ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Confirm & Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Banner Confirmation Dialog */}
            <Dialog open={!!pendingBannerPreview} onOpenChange={(open) => { if (!open) cancelBannerPreview(); }}>
                <DialogContent className="sm:max-w-2xl bg-[#0a0a0c] border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>Confirm Banner</DialogTitle>
                        <DialogDescription>Preview your new banner before saving.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div
                            className="h-36 rounded-xl bg-gradient-to-r from-esports-purple/20 to-esports-accent/20 border border-white/10 overflow-hidden"
                            style={pendingBannerPreview ? { backgroundImage: `url(${pendingBannerPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                        />
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button variant="outline" onClick={cancelBannerPreview} className="border-white/10 hover:bg-white/5">
                            Cancel
                        </Button>
                        <Button onClick={confirmBannerUpload} disabled={uploadingBanner} className="bg-esports-accent hover:bg-esports-accent/80">
                            {uploadingBanner ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Confirm & Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Card className="border-white/5 bg-gradient-to-br from-[#0a0a0c] to-[#050507]">
                <CardHeader>
                    <CardTitle className="font-heading">Social Links</CardTitle>
                    <CardDescription>Connect your organization's social media accounts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-gray-300">
                                <Globe className="h-4 w-4 text-esports-accent" /> Website
                            </Label>
                            <Input
                                value={socialLinks.website || ''}
                                onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                                placeholder="https://your-website.com"
                                className="bg-white/5 border-white/10 focus:border-esports-accent"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-gray-300">
                                <Twitter className="h-4 w-4 text-blue-400" /> Twitter/X
                            </Label>
                            <Input
                                value={socialLinks.twitter || ''}
                                onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                                placeholder="@username"
                                className="bg-white/5 border-white/10 focus:border-esports-accent"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-gray-300">
                                <Instagram className="h-4 w-4 text-pink-400" /> Instagram
                            </Label>
                            <Input
                                value={socialLinks.instagram || ''}
                                onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                                placeholder="@username"
                                className="bg-white/5 border-white/10 focus:border-esports-accent"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-gray-300">
                                <Youtube className="h-4 w-4 text-red-500" /> YouTube
                            </Label>
                            <Input
                                value={socialLinks.youtube || ''}
                                onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                                placeholder="Channel URL"
                                className="bg-white/5 border-white/10 focus:border-esports-accent"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-gray-300">
                                <Link2 className="h-4 w-4 text-indigo-400" /> Discord
                            </Label>
                            <Input
                                value={socialLinks.discord || ''}
                                onChange={(e) => setSocialLinks({ ...socialLinks, discord: e.target.value })}
                                placeholder="Discord invite link"
                                className="bg-white/5 border-white/10 focus:border-esports-accent"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Media Gallery */}
            {/* Media Gallery */}
            <Card className="border-white/5 bg-gradient-to-br from-[#0a0a0c] to-[#050507]">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            {activeAlbum && (
                                <Button variant="ghost" size="icon" onClick={() => { setActiveAlbum(null); fetchMedia(organization?.id || '', null); }} className="h-8 w-8 -ml-2">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <CardTitle className="font-heading">
                                {activeAlbum ? activeAlbum.title : 'Media Library'}
                            </CardTitle>
                        </div>
                        <CardDescription>
                            {activeAlbum ? activeAlbum.description : 'Manage your albums and photos.'}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {!activeAlbum && (
                            <Dialog open={isCreateAlbumOpen} onOpenChange={setIsCreateAlbumOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="border-white/10 hover:bg-white/5 gap-2">
                                        <Plus className="w-4 h-4" /> New Album
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gaming-dark border-gaming-gray text-white">
                                    <DialogHeader>
                                        <DialogTitle>Create New Album</DialogTitle>
                                        <DialogDescription className="text-gray-400">Group your photos and videos.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">Title</Label>
                                            <Input
                                                placeholder="e.g. Summer Championship 2024"
                                                value={newAlbumTitle}
                                                onChange={e => setNewAlbumTitle(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">Description</Label>
                                            <Textarea
                                                placeholder="Optional description"
                                                value={newAlbumDesc}
                                                onChange={e => setNewAlbumDesc(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setIsCreateAlbumOpen(false)} className="hover:bg-white/10 hover:text-white">Cancel</Button>
                                        <Button onClick={handleCreateAlbum} disabled={creatingAlbum} className="bg-esports-accent hover:bg-esports-accent/90">
                                            {creatingAlbum ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}

                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleMediaUpload}
                                className="hidden"
                            />
                            <Button
                                disabled={uploadingMedia}
                                onClick={() => fileInputRef.current?.click()}
                                variant="default"
                                className="bg-esports-accent hover:bg-esports-accent/90 gap-2"
                            >
                                {uploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {activeAlbum ? 'Upload to Album' : 'Upload Uncategorized'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!activeAlbum && (
                        <div className="mb-8">
                            <h4 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                                <Folder className="w-4 h-4" /> Albums
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {albums.map(album => {
                                    // We need to find a cover. ideally fetched. 
                                    // For now, let's assume we can fetch it or just show a nice placeholder.
                                    // To do it properly, I'll update the fetch logic below separately.
                                    // For this replace block, I will set up the UI assuming `album.cover_url` exists or is passed.
                                    // But wait, I can't inject props.
                                    // I'll stick to the UI change here and rely on the existing 'album' object.
                                    // Since I haven't updated the fetch yet, I will use a placeholder for now, then update fetch.
                                    return (
                                        <div
                                            key={album.id}
                                            onClick={() => { setActiveAlbum(album); fetchMedia(organization?.id || '', album.id); }}
                                            className="group cursor-pointer relative aspect-square"
                                        >
                                            {/* Stack Effect */}
                                            <div className="absolute top-0 right-0 w-full h-full bg-white/5 rounded-2xl rotate-3 scale-90 transition-transform group-hover:rotate-6 border border-white/5" />
                                            <div className="absolute top-0 right-0 w-full h-full bg-white/5 rounded-2xl -rotate-3 scale-95 transition-transform group-hover:-rotate-6 border border-white/5" />

                                            {/* Main Card */}
                                            <div className="relative w-full h-full bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden shadow-xl transition-transform group-hover:scale-[1.02]">
                                                {/* Cover Image */}
                                                {(album as any).cover_url ? (
                                                    <img
                                                        src={(album as any).cover_url}
                                                        alt={album.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                                                        <Folder className="w-12 h-12 text-white/20 mb-2" />
                                                    </div>
                                                )}

                                                {/* Overlay Gradient */}
                                                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-4">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-white text-lg truncate leading-tight shadow-sm drop-shadow-md">{album.title}</h3>
                                                            <p className="text-xs text-gray-300 mt-1 truncate font-medium drop-shadow-sm">
                                                                {new Date(album.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Delete Button (Hover) */}
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-lg"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>

                                                {/* Type Icon */}
                                                <div className="absolute top-2 left-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg border border-white/10">
                                                    <ImageIcon className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Media Grid */}
                    {mediaItems.length === 0 && !activeAlbum ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                            <ImageIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500">No media uploaded yet.</p>
                        </div>
                    ) : (
                        <div className="mt-8">
                            <h4 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" /> {activeAlbum ? 'Album Photos' : 'Uncategorized Photos'}
                            </h4>
                            <div className="columns-1 md:columns-3 gap-4 space-y-4">
                                {mediaItems.map((item) => (
                                    <div key={item.id} className="break-inside-avoid relative group rounded-xl overflow-hidden bg-black/20">
                                        <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                onClick={() => handleDeleteMedia(item.id, item.url)}
                                                className="h-8 w-8"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Organization Staff */}
            {organization && user?.id && (
                <OrganizationStaffManager
                    organizationId={organization.id}
                    ownerId={user.id}
                />
            )}

            {/* Danger Zone */}
            {organization && organization.owner_id === user?.id && (
                <Card className="border-red-900/30 bg-red-950/10 mt-12">
                    <CardHeader>
                        <CardTitle className="text-red-500 font-heading">Danger Zone</CardTitle>
                        <CardDescription className="text-red-400/60">
                            Irreversible actions for your organization.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 border border-red-900/30 rounded-xl bg-red-950/20">
                            <div>
                                <h4 className="font-semibold text-red-100">Delete Organization</h4>
                                <p className="text-sm text-red-400/60 mt-1">
                                    This will delete your organization profile, settings, and media.
                                    <br />Active tournaments must be completed or cancelled first.
                                </p>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="bg-red-900/50 hover:bg-red-900 text-red-100 border border-red-800">
                                        Delete Organization
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-zinc-950 border-red-900 text-white">
                                    <DialogHeader>
                                        <DialogTitle className="text-red-500">Delete Organization?</DialogTitle>
                                        <DialogDescription className="text-zinc-400">
                                            Are you sure you want to delete <strong>{organization.name}</strong>?
                                            This action cannot be undone.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button
                                            variant="ghost"
                                            className="text-zinc-400 hover:text-white"
                                            onClick={(e) => {
                                                const closeButton = e.currentTarget.closest('[role="dialog"]')?.querySelector('button[aria-label="Close"]');
                                                if (closeButton) (closeButton as HTMLButtonElement).click();
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={async () => {
                                                try {
                                                    setLoading(true);
                                                    const data = await apiClient.delete<any>(`/api/organizations/${organization.id}`);

                                                    if (data && !data.success) {
                                                        toast({ title: "Cannot Delete", description: data.message, variant: "destructive" });
                                                    } else {
                                                        toast({ title: "Deleted", description: "Organization deleted successfully." });
                                                        setOrganization(null);
                                                        navigate('/');
                                                    }
                                                } catch (err: any) {
                                                    toast({ title: "Error", description: err.message, variant: "destructive" });
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                        >
                                            Yes, Delete Forever
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Unsaved changes bar — fixed at bottom */}
            {hasUnsavedChanges && (
                <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/95 backdrop-blur-lg px-6 py-3"
                >
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-amber-400">
                            <Save className="w-4 h-4" />
                            <span>You have unsaved changes</span>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-esports-accent hover:bg-esports-accent/90 text-white min-w-[130px] shadow-lg shadow-esports-accent/20"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default OrganizationSettings;
