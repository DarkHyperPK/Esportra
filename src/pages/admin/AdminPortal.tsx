import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Users, MapPin, Trophy, Info, FileText } from 'lucide-react';
import type { Database } from '@/types/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  avatar_url?: string;
  full_name?: string;
  username?: string;
  updated_at?: string;
}

const cardStyles = [
  'bg-gradient-to-tr from-blue-600 to-blue-400',
  'bg-gradient-to-tr from-green-600 to-green-400',
  'bg-gradient-to-tr from-purple-600 to-purple-400',
];

const cardIcons = [
  <Users size={32} className="text-white" />,
  <MapPin size={32} className="text-white" />,
  <Trophy size={32} className="text-white" />,
];

const AdminPortal = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<Database['public']['Tables']['tournaments']['Row'][]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVenues: 0,
    activeTournaments: 0,
  });
  const [tournamentModal, setTournamentModal] = useState<{ open: boolean, tournament: any | null }>({ open: false, tournament: null });
  const [activeTab, setActiveTab] = useState<'users' | 'venues' | 'tournaments' | 'bookings' | 'audit'>('users');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditUserFilter, setAuditUserFilter] = useState('');
  const [auditDetailsModal, setAuditDetailsModal] = useState<{ open: boolean, log: any | null }>({ open: false, log: null });

  useEffect(() => {
    if (!user || !profile || profile.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, profile, navigate]);

  const fetchData = async () => {
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, full_name, email');
      if (usersError) throw usersError;
      setUsers(
        (usersData || []).map((u: any) => ({
          ...u,
          role: u.roles || 'casual',
        }))
      );

      // Fetch venues (no join)
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, user_id');
      if (venuesError) {
        console.error('Supabase venues error:', venuesError);
        throw venuesError;
      }
      setVenues(venuesData || []);

      // Fetch tournaments (no join)
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id, name, status, user_id, date, time, finished');
      if (tournamentsError) {
        console.error('Supabase tournaments error:', tournamentsError);
        throw tournamentsError;
      }
      const updatedTournaments = Array.isArray(tournamentsData)
        ? tournamentsData
          .filter(t => t && typeof t === 'object' && t !== null)
          .map((t) => {
            return { ...(t as any) } as Database['public']['Tables']['tournaments']['Row'];
          })
        : [];
      setTournaments(updatedTournaments);

      // Fetch bookings (no join needed)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('venue_bookings')
        .select('*');
      if (bookingsError) {
        console.error('Supabase bookings error:', bookingsError);
        throw bookingsError;
      }
      setBookings(bookingsData || []);

      // Fetch stats (no join, just count)
      const { count: usersCount, error: usersCountError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (usersCountError) console.error('Supabase users count error:', usersCountError);
      const { count: venuesCount, error: venuesCountError } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true });
      if (venuesCountError) console.error('Supabase venues count error:', venuesCountError);
      const { count: activeTournamentsCount, error: activeTournamentsCountError } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (activeTournamentsCountError) console.error('Supabase tournaments count error:', activeTournamentsCountError);

      setStats({
        totalUsers: usersCount || 0,
        totalVenues: venuesCount || 0,
        activeTournaments: activeTournamentsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ roles: newRole })
        .eq('id', userId);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'User role updated successfully.',
      });
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVenue = async (venueId) => {
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Venue deleted successfully.',
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting venue:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete venue. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTournament = async (tournamentId) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Tournament deleted successfully.',
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tournament. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Helper for alternating row colors
  const getRowClass = (index: number) =>
    index % 2 === 0 ? 'bg-[#23232a]' : 'bg-[#18181b]';

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    const { data, error } = await (supabase.from('audit_logs') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setAuditLogs(Array.isArray(data) ? data : []);
    setAuditLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#18181b] text-white pb-10">
      <header className="sticky top-0 z-10 bg-[#18181b] py-6 shadow-md mb-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
        </div>
      </header>

      <div className="container mx-auto px-4">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-10 border-b border-white/10 pb-2">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'users' ? 'bg-blue-700 text-white' : 'bg-transparent text-white/70 hover:bg-blue-700/20'}`}>Users</button>
          <button onClick={() => setActiveTab('venues')} className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'venues' ? 'bg-green-700 text-white' : 'bg-transparent text-white/70 hover:bg-green-700/20'}`}>Venues</button>
          <button onClick={() => setActiveTab('tournaments')} className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'tournaments' ? 'bg-purple-700 text-white' : 'bg-transparent text-white/70 hover:bg-purple-700/20'}`}>Tournaments</button>
          <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 rounded-t-lg font-semibold ${activeTab === 'bookings' ? 'bg-yellow-700 text-white' : 'bg-transparent text-white/70 hover:bg-yellow-700/20'}`}>Bookings</button>
          <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-t-lg font-semibold flex items-center gap-2 ${activeTab === 'audit' ? 'bg-gray-800 text-white' : 'bg-transparent text-white/70 hover:bg-gray-800/20'}`}><FileText size={16} /> Audit Logs</button>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 border-b border-white/10 pb-2">User Management</h2>
            <div className="overflow-x-auto rounded-xl shadow-lg bg-[#23232a]">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-[#23232a]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Username</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id} className={getRowClass(idx) + ' hover:bg-blue-50/10 transition'}>
                      <td className="px-6 py-4 text-sm text-white font-mono">{user.id}</td>
                      <td className="px-6 py-4 text-sm text-white">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-white capitalize">{user.role}</td>
                      <td className="px-6 py-4 text-sm text-white">{user.username}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'venues' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 border-b border-white/10 pb-2">Venue Management</h2>
            <div className="overflow-x-auto rounded-xl shadow-lg bg-[#23232a]">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-[#23232a]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-white/70 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((venue, idx) => {
                    const owner = users.find(u => u.id === venue.user_id);
                    return (
                      <tr key={venue.id} className={getRowClass(idx) + ' hover:bg-green-50/10 transition'}>
                        <td className="px-6 py-4 text-sm text-white font-mono">{venue.id}</td>
                        <td className="px-6 py-4 text-sm text-white">{venue.name}</td>
                        <td className="px-6 py-4 text-sm text-white">{owner?.username || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-white">{owner?.full_name || ''}</td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-full px-4 py-1 text-xs font-bold"
                            onClick={() => handleDeleteVenue(venue.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'tournaments' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 border-b border-white/10 pb-2">Tournament Management</h2>
            <div className="overflow-x-auto rounded-xl shadow-lg bg-[#23232a]">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-[#23232a]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-white/70 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((tournament, idx) => {
                    const organizer = users.find(u => u.id === tournament.user_id);
                    return (
                      <tr key={tournament.id} className={getRowClass(idx) + ' hover:bg-purple-50/10 transition'}>
                        <td className="px-6 py-4 text-sm text-white font-mono">{tournament.id}</td>
                        <td className="px-6 py-4 text-sm text-white">{tournament.name}</td>
                        <td className="px-6 py-4 text-sm text-white">{organizer?.username || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-white">{organizer?.full_name || ''}</td>
                        <td className="px-6 py-4 text-sm text-white capitalize">{tournament.status}</td>
                        <td className="px-6 py-4 text-right flex gap-2 items-center justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full px-4 py-1 text-xs font-bold flex items-center gap-1"
                            onClick={() => setTournamentModal({ open: true, tournament })}
                          >
                            <Info size={14} /> Details
                          </Button>
                          {tournament.status === 'live' && !tournament.finished && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="rounded-full px-4 py-1 text-xs font-bold"
                              onClick={async () => {
                                await supabase.from('tournaments').update({ finished: true }).eq('id', tournament.id);

                                // Create audit log
                                const { error: auditError } = await supabase
                                  .from('audit_logs')
                                  .insert({
                                    action: 'tournament_finished',
                                    user_id: user?.id || null,
                                    target_type: 'tournament',
                                    target_id: tournament.id,
                                    details: {
                                      tournament_name: tournament.name,
                                      tournament_id: tournament.id,
                                      finished_by: user?.id || 'system'
                                    }
                                  });

                                if (auditError) {
                                  console.error('Failed to create audit log:', auditError);
                                }

                                toast({ title: 'Tournament marked as finished.' });
                                fetchData();
                              }}
                            >
                              Mark as Finished
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-full px-4 py-1 text-xs font-bold"
                            onClick={() => handleDeleteTournament(tournament.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'bookings' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 border-b border-white/10 pb-2">Booking Overview</h2>
            <div className="overflow-x-auto rounded-xl shadow-lg bg-[#23232a]">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-[#23232a]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Venue</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, idx) => (
                    <tr key={booking.id} className={getRowClass(idx) + ' hover:bg-blue-50/10 transition'}>
                      <td className="px-6 py-4 text-sm text-white font-mono">{booking.id}</td>
                      <td className="px-6 py-4 text-sm text-white">{booking.venue_id}</td>
                      <td className="px-6 py-4 text-sm text-white">{booking.user_id}</td>
                      <td className="px-6 py-4 text-sm text-white">{booking.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'audit' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 border-b border-white/10 pb-2 flex items-center gap-2"><FileText size={20} /> Audit Logs</h2>
            <div className="flex flex-wrap gap-4 mb-4">
              <input
                type="text"
                placeholder="Search by action, user, or target..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="px-3 py-2 rounded bg-[#23232a] text-white border border-gray-700 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Filter by action..."
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
                className="px-3 py-2 rounded bg-[#23232a] text-white border border-gray-700 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Filter by user ID..."
                value={auditUserFilter}
                onChange={e => setAuditUserFilter(e.target.value)}
                className="px-3 py-2 rounded bg-[#23232a] text-white border border-gray-700 focus:outline-none"
              />
              <Button
                onClick={() => {
                  // Export to CSV
                  const csv = [
                    ['Date', 'Action', 'User', 'Target Type', 'Target ID', 'Details'],
                    ...auditLogs.map(log => [
                      new Date(log.created_at).toLocaleString(),
                      log.action,
                      log.user_id || '',
                      log.target_type || '',
                      log.target_id || '',
                      JSON.stringify(log.details)
                    ])
                  ].map(row => row.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'audit_logs.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="ml-auto"
              >Export CSV</Button>
            </div>
            <div className="overflow-x-auto rounded-xl shadow-lg bg-[#23232a]">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-[#23232a]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Target Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Target ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  ) : (
                    auditLogs
                      .filter(log =>
                        (!auditSearch ||
                          log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.user_id?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.target_type?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.target_id?.toLowerCase().includes(auditSearch.toLowerCase())
                        ) &&
                        (!auditActionFilter || log.action?.toLowerCase().includes(auditActionFilter.toLowerCase())) &&
                        (!auditUserFilter || (log.user_id || '').toLowerCase().includes(auditUserFilter.toLowerCase()))
                      )
                      .slice(0, 100)
                      .map((log, idx) => (
                        <tr key={log.id} className={getRowClass(idx) + ' hover:bg-blue-50/10 transition'}>
                          <td className="px-4 py-3 text-sm text-white font-mono">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-white"><span className="inline-block px-2 py-1 rounded bg-blue-800/60 text-xs font-bold uppercase">{log.action}</span></td>
                          <td className="px-4 py-3 text-sm text-white font-mono">{log.user_id || <span className="text-gray-400">system</span>}</td>
                          <td className="px-4 py-3 text-sm text-white"><span className="inline-block px-2 py-1 rounded bg-gray-700/60 text-xs font-bold uppercase">{log.target_type}</span></td>
                          <td className="px-4 py-3 text-sm text-white font-mono">{log.target_id}</td>
                          <td className="px-4 py-3 text-sm text-blue-300 cursor-pointer underline" onClick={() => setAuditDetailsModal({ open: true, log })}>View</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Details Modal */}
            {auditDetailsModal.open && auditDetailsModal.log && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                <div className="bg-[#23232a] rounded-xl shadow-lg p-8 w-full max-w-2xl relative">
                  <button className="absolute top-2 right-2 text-white/60 hover:text-white text-xl" onClick={() => setAuditDetailsModal({ open: false, log: null })}>&times;</button>
                  <h3 className="text-xl font-bold mb-4">Audit Log Details</h3>
                  <pre className="bg-[#18181b] rounded p-4 text-white text-sm overflow-x-auto max-h-[60vh]">{JSON.stringify(auditDetailsModal.log.details, null, 2)}</pre>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Tournament Details Modal */}
      {tournamentModal.open && tournamentModal.tournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#23232a] rounded-xl shadow-lg p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-white" onClick={() => setTournamentModal({ open: false, tournament: null })}>&times;</button>
            <h2 className="text-2xl font-bold mb-4">Tournament Details</h2>
            <div className="mb-2"><b>Name:</b> {tournamentModal.tournament.name}</div>
            <div className="mb-2"><b>Date:</b> {tournamentModal.tournament.date}</div>
            <div className="mb-2"><b>Time:</b> {tournamentModal.tournament.time}</div>
            <div className="mb-2"><b>Status:</b> {tournamentModal.tournament.status}</div>
            <div className="mb-2"><b>Finished:</b> {tournamentModal.tournament.finished ? 'Yes' : 'No'}</div>
            <div className="mb-2"><b>ID:</b> {tournamentModal.tournament.id}</div>
            <Link
              to={`/admin/tournaments/${tournamentModal.tournament.id}`}
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Full Details Page
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal; 