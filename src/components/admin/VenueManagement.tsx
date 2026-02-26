
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Edit, Trash, Plus } from 'lucide-react';
import { VenueCard } from '@/components/venues/VenueCard';
import { VenueEditModal } from '@/components/admin/VenueEditModal';
import { auditLog } from '@/lib/auditLog';

import { Venue } from '@/types/venue';

interface VenueManagementProps {
  userId: string;
}

const VenueManagement = ({ userId }: VenueManagementProps) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', userId);

      if (error) {
        throw error;
      }

      setVenues(data || []);
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [userId]);

  const handleEditVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setIsEditModalOpen(true);
  };

  const handleDeleteVenue = async (id: string) => {
    if (confirm('Are you sure you want to delete this venue?')) {
      try {
        const venue = venues.find(v => v.id === id);
        const { error } = await supabase
          .from('venues')
          .delete()
          .eq('id', id);

        if (error) throw error;

        await auditLog.log('delete', 'venue', id, venue?.name || 'Unknown', { owner_id: userId });

        toast({
          title: 'Venue deleted',
          description: 'The venue has been deleted successfully',
        });

        // Refresh venues list
        fetchVenues();
      } catch (error: any) {
        console.error('Error deleting venue:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleCreateVenue = () => {
    navigate('/venues/list-venue');
  };

  const handleVenueUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedVenue(null);
    fetchVenues();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Venues</h2>
        <Button
          className="bg-gaming-purple hover:bg-gaming-purple/80"
          onClick={handleCreateVenue}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Venue
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Loading...
            </span>
          </div>
        </div>
      ) : venues.length === 0 ? (
        <div className="bg-gaming-dark border border-gaming-gray/30 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">You haven't listed any venues yet</p>
          <Button
            className="bg-gaming-purple hover:bg-gaming-purple/80"
            onClick={handleCreateVenue}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Venue
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <div key={venue.id} className="relative group">
              <VenueCard venue={venue} />
              <div className="absolute inset-0 bg-black bg-opacity-70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity duration-200 rounded-3xl z-30">
                <Button
                  size="sm"
                  onClick={() => handleEditVenue(venue)}
                  className="bg-gaming-blue hover:bg-gaming-blue/80"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteVenue(venue.id)}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVenue && (
        <VenueEditModal
          venue={selectedVenue}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedVenue(null);
          }}
          onVenueUpdated={handleVenueUpdated}
        />
      )}
    </div>
  );
};

export default VenueManagement;
