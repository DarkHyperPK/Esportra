import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Phone,
  Trophy,
  DollarSign,
  Calendar,
  AlertCircle,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegistrationManagementProps {
  tournamentId: string;
  tournamentName: string;
  onRegistrationUpdate?: () => void;
}

interface Registration {
  id: string;
  registration_type: 'solo' | 'team';
  user_id?: string;
  team_id?: string;
  team_captain_id?: string;
  gamer_tag?: string;
  team_name?: string;
  team_members?: any[];
  solo_contact_email?: string;
  solo_contact_phone?: string;
  team_contact_email?: string;
  team_contact_phone?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'checked_in' | 'eliminated' | 'disqualified';
  entry_fee_amount: number;
  entry_fee_paid: boolean;
  registration_date: string;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  rejection_reason?: string;
  // User/Team details
  user?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  team_captain?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

const RegistrationManagement: React.FC<RegistrationManagementProps> = ({
  tournamentId,
  tournamentName,
  onRegistrationUpdate
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchRegistrations();
  }, [tournamentId]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      
      // Fetch solo registrations
      const { data: soloRegistrations, error: soloError } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          user:profiles!tournament_participants_user_id_fkey(username, full_name, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .eq('participant_type', 'solo')
        .order('registration_date', { ascending: false });

      if (soloError) throw soloError;

      // Fetch team registrations
      const { data: teamRegistrations, error: teamError } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          team_captain:profiles!tournament_participants_team_captain_id_fkey(username, full_name, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .eq('participant_type', 'team')
        .order('registration_date', { ascending: false });

      if (teamError) throw teamError;

      const allRegistrations = [
        ...(soloRegistrations || []),
        ...(teamRegistrations || [])
      ];

      setRegistrations(allRegistrations);
    } catch (error: any) {
      console.error('Error fetching registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch registrations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (registrationId: string, newStatus: string, rejectionReason?: string) => {
    setActionLoading(registrationId);
    try {
      const updateData: any = {
        status: newStatus,
        verified_by: user?.id,
        verified_at: new Date().toISOString()
      };

      if (newStatus === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('tournament_participants')
        .update(updateData)
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Registration ${newStatus} successfully`,
        variant: 'default',
      });

      fetchRegistrations();
      onRegistrationUpdate?.();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update registration status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending', icon: Clock },
      approved: { color: 'bg-green-500', text: 'Approved', icon: CheckCircle },
      rejected: { color: 'bg-red-500', text: 'Rejected', icon: XCircle },
      cancelled: { color: 'bg-gray-500', text: 'Cancelled', icon: XCircle },
      checked_in: { color: 'bg-blue-500', text: 'Checked In', icon: CheckCircle },
      eliminated: { color: 'bg-gray-500', text: 'Eliminated', icon: XCircle },
      disqualified: { color: 'bg-red-500', text: 'Disqualified', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = 
      reg.gamer_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.team_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.team_captain?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    const matchesType = typeFilter === 'all' || reg.registration_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStats = () => {
    const total = registrations.length;
    const pending = registrations.filter(r => r.status === 'pending').length;
    const approved = registrations.filter(r => r.status === 'approved').length;
    const rejected = registrations.filter(r => r.status === 'rejected').length;
    const totalFees = registrations
      .filter(r => r.entry_fee_paid)
      .reduce((sum, r) => sum + (r.entry_fee_amount || 0), 0);
    
    return { total, pending, approved, rejected, totalFees };
  };

  const stats = getStats();

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-white">Loading registrations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-gray-400 text-sm">Total Registrations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-gray-400 text-sm">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.approved}</p>
                <p className="text-gray-400 text-sm">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">${stats.totalFees}</p>
                <p className="text-gray-400 text-sm">Total Fees Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-white text-sm">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by gamer tag, team name, or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-white text-sm">Status</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 w-full"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="checked_in">Checked In</option>
              </select>
            </div>
            
            <div>
              <Label className="text-white text-sm">Type</Label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-700/50 border border-slate-600 text-white rounded-md px-3 py-2 w-full"
              >
                <option value="all">All Types</option>
                <option value="solo">Solo</option>
                <option value="team">Team</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registrations List */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Registrations ({filteredRegistrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No registrations found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegistrations.map((registration) => (
                <div key={registration.id} className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {registration.registration_type === 'solo' ? (
                          <User className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Users className="w-5 h-5 text-green-500" />
                        )}
                        <h3 className="text-white font-semibold">
                          {registration.registration_type === 'solo' 
                            ? registration.gamer_tag 
                            : registration.team_name}
                        </h3>
                        {getStatusBadge(registration.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-400">Type</Label>
                          <p className="text-white capitalize">{registration.registration_type}</p>
                        </div>
                        
                        <div>
                          <Label className="text-gray-400">
                            {registration.registration_type === 'solo' ? 'Player' : 'Captain'}
                          </Label>
                          <p className="text-white">
                            {registration.registration_type === 'solo' 
                              ? registration.user?.username || 'Unknown'
                              : registration.team_captain?.username || 'Unknown'}
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-gray-400">Registration Date</Label>
                          <p className="text-white">{formatDate(registration.registration_date)}</p>
                        </div>
                        
                        <div>
                          <Label className="text-gray-400">Contact Email</Label>
                          <p className="text-white">
                            {registration.registration_type === 'solo' 
                              ? registration.solo_contact_email 
                              : registration.team_contact_email}
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-gray-400">Contact Phone</Label>
                          <p className="text-white">
                            {registration.registration_type === 'solo' 
                              ? registration.solo_contact_phone 
                              : registration.team_contact_phone}
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-gray-400">Entry Fee</Label>
                          <p className="text-white">
                            ${registration.entry_fee_amount} 
                            {registration.entry_fee_paid ? ' (Paid)' : ' (Unpaid)'}
                          </p>
                        </div>
                      </div>
                      
                      {registration.registration_type === 'team' && registration.team_members && (
                        <div className="mt-3">
                          <Label className="text-gray-400">Team Members</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {registration.team_members.map((member: any, index: number) => (
                              <Badge key={index} variant="outline" className="border-slate-500 text-slate-300">
                                {member.username}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {registration.rejection_reason && (
                        <Alert className="mt-3 bg-red-900/20 border-red-500/50">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <AlertDescription className="text-red-200">
                            <strong>Rejection Reason:</strong> {registration.rejection_reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {registration.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleStatusChange(registration.id, 'approved')}
                            disabled={actionLoading === registration.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {actionLoading === registration.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) {
                                handleStatusChange(registration.id, 'rejected', reason);
                              }
                            }}
                            disabled={actionLoading === registration.id}
                            size="sm"
                            variant="destructive"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {registration.status === 'approved' && (
                        <Button
                          onClick={() => handleStatusChange(registration.id, 'checked_in')}
                          disabled={actionLoading === registration.id}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {actionLoading === registration.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Check In
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationManagement;
