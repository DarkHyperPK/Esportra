
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Edit, Trash2, MapPin, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { VenueEditModal } from '@/components/admin/VenueEditModal';

import { Venue } from '@/types/venue';

const ManageVenues = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [editVenue, setEditVenue] = useState<Venue | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchMyVenues();
        }
    }, [user]);

    const fetchMyVenues = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('venues')
                .select('*')
                .eq('owner_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setVenues(data || []);
        } catch (error: any) {
            console.error('Error fetching venues:', error);
            toast({
                title: "Error",
                description: "Failed to load your venues.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this venue? This cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from('venues')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({ title: "Venue Deleted", description: "The venue has been removed." });
            setVenues(venues.filter(v => v.id !== id));
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white">

            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">My Venues</h1>
                        <p className="text-gray-400">Manage your listed gaming centers</p>
                    </div>
                    <Button onClick={() => navigate('/venues/list-venue')} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="w-4 h-4 mr-2" /> List New Venue
                    </Button>
                </div>

                {venues.length === 0 ? (
                    <div className="text-center py-20 bg-[#0a0a0c] border border-white/5 rounded-2xl">
                        <h2 className="text-xl font-semibold mb-2">No Venues Listed</h2>
                        <p className="text-gray-500 mb-6">You haven't listed any venues yet.</p>
                        <Button onClick={() => navigate('/venues/list-venue')} variant="outline">
                            List Your First Venue
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {venues.map((venue) => (
                            <div key={venue.id} className="bg-[#0a0a0c] border border-white/5 rounded-xl overflow-hidden group hover:border-purple-500/30 transition-all">
                                <div className="h-48 bg-gray-900 relative">
                                    {venue.images && venue.images[0] ? (
                                        <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="secondary" onClick={() => {
                                            setEditVenue(venue); // Need key mapping if types differ, or reuse Modal logic
                                            setIsEditOpen(true);
                                        }}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="destructive" onClick={() => handleDelete(venue.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-lg font-bold mb-1">{venue.name}</h3>
                                    <div className="flex items-center text-sm text-gray-400 mb-4">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {venue.city}, {venue.country}
                                    </div>
                                    <Button variant="outline" className="w-full border-white/10 hover:bg-white/5" onClick={() => navigate(`/venues/${venue.slug}`)}>
                                        <Eye className="w-4 h-4 mr-2" /> View Public Page
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editVenue && (
                <VenueEditModal
                    isOpen={isEditOpen}
                    onClose={() => {
                        setIsEditOpen(false);
                        setEditVenue(null);
                    }}
                    venue={editVenue}
                    onVenueUpdated={() => {
                        fetchMyVenues();
                        setIsEditOpen(false);
                        setEditVenue(null);
                    }}
                />
            )}

            <Footer />
        </div>
    );
};

export default ManageVenues;
