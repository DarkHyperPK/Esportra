import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Globe, Twitter, Instagram, Youtube, Link2, Calendar, Users, MapPin, Search, ArrowRight, ImageIcon, Play, Loader2, Award, Zap, CheckCircle2, Building2, Folder, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '@/components/Footer';
import { TournamentCard } from '@/components/TournamentCard';

const OrganizationPublicProfile = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedMediaItem, setSelectedMediaItem] = useState<any | null>(null);
    const [activeAlbum, setActiveAlbum] = useState<any | null>(null);

    const ensureHttps = (url: string) => url.startsWith('http') ? url : `https://${url}`;

    // Fetch Organization
    const { data: org, isLoading: orgLoading } = useQuery({
        queryKey: ['org-public-profile', slug],
        queryFn: async () => {
            return await apiClient.get(`/api/organizations/by-slug/${slug}`);
        },
        enabled: !!slug,
    });

    // Fetch Tournaments
    const { data: tournaments, isLoading: tournamentsLoading } = useQuery({
        queryKey: ['org-tournaments', org?.id],
        queryFn: async () => {
            return await apiClient.get(`/api/organizations/${org.id}/tournaments`);
        },
        enabled: !!org?.id,
    });

    // Fetch Albums
    const { data: albums } = useQuery({
        queryKey: ['org-albums', org?.id],
        queryFn: async () => {
            const data: any[] = await apiClient.get(`/api/organizations/${org.id}/albums`);
            return data?.map((album: any) => ({
                ...album,
                cover_url: album.media?.[0]?.url || null
            })) || [];
        },
        enabled: !!org?.id
    });

    // Fetch Media
    // We fetch all media and filter client side for smooth transition
    const { data: media, isLoading: mediaLoading } = useQuery({
        queryKey: ['org-media', org?.id],
        queryFn: async () => {
            return await apiClient.get(`/api/organizations/${org.id}/media`);
        },
        enabled: !!org?.id,
    });

    const activeTournaments = tournaments?.filter(t => ['open', 'ongoing'].includes(t.status)) || [];
    const pastTournaments = tournaments?.filter(t => ['completed', 'cancelled'].includes(t.status)) || [];

    if (orgLoading) {
        return (
            <div className="min-h-screen bg-[#050507] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-esports-accent animate-spin" />
            </div>
        );
    }

    if (!org) {
        return (
            <div className="min-h-screen bg-[#050507] text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-heading mb-4">Organization Not Found</h1>
                <p className="text-gray-400 mb-8">The organization you are looking for does not exist.</p>
                <Button onClick={() => navigate('/')} variant="outline" className="border-white/10">Go Home</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050507] text-white font-body">

            {/* ── HERO V2 ───────────────────────────────────────────────── */}
            <div className="relative overflow-hidden" style={{ minHeight: '520px' }}>
                {/* Banner */}
                <div className="absolute inset-0 z-0">
                    {org.banner_url ? (
                        <img src={org.banner_url} alt="" className="w-full h-full object-cover scale-105" style={{ filter: 'brightness(0.45) saturate(1.2)' }} />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0e0e14] via-[#0a0a0c] to-[#050507]" />
                    )}
                    {/* Multi-layer atmospheric gradients */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/90 via-transparent to-[#050507]/60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/30 to-transparent" />
                    {/* Accent glow from top-left */}
                    <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #f43f5e 0%, transparent 70%)' }} />
                </div>

                {/* Back button */}
                <div className="absolute top-6 left-4 md:left-8 z-20">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                </div>

                {/* Hero content */}
                <div className="relative z-10 container mx-auto px-4 md:px-8 flex flex-col justify-end" style={{ minHeight: '520px', paddingBottom: '48px' }}>
                    <div className="flex flex-col md:flex-row md:items-end gap-8 md:gap-10">

                        {/* Logo with glow ring */}
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="flex-shrink-0"
                        >
                            <div className="relative w-28 h-28 md:w-36 md:h-36">
                                {/* Glow ring */}
                                <div className="absolute -inset-1 rounded-3xl opacity-50" style={{ background: 'linear-gradient(135deg, #f43f5e, #7c3aed)', filter: 'blur(8px)' }} />
                                <div className="relative w-full h-full rounded-3xl bg-[#0a0a0c] border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                                    {org.logo_url ? (
                                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 className="w-12 h-12 text-gray-700" />
                                    )}
                                </div>
                                {org.is_verified && (
                                    <div className="absolute -bottom-1 -right-1 bg-esports-accent rounded-full p-1 border-2 border-[#050507]">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Name, slug, description, stats */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.15, duration: 0.5 }}
                            className="flex-grow space-y-3 md:space-y-4"
                        >
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-4xl md:text-6xl font-heading font-bold leading-none tracking-tight drop-shadow-lg">{org.name}</h1>
                                    {org.is_verified && (
                                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-esports-accent/15 text-esports-accent border border-esports-accent/30">
                                            <CheckCircle2 className="w-3 h-3" /> Verified
                                        </span>
                                    )}
                                </div>
                                <p className="text-white/40 mt-1 text-sm font-mono">@{org.slug}</p>
                            </div>

                            {org.description && (
                                <p className="text-white/60 text-sm md:text-base max-w-xl leading-relaxed line-clamp-2">{org.description}</p>
                            )}

                            {/* Stat pills */}
                            <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/8 backdrop-blur-sm">
                                    <Trophy className="w-4 h-4 text-yellow-400" />
                                    <span className="text-sm font-semibold">{tournaments?.length || 0}</span>
                                    <span className="text-xs text-white/40">Tournaments</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-esports-accent/10 border border-esports-accent/20 backdrop-blur-sm">
                                    <Zap className="w-4 h-4 text-esports-accent" />
                                    <span className="text-sm font-semibold text-esports-accent">{activeTournaments.length}</span>
                                    <span className="text-xs text-white/40">Active</span>
                                </div>
                            </div>

                            {/* Social links */}
                            <div className="flex items-center flex-wrap gap-2 pt-1">
                                {org.social_links?.website && (
                                    <a href={ensureHttps(org.social_links.website)} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white/60 hover:text-white transition-all text-xs font-medium">
                                        <Globe className="w-3.5 h-3.5" /> Website
                                    </a>
                                )}
                                {org.social_links?.twitter && (
                                    <a href={`https://twitter.com/${org.social_links.twitter.replace('@', '')}`} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 hover:text-sky-300 transition-all text-xs font-medium">
                                        <Twitter className="w-3.5 h-3.5" /> Twitter
                                    </a>
                                )}
                                {org.social_links?.instagram && (
                                    <a href={`https://instagram.com/${org.social_links.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-400 hover:text-pink-300 transition-all text-xs font-medium">
                                        <Instagram className="w-3.5 h-3.5" /> Instagram
                                    </a>
                                )}
                                {org.social_links?.youtube && (
                                    <a href={`https://youtube.com/@${org.social_links.youtube.replace('@', '')}`} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all text-xs font-medium">
                                        <Youtube className="w-3.5 h-3.5" /> YouTube
                                    </a>
                                )}
                                {org.social_links?.discord && (
                                    <a href={ensureHttps(org.social_links.discord)} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all text-xs font-medium">
                                        <Link2 className="w-3.5 h-3.5" /> Discord
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
            {/* ── END HERO V2 ───────────────────────────────────────────── */}

            {/*
            ── HERO V1 (backup) ────────────────────────────────────────────
            <div className="relative h-[300px] md:h-[400px]">
                <div className="absolute inset-0 z-0">
                    {org.banner_url ? (
                        <img src={org.banner_url} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#111] to-[#050507]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/60 to-transparent" />
                </div>
                <div className="absolute inset-0 container mx-auto px-4 flex flex-col justify-end pb-8 z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-[#0a0a0c] border-4 border-[#050507] overflow-hidden shadow-2xl flex items-center justify-center">
                                {org.logo_url ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" /> : <Building2 className="w-16 h-16 text-gray-700" />}
                            </div>
                            {org.is_verified && (<div className="absolute -bottom-2 -right-2 bg-esports-accent text-black p-1.5 rounded-full border-4 border-[#050507]"><CheckCircle2 className="w-5 h-5" /></div>)}
                        </motion.div>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex-grow mb-2">
                            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-2 tracking-tight">{org.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm">
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">@{org.slug}</span>
                                {org.social_links?.website && <a href={ensureHttps(org.social_links.website)} target="_blank" rel="noreferrer" className="hover:text-esports-accent transition-colors flex items-center gap-1"><Globe className="w-4 h-4" /> Website</a>}
                                {org.social_links?.twitter && <a href={`https://twitter.com/${org.social_links.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:text-blue-400 transition-colors"><Twitter className="w-4 h-4" /></a>}
                                {org.social_links?.instagram && <a href={`https://instagram.com/${org.social_links.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:text-pink-400 transition-colors"><Instagram className="w-4 h-4" /></a>}
                                {org.social_links?.youtube && <a href={`https://youtube.com/@${org.social_links.youtube.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:text-red-400 transition-colors"><Youtube className="w-4 h-4" /></a>}
                                {org.social_links?.discord && <a href={ensureHttps(org.social_links.discord)} target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors"><Link2 className="w-4 h-4" /></a>}
                            </div>
                        </motion.div>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-6 mb-2">
                            <div className="text-center"><p className="text-2xl font-bold font-heading">{tournaments?.length || 0}</p><p className="text-xs uppercase tracking-wider text-gray-500">Tournaments</p></div>
                            <div className="text-center"><p className="text-2xl font-bold font-heading text-esports-accent">{activeTournaments.length}</p><p className="text-xs uppercase tracking-wider text-gray-500">Active</p></div>
                        </motion.div>
                    </div>
                </div>
            </div>
            ── END HERO V1 ──────────────────────────────────────────────────
            */}

            {/* Main Content */}
            <div className="container mx-auto px-4 py-12">
                <Tabs defaultValue="tournaments" className="w-full">
                    <TabsList className="bg-transparent border-b border-white/10 w-full justify-start rounded-none p-0 mb-8 h-auto">
                        <TabsTrigger
                            value="tournaments"
                            className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-esports-accent data-[state=active]:bg-transparent data-[state=active]:text-esports-accent text-lg font-medium text-gray-400 transition-all"
                        >
                            Tournaments
                        </TabsTrigger>
                        <TabsTrigger
                            value="media"
                            className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-esports-accent data-[state=active]:bg-transparent data-[state=active]:text-esports-accent text-lg font-medium text-gray-400 transition-all"
                        >
                            Media Gallery
                        </TabsTrigger>
                        <TabsTrigger
                            value="about"
                            className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-esports-accent data-[state=active]:bg-transparent data-[state=active]:text-esports-accent text-lg font-medium text-gray-400 transition-all"
                        >
                            About
                        </TabsTrigger>
                    </TabsList>

                    {/* Tournaments Tab */}
                    <TabsContent value="tournaments" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Active */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <Zap className="w-6 h-6 text-esports-accent" />
                                <h2 className="text-2xl font-heading font-bold">Active Tournaments</h2>
                            </div>

                            {activeTournaments.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeTournaments.map(t => (
                                        <TournamentCard
                                            key={t.id}
                                            id={t.id}
                                            name={t.name}
                                            game={t.game}
                                            date={t.start_date ? new Date(t.start_date).toLocaleDateString('en-CA') : ''}
                                            time={t.start_date ? new Date(t.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                                            venue={t.settings?.venue || (t.is_online ? 'Online' : 'TBD')}
                                            max_participants={t.max_participants || t.max_teams || 0}
                                            current_participants={t.participant_count || 0}
                                            status={t.status}
                                            team_size={t.team_size || 1}
                                            prize_pool={t.prize_pool?.toString() || '0'}
                                            entry_fee={t.entry_fee?.toString() || 'Free'}
                                            is_online={t.is_online}
                                            image_url={t.banner_url || t.logo_url}
                                            slug={t.slug}
                                            organizer_name={t.organization_name}
                                            organizer_id={t.organizer_owner_id}
                                            currentUserId={user?.id}
                                            start_date={t.start_date}
                                            end_date={t.end_date}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 rounded-3xl border border-white/5 bg-[#0a0a0c] text-center">
                                    <p className="text-gray-500">No active tournaments right now.</p>
                                </div>
                            )}
                        </section>

                        {/* Past */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <Trophy className="w-6 h-6 text-gray-500" />
                                <h2 className="text-2xl font-heading font-bold text-gray-300">Past Tournaments</h2>
                            </div>

                            {pastTournaments.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                                    {pastTournaments.map(t => (
                                        <TournamentCard
                                            key={t.id}
                                            id={t.id}
                                            name={t.name}
                                            game={t.game}
                                            date={t.start_date ? new Date(t.start_date).toLocaleDateString('en-CA') : ''}
                                            time={t.start_date ? new Date(t.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                                            venue={t.settings?.venue || (t.is_online ? 'Online' : 'TBD')}
                                            max_participants={t.max_participants || t.max_teams || 0}
                                            current_participants={t.participant_count || 0}
                                            status={t.status}
                                            team_size={t.team_size || 1}
                                            prize_pool={t.prize_pool?.toString() || '0'}
                                            entry_fee={t.entry_fee?.toString() || 'Free'}
                                            is_online={t.is_online}
                                            image_url={t.banner_url || t.logo_url}
                                            slug={t.slug}
                                            organizer_name={t.organization_name}
                                            organizer_id={t.organizer_owner_id}
                                            currentUserId={user?.id}
                                            start_date={t.start_date}
                                            end_date={t.end_date}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-600 ml-2">No past tournaments.</p>
                            )}
                        </section>
                    </TabsContent>

                    {/* Media Tab */}
                    <TabsContent value="media" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {mediaLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => <div key={i} className="aspect-video bg-white/5 animate-pulse rounded-xl" />)}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Header / Breadcrumb */}
                                {activeAlbum && (
                                    <div className="flex items-center gap-4 mb-6">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setActiveAlbum(null)}
                                            className="rounded-full border-white/10 hover:bg-white/10"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                        </Button>
                                        <div>
                                            <h3 className="text-2xl font-heading font-bold">{activeAlbum.title}</h3>
                                            {activeAlbum.description && <p className="text-gray-400">{activeAlbum.description}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Albums Grid (Only show if no active album) */}
                                {!activeAlbum && albums && albums.length > 0 && (
                                    <div className="mb-10">
                                        <h4 className="text-lg font-bold font-heading mb-4 flex items-center gap-2 text-gray-300">
                                            <Folder className="text-esports-accent w-5 h-5" /> Albums
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {albums.map((album: any) => (
                                                <div
                                                    key={album.id}
                                                    onClick={() => setActiveAlbum(album)}
                                                    className="group cursor-pointer relative aspect-square rounded-2xl overflow-hidden border border-white/5 bg-[#0a0a0c] hover:border-esports-accent/50 transition-all hover:scale-[1.02]"
                                                >
                                                    {/* Stack Icon */}
                                                    <div className="absolute top-3 right-3 z-20">
                                                        <div className="p-1.5 rounded-md bg-black/60 backdrop-blur-sm">
                                                            <ImageIcon className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>

                                                    {/* Cover */}
                                                    {album.cover_url ? (
                                                        <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                                                            <Folder className="w-12 h-12 text-gray-700 mb-2 group-hover:text-esports-accent transition-colors" />
                                                            <span className="text-xs text-gray-500 font-medium">Empty Album</span>
                                                        </div>
                                                    )}

                                                    {/* Overlay */}
                                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                                                        <h3 className="font-bold text-lg text-white truncate group-hover:text-esports-accent transition-colors">{album.title}</h3>
                                                        <p className="text-xs text-gray-300">{new Date(album.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Photos Grid */}
                                <div>
                                    {!activeAlbum && (
                                        <h4 className="text-lg font-bold font-heading mb-4 flex items-center gap-2 text-gray-300">
                                            <ImageIcon className="text-gray-500 w-5 h-5" /> {albums && albums.length > 0 ? 'All Photos' : 'Gallery'}
                                        </h4>
                                    )}

                                    {media && media.length > 0 ? (
                                        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                                            {media
                                                .filter((m: any) => activeAlbum ? m.album_id === activeAlbum.id : true)
                                                .map((item: any) => (
                                                    <div
                                                        key={item.id}
                                                        className="break-inside-avoid relative group rounded-2xl overflow-hidden cursor-zoom-in border border-white/5 bg-[#0a0a0c]"
                                                        onClick={() => setSelectedMediaItem(item)}
                                                    >
                                                        <img src={item.url} alt={item.caption} className="w-full h-auto hover:scale-105 transition-transform duration-500" />
                                                        {item.caption && (
                                                            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <p className="text-sm font-medium">{item.caption}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                            {media.filter((m: any) => activeAlbum ? m.album_id === activeAlbum.id : true).length === 0 && (
                                                <div className="col-span-full py-12 text-center text-gray-500">
                                                    No photos in this album.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-20 text-center border border-white/5 rounded-3xl bg-[#0a0a0c]">
                                            <ImageIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                            <p className="text-gray-500">No media uploaded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* About Tab */}
                    <TabsContent value="about" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 p-8 rounded-3xl bg-[#0a0a0c] border border-white/5">
                                <h3 className="text-xl font-bold font-heading mb-4">About {org.name}</h3>
                                <div className="prose prose-invert max-w-none text-gray-400 leading-relaxed">
                                    {org.description ? (
                                        <p className="whitespace-pre-line">{org.description}</p>
                                    ) : (
                                        <p className="italic text-gray-600">No description available.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 rounded-3xl bg-[#0a0a0c] border border-white/5">
                                    <h3 className="text-lg font-bold font-heading mb-4">Connect</h3>
                                    <div className="space-y-4">
                                        {org.social_links?.website && (
                                            <a href={ensureHttps(org.social_links.website)} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                <span className="flex items-center gap-3 text-gray-300"><Globe className="w-4 h-4" /> Website</span>
                                                <ArrowRight className="w-4 h-4 text-gray-500" />
                                            </a>
                                        )}
                                        {org.social_links?.twitter && (
                                            <a href={`https://twitter.com/${org.social_links.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                <span className="flex items-center gap-3 text-gray-300"><Twitter className="w-4 h-4 text-blue-400" /> Twitter / X</span>
                                                <ArrowRight className="w-4 h-4 text-gray-500" />
                                            </a>
                                        )}
                                        {org.social_links?.instagram && (
                                            <a href={`https://instagram.com/${org.social_links.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                <span className="flex items-center gap-3 text-gray-300"><Instagram className="w-4 h-4 text-pink-400" /> Instagram</span>
                                                <ArrowRight className="w-4 h-4 text-gray-500" />
                                            </a>
                                        )}
                                        {org.social_links?.youtube && (
                                            <a href={`https://youtube.com/@${org.social_links.youtube.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                <span className="flex items-center gap-3 text-gray-300"><Youtube className="w-4 h-4 text-red-400" /> YouTube</span>
                                                <ArrowRight className="w-4 h-4 text-gray-500" />
                                            </a>
                                        )}
                                        {org.social_links?.discord && (
                                            <a href={ensureHttps(org.social_links.discord)} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                <span className="flex items-center gap-3 text-gray-300"><Link2 className="w-4 h-4 text-indigo-400" /> Discord</span>
                                                <ArrowRight className="w-4 h-4 text-gray-500" />
                                            </a>
                                        )}
                                        {!org.social_links?.website && !org.social_links?.twitter && !org.social_links?.instagram && !org.social_links?.youtube && !org.social_links?.discord && (
                                            <p className="text-sm text-gray-600 italic">No social links added yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <Footer />

            {/* Lightbox */}
            {selectedMediaItem && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl" onClick={() => setSelectedMediaItem(null)}>
                    <img
                        src={selectedMediaItem.url}
                        alt="Full size"
                        className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    {selectedMediaItem.caption && (
                        <div className="absolute bottom-8 left-0 right-0 text-center text-white/90">
                            <p className="inline-block bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">{selectedMediaItem.caption}</p>
                        </div>
                    )}
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300 bg-white/10 p-2 rounded-full" onClick={() => setSelectedMediaItem(null)}>
                        <ArrowRight className="w-6 h-6 rotate-45" />
                    </button>
                </div>
            )}
        </div>
    );
};


export default OrganizationPublicProfile;
