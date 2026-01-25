import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Image as ImageIcon, MessageSquare, Award } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

const PublicProfile = () => {
    const { userId } = useParams<{ userId: string }>();

    // Fetch Profile
    const { data: profile } = useQuery({
        queryKey: ['organizer-public-profile', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });

    // Fetch Tournaments
    const { data: tournaments } = useQuery({
        queryKey: ['organizer-tournaments', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    if (!profile) return <div className="text-white p-20 text-center">Loading Profile...</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Hero Layer */}
            <div className="h-80 bg-gradient-to-br from-esports-primary/20 via-black to-black relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050505] to-transparent"></div>
            </div>

            <div className="container mx-auto px-4 -mt-32 relative z-10">
                <div className="flex flex-col md:flex-row items-end gap-8 mb-12">
                    {/* Avatar */}
                    <div className="w-40 h-40 rounded-3xl bg-zinc-900 border-4 border-[#050505] overflow-hidden flex items-center justify-center">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl font-black text-zinc-700">{profile.username?.charAt(0).toUpperCase()}</span>
                        )}
                    </div>

                    {/* Identity */}
                    <div className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-black tracking-tighter text-white">{profile.username}</h1>
                            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono uppercase tracking-widest rounded-full flex items-center gap-2">
                                <Award className="w-3 h-3" /> Verified Organizer
                            </div>
                        </div>
                        <p className="text-gray-400 max-w-xl">{profile.bio || "This organizer has not drafted a bio yet."}</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex-1 flex justify-end gap-12 pb-6">
                        <div className="text-center">
                            <p className="text-3xl font-black text-white">{tournaments?.length || 0}</p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Events Hosted</p>
                        </div>
                        <div className="text-center opacity-50">
                            <p className="text-3xl font-black text-white">4.9</p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Reputation</p>
                        </div>
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="tournaments" className="w-full">
                    <TabsList className="bg-transparent border-b border-white/10 w-full justify-start h-auto p-0 gap-8 mb-12">
                        {['Tournaments', 'Community Reviews', 'Media Gallery'].map(tab => (
                            <TabsTrigger
                                key={tab}
                                value={tab.toLowerCase().split(' ')[0]}
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-esports-primary data-[state=active]:text-esports-primary bg-transparent px-0 py-4 text-sm font-mono tracking-widest uppercase text-gray-500 hover:text-white transition-colors"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="tournaments" className="space-y-8 animated-tab-content">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tournaments?.map((tourney: any) => (
                                <Card key={tourney.id} className="bg-[#0a0a0c] border-white/10 hover:border-esports-primary/30 transition-all group overflow-hidden">
                                    <div className="h-48 bg-zinc-900 relative">
                                        {tourney.image_url && (
                                            <img src={tourney.image_url} alt={tourney.name} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur border border-white/10 text-white`}>
                                                {tourney.status}
                                            </span>
                                        </div>
                                    </div>
                                    <CardContent className="p-6">
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-esports-primary transition-colors truncate">{tourney.name}</h3>
                                        <div className="flex justify-between items-center text-sm text-gray-500 font-mono mt-4">
                                            <span className="flex items-center gap-2"><Trophy className="w-4 h-4" /> {tourney.prize_pool}</span>
                                            <span>{new Date(tourney.date).toLocaleDateString()}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="community" className="min-h-[300px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-[#0a0a0c]">
                        <MessageSquare className="w-12 h-12 text-zinc-800 mb-4" />
                        <p className="text-zinc-600 font-mono text-sm">NO_REVIEWS_LOGGED</p>
                    </TabsContent>

                    <TabsContent value="media" className="min-h-[300px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-[#0a0a0c]">
                        <ImageIcon className="w-12 h-12 text-zinc-800 mb-4" />
                        <p className="text-zinc-600 font-mono text-sm">MEDIA_ARCHIVE_EMPTY</p>
                    </TabsContent>
                </Tabs>

            </div>
        </div>
    );
};

export default PublicProfile;
