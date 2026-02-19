import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Eye, Edit, Trash2, MapPin, Plus, Building2 } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  location?: string;
  city: string;
  address: string;
  owner?: string;
  status?: 'active' | 'pending' | 'closed';
  stations: number;
  hourlyRate?: string;
  price_range?: string;
  user_id: string;
  description: string;
  hours: string;
  games: string;
  contact_email: string;
  contact_phone: string;
}

const AdminVenuesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Venue>>({});

  const fetchVenues = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('venues')
        .select('*');

      if (error) throw error;

      setVenues(data || []);
      setError(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('Error fetching venues:', e);
      setError(e.message || 'Failed to load venues');
      toast({
        title: 'Error',
        description: `Failed to load venues: ${e.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues, toast]);

  const handleEditVenue = (venue: Venue) => {
    setEditingVenue(venue);
    setFormData(venue);
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenue) return;

    try {
      const { error } = await supabase
        .from('venues')
        .update({
          name: formData.name,
          city: formData.city,
          address: formData.address,
          description: formData.description,
          stations: parseInt(String(formData.stations)) || 0,
          hours: formData.hours,
          games: formData.games,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          price_range: formData.price_range
        })
        .eq('id', editingVenue.id);

      if (error) throw error;

      toast({
        title: 'Venue Updated',
        description: 'The venue has been updated successfully.',
      });

      setIsEditModalOpen(false);
      fetchVenues();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: 'Error',
        description: `Failed to update venue: ${e.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this venue?')) {
      try {
        const { error } = await supabase
          .from('venues')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Venue Deleted',
          description: 'The venue has been deleted successfully.',
        });

        fetchVenues();
      } catch (err: unknown) {
        const e = err as { message?: string };
        toast({
          title: 'Error',
          description: `Failed to delete venue: ${e.message || 'Unknown error'}`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleCreateVenue = () => {
    navigate('/venues/list-venue');
  };

  const filteredVenues = venues.filter(venue =>
    venue.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Venues Management</h2>
            <p className="text-zinc-500 text-sm">Manage all gaming venues and their details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-rose-500 w-64"
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            className="bg-rose-500 hover:bg-rose-600 text-white"
            onClick={handleCreateVenue}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Venue
          </Button>
        </div>
      </div>

      {/* Venues Table */}
      <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-400 p-8 text-center">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-900/50">
                  <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Venue</th>
                  <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Stations</th>
                  <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Price Range</th>
                  <th className="px-6 py-3 text-right text-xs font-mono text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredVenues.length > 0 ? (
                  filteredVenues.map((venue, idx) => (
                    <motion.tr
                      key={venue.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-zinc-900/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{venue.name}</p>
                            <p className="text-xs text-zinc-500 font-mono">{venue.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{`${venue.city}, ${venue.address}`}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs">
                          {venue.stations} stations
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-400">{venue.price_range || '$10-20/hr'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-rose-500">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-blue-400"
                            onClick={() => handleEditVenue(venue)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-red-500"
                            onClick={() => handleDeleteVenue(venue.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-zinc-500">
                      No venues found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              Edit Venue
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateVenue}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Name</label>
                <Input
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Price Range</label>
                <Input
                  name="price_range"
                  value={formData.price_range || ''}
                  onChange={handleInputChange}
                  className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                  placeholder="e.g. $10-20/hr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">City</label>
                <Input
                  name="city"
                  value={formData.city || ''}
                  onChange={handleInputChange}
                  className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Address</label>
                <Input
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-zinc-400">Description</label>
              <Textarea
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Gaming Stations</label>
                <Input
                  name="stations"
                  type="number"
                  value={formData.stations || ''}
                  onChange={handleInputChange}
                  className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Hours</label>
                <Input
                  name="hours"
                  value={formData.hours || ''}
                  onChange={handleInputChange}
                  className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Games</label>
                <Input
                  name="games"
                  value={formData.games || ''}
                  onChange={handleInputChange}
                  className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Contact Email</label>
                <Input
                  name="contact_email"
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={handleInputChange}
                  className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-400">Contact Phone</label>
                <Input
                  name="contact_phone"
                  value={formData.contact_phone || ''}
                  onChange={handleInputChange}
                  className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="border-zinc-800 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                Update Venue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVenuesList;
