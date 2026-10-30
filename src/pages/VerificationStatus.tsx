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
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Award,
  Building2,
  Trophy
} from 'lucide-react';
import { JackButton } from '@/components/ui/JackButton';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'admin' || currentRole === 'admin') {
      navigate('/admin/dashboard');
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
      const _ = (rolesData?.verifiedRoles || []).some((role: any) => role.role === 'venue_owner' && isApprovedVerifiedRole(role));
      void _;
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch verification status', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchVerificationData(); }, [fetchVerificationData]);

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
    return isApproved && isAssigned;
  };

  if (profile?.role === 'admin' || currentRole === 'admin') {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Settings className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-gray-400 mb-6">As an admin, you have full access to all platform features.</p>
          <JackButton onClick={() => navigate('/admin/dashboard')}>Go to Admin Dashboard</JackButton>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 rounded-none border border-white/10 bg-[#0a0a0c] p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-wider text-rose-300 mb-3">
                  <Shield className="w-3.5 h-3.5" />
                  Account Status
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Verification Status</h1>
                <p className="text-zinc-400">Your current role and verification status on the platform.</p>
              </div>
              <Button onClick={() => navigate(-1)} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                Back
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-[#09090b] border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trophy className="w-5 h-5 text-rose-400" />
                  Organizer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasVerifiedRole('organizer') ? (
                  <div className="space-y-3">
                    <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit">
                      <Award className="w-4 h-4" />
                      Active
                    </Badge>
                    <p className="text-gray-400 text-sm">You can create and manage esports tournaments.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-gray-400 border-gray-600 w-fit">Not active</Badge>
                    <p className="text-gray-400 text-sm">Create an organization to get the organizer role.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#09090b] border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Building2 className="w-5 h-5 text-rose-400" />
                  Venue Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasVerifiedRole('venue_owner') ? (
                  <div className="space-y-3">
                    <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit">
                      <Award className="w-4 h-4" />
                      Active
                    </Badge>
                    <p className="text-gray-400 text-sm">You can list and manage gaming venues.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-gray-400 border-gray-600 w-fit">Not active</Badge>
                    <p className="text-gray-400 text-sm">List your venue — it becomes bookable once admin verifies it.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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
                            {request.requested_role.replace('_', ' ')} · {request.business_type.replace('_', ' ')}
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
                          <span className="text-white ml-2">{new Date(request.created_at).toLocaleDateString()}</span>
                        </div>
                        {request.reviewed_at && (
                          <div>
                            <span className="text-gray-400">Reviewed:</span>
                            <span className="text-white ml-2">{new Date(request.reviewed_at).toLocaleDateString()}</span>
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationStatus;
