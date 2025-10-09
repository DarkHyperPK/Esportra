import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  User, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Ban,
  UserCheck,
  UserX,
  MessageSquare,
  DollarSign,
  Trophy,
  Building2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  last_sign_in?: string;
  is_verified: boolean;
  is_suspended: boolean;
  is_banned: boolean;
  suspension_reason?: string;
  ban_reason?: string;
  suspension_until?: string;
  profile_data?: any;
  stats?: {
    tournaments_played: number;
    tournaments_won: number;
    total_earnings: number;
    teams_created: number;
  };
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState('7');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const from = (currentPage - 1) * itemsPerPage;
      const to = currentPage * itemsPerPage - 1;

      const buildQuery = (includeStatusFilter: boolean) => {
        let q = supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (filterRole !== 'all') {
          q = q.eq('role', filterRole);
        }

        if (searchTerm) {
          q = q.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        if (includeStatusFilter && filterStatus !== 'all') {
          if (filterStatus === 'suspended') {
            q = q.eq('is_suspended', true);
          } else if (filterStatus === 'banned') {
            q = q.eq('is_banned', true);
          } else if (filterStatus === 'active') {
            q = q.eq('is_suspended', false).eq('is_banned', false);
          }
        }

        return q;
      };

      // First try with status filters applied
      let { data, error, count } = await buildQuery(true);

      // If the error is due to missing columns, retry without status filters
      if (error) {
        console.warn('Primary users query failed, retrying without status filter:', error.message);
        const retry = await buildQuery(false);
        const r = await retry;
        data = r.data;
        error = r.error;
        count = r.count;
      }

      if (error) throw error;

      setUsers(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filterRole, filterStatus, searchTerm]);

  const handleSuspendUser = async () => {
    if (!selectedUser || !actionReason) return;

    try {
      const suspensionUntil = new Date();
      suspensionUntil.setDate(suspensionUntil.getDate() + parseInt(actionDuration));

      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: true,
          suspension_reason: actionReason,
          suspension_until: suspensionUntil.toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log the action
      await logAdminAction('suspend', 'user', selectedUser.id, selectedUser.username, {
        reason: actionReason,
        duration: actionDuration,
        until: suspensionUntil.toISOString()
      });

      toast({
        title: 'User Suspended',
        description: `${selectedUser.username} has been suspended for ${actionDuration} days`,
        variant: 'default',
      });

      setShowSuspendDialog(false);
      setActionReason('');
      fetchUsers();

    } catch (error) {
      console.error('Error suspending user:', error);
      toast({
        title: 'Error',
        description: 'Failed to suspend user',
        variant: 'destructive',
      });
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !actionReason) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: true,
          ban_reason: actionReason,
          is_suspended: false // Remove suspension if banned
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log the action
      await logAdminAction('ban', 'user', selectedUser.id, selectedUser.username, {
        reason: actionReason
      });

      toast({
        title: 'User Banned',
        description: `${selectedUser.username} has been permanently banned`,
        variant: 'default',
      });

      setShowBanDialog(false);
      setActionReason('');
      fetchUsers();

    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to ban user',
        variant: 'destructive',
      });
    }
  };

  const handleUnsuspendUser = async (userId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: false,
          suspension_reason: null,
          suspension_until: null
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      await logAdminAction('unsuspend', 'user', userId, username, {});

      toast({
        title: 'User Unsuspended',
        description: `${username} has been unsuspended`,
        variant: 'default',
      });

      fetchUsers();

    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unsuspend user',
        variant: 'destructive',
      });
    }
  };

  const handleUnbanUser = async (userId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: false,
          ban_reason: null
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      await logAdminAction('unban', 'user', userId, username, {});

      toast({
        title: 'User Unbanned',
        description: `${username} has been unbanned`,
        variant: 'default',
      });

      fetchUsers();

    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unban user',
        variant: 'destructive',
      });
    }
  };

  const logAdminAction = async (action: string, targetType: string, targetId: string, targetName: string, details: any) => {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: currentUser?.id,
          admin_name: currentUser?.email,
          action_type: action,
          target_type: targetType,
          target_id: targetId,
          target_name: targetName,
          details: details,
          ip_address: '127.0.0.1', // In production, get real IP
          user_agent: navigator.userAgent,
          severity: action === 'ban' ? 'critical' : action === 'suspend' ? 'high' : 'medium'
        });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.is_banned) {
      return <Badge className="bg-red-600 text-white">Banned</Badge>;
    }
    if (user.is_suspended) {
      return <Badge className="bg-orange-600 text-white">Suspended</Badge>;
    }
    return <Badge className="bg-green-600 text-white">Active</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-purple-600',
      organizer: 'bg-blue-600',
      venue_owner: 'bg-green-600',
      casual: 'bg-gray-600'
    };
    return (
      <Badge className={`${colors[role as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400">Manage users, handle disputes, and enforce platform policies</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="organizer">Organizer</SelectItem>
                <SelectItem value="venue_owner">Venue Owner</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Role</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Stats</TableHead>
                <TableHead className="text-gray-300">Joined</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="border-gray-700 hover:bg-gray-700/30">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full" />
                          ) : (
                            <User className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{user.full_name || user.username}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user)}
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-yellow-400" />
                          {user.stats?.tournaments_won || 0} wins
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-green-400" />
                          ${user.stats?.total_earnings || 0}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label="View details"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserDetails(true);
                              }}
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View details</TooltipContent>
                        </Tooltip>
                        
                        {!user.is_banned && !user.is_suspended && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  aria-label="Suspend user"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowSuspendDialog(true);
                                  }}
                                  className="border-orange-600 text-orange-400 hover:bg-orange-600/10"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Suspend</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  aria-label="Ban user"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowBanDialog(true);
                                  }}
                                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ban</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        
                        {user.is_suspended && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label="Unsuspend user"
                                onClick={() => handleUnsuspendUser(user.id, user.username)}
                                className="border-green-600 text-green-400 hover:bg-green-600/10"
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Unsuspend</TooltipContent>
                          </Tooltip>
                        )}
                        
                        {user.is_banned && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label="Unban user"
                                onClick={() => handleUnbanUser(user.id, user.username)}
                                className="border-green-600 text-green-400 hover:bg-green-600/10"
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Unban</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Previous
          </Button>
          
          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Next
          </Button>
        </div>
      )}

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Suspend User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Suspend {selectedUser?.username} for violating platform policies
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="duration" className="text-white">Duration (days)</Label>
              <Select value={actionDuration} onValueChange={setActionDuration}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reason" className="text-white">Reason for suspension</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this user is being suspended..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuspendUser}
              disabled={!actionReason}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Ban User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Permanently ban {selectedUser?.username} from the platform
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="ban-reason" className="text-white">Reason for ban</Label>
              <Textarea
                id="ban-reason"
                placeholder="Explain why this user is being banned..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBanDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBanUser}
              disabled={!actionReason}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
