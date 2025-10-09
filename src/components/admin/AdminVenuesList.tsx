
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Eye, Edit, Trash2, MapPin, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-green-400" />
            Venues Management
          </h2>
          <p className="text-gray-400">Manage all gaming venues and their details</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              className="pl-10 bg-gray-700 border-gray-600 text-white"
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleCreateVenue}
          >
            <Plus size={18} className="mr-2" />
            Add Venue
          </Button>
        </div>
      </div>
      
      {/* Venues Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Name</TableHead>
                    <TableHead className="text-gray-300">Location</TableHead>
                    <TableHead className="text-gray-300">Stations</TableHead>
                    <TableHead className="text-gray-300">Price Range</TableHead>
                    <TableHead className="text-right text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVenues.length > 0 ? (
                    filteredVenues.map(venue => (
                      <TableRow key={venue.id} className="border-gray-700 hover:bg-gray-700/30">
                        <TableCell className="font-medium text-white">{venue.name}</TableCell>
                        <TableCell className="text-gray-300">{`${venue.city}, ${venue.address}`}</TableCell>
                        <TableCell className="text-white">{venue.stations}</TableCell>
                        <TableCell className="text-gray-300">{venue.price_range || '$10-20/hr'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                              <Eye size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-gray-400 hover:text-blue-400"
                              onClick={() => handleEditVenue(venue)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-gray-400 hover:text-red-500"
                              onClick={() => handleDeleteVenue(venue.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                        No venues found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Venue</DialogTitle>
          </DialogHeader>
            <form onSubmit={handleUpdateVenue}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price Range</label>
                  <Input
                    name="price_range"
                    value={formData.price_range || ''}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g. $10-20/hr"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <Input
                    name="city"
                    value={formData.city || ''}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <Input
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  className="bg-esports-dark"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Gaming Stations</label>
                  <Input
                    name="stations"
                    type="number"
                    value={formData.stations || ''}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hours</label>
                  <Input
                    name="hours"
                    value={formData.hours || ''}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Games</label>
                  <Input
                    name="games"
                    value={formData.games || ''}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Email</label>
                  <Input
                    name="contact_email"
                    type="email"
                    value={formData.contact_email || ''}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Phone</label>
                  <Input
                    name="contact_phone"
                    value={formData.contact_phone || ''}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
