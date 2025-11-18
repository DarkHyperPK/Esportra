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
  Trophy, 
  Users, 
  Calendar,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Gamepad2,
  BarChart3,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  title: string;
  description: string;
  game: string;
  format: string;
  max_participants: number;
  entry_fee: number;
  prize_pool: number;
  start_date: string;
  end_date: string;
  status: 'draft' | 'published' | 'registration_open' | 'registration_closed' | 'ongoing' | 'completed' | 'cancelled';
  user_id: string;
  organizer_name: string;
  venue_id?: string;
  venue_name?: string;
  registration_count: number;
  created_at: string;
  updated_at: string;
  is_featured: boolean;
  is_verified: boolean;
}

const TournamentManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const admin = useAdmin();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGame, setFilterGame] = useState('all');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showTournamentDetails, setShowTournamentDetails] = useState(false);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | 'feature' | 'unfeature'>('approve');
  const [moderationReason, setModerationReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('tournaments')
        .select(`
          *,
          organizer:profiles!tournaments_user_id_fkey(username, full_name),
          venue:venues(name),
          registrations:tournament_participants(count)
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply filters
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      if (filterGame !== 'all') {
        query = query.eq('game', filterGame);
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data
      const transformedTournaments = (data || []).map(tournament => ({
        ...tournament,
        organizer_name: tournament.organizer?.full_name || tournament.organizer?.username || 'Unknown',
        venue_name: tournament.venue?.name,
        registration_count: tournament.registrations?.[0]?.count || 0
      }));

      setTournaments(transformedTournaments);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tournaments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [currentPage, filterStatus, filterGame, searchTerm]);

  const handleModerationAction = async () => {
    if (!admin.hasPermission('tournament:approve')) {
      toast({ title: 'Forbidden', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }
    if (!selectedTournament || !moderationReason) return;

    try {
      let updateData: any = {};
      
      switch (moderationAction) {
        case 'approve':
          updateData = { 
            status: 'published',
            is_verified: true 
          };
          break;
        case 'reject':
          updateData = { 
            status: 'cancelled',
            is_verified: false 
          };
          break;
        case 'feature':
          updateData = { is_featured: true };
          break;
        case 'unfeature':
          updateData = { is_featured: false };
          break;
      }

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', selectedTournament.id);

      if (error) throw error;

      // Log the action
      await logAdminAction(moderationAction, 'tournament', selectedTournament.id, selectedTournament.title, {
        reason: moderationReason,
        previous_status: selectedTournament.status
      });

      toast({
        title: 'Action Completed',
        description: `Tournament ${moderationAction} successful`,
        variant: 'default',
      });

      setShowModerationDialog(false);
      setModerationReason('');
      fetchTournaments();

    } catch (error) {
      console.error('Error performing moderation action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTournament = async (tournamentId: string, tournamentTitle: string) => {
    if (!admin.hasPermission('tournament:reject')) {
      toast({ title: 'Forbidden', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }
    if (!confirm(`Are you sure you want to delete "${tournamentTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (error) throw error;

      // Log the action
      await logAdminAction('delete', 'tournament', tournamentId, tournamentTitle, {});

      toast({
        title: 'Tournament Deleted',
        description: `"${tournamentTitle}" has been deleted`,
        variant: 'default',
      });

      fetchTournaments();

    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tournament',
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
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent,
          severity: action === 'delete' ? 'high' : 'medium'
        });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-600',
      published: 'bg-blue-600',
      registration_open: 'bg-green-600',
      registration_closed: 'bg-yellow-600',
      ongoing: 'bg-purple-600',
      completed: 'bg-green-600',
      cancelled: 'bg-red-600'
    };
    
    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'published': return <CheckCircle className="w-4 h-4" />;
      case 'registration_open': return <Users className="w-4 h-4" />;
      case 'registration_closed': return <Clock className="w-4 h-4" />;
      case 'ongoing': return <Trophy className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Tournament Management</h2>
          <p className="text-gray-400">Oversee tournaments, moderate content, and manage events</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Tournaments</p>
                <p className="text-white text-2xl font-bold">{tournaments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Participants</p>
                <p className="text-white text-2xl font-bold">
                  {tournaments.reduce((sum, t) => sum + t.registration_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Prize Pool</p>
                <p className="text-white text-2xl font-bold">
                  ${tournaments.reduce((sum, t) => sum + t.prize_pool, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Events</p>
                <p className="text-white text-2xl font-bold">
                  {tournaments.filter(t => ['registration_open', 'ongoing'].includes(t.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tournaments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="registration_open">Registration Open</SelectItem>
                <SelectItem value="registration_closed">Registration Closed</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterGame} onValueChange={setFilterGame}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by game" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Games</SelectItem>
                <SelectItem value="valorant">Valorant</SelectItem>
                <SelectItem value="counter-strike">Counter-Strike</SelectItem>
                <SelectItem value="fortnite">Fortnite</SelectItem>
                <SelectItem value="league-of-legends">League of Legends</SelectItem>
                <SelectItem value="dota-2">Dota 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tournaments Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Tournament</TableHead>
                <TableHead className="text-gray-300">Organizer</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Participants</TableHead>
                <TableHead className="text-gray-300">Prize Pool</TableHead>
                <TableHead className="text-gray-300">Start Date</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    Loading tournaments...
                  </TableCell>
                </TableRow>
              ) : tournaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    No tournaments found
                  </TableCell>
                </TableRow>
              ) : (
                tournaments.map((tournament) => (
                  <TableRow key={tournament.id} className="border-gray-700 hover:bg-gray-700/30">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center">
                          <Gamepad2 className="w-5 h-5 text-gray-300" />
                        </div>
                        <div>
                          <div className="font-medium">{tournament.title}</div>
                          <div className="text-sm text-gray-400 flex items-center gap-2">
                            <span>{tournament.game}</span>
                            {tournament.is_featured && (
                              <Badge className="bg-yellow-600 text-white text-xs">Featured</Badge>
                            )}
                            {tournament.is_verified && (
                              <Badge className="bg-green-600 text-white text-xs">Verified</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        {tournament.organizer_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(tournament.status)}
                        {getStatusBadge(tournament.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        {tournament.registration_count}/{tournament.max_participants}
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        ${tournament.prize_pool.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(tournament.start_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setShowTournamentDetails(true);
                          }}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setModerationAction('approve');
                            setShowModerationDialog(true);
                          }}
                          className="border-green-600 text-green-400 hover:bg-green-600/10"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setModerationAction('reject');
                            setShowModerationDialog(true);
                          }}
                          className="border-red-600 text-red-400 hover:bg-red-600/10"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTournament(tournament.id, tournament.title)}
                          className="border-red-600 text-red-400 hover:bg-red-600/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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

      {/* Moderation Dialog */}
      <Dialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {moderationAction === 'approve' && 'Approve Tournament'}
              {moderationAction === 'reject' && 'Reject Tournament'}
              {moderationAction === 'feature' && 'Feature Tournament'}
              {moderationAction === 'unfeature' && 'Unfeature Tournament'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {moderationAction === 'approve' && `Approve "${selectedTournament?.title}" for publication`}
              {moderationAction === 'reject' && `Reject "${selectedTournament?.title}" and provide reason`}
              {moderationAction === 'feature' && `Feature "${selectedTournament?.title}" on the homepage`}
              {moderationAction === 'unfeature' && `Remove "${selectedTournament?.title}" from featured tournaments`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason" className="text-white">
                {moderationAction === 'approve' && 'Approval notes (optional)'}
                {moderationAction === 'reject' && 'Reason for rejection'}
                {moderationAction === 'feature' && 'Feature notes (optional)'}
                {moderationAction === 'unfeature' && 'Unfeature reason (optional)'}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  moderationAction === 'approve' ? 'Add any notes about this approval...' :
                  moderationAction === 'reject' ? 'Explain why this tournament is being rejected...' :
                  moderationAction === 'feature' ? 'Add notes about featuring this tournament...' :
                  'Explain why this tournament is being unfeatured...'
                }
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                required={moderationAction === 'reject'}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModerationDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleModerationAction}
              disabled={moderationAction === 'reject' && !moderationReason}
              className={
                moderationAction === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' :
                moderationAction === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
                moderationAction === 'feature' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                'bg-gray-600 hover:bg-gray-700 text-white'
              }
            >
              {moderationAction === 'approve' && 'Approve Tournament'}
              {moderationAction === 'reject' && 'Reject Tournament'}
              {moderationAction === 'feature' && 'Feature Tournament'}
              {moderationAction === 'unfeature' && 'Unfeature Tournament'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentManagement;