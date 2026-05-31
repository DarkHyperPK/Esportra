import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Globe, Twitter, Instagram, Youtube, Link2, ArrowRight, ImageIcon, Loader2, Zap, CheckCircle2, Building2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
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
    const { data: tournaments, isLoading: _tournamentsLoading } = useQuery({
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
            {/* Hero Header */}
            <div className="relative h-[300px] md:h-[400px]">
                {/* Banner with Gradient Overlay */}
                <div className="absolute inset-0 z-0">
                    {org.banner_url ? (
                        <img src={org.banner_url} loading="lazy" alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#111] to-[#050507]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/60 to-transparent" />
                </div>

                {/* Content Container */}
                <div className="absolute inset-0 container mx-auto px-4 flex flex-col justify-end pb-8 z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8">
                        {/* Logo */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="relative"
                        >
                            <div className="w-32 h-32 md:w-40 md:h-40 bg-[#0a0a0c] border-4 border-[#050507] overflow-hidden flex items-center justify-center">
                                {org.logo_url ? (
                                    <img src={org.logo_url} loading="lazy" alt={org.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-16 h-16 text-gray-700" />
                                )}
                            </div>
                            {org.is_verified && (
                                <div className="absolute -bottom-2 -right-2 bg-esports-accent text-black p-1.5 rounded-full border-4 border-[#050507]">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            )}
                        </motion.div>

                        {/* Info */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="flex-grow mb-2"
                        >
                            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-2 tracking-tight">{org.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm">
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                    @{org.slug}
                                </span>
                                {org.social_links?.website && (
                                    <a href={ensureHttps(org.social_links.website)} target="_blank" rel="noreferrer" className="hover:text-esports-accent transition-colors flex items-center gap-1">
                                        <Globe className="w-4 h-4" /> Website
                                    </a>
                                )}
                                {org.social_links?.twitter && (
                                    <a href={`https://twitter.com/${org.social_links.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:text-blue-400 transition-colors">
                                        <Twitter className="w-4 h-4" />
                                    </a>
                                )}
                                {org.social_links?.instagram && (
                                    <a href={`https://instagram.com/${org.social_links.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:text-pink-400 transition-colors">
                                        <Instagram className="w-4 h-4" />
                                    </a>
                                )}
                                {org.social_links?.youtube && (
                                    <a href={`https://youtube.com/@${org.social_links.youtube.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:text-red-400 transition-colors">
                                        <Youtube className="w-4 h-4" />
                                    </a>
                                )}
                                {org.social_links?.discord && (
                                    <a href={ensureHttps(org.social_links.discord)} target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">
                                        <Link2 className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex gap-6 mb-2"
                        >
                            <div className="text-center">
                                <p className="text-2xl font-bold font-heading">{tournaments?.length || 0}</p>
                                <p className="text-xs uppercase tracking-wider text-gray-500">Tournaments</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold font-heading text-esports-accent">{activeTournaments.length}</p>
                                <p className="text-xs uppercase tracking-wider text-gray-500">Active</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

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
                                            image_url={t.banner_url || undefined}
                                            slug={t.slug}
                                            organizer_name={t.organization_name}
                                            organizer_id={t.organizer_owner_id}
                                            currentUserId={user?.id}
                                            start_date={t.start_date}
                                            end_date={t.end_date}
                                            currency={t.currency}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 border border-white/5 bg-[#0a0a0c] text-center">
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
                                            image_url={t.banner_url || undefined}
                                            slug={t.slug}
                                            organizer_name={t.organization_name}
                                            organizer_id={t.organizer_owner_id}
                                            currentUserId={user?.id}
                                            start_date={t.start_date}
                                            end_date={t.end_date}
                                            winner_name={t.winner_team_name}
                                            currency={t.currency}
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
                                                    className="group cursor-pointer relative aspect-square overflow-hidden border border-white/5 bg-[#0a0a0c] hover:border-rose-500/50 transition-all hover:scale-[1.02]"
                                                >
                                                    {/* Stack Icon */}
                                                    <div className="absolute top-3 right-3 z-20">
                                                        <div className="p-1.5 rounded-md bg-black/60 backdrop-blur-sm">
                                                            <ImageIcon className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>

                                                    {/* Cover */}
                                                    {album.cover_url ? (
                                                        <img src={album.cover_url} loading="lazy" alt={album.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
                                                        className="break-inside-avoid relative group overflow-hidden cursor-zoom-in border border-white/5 bg-[#0a0a0c]"
                                                        onClick={() => setSelectedMediaItem(item)}
                                                    >
                                                        <img src={item.url} loading="lazy" alt={item.caption} className="w-full h-auto hover:scale-105 transition-transform duration-500" />
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
                                        <div className="p-20 text-center border border-white/5 bg-[#0a0a0c]">
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
                            <div className="lg:col-span-2 p-8 bg-[#0a0a0c] border border-white/5">
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
                                <div className="p-6 bg-[#0a0a0c] border border-white/5">
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
