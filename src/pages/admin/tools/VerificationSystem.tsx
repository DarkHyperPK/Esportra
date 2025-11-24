import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Eye, 
  ArrowLeft,
  UserCheck,
  Building2,
  Clock,
  FileText,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface VerificationRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  submitted_at?: string;
  created_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  date_of_birth?: string;
  business_name?: string;
  business_type?: string;
  business_description?: string;
  contact_email?: string;
  email?: string;
  contact_phone?: string;
  website?: string;
  business_address?: string;
  social_media_links?: any;
  cnic_image_path?: string | null;
  cnic_front_url?: string | null;
  cnic_back_url?: string | null;
  organizer_data?: any;
  venue_data?: any;
  profiles?: {
    full_name: string;
    username: string;
    email: string;
  };
}

const VerificationSystemTool = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [roleFilter, setRoleFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<VerificationRequest | null>(null);
  const [cnicFrontUrl, setCnicFrontUrl] = useState<string | null>(null);
  const [cnicBackUrl, setCnicBackUrl] = useState<string | null>(null);
  const [venueExteriorUrl, setVenueExteriorUrl] = useState<string | null>(null);
  const [venueInteriorUrl, setVenueInteriorUrl] = useState<string | null>(null);
  const [venueGamingUrl, setVenueGamingUrl] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    fetchVerificationRequests();
  }, []);

  const fetchVerificationRequests = async () => {
    try {
      setLoading(true);
      // Fetch without relationship embed to avoid FK ambiguity
      let { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) {
        console.warn('Primary fetch failed, retrying without join:', error.message);
        // Fallback: fetch base rows then hydrate profiles in a second query
        let base = await supabase
          .from('verification_requests')
          .select('*')
          .order('submitted_at', { ascending: false });
        if (base.error) {
          // Try ordering by created_at if submitted_at doesn't exist
          base = await supabase
            .from('verification_requests')
            .select('*')
            .order('created_at', { ascending: false });
          if (base.error) throw base.error;
        }
        const rows = base.data || [];
        const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
        let profilesMap: Record<string, any> = {};
        if (userIds.length) {
          const prof = await supabase
            .from('profiles')
            .select('id, full_name, username, email')
            .in('id', userIds);
          if (!prof.error && prof.data) {
            profilesMap = Object.fromEntries(prof.data.map((p: any) => [p.id, p]));
          }
        }
        data = rows.map((r: any) => ({ ...r, profiles: profilesMap[r.user_id] || null }));
      }
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching verification requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, userId: string, role: string) => {
    try {
      // Update verification request status
      const { error: updateError } = await supabase
        .from('verification_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Update user role (legacy single-role display)
      const { error: roleError } = await supabase.from('profiles').update({ role: role }).eq('id', userId);

      if (roleError) throw roleError;

      // Ensure multi-role records reflect approval
      // 1) verified_roles: mark approved + active
      try {
        const { error: vrErr } = await supabase
          .from('verified_roles')
          .upsert({
            user_id: userId,
            role,
            status: 'approved',
            is_active: true,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,role' });
        if (vrErr) console.warn('verified_roles upsert warning:', vrErr);
      } catch (e) {
        console.warn('verified_roles table not available:', e);
      }

      // 2) user_roles: ensure active assignment exists
      try {
        const { error: urErr } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role,
            is_active: true,
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,role' });
        if (urErr) console.warn('user_roles upsert warning:', urErr);
      } catch (e) {
        console.warn('user_roles table not available:', e);
      }

      // Create company profile for organizers
      if (role === 'organizer') {
        try {
          const { error: companyError } = await supabase
            .from('company_profiles')
            .insert({
              user_id: userId,
              company_name: `${requests.find(r => r.id === requestId)?.profiles?.full_name}'s Organization`,
              is_verified: true
            });

          if (companyError) {
            console.warn('Could not create company profile:', companyError);
          }
        } catch (companyError) {
          console.warn('Company profiles table may not exist:', companyError);
        }
      }
      // Create venue profile for venue owners
      if (role === 'venue_owner') {
        try {
          const { error: venueErr } = await supabase
            .from('venue_profiles')
            .insert({ owner_id: userId, verified: true })
            .select();
          if (venueErr) {
            console.warn('Could not create venue profile:', venueErr);
          }
        } catch (e) {
          console.warn('Venue profiles table may not exist:', e);
        }
      }

      // Invalidate any cached profile in the client by forcing a minimal read
      await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();

      // Audit
      await supabase.from('audit_logs').insert({
        action_type: 'verification:approve',
        target_type: 'user',
        target_id: userId,
        target_name: requests.find(r => r.id === requestId)?.profiles?.email || userId,
        details: { request_id: requestId, role }
      });

      fetchVerificationRequests();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('verification_requests')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
          rejection_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;
      await supabase.from('audit_logs').insert({
        action_type: 'verification:reject',
        target_type: 'user',
        target_id: requestId,
        target_name: requestId,
        details: { reason }
      });
      fetchVerificationRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || (request.status || '').toLowerCase() === statusFilter;
    const matchesRole = roleFilter === "all" || (request.requested_role || '').toLowerCase() === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const openDetails = async (req: VerificationRequest) => {
    setSelected(req);
    setDetailsOpen(true);
    setCnicFrontUrl(null);
    setCnicBackUrl(null);
    setVenueExteriorUrl(null);
    setVenueInteriorUrl(null);
    setVenueGamingUrl(null);
    try {
      if (req.cnic_front_url) setCnicFrontUrl(req.cnic_front_url);
      if (req.cnic_back_url) setCnicBackUrl(req.cnic_back_url);

      const frontPath = (req as any).cnic_front_path || req.organizer_data?.cnic_front_path || req.venue_data?.cnic_front_path || null;
      const backPath = (req as any).cnic_back_path || req.organizer_data?.cnic_back_path || req.venue_data?.cnic_back_path || null;
      if (!cnicFrontUrl && frontPath) {
        const { data } = await supabase.storage.from('users.documents.kyc').createSignedUrl(frontPath, 300);
        if (data?.signedUrl) setCnicFrontUrl(data.signedUrl);
      }
      if (!cnicBackUrl && backPath) {
        const { data } = await supabase.storage.from('users.documents.kyc').createSignedUrl(backPath, 300);
        if (data?.signedUrl) setCnicBackUrl(data.signedUrl);
      }

      const venueImages = req.venue_data?.venue_images || {};
      if (venueImages.exterior) {
        const { data } = await supabase.storage.from('users.documents.kyc').createSignedUrl(venueImages.exterior, 300);
        if (data?.signedUrl) setVenueExteriorUrl(data.signedUrl);
      }
      if (venueImages.interior) {
        const { data } = await supabase.storage.from('users.documents.kyc').createSignedUrl(venueImages.interior, 300);
        if (data?.signedUrl) setVenueInteriorUrl(data.signedUrl);
      }
      if (venueImages.gaming_area) {
        const { data } = await supabase.storage.from('users.documents.kyc').createSignedUrl(venueImages.gaming_area, 300);
        if (data?.signedUrl) setVenueGamingUrl(data.signedUrl);
      }
    } catch {}
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-600",
      approved: "bg-green-600",
      rejected: "bg-red-600"
    };
    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {status}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      organizer: "bg-blue-600",
      venue_owner: "bg-green-600"
    };
    return (
      <Badge className={`${colors[role as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {role === 'organizer' ? 'Organizer' : 'Venue Owner'}
      </Badge>
    );
  };

  const getRoleIcon = (role: string) => {
    return role === 'organizer' ? <Building2 className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />;
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <>
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/admin')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-red-400" />
                  Verification System
                </h1>
                <p className="text-gray-400">Review and approve organizer and venue owner verification requests</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Pending Requests</p>
                <p className="text-xl font-bold text-white">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input 
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <select 
                className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select 
                className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="organizer">Organizer</option>
                <option value="venue_owner">Venue Owner</option>
              </select>

              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={fetchVerificationRequests}
              >
                <Filter className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Verification Requests */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Verification Requests ({filteredRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-red-500 border-r-red-500 border-b-transparent border-l-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-4 text-gray-300">Applicant</th>
                      <th className="text-left p-4 text-gray-300">Requested Role</th>
                      <th className="text-left p-4 text-gray-300">Status</th>
                      <th className="text-left p-4 text-gray-300">Submitted</th>
                      <th className="text-left p-4 text-gray-300">Reviewed</th>
                      <th className="text-right p-4 text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-white">{request.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-400">{request.profiles?.email}</p>
                            {request.profiles?.username && (
                              <p className="text-xs text-gray-500">@{request.profiles.username}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(request.requested_role)}
                            {getRoleBadge(request.requested_role)}
                          </div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="p-4 text-gray-300">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(request.submitted_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4 text-gray-300">
                          {request.reviewed_at ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {new Date(request.reviewed_at).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-gray-500">Not reviewed</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-gray-400 hover:text-white"
                              onClick={() => openDetails(request)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {request.status === 'pending' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-green-400 hover:text-green-300"
                                  onClick={() => handleApproveRequest(request.id, request.user_id, request.requested_role)}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-red-400 hover:text-red-300"
                                  onClick={() => {
                                    const reason = prompt('Rejection reason:');
                                    if (reason) {
                                      handleRejectRequest(request.id, reason);
                                    }
                                  }}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}

                            {request.status === 'rejected' && request.rejection_reason && (
                              <div className="text-xs text-red-400 max-w-32 truncate" title={request.rejection_reason}>
                                {request.rejection_reason}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    {/* Details dialog needs to be a sibling wrapper element */}
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Verification Details</DialogTitle>
          <DialogDescription className="text-gray-400">Applicant-submitted information</DialogDescription>
        </DialogHeader>
        {selected && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm p-1 md:p-2">
            <div>
              <div className="text-gray-400">Name</div>
              <div className="text-white">{selected.first_name} {selected.last_name}</div>
            </div>
            <div>
              <div className="text-gray-400">DOB</div>
              <div className="text-white">{selected.date_of_birth || selected.dob || selected.organizer_data?.dob || selected.venue_data?.dob || '—'}</div>
            </div>
            <div>
              <div className="text-gray-400">Email</div>
              <div className="text-white">{selected.email || selected.contact_email || selected.organizer_data?.contact_email || selected.venue_data?.contact_email || selected.profiles?.email}</div>
            </div>
            <div>
              <div className="text-gray-400">Phone</div>
              <div className="text-white">{selected.contact_phone || selected.organizer_data?.contact_phone || selected.venue_data?.contact_phone || '—'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-gray-400">Business Name</div>
              <div className="text-white">{selected.business_name || '—'}</div>
            </div>
            <div>
              <div className="text-gray-400">Business Type</div>
              <div className="text-white capitalize">{selected.business_type || selected.organizer_data?.business_type || selected.organizer_data?.organization_type || '—'}</div>
            </div>
            <div>
              <div className="text-gray-400">Website</div>
              <div className="text-white">{selected.website || selected.organizer_data?.website || selected.venue_data?.website || '—'}</div>
            </div>
            {(() => {
              const isOrg = (selected.requested_role || '').toLowerCase() === 'organizer';
              const isVenue = (selected.requested_role || '').toLowerCase() === 'venue_owner';
              const addr = (isOrg ? (selected.organizer_data?.business_address || selected.organizer_data?.address) : null)
                || (isVenue ? (selected.venue_data?.business_address || selected.venue_data?.address) : null)
                || selected.business_address;
              return addr ? (
                <div className="md:col-span-2">
                  <div className="text-gray-400">Business Address</div>
                  <div className="text-white">{addr}</div>
                </div>
              ) : null;
            })()}
            <div className="md:col-span-2">
              <div className="text-gray-400">Description</div>
              <div className="text-white whitespace-pre-wrap">{((selected.requested_role || '').toLowerCase() === 'organizer' ? selected.organizer_data?.business_description : selected.venue_data?.business_description) || selected.business_description || '—'}</div>
            </div>

            {/* Experience Description (top-level or from organizer_data.previous_experience) */}
            <div className="md:col-span-2">
              <div className="text-gray-400">Experience Description</div>
              <div className="text-white whitespace-pre-wrap">{(selected as any).experience_description || selected.organizer_data?.previous_experience || '—'}</div>
            </div>
            {/* Socials */}
            {(() => {
              // Accept multiple shapes/keys: prioritize by role
              const isOrg = (selected.requested_role || '').toLowerCase() === 'organizer';
              const isVenue = (selected.requested_role || '').toLowerCase() === 'venue_owner';
              const cand = (isOrg ? (selected.organizer_data?.social_media_links || selected.organizer_data?.socials) : null)
                || (isVenue ? (selected.venue_data?.social_media_links || selected.venue_data?.socials) : null)
                || (selected as any).social_media_links
                || (selected as any).socials
                || (selected as any).social_links
                || (selected as any).links;

              if (!cand) return null;

              type Entry = { label: string; url: string };
              const normalizeUrl = (u: string) => (u.startsWith('http://') || u.startsWith('https://')) ? u : `https://${u}`;
              const makeEntries = (val: any): Entry[] => {
                if (!val) return [];
                if (Array.isArray(val)) {
                  return val
                    .map((v) => (typeof v === 'string' ? v.trim() : ''))
                    .filter(Boolean)
                    .map((url, i) => ({ label: `link_${i+1}`, url }));
                }
                if (typeof val === 'string') {
                  return val.split(',').map(s => s.trim()).filter(Boolean).map((url, i) => ({ label: `link_${i+1}`, url }));
                }
                if (typeof val === 'object') {
                  return Object.entries(val)
                    .filter(([, v]) => typeof v === 'string' && (v as string).trim().length > 0)
                    .map(([k, v]) => ({ label: k.replace(/_/g,' '), url: v as string }));
                }
                return [];
              };

              const entries = makeEntries(cand);
              if (!entries.length) return null;

              return (
                <div className="md:col-span-2">
                  <div className="text-gray-400 mb-1">Socials</div>
                  <div className="flex flex-wrap gap-4 text-white text-sm">
                    {entries.map((e) => (
                      <div key={e.label} className="min-w-[160px] truncate">
                        <span className="text-gray-400 capitalize mr-2">{e.label}:</span>
                        <a href={normalizeUrl(e.url)} target="_blank" rel="noreferrer" className="underline hover:text-blue-300">
                          {e.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {(cnicFrontUrl || cnicBackUrl) && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {cnicFrontUrl && (
                  <div>
                    <div className="text-gray-400 mb-1">CNIC Front</div>
                    <img src={cnicFrontUrl} alt="CNIC front" className="max-h-64 rounded border border-gray-700" />
                  </div>
                )}
                {cnicBackUrl && (
                  <div>
                    <div className="text-gray-400 mb-1">CNIC Back</div>
                    <img src={cnicBackUrl} alt="CNIC back" className="max-h-64 rounded border border-gray-700" />
                  </div>
                )}
              </div>
            )}

            {/* Venue images */}
            {(selected.requested_role === 'venue_owner') && (
              <div className="md:col-span-2 space-y-4">
                <div className="text-gray-400">Venue Images</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {venueExteriorUrl && (
                    <div>
                      <div className="text-gray-400 mb-1">Exterior</div>
                      <img src={venueExteriorUrl} alt="Venue exterior" className="max-h-48 rounded border border-gray-700" />
                    </div>
                  )}
                  {venueInteriorUrl && (
                    <div>
                      <div className="text-gray-400 mb-1">Interior</div>
                      <img src={venueInteriorUrl} alt="Venue interior" className="max-h-48 rounded border border-gray-700" />
                    </div>
                  )}
                  {venueGamingUrl && (
                    <div>
                      <div className="text-gray-400 mb-1">Gaming Area</div>
                      <img src={venueGamingUrl} alt="Gaming area" className="max-h-48 rounded border border-gray-700" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Organizer-specific details */}
            {selected.requested_role === 'organizer' && selected.organizer_data && (
              <div className="md:col-span-2 space-y-3">
                <div className="text-gray-400">Organizer Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400">Organization Type</div>
                    <div className="text-white">{selected.organizer_data.organization_type || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Years Experience</div>
                    <div className="text-white">{selected.organizer_data.years_experience ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Staff Count</div>
                    <div className="text-white">{selected.organizer_data.staff_count ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Expected Tournaments / Month</div>
                    <div className="text-white">{selected.organizer_data.expected_tournaments_per_month ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Streaming Capabilities</div>
                    <div className="text-white">{selected.organizer_data.streaming_capabilities ? 'Yes' : (selected.organizer_data.streaming_capabilities === false ? 'No' : '—')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Prize Pool Experience</div>
                    <div className="text-white whitespace-pre-wrap">{selected.organizer_data.prize_pool_experience || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Team Size Experience</div>
                    <div className="text-white whitespace-pre-wrap">{selected.organizer_data.team_size_experience || '—'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-gray-400">Equipment Available</div>
                    <div className="text-white whitespace-pre-wrap">{selected.organizer_data.equipment_available || '—'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-gray-400">Previous Tournaments</div>
                    <div className="text-white whitespace-pre-wrap">{selected.organizer_data.previous_tournaments || '—'}</div>
                  </div>
                </div>
                {/* Additional organizer fields not explicitly rendered */}
                {(() => {
                  const renderedKeys = new Set(['organization_type','years_experience','staff_count','expected_tournaments_per_month','streaming_capabilities','equipment_available','previous_tournaments','prize_pool_experience','team_size_experience','dob','contact_email','contact_phone','business_address','business_type','website','cnic_front_path','cnic_back_path','social_media_links']);
                  const extra = Object.entries(selected.organizer_data).filter(([k]) => !renderedKeys.has(k));
                  return extra.length ? (
                    <div className="space-y-2">
                      <div className="text-gray-400">Additional Organizer Data</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white">
                        {extra.map(([k,v]) => (
                          <div key={k} className="break-all">
                            <span className="text-gray-400 capitalize mr-2">{k.replace(/_/g,' ')}:</span>
                            <span>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v || '—'))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Venue-specific details */}
            {selected.requested_role === 'venue_owner' && selected.venue_data && (
              <div className="md:col-span-2 space-y-3">
                <div className="text-gray-400">Venue Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400">Venue Name</div>
                    <div className="text-white">{selected.venue_data.venue_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Total PCs</div>
                    <div className="text-white">{selected.venue_data.total_pcs ?? '—'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-gray-400">PC Specs</div>
                    <div className="text-white whitespace-pre-wrap">{selected.venue_data.pc_specs || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Operating Hours</div>
                    <div className="text-white">{selected.venue_data.operating_hours || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Hourly Rate</div>
                    <div className="text-white">{selected.venue_data.hourly_rate ?? '—'}</div>
                  </div>
                  {Array.isArray(selected.venue_data.amenities) && (
                    <div className="md:col-span-2">
                      <div className="text-gray-400 mb-1">Amenities</div>
                      <div className="flex flex-wrap gap-2">
                        {selected.venue_data.amenities.map((a: string) => (
                          <span key={a} className="px-2 py-1 bg-gray-700 rounded text-white text-xs">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-gray-400">Streaming Setup</div>
                    <div className="text-white">{selected.venue_data.streaming_setup ? 'Yes' : (selected.venue_data.streaming_setup === false ? 'No' : '—')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Tournament Capability</div>
                    <div className="text-white">{selected.venue_data.tournament_capability ? 'Yes' : (selected.venue_data.tournament_capability === false ? 'No' : '—')}</div>
                  </div>
                  {Array.isArray(selected.venue_data.games_available) && (
                    <div className="md:col-span-2">
                      <div className="text-gray-400 mb-1">Games Available</div>
                      <div className="flex flex-wrap gap-2">
                        {selected.venue_data.games_available.map((g: string) => (
                          <span key={g} className="px-2 py-1 bg-gray-700 rounded text-white text-xs">{g}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Additional venue fields not explicitly rendered */}
                {(() => {
                  const renderedVenueKeys = new Set(['venue_name','total_pcs','pc_specs','operating_hours','hourly_rate','amenities','games_available','business_address','contact_email','contact_phone','website','dob','cnic_front_path','cnic_back_path','venue_images','streaming_setup','tournament_capability']);
                  const extra = Object.entries(selected.venue_data).filter(([k]) => !renderedVenueKeys.has(k) && k !== 'venue_images');
                  return extra.length ? (
                    <div className="space-y-2">
                      <div className="text-gray-400">Additional Venue Data</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white">
                        {extra.map(([k,v]) => (
                          <div key={k} className="break-all">
                            <span className="text-gray-400 capitalize mr-2">{k.replace(/_/g,' ')}:</span>
                            <span>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v || '—'))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Raw payload (for completeness) */}
            <div className="md:col-span-2">
              <button
                className="text-xs text-gray-400 underline hover:text-gray-200"
                onClick={() => setShowRaw(v => !v)}
                type="button"
              >
                {showRaw ? 'Hide raw data' : 'Show raw data'}
              </button>
              {showRaw && (
                <pre className="mt-2 max-h-64 overflow-auto bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-200">
{JSON.stringify(selected, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default VerificationSystemTool;
