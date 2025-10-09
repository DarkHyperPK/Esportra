import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  Building2, 
  Mail, 
  Phone, 
  Globe,
  Calendar,
  User
} from 'lucide-react';

interface VerificationRequest {
  id: string;
  user_id: string;
  requested_role: 'organizer' | 'venue_owner';
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  business_name: string;
  business_type: string;
  business_description: string;
  website?: string;
  contact_email: string;
  contact_phone?: string;
  business_address?: string;
  social_media_links: {
    twitter?: string;
    discord?: string;
    instagram?: string;
  };
  previous_experience?: string;
  expected_tournaments_per_month: number;
  verification_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    full_name: string;
    email: string;
  };
}

interface VerificationPanelProps {
  onPendingCountChange?: (count: number) => void;
}

const VerificationPanel: React.FC<VerificationPanelProps> = ({ onPendingCountChange }) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      
      // Update pending count
      const pendingCount = (data || []).filter(req => req.status === 'pending').length;
      onPendingCountChange?.(pendingCount);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch verification requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      // First approve the verification request
      const { data, error } = await supabase.rpc('approve_verification_request', {
        request_id: selectedRequest.id,
        admin_notes: adminNotes || null
      });

      if (error) throw error;

      // If it's an organizer request, create a company profile
      if (selectedRequest.requested_role === 'organizer') {
        try {
          const { error: companyError } = await supabase
            .from('company_profiles')
            .insert({
              user_id: selectedRequest.user_id,
              company_name: selectedRequest.business_name,
              company_description: selectedRequest.business_description,
              website: selectedRequest.website,
              contact_email: selectedRequest.contact_email,
              business_type: selectedRequest.business_type,
              social_media_links: selectedRequest.social_media_links,
              is_verified: true
            });

          if (companyError) {
            console.error('Error creating company profile:', companyError);
            // Don't fail the whole process, just log the error
          }
        } catch (error) {
          console.error('Error creating company profile (table may not exist):', error);
          // Company profiles table doesn't exist yet, that's okay
        }
      }

      toast({
        title: 'Request Approved',
        description: 'Verification request has been approved successfully',
        variant: 'default',
      });

      setShowApproveDialog(false);
      setAdminNotes('');
      await fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve verification request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_verification_request', {
        request_id: selectedRequest.id,
        rejection_reason: rejectionReason,
        admin_notes: adminNotes || null
      });

      if (error) throw error;

      toast({
        title: 'Request Rejected',
        description: 'Verification request has been rejected',
        variant: 'default',
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      setAdminNotes('');
      await fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject verification request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600';
      case 'approved': return 'bg-green-600';
      case 'rejected': return 'bg-red-600';
      case 'under_review': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'under_review': return <Eye className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-800 rounded-lg h-32"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Verification Requests</h2>
        <Button onClick={fetchRequests} variant="outline" className="border-gray-600 text-gray-300">
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Alert className="bg-gray-800 border-gray-700">
          <AlertDescription className="text-gray-400">
            No verification requests found.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <CardTitle className="text-white text-lg">{request.business_name}</CardTitle>
                      <p className="text-gray-400 text-sm">
                        Requested by {request.profiles?.full_name || request.profiles?.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(request.status)} text-white flex items-center gap-1`}>
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailsDialog(true);
                      }}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Role:</span>
                    <span className="text-white capitalize">{request.requested_role.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Type:</span>
                    <span className="text-white capitalize">{request.business_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Submitted:</span>
                    <span className="text-white">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {request.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApproveDialog(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectDialog(true);
                      }}
                      className="border-red-600 text-red-400 hover:bg-red-600/10"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Verification Request Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Review all information provided by the applicant
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400 text-sm">Business Name</Label>
                    <p className="text-white">{selectedRequest.business_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Business Type</Label>
                    <p className="text-white capitalize">{selectedRequest.business_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Requested Role</Label>
                    <p className="text-white capitalize">{selectedRequest.requested_role.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Expected Tournaments/Month</Label>
                    <p className="text-white">{selectedRequest.expected_tournaments_per_month}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-400 text-sm">Business Description</Label>
                  <p className="text-white mt-1">{selectedRequest.business_description}</p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <Label className="text-gray-400 text-sm">Email</Label>
                      <p className="text-white">{selectedRequest.contact_email}</p>
                    </div>
                  </div>
                  {selectedRequest.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <Label className="text-gray-400 text-sm">Phone</Label>
                        <p className="text-white">{selectedRequest.contact_phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedRequest.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <div>
                        <Label className="text-gray-400 text-sm">Website</Label>
                        <a href={selectedRequest.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {selectedRequest.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                
                {selectedRequest.business_address && (
                  <div>
                    <Label className="text-gray-400 text-sm">Business Address</Label>
                    <p className="text-white mt-1">{selectedRequest.business_address}</p>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {(selectedRequest.social_media_links?.twitter || selectedRequest.social_media_links?.discord || selectedRequest.social_media_links?.instagram) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Social Media</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedRequest.social_media_links?.twitter && (
                      <div>
                        <Label className="text-gray-400 text-sm">Twitter</Label>
                        <p className="text-white">{selectedRequest.social_media_links.twitter}</p>
                      </div>
                    )}
                    {selectedRequest.social_media_links?.discord && (
                      <div>
                        <Label className="text-gray-400 text-sm">Discord</Label>
                        <p className="text-white">{selectedRequest.social_media_links.discord}</p>
                      </div>
                    )}
                    {selectedRequest.social_media_links?.instagram && (
                      <div>
                        <Label className="text-gray-400 text-sm">Instagram</Label>
                        <p className="text-white">{selectedRequest.social_media_links.instagram}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Previous Experience */}
              {selectedRequest.previous_experience && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Previous Experience</h3>
                  <p className="text-white">{selectedRequest.previous_experience}</p>
                </div>
              )}

              {/* Admin Notes */}
              {selectedRequest.verification_notes && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Admin Notes</h3>
                  <p className="text-white">{selectedRequest.verification_notes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedRequest.rejection_reason && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Rejection Reason</h3>
                  <p className="text-red-400">{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Approve Verification Request</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to approve this verification request?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminNotes" className="text-white">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processing ? 'Approving...' : 'Approve Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Verification Request</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason" className="text-white">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Please explain why this request is being rejected..."
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="adminNotesReject" className="text-white">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotesReject"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Add any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {processing ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerificationPanel;
