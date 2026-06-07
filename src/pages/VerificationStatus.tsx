import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { fetchMeRoles, isApprovedVerifiedRole } from '@/lib/meRoles';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
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
  Settings,
  Award,
  Briefcase,
  Trophy
} from 'lucide-react';

interface VerificationRequest {
  id?: string;
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
  id?: string;
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
  const [assignedRoles, setAssignedRoles] = useState<{ role: 'organizer' | 'venue_owner'; is_active: boolean }[]>([]);
  const [, setOrgVerifiedByProfile] = useState(false);
  const [, setVenueVerifiedByProfile] = useState(false);
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

  const fetchVerificationData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [rolesData, requestData] = await Promise.all([
        fetchMeRoles(),
        apiClient.get<VerificationRequest[]>('/api/profiles/me/verification-requests'),
      ]);

      setRequests(requestData || []);
      setVerifiedRoles(rolesData?.verifiedRoles || []);
      setAssignedRoles(rolesData?.userRoles || []);

      // Company profiles removed - no longer needed
      setOrgVerifiedByProfile(false);

      setVenueVerifiedByProfile((rolesData?.verifiedRoles || []).some((role: any) => role.role === 'venue_owner' && isApprovedVerifiedRole(role)));

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
  }, [user, toast]);

  useEffect(() => {
    fetchVerificationData();
  }, [fetchVerificationData]);

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
    const isApproved = verifiedRoles.some(vr => (vr.role as any) === role && vr.is_active);
    const isAssigned = assignedRoles.some(ar => (ar.role as any) === role && ar.is_active);
    // Only show Verified if BOTH conditions are met (matches Role Switcher)
    return isApproved && isAssigned;
  };

  const hasPendingRequest = (role: 'organizer' | 'venue_owner') => {
    return requests.some(req =>
      (req.requested_role || '').toLowerCase() === role &&
      (req.status || '').toLowerCase() === 'pending'
    );
  };

  // Show admin message if they somehow reach this page
  if (profile?.role === 'admin' || currentRole === 'admin') {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Settings className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-gray-400 mb-6">
            As an admin, you don't need verification. You have full access to all platform features.
          </p>
          <Button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-white text-black hover:bg-rose-500 hover:text-white text-white"
          >
            Go to Admin Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 rounded-none border border-white/10 bg-[#0a0a0c] p-6 md:p-8 relative overflow-hidden">
            <div className="hidden" />
            <div className="hidden" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-wider text-rose-300 mb-3">
                  <Shield className="w-3.5 h-3.5" />
                  License Portal
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Apply for License</h1>
                <p className="text-zinc-400">Apply for and manage your organizer or venue owner licenses.</p>
              </div>
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Back
              </Button>
            </div>
          </div>

          {/* Verification Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Organizer License */}
            <Card className="bg-[#09090b] border-white/10 hover:border-rose-500/30 transition-all hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trophy className="w-5 h-5 text-rose-400" />
                  Organizer License
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasVerifiedRole('organizer') ? (
                  <div className="space-y-3">
                    <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit">
                      <Award className="w-4 h-4" />
                      Licensed
                    </Badge>
                    <p className="text-gray-400 text-sm">
                      You are licensed to create and manage esports tournaments.
                    </p>
                  </div>
                ) : hasPendingRequest('organizer') ? (
                  <div className="space-y-3">
                    <Badge className="bg-amber-600 text-white flex items-center gap-1 w-fit">
                      <Clock className="w-4 h-4" />
                      Application Under Review
                    </Badge>
                    <p className="text-gray-400 text-sm">
                      Your license application is being reviewed by our team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-gray-400 border-gray-600 w-fit">
                      No License
                    </Badge>
                    <p className="text-gray-400 text-sm mb-4">
                      Apply for an Organizer License to host and manage tournaments.
                    </p>
                    <Button
                      onClick={() => { setRequestFor('organizer'); setShowRequestForm(true); }}
                      className="bg-white text-black hover:bg-rose-500 hover:text-white rounded-none text-white shadow-lg shadow-rose-500/20"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Apply for License
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Venue Owner License */}
            <Card className="bg-[#09090b] border-white/10 hover:border-rose-500/30 transition-all hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Building2 className="w-5 h-5 text-rose-400" />
                  Venue Owner License
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasVerifiedRole('venue_owner') ? (
                  <div className="space-y-3">
                    <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit">
                      <Award className="w-4 h-4" />
                      Licensed
                    </Badge>
                    <p className="text-gray-400 text-sm">
                      You are licensed to list and manage gaming venues.
                    </p>
                  </div>
                ) : hasPendingRequest('venue_owner') ? (
                  <div className="space-y-3">
                    <Badge className="bg-amber-600 text-white flex items-center gap-1 w-fit">
                      <Clock className="w-4 h-4" />
                      Application Under Review
                    </Badge>
                    <p className="text-gray-400 text-sm">
                      Your license application is being reviewed by our team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-gray-400 border-gray-600 w-fit">
                      No License
                    </Badge>
                    <p className="text-gray-400 text-sm mb-4">
                      Apply for a Venue Owner License to list and manage gaming venues.
                    </p>
                    <Button
                      onClick={() => { setRequestFor('venue_owner'); setShowRequestForm(true); }}
                      className="bg-white text-black hover:bg-rose-500 hover:text-white rounded-none text-white shadow-lg shadow-emerald-500/20"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Apply for License
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Application History */}
          {requests.length > 0 && (
            <Card className="bg-[#0a0a0c] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Application History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id ?? `${request.requested_role}-${request.created_at}`} className="border border-gray-700 rounded-none p-4">
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
                          <AlertDescription className="text-zinc-300">
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
            <Alert className="mt-6 bg-white/[0.03] border-white/10">
              <Award className="h-4 w-4" />
              <AlertDescription className="text-zinc-300">
                <strong>License Application Process:</strong> Our team reviews all license applications within 1-3 business days.
              You'll receive an email notification once your application is processed. Please provide accurate business information.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Verification Request Form Dialog */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-none border border-white/10 bg-[#09090b] shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
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
