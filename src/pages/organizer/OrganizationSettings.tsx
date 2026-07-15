'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import OrganizationStaffManager from '@/components/organizer/OrganizationStaffManager';
import {
  CommandActionBar,
  CommandButton,
  CommandEmptyState,
  CommandPanel,
  CommandSection,
  CommandTabs,
} from '@/components/management/CommandSurface';
import { cn } from '@/lib/utils';

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

const tabs = [
  { value: 'profile', label: 'Profile' },
  { value: 'branding', label: 'Branding' },
  { value: 'staff', label: 'Staff' },
  { value: 'media', label: 'Media' },
  { value: 'advanced', label: 'Advanced' },
];

const textInput = 'rounded-none border-white/10 bg-[#0a0a0c] text-white placeholder:text-zinc-600 focus:border-rose-500';

const OrganizationSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrgStats>({ totalTournaments: 0, totalParticipants: 0, activeTournaments: 0 });
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState('profile');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState({ website: '', twitter: '', instagram: '', youtube: '', discord: '' });
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(null);
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const [pendingBannerPreview, setPendingBannerPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const hasUnsavedChanges = organization
    ? name !== organization.name ||
      slug !== organization.slug ||
      (description || '') !== (organization.description || '') ||
      (logoUrl || '') !== (organization.logo_url || '') ||
      (bannerUrl || '') !== (organization.banner_url || '') ||
      JSON.stringify(socialLinks) !== JSON.stringify(organization.social_links || {})
    : name.trim() !== '' || description.trim() !== '';

  const fetchOrganization = useCallback(async () => {
    try {
      const data = await apiClient.get<Organization | null>('/api/organizations/mine');
      if (!data) return;
      setOrganization(data);
      setName(data.name);
      setSlug(data.slug);
      setDescription(data.description || '');
      setLogoUrl(data.logo_url || '');
      setBannerUrl(data.banner_url || '');
      setSocialLinks({ website: '', twitter: '', instagram: '', youtube: '', discord: '', ...(data.social_links || {}) });
      void fetchAlbums(data.id);
      void fetchMedia(data.id, null);
      void fetchStats(data.id);
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) void fetchOrganization();
  }, [user?.id, fetchOrganization]);

  const fetchAlbums = async (orgId: string) => {
    try {
      const data = await apiClient.get<any[]>(`/api/organizations/${orgId}/albums`);
      setAlbums((data || []).map((album: any) => ({ ...album, cover_url: album.cover_url || album.media?.[0]?.url || null })));
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  const fetchStats = async (orgId: string) => {
    try {
      setStats((await apiClient.get<OrgStats>(`/api/organizations/${orgId}/stats`)) || { totalTournaments: 0, totalParticipants: 0, activeTournaments: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMedia = async (orgId: string, albumId: string | null = null) => {
    try {
      const data = await apiClient.get<any[]>(`/api/organizations/${orgId}/media${albumId ? `?albumId=${albumId}` : ''}`);
      setMediaItems(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const generateSlug = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

  const handleNameChange = (value: string) => {
    setName(value);
    if (!organization) setSlug(generateSlug(value));
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
        socialLinks,
      };

      if (organization) {
        await apiClient.put(`/api/organizations/${organization.id}`, orgData);
        toast({ title: 'Saved', description: 'Organization updated successfully.' });
      } else {
        setOrganization(await apiClient.post<Organization>('/api/organizations', orgData));
        toast({ title: 'Created', description: 'Organization created successfully.' });
      }
      void fetchOrganization();
    } catch (error: any) {
      const detail = error?.body?.error || error?.body?.detail || error?.body?.title || error.message;
      toast({ title: 'Error', description: String(detail), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingLogoFile(file);
    setPendingLogoPreview(URL.createObjectURL(file));
    event.target.value = '';
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingBannerFile(file);
    setPendingBannerPreview(URL.createObjectURL(file));
    event.target.value = '';
  };

  const cancelLogoPreview = () => {
    if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
    setPendingLogoFile(null);
    setPendingLogoPreview(null);
  };

  const cancelBannerPreview = () => {
    if (pendingBannerPreview) URL.revokeObjectURL(pendingBannerPreview);
    setPendingBannerFile(null);
    setPendingBannerPreview(null);
  };

  const confirmLogoUpload = async () => {
    if (!pendingLogoFile) return;
    setUploadingLogo(true);
    try {
      const fileExt = pendingLogoFile.name.split('.').pop();
      const fileName = `${user?.id}/org-logo.${fileExt}`;
      const { error } = await supabase.storage.from('organizer-media').upload(fileName, pendingLogoFile, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('organizer-media').getPublicUrl(fileName);
      setLogoUrl(data.publicUrl);
      if (organization?.id) await apiClient.put(`/api/organizations/${organization.id}/logo`, { url: data.publicUrl });
      toast({ title: 'Logo saved' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
      cancelLogoPreview();
    }
  };

  const confirmBannerUpload = async () => {
    if (!pendingBannerFile) return;
    setUploadingBanner(true);
    try {
      const fileExt = pendingBannerFile.name.split('.').pop();
      const fileName = `${user?.id}/org-banner.${fileExt}`;
      const { error } = await supabase.storage.from('organizer-media').upload(fileName, pendingBannerFile, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('organizer-media').getPublicUrl(fileName);
      setBannerUrl(data.publicUrl);
      if (organization?.id) await apiClient.put(`/api/organizations/${organization.id}/banner`, { url: data.publicUrl });
      toast({ title: 'Banner saved' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingBanner(false);
      cancelBannerPreview();
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length || !organization) return;

    setUploadingMedia(true);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const fileExt = file.name.split('.').pop();
        const fileName = `${organization.id}/media_${Date.now()}_${index}.${fileExt}`;
        const { error } = await supabase.storage.from('organizer-media').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('organizer-media').getPublicUrl(fileName);
        await apiClient.post(`/api/organizations/${organization.id}/media`, {
          url: data.publicUrl,
          type: file.type.startsWith('video') ? 'video' : 'image',
          caption: file.name,
          albumId: activeAlbum?.id || null,
        });
      }
      toast({ title: 'Uploaded', description: 'Media uploaded successfully.' });
      await fetchMedia(organization.id, activeAlbum?.id || null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to upload media.', variant: 'destructive' });
    } finally {
      setUploadingMedia(false);
      event.target.value = '';
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!organization) return;
    try {
      await apiClient.delete(`/api/organizations/${organization.id}/media/${id}`);
      await fetchMedia(organization.id, activeAlbum?.id || null);
      toast({ title: 'Deleted', description: 'Media removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete media.', variant: 'destructive' });
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
      toast({ title: 'Created', description: 'Album created.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCreatingAlbum(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!organization) return;
    try {
      await apiClient.delete(`/api/organizations/${organization.id}/albums/${albumId}`);
      setAlbums(albums.filter((album) => album.id !== albumId));
      if (activeAlbum?.id === albumId) setActiveAlbum(null);
      toast({ title: 'Deleted', description: 'Album removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete album.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <CommandSection>
        <div className="flex items-center justify-center gap-3 py-16 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
          Loading organization
        </div>
      </CommandSection>
    );
  }

  const ownerName = profile?.full_name || profile?.username || 'Organizer';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
      <CommandPanel className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0 p-4 sm:p-5">
            <div
              className="relative aspect-[5/1] min-h-[128px] overflow-hidden border border-white/10 bg-[#0a0a0c] bg-cover bg-center"
              style={bannerUrl ? { backgroundImage: `linear-gradient(to top, rgba(5,5,5,0.82), rgba(5,5,5,0.1)), url(${bannerUrl})` } : undefined}
            >
              {!bannerUrl ? (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                  <span className="font-heading text-2xl font-black uppercase tracking-tight text-zinc-800 sm:text-4xl">{name || 'Organization banner'}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[104px_minmax(0,1fr)]">
              <div className="flex lg:block">
                <Avatar className="h-24 w-24 shrink-0 rounded-none border border-white/10 bg-black">
                  <AvatarImage src={logoUrl} />
                  <AvatarFallback className="rounded-none bg-rose-500 text-xl font-black text-white">{name ? name[0].toUpperCase() : 'O'}</AvatarFallback>
                </Avatar>
              </div>

              <div className="min-w-0">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 break-words font-heading text-2xl font-black uppercase leading-none tracking-tight text-white md:text-3xl">{name || 'Your Organization'}</h2>
                      {organization?.is_verified ? (
                        <span className="inline-flex items-center gap-1 border border-emerald-500/35 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">@{slug || 'your-slug'} / {ownerName}</p>
                  </div>
                </div>

                <div className="mt-4 border border-white/10 bg-[#0a0a0c] p-3">
                  <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-400">Bio</div>
                  {description ? (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">{description}</p>
                  ) : (
                    <p className="text-sm leading-relaxed text-zinc-600">No organization bio has been added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-white/10 xl:grid-cols-1 xl:border-l xl:border-t-0">
            <div className="border-r border-white/10 p-4 xl:border-b xl:border-r-0">
              <Trophy className="mb-3 h-4 w-4 text-rose-400" />
              <div className="text-2xl font-black text-white">{stats.totalTournaments}</div>
              <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">Tournaments</div>
            </div>
            <div className="border-r border-white/10 p-4 xl:border-b xl:border-r-0">
              <Users className="mb-3 h-4 w-4 text-rose-400" />
              <div className="text-2xl font-black text-white">{stats.totalParticipants}</div>
              <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">Participants</div>
            </div>
            <div className="p-4">
              <Calendar className="mb-3 h-4 w-4 text-rose-400" />
              <div className="text-2xl font-black text-white">{stats.activeTournaments}</div>
              <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">Active</div>
            </div>
          </div>
        </div>
      </CommandPanel>

      <CommandTabs tabs={tabs} active={activeSection} onChange={setActiveSection} />

      {activeSection === 'profile' && (
        <CommandSection>
          <SectionTitle title="Profile" description="Control the identity shown on tournament and organization pages." />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Organization Name" htmlFor="name">
              <Input id="name" value={name} onChange={(event) => handleNameChange(event.target.value)} className={textInput} placeholder="Esportra Gaming" />
            </Field>
            <Field label="URL Slug" htmlFor="slug">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-600">/org/</span>
                <Input id="slug" value={slug} onChange={(event) => setSlug(generateSlug(event.target.value))} className={textInput} placeholder="esportra-gaming" />
              </div>
            </Field>
            <Field label="Description" htmlFor="description" className="md:col-span-2">
              <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} className={cn(textInput, 'min-h-[130px]')} placeholder="Tell players about your organization..." />
            </Field>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(['website', 'twitter', 'instagram', 'youtube', 'discord'] as const).map((key) => (
              <Field key={key} label={key} htmlFor={`social-${key}`}>
                <Input
                  id={`social-${key}`}
                  value={socialLinks[key] || ''}
                  onChange={(event) => setSocialLinks((current) => ({ ...current, [key]: event.target.value }))}
                  className={textInput}
                  placeholder={key === 'website' ? 'https://example.com' : key}
                />
              </Field>
            ))}
          </div>
        </CommandSection>
      )}

      {activeSection === 'branding' && (
        <CommandSection>
          <SectionTitle title="Branding" description="Upload the logo and banner used across organization and tournament surfaces." />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <CommandPanel>
              <div className="flex items-center gap-5">
                <Avatar className="h-24 w-24 rounded-none border border-white/10">
                  <AvatarImage src={logoUrl} />
                  <AvatarFallback className="rounded-none bg-rose-500 text-xl text-white">{name ? name[0].toUpperCase() : 'O'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-white">Logo</h3>
                  <p className="mt-1 text-sm text-zinc-500">Recommended 200x200 PNG or JPG.</p>
                  <label className="mt-4 inline-flex cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <span className="inline-flex h-10 items-center justify-center border border-white/15 bg-[#0a0a0c] px-4 font-mono text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:border-white/30 hover:bg-white/[0.06]">
                      <span className="inline-flex items-center gap-2"><Upload className="h-4 w-4" /> Upload Logo</span>
                    </span>
                  </label>
                </div>
              </div>
            </CommandPanel>

            <CommandPanel>
              <div
                className="flex h-32 items-center justify-center border border-white/10 bg-[#0a0a0c] bg-cover bg-center"
                style={bannerUrl ? { backgroundImage: `linear-gradient(to top, rgba(5,5,5,0.72), rgba(5,5,5,0.08)), url(${bannerUrl})` } : undefined}
              >
                {!bannerUrl ? <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">1200 x 300 recommended</span> : null}
              </div>
              <label className="mt-4 inline-flex cursor-pointer">
                <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                <span className="inline-flex h-10 items-center justify-center border border-white/15 bg-[#0a0a0c] px-4 font-mono text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:border-white/30 hover:bg-white/[0.06]">
                  <span className="inline-flex items-center gap-2"><Upload className="h-4 w-4" /> Upload Banner</span>
                </span>
              </label>
            </CommandPanel>
          </div>
        </CommandSection>
      )}

      {activeSection === 'staff' && organization && user?.id && (
        <CommandSection>
          <OrganizationStaffManager organizationId={organization.id} ownerId={user.id} />
        </CommandSection>
      )}

      {activeSection === 'media' && (
        <CommandSection>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle title="Media" description="Manage organization albums and public media assets." />
            <div className="flex flex-wrap gap-2">
              <input ref={mediaInputRef} type="file" multiple accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
              <CommandButton variant="secondary" onClick={() => mediaInputRef.current?.click()} disabled={uploadingMedia || !organization}>
                {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Media
              </CommandButton>
              <Dialog open={isCreateAlbumOpen} onOpenChange={setIsCreateAlbumOpen}>
                <DialogTrigger asChild>
                  <CommandButton><Plus className="h-4 w-4" />Album</CommandButton>
                </DialogTrigger>
                <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
                  <DialogHeader>
                    <DialogTitle>Create Album</DialogTitle>
                    <DialogDescription className="text-zinc-400">Group your photos and videos.</DialogDescription>
                  </DialogHeader>
                  <Input value={newAlbumTitle} onChange={(event) => setNewAlbumTitle(event.target.value)} placeholder="Album title" className={textInput} />
                  <Textarea value={newAlbumDesc} onChange={(event) => setNewAlbumDesc(event.target.value)} placeholder="Description" className={textInput} />
                  <DialogFooter>
                    <CommandButton variant="secondary" onClick={() => setIsCreateAlbumOpen(false)}>Cancel</CommandButton>
                    <CommandButton onClick={handleCreateAlbum} disabled={creatingAlbum}>{creatingAlbum ? 'Creating...' : 'Create'}</CommandButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setActiveAlbum(null); if (organization) void fetchMedia(organization.id, null); }} className={cn('border px-3 py-2 font-mono text-[10px] uppercase tracking-wider', !activeAlbum ? 'border-rose-500 bg-rose-500 text-white' : 'border-white/10 text-zinc-400 hover:text-white')}>
              All Media
            </button>
            {albums.map((album) => (
              <button key={album.id} type="button" onClick={() => { setActiveAlbum(album); if (organization) void fetchMedia(organization.id, album.id); }} className={cn('border px-3 py-2 font-mono text-[10px] uppercase tracking-wider', activeAlbum?.id === album.id ? 'border-rose-500 bg-rose-500 text-white' : 'border-white/10 text-zinc-400 hover:text-white')}>
                {album.title}
              </button>
            ))}
          </div>

          {albums.length > 0 && (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {albums.map((album) => (
                <CommandPanel key={album.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-white">{album.title}</h3>
                    <p className="text-xs text-zinc-500">{new Date(album.created_at).toLocaleDateString()}</p>
                  </div>
                  <CommandButton size="sm" variant="danger" onClick={() => handleDeleteAlbum(album.id)} aria-label={`Delete ${album.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </CommandButton>
                </CommandPanel>
              ))}
            </div>
          )}

          <div className="mt-6">
            {mediaItems.length === 0 ? (
              <CommandEmptyState title="No media uploaded yet" description="Upload media assets for your organization gallery." icon={<ImageIcon className="h-5 w-5" />} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mediaItems.map((item) => (
                  <div key={item.id} className="group relative overflow-hidden border border-white/10 bg-black">
                    <img src={item.url} loading="lazy" alt={item.caption || ''} className="h-52 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/82 p-3">
                      <span className="truncate text-xs text-zinc-400">{item.caption || 'Media asset'}</span>
                      <CommandButton size="sm" variant="danger" onClick={() => handleDeleteMedia(item.id)} aria-label="Delete media">
                        <Trash2 className="h-4 w-4" />
                      </CommandButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CommandSection>
      )}

      {activeSection === 'advanced' && organization && (
        <CommandSection className="border-red-500/25 bg-red-950/10">
          <SectionTitle title="Advanced" description="Irreversible controls for this organization." />
          <CommandPanel className="mt-6 border-red-500/25 bg-red-950/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-red-100">Delete Organization</h3>
                <p className="mt-1 text-sm text-red-200/60">Active tournaments must be completed or cancelled first.</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <CommandButton variant="danger"><Trash2 className="h-4 w-4" />Delete</CommandButton>
                </DialogTrigger>
                <DialogContent className="rounded-none border-red-900 bg-zinc-950 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-red-400">Delete Organization?</DialogTitle>
                    <DialogDescription className="text-zinc-400">This action cannot be undone.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <CommandButton variant="secondary">Cancel</CommandButton>
                    <CommandButton
                      variant="danger"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const data = await apiClient.delete<any>(`/api/organizations/${organization.id}`);
                          if (data && !data.success) {
                            toast({ title: 'Cannot delete', description: data.message, variant: 'destructive' });
                          } else {
                            toast({ title: 'Deleted', description: 'Organization deleted successfully.' });
                            setOrganization(null);
                            navigate('/');
                          }
                        } catch (error: any) {
                          toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      Delete Forever
                    </CommandButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CommandPanel>
        </CommandSection>
      )}

      <Dialog open={!!pendingLogoPreview} onOpenChange={(open) => { if (!open) cancelLogoPreview(); }}>
        <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle>Confirm Logo</DialogTitle>
            <DialogDescription className="text-zinc-400">Preview your new logo before saving.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <Avatar className="h-32 w-32 rounded-none border border-white/10">
              <AvatarImage src={pendingLogoPreview || ''} />
              <AvatarFallback className="rounded-none bg-rose-500 text-3xl text-white">{name ? name[0].toUpperCase() : 'O'}</AvatarFallback>
            </Avatar>
          </div>
          <DialogFooter>
            <CommandButton variant="secondary" onClick={cancelLogoPreview}>Cancel</CommandButton>
            <CommandButton onClick={confirmLogoUpload} disabled={uploadingLogo}>{uploadingLogo ? 'Saving...' : 'Confirm'}</CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingBannerPreview} onOpenChange={(open) => { if (!open) cancelBannerPreview(); }}>
        <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Banner</DialogTitle>
            <DialogDescription className="text-zinc-400">Preview your new banner before saving.</DialogDescription>
          </DialogHeader>
          <div className="h-40 border border-white/10 bg-cover bg-center" style={pendingBannerPreview ? { backgroundImage: `url(${pendingBannerPreview})` } : undefined} />
          <DialogFooter>
            <CommandButton variant="secondary" onClick={cancelBannerPreview}>Cancel</CommandButton>
            <CommandButton onClick={confirmBannerUpload} disabled={uploadingBanner}>{uploadingBanner ? 'Saving...' : 'Confirm'}</CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {hasUnsavedChanges && (
        <CommandActionBar className="sticky bottom-4 z-40">
          <div className="flex items-center gap-2 text-sm text-amber-300">
            <Save className="h-4 w-4" />
            You have unsaved organization changes
          </div>
          <CommandButton onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </CommandButton>
        </CommandActionBar>
      )}
    </motion.div>
  );
};

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">{title}</p>
      <h3 className="mt-1 text-xl font-black uppercase text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

function Field({ label, htmlFor, children, className }: { label: string; htmlFor: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</Label>
      {children}
    </div>
  );
}

export default OrganizationSettings;
