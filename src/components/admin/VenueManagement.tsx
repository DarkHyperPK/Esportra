
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Edit, Trash, Plus, CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { VenueCard } from '@/components/venues/VenueCard';
import { VenueEditModal } from '@/components/admin/VenueEditModal';
import { auditLog } from '@/lib/auditLog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Venue } from '@/types/venue';

interface VenueManagementProps {
  userId: string;
}

interface PendingVenue extends Venue {
  owner_email?: string;
}

type Tab = 'my_venues' | 'pending_review';

const VenueManagement = ({ userId }: VenueManagementProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('my_venues');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [pendingVenues, setPendingVenues] = useState<PendingVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<PendingVenue | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', userId);
      if (error) throw error;
      setVenues(data || []);
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingVenues = async () => {
    try {
      setPendingLoading(true);
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      setPendingVenues(data || []);
    } catch (error: any) {
      console.error('Error fetching pending venues:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'pending_review') {
      fetchPendingVenues();
    }
  }, [activeTab]);

  const handleEditVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setIsEditModalOpen(true);
  };

  const handleDeleteVenue = async (id: string) => {
    if (!confirm('Are you sure you want to delete this venue?')) return;
    try {
      const venue = venues.find(v => v.id === id);
      const { error } = await supabase.from('venues').delete().eq('id', id);
      if (error) throw error;
      await auditLog.log('delete', 'venue', id, venue?.name || 'Unknown', { owner_id: userId });
      toast({ title: 'Venue deleted', description: 'The venue has been deleted successfully' });
      fetchVenues();
    } catch (error: any) {
      console.error('Error deleting venue:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleApprove = async (venue: PendingVenue) => {
    setActioning(venue.id);
    try {
      const { error } = await supabase
        .from('venues')
        .update({
          status: 'published',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        })
        .eq('id', venue.id);
      if (error) throw error;
      await auditLog.log('approve', 'venue', venue.id, venue.name, { reviewed_by: userId });
      toast({ title: 'Venue Approved', description: `${venue.name} is now published.` });
      setPendingVenues(prev => prev.filter(v => v.id !== venue.id));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActioning(rejectTarget.id);
    try {
      const { error } = await supabase
        .from('venues')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason.trim(),
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', rejectTarget.id);
      if (error) throw error;
      await auditLog.log('reject', 'venue', rejectTarget.id, rejectTarget.name, { reviewed_by: userId, reason: rejectReason });
      toast({ title: 'Venue Rejected', description: `${rejectTarget.name} has been rejected.` });
      setPendingVenues(prev => prev.filter(v => v.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActioning(null);
    }
  };

  const handleVenueUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedVenue(null);
    fetchVenues();
  };

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          <button
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'my_venues' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('my_venues')}
          >
            My Venues
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pending_review' ? 'bg-yellow-600/20 text-yellow-300' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('pending_review')}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Review
            {pendingVenues.length > 0 && activeTab !== 'pending_review' && (
              <span className="bg-yellow-500 text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendingVenues.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'my_venues' && (
          <Button className="bg-gaming-purple hover:bg-gaming-purple/80" onClick={() => navigate('/venues/list-venue')}>
            <Plus className="h-4 w-4 mr-2" /> Add New Venue
          </Button>
        )}
      </div>

      {/* My Venues Tab */}
      {activeTab === 'my_venues' && (
        <>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
          ) : venues.length === 0 ? (
            <div className="bg-gaming-dark border border-gaming-gray/30 rounded-lg p-8 text-center">
              <p className="text-gray-400 mb-4">You haven't listed any venues yet</p>
              <Button className="bg-gaming-purple hover:bg-gaming-purple/80" onClick={() => navigate('/venues/list-venue')}>
                <Plus className="h-4 w-4 mr-2" /> Add Your First Venue
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <div key={venue.id} className="relative group">
                  <VenueCard venue={venue} showStatus />
                  <div className="absolute inset-0 bg-black bg-opacity-70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity duration-200 rounded-3xl z-30">
                    <Button size="sm" onClick={() => handleEditVenue(venue)} className="bg-gaming-blue hover:bg-gaming-blue/80">
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteVenue(venue.id)}>
                      <Trash className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pending Review Tab */}
      {activeTab === 'pending_review' && (
        <>
          {pendingLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-yellow-400" /></div>
          ) : pendingVenues.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-500/40" />
              <p>No venues pending review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingVenues.map((venue) => (
                <div key={venue.id} className="bg-[#0a0a0c] border border-yellow-500/20 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-full md:w-24 h-20 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                    {venue.images?.[0] ? (
                      <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No image</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">{venue.name}</h4>
                    <p className="text-sm text-gray-400">{venue.city}, {venue.country}</p>
                    {venue.venue_id && (
                      <p className="text-xs text-gray-600 font-mono mt-0.5">{venue.venue_id}</p>
                    )}
                    {venue.submitted_at && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Submitted {new Date(venue.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-600 text-white"
                      disabled={actioning === venue.id}
                      onClick={() => handleApprove(venue)}
                    >
                      {actioning === venue.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><CheckCircle className="w-4 h-4 mr-1.5" /> Approve</>
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actioning === venue.id}
                      onClick={() => { setRejectTarget(venue); setRejectReason(''); }}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" /> Reject Venue
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting <strong>{rejectTarget?.name}</strong>. This will be shown to the venue owner.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g. Missing images, incomplete address, unclear pricing..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-rose-500/50 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || actioning === rejectTarget?.id}
              onClick={handleReject}
            >
              {actioning === rejectTarget?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject Venue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedVenue && (
        <VenueEditModal
          venue={selectedVenue}
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setSelectedVenue(null); }}
          onVenueUpdated={handleVenueUpdated}
        />
      )}
    </div>
  );
};

export default VenueManagement;
