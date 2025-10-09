import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useNavigate } from 'react-router-dom';
import VerificationRequestForm from '@/components/VerificationRequestForm';
import { 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Building2,
  RefreshCw,
  Settings
} from 'lucide-react';

interface VerificationRequest {
  id: string;
  requested_role: 'organizer' | 'venue_owner';
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  business_name: string;
  business_type: string;
  created_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  verification_notes?: string;
}

interface VerifiedRole {
  id: string;
  role: 'organizer' | 'venue_owner';
  verified_at: string;
  is_active: boolean;
}

const VerificationStatus: React.FC = () => {
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [verifiedRoles, setVerifiedRoles] = useState<VerifiedRole[]>([]);
  const [orgVerifiedByProfile, setOrgVerifiedByProfile] = useState(false);
  const [venueVerifiedByProfile, setVenueVerifiedByProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFor, setRequestFor] = useState<'organizer' | 'venue_owner' | null>(null);

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (profile?.role === 'admin' || currentRole === 'admin') {
      navigate('/admin/dashboard');
      return;
    }
  }, [profile?.role, currentRole, navigate]);

  const fetchVerificationData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch verification requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch verified roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('verified_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      setRequests(requestsData || []);
      setVerifiedRoles(rolesData || []);

      // Fallback sources of truth: profile/company/venue
      try {
        const org = await supabase
          .from('company_profiles')
          .select('is_verified')
          .eq('user_id', user.id)
          .maybeSingle();
        setOrgVerifiedByProfile(!!org.data?.is_verified);
      } catch {}
      try {
        const venue = await supabase
          .from('venue_profiles')
          .select('verified, is_verified')
          .eq('owner_id', user.id)
          .maybeSingle();
        setVenueVerifiedByProfile(!!(venue.data?.verified || venue.data?.is_verified));
      } catch {}

    } catch (error) {
      console.error('Error fetching verification data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch verification status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationData();
  }, [user]);

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
      case 'under_review': return <RefreshCw className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const hasVerifiedRole = (role: 'organizer' | 'venue_owner') => {
    const viaTable = verifiedRoles.some(vr => vr.role === role && vr.is_active);
    const viaApprovedRequest = requests.some(req => 
      (req.requested_role || '').toLowerCase() === role && 
      (req.status || '').toLowerCase() === 'approved'
    );
    const viaProfileRole = profile?.role === role;
    const viaProfileRecords = role === 'organizer' ? orgVerifiedByProfile : venueVerifiedByProfile;
    
    return viaTable || viaApprovedRequest || viaProfileRole || viaProfileRecords;
  };

  const hasPendingRequest = (role: 'organizer' | 'venue_owner') => {
    return requests.some(req => 
      (req.requested_role || '').toLowerCase() === role && 
      (req.status || '').toLowerCase() === 'pending'
    );
  };

  const canRequestVerification = (role: 'organizer' | 'venue_owner') => {
    return !hasVerifiedRole(role) && !hasPendingRequest(role);
  };

  // Show admin message if they somehow reach this page
  if (profile?.role === 'admin' || currentRole === 'admin') {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Settings className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-gray-400 mb-6">
            As an admin, you don't need verification. You have full access to all platform features.
          </p>
          <Button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Go to Admin Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Verification Status</h1>
              <p className="text-gray-400">Manage your organizer and venue owner verification</p>
            </div>
            <div className="flex gap-2">
              <Button
              onClick={fetchVerificationData}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
              </Button>
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Back
              </Button>
            </div>
          </div>

          {/* Verification Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Organizer Status */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Organizer Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasVerifiedRole('organizer') ? (
                  <div className="space-y-3">
                    <Badge className="bg-green-600 text-white flex items-center gap-1 w-fit">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </Badge>
                    <p className="text-gray-400 text-sm">
                      You can create and manage tournaments as an organizer.
                    </p>
                  </div>
                ) : hasPendingRequest('organizer') ? (
                  <div className="space-y-3">
                    <Badge className="bg-yellow-600 text-white flex items-center gap-1 w-fit">
                      <Clock className="w-4 h-4" />
                      Pending Review
                    </Badge>
                    <p className="text-gray-400 text-sm">
                      Your verification request is being reviewed by our admin team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-gray-400 border-gray-600 w-fit">
                      Not Verified
                    </Badge>
                    <p className="text-gray-400 text-sm mb-4">
                      Request verification to create and manage tournaments.
                    </p>
                    <Button
                      onClick={() => { setRequestFor('organizer'); setShowRequestForm(true); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Request Verification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Venue Owner Status */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  Venue Owner Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasVerifiedRole('venue_owner') ? (
                  <div className="space-y-3">
                    <Badge className="bg-green-600 text-white flex items-center gap-1 w-fit">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </Badge>
                    <p className="text-gray-400 text-sm">
                      You can list and manage gaming venues.
                    </p>
                  </div>
                ) : hasPendingRequest('venue_owner') ? (
                  <div className="space-y-3">
                    <Badge className="bg-yellow-600 text-white flex items-center gap-1 w-fit">
                      <Clock className="w-4 h-4" />
                      Pending Review
                    </Badge>
                    <p className="text-gray-400 text-sm">
                      Your verification request is being reviewed by our admin team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-gray-400 border-gray-600 w-fit">
                      Not Verified
                    </Badge>
                    <p className="text-gray-400 text-sm mb-4">
                      Request verification to list and manage gaming venues.
                    </p>
                    <Button
                      onClick={() => { setRequestFor('venue_owner'); setShowRequestForm(true); }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Request Verification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Verification Requests History */}
          {requests.length > 0 && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Verification History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-semibold">{request.business_name}</h3>
                          <p className="text-gray-400 text-sm capitalize">
                            {request.requested_role.replace('_', ' ')} • {request.business_type.replace('_', ' ')}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(request.status)} text-white flex items-center gap-1`}>
                          {getStatusIcon(request.status)}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Submitted:</span>
                          <span className="text-white ml-2">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {request.reviewed_at && (
                          <div>
                            <span className="text-gray-400">Reviewed:</span>
                            <span className="text-white ml-2">
                              {new Date(request.reviewed_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {request.rejection_reason && (
                        <Alert className="mt-3 bg-red-900/20 border-red-700">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription className="text-red-300">
                            <strong>Rejection Reason:</strong> {request.rejection_reason}
                          </AlertDescription>
                        </Alert>
                      )}

                      {request.verification_notes && (
                        <Alert className="mt-3 bg-blue-900/20 border-blue-700">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-blue-300">
                            <strong>Admin Notes:</strong> {request.verification_notes}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Information Alert */}
          <Alert className="mt-6 bg-blue-900/20 border-blue-700">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-blue-300">
              <strong>Verification Process:</strong> Our admin team reviews all verification requests within 1-3 business days. 
              You'll receive an email notification once your request is processed. Make sure to provide accurate and complete information.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Verification Request Form Dialog */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <VerificationRequestForm
              requestedRole={requestFor || undefined}
              onSuccess={() => {
                setShowRequestForm(false);
                setRequestFor(null);
                fetchVerificationData();
              }}
              onCancel={() => { setShowRequestForm(false); setRequestFor(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationStatus;
