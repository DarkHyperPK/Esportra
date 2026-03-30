import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';

import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Calendar, CheckCircle2, MapPin, Wifi, ChevronDown, X, Search, Flame, Clock, CheckCircle, Archive } from 'lucide-react';
import { Tournament } from '@/types/tournament';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

interface TournamentFilters {
  cities: string[];
  countries: string[];
  games: string[];
}

const STATUS_TABS = [
  { key: '',          label: 'All',       icon: Trophy,      statuses: null },
  { key: 'upcoming',  label: 'Upcoming',  icon: Clock,       statuses: ['open', 'published', 'check_in'] },
  { key: 'ongoing',   label: 'Live',      icon: Flame,       statuses: ['ongoing'] },
  { key: 'completed', label: 'Completed', icon: CheckCircle, statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', icon: Archive,     statuses: ['cancelled'] },
] as const;

const TournamentList = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeredTournaments, setRegisteredTournaments] = useState<string[]>([]);
  const { toast } = useToast();

  // Filter state — read initial tab from URL
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || '');
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'' | 'lan' | 'online'>('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch filter options from API
  const { data: filterOptions } = useQuery<TournamentFilters>({
    queryKey: ['tournament-filters'],
    queryFn: () => apiClient.get<TournamentFilters>('/api/tournaments/filters'),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's registrations
  const fetchUserRegistrations = useCallback(async () => {
    if (!user || !user.id) {
      setRegisteredTournaments([]);
      return;
    }

    try {
      const data = await apiClient.get<{ tournament_id: string }[]>('/api/tournaments/me/registration-status');
      const userRegistrations = (data || []).map(reg => reg.tournament_id.toString());
      setRegisteredTournaments(userRegistrations);
    } catch (error) {
      console.error('[TournamentList] Error fetching registrations:', error);
    }
  }, [user]);

  // Resolve the DB status value(s) for the active tab
  const currentTab = STATUS_TABS.find(t => t.key === activeTab) || STATUS_TABS[0];

  // Fetch tournaments with filters
  const fetchTournaments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' });

      // For tabs with a single status, use the API status param directly
      // For tabs with multiple statuses (upcoming), we fetch all and filter client-side
      if (currentTab.statuses && currentTab.statuses.length === 1) {
        params.set('status', currentTab.statuses[0]);
      }

      if (selectedGame) params.set('game', selectedGame);
      if (selectedFormat === 'online') params.set('is_online', 'true');
      if (selectedFormat === 'lan') params.set('is_online', 'false');
      if (selectedCountry) params.set('country', selectedCountry);
      if (selectedCity) params.set('city', selectedCity);

      const tournamentsData = await apiClient.get<any[]>(`/api/tournaments?${params}`);

      let mappedTournaments = (tournamentsData || []).map(tournament => ({
        ...tournament,
        current_participants: tournament.current_participants ?? 0,
        status: tournament.status ?? 'open',
        team_size: tournament.team_size ?? 1,
        is_online: !tournament.venue_id,
        venue_city: tournament.venue_city ?? null,
        venue_country: tournament.venue_country ?? null,
      }));

      // Client-side multi-status filter for tabs like "upcoming"
      if (currentTab.statuses && currentTab.statuses.length > 1) {
        mappedTournaments = mappedTournaments.filter(t =>
          (currentTab.statuses as readonly string[]).includes(t.status)
        );
      }

      setTournaments(mappedTournaments);
    } catch (error) {
      console.error('[TournamentList] Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive',
      });
    }
  }, [toast, selectedGame, selectedFormat, selectedCountry, selectedCity, currentTab]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTournaments(),
        fetchUserRegistrations()
      ]);
    } catch (error) {
      console.error('[TournamentList] Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchTournaments, fetchUserRegistrations]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync tab to URL
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key) {
      setSearchParams({ tab: key });
    } else {
      setSearchParams({});
    }
  };

  // Client-side text search on top of API filters
  const filteredTournaments = useMemo(() => {
    if (!searchQuery.trim()) return tournaments;
    const q = searchQuery.toLowerCase();
    return tournaments.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.game?.toLowerCase().includes(q) ||
      t.organizer_name?.toLowerCase().includes(q)
    );
  }, [tournaments, searchQuery]);

  // Check if user is registered for a tournament
  const isRegistered = (tournamentId: string) => {
    return registeredTournaments.includes(tournamentId.toString());
  };

  const handleClearFilters = () => {
    setSelectedGame('');
    setSelectedFormat('');
    setSelectedCountry('');
    setSelectedCity('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedGame || selectedFormat || selectedCountry || selectedCity || searchQuery;

  // City dropdown only shows when LAN format is selected
  const showCityFilter = selectedFormat === 'lan';

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Tournaments</h1>
          <p className="text-gray-400">Browse, filter, and join tournaments</p>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1 border-b border-zinc-800/60">
          {STATUS_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-rose-500/10 text-rose-400 border-b-2 border-rose-500'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tournaments by name, game, or organizer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 placeholder:text-zinc-600"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Game Dropdown */}
          {filterOptions?.games && filterOptions.games.length > 0 && (
            <div className="relative">
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg px-4 py-2.5 pr-9 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <option value="">All Games</option>
                {filterOptions.games.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          )}

          {/* Format Toggle */}
          <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
            <button
              onClick={() => setSelectedFormat('')}
              className={`px-3 py-2 text-sm transition-colors ${
                selectedFormat === '' ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedFormat(selectedFormat === 'online' ? '' : 'online')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors border-l border-zinc-800 ${
                selectedFormat === 'online' ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" /> Online
            </button>
            <button
              onClick={() => setSelectedFormat(selectedFormat === 'lan' ? '' : 'lan')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors border-l border-zinc-800 ${
                selectedFormat === 'lan' ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> LAN
            </button>
          </div>

          {/* Country Dropdown (LAN only) */}
          {showCityFilter && filterOptions?.countries && filterOptions.countries.length > 0 && (
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => { setSelectedCountry(e.target.value); setSelectedCity(''); }}
                className="appearance-none bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg px-4 py-2.5 pr-9 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <option value="">All Countries</option>
                {filterOptions.countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          )}

          {/* City Dropdown (LAN only) */}
          {showCityFilter && filterOptions?.cities && filterOptions.cities.length > 0 && (
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg px-4 py-2.5 pr-9 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <option value="">All Cities</option>
                {filterOptions.cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          )}

          {/* Clear All */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-white"
              onClick={handleClearFilters}
            >
              <X className="w-4 h-4 mr-1" /> Clear filters
            </Button>
          )}

          {/* Count */}
          <div className="ml-auto text-sm text-zinc-500">
            {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gaming-dark border-gaming-gray/30">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gaming-gray/20 rounded w-3/4"></div>
                    <div className="h-4 bg-gaming-gray/20 rounded w-1/2"></div>
                    <div className="h-4 bg-gaming-gray/20 rounded w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTournaments.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          >
            {filteredTournaments.map((tournament) => (
              <motion.div
                key={tournament.id}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}
              >
                <Link to={`/tournaments/${tournament.slug || tournament.id}`}>
                  <Card className={`bg-gaming-dark border-gaming-gray/30 hover:border-gaming-purple transition-colors ${isRegistered(tournament.id) ? 'border-gaming-purple' : ''}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{tournament.name}</CardTitle>
                          <p className="text-gray-400">{tournament.game}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {tournament.status === 'ongoing' && (
                            <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                              <Flame className="w-3 h-3" /> LIVE
                            </span>
                          )}
                          {isRegistered(tournament.id) && (
                            <CheckCircle2 className="h-5 w-5 text-gaming-purple" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center text-gray-400">
                          <Calendar className="mr-2 h-4 w-4" />
                          {new Date(tournament.start_date || tournament.date).toLocaleDateString()} at {tournament.time || ''}
                        </div>
                        <div className="flex items-center text-gray-400">
                          <Users className="mr-2 h-4 w-4" />
                          Registered Participants: {tournament.current_participants}
                        </div>
                        <div className="flex items-center text-gaming-green">
                          <Trophy className="mr-2 h-4 w-4" />
                          Prize Pool: {tournament.prize_pool}
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-sm text-gray-400 flex items-center gap-1.5">
                            {tournament.is_online || !tournament.venue_id ? (
                              <><Wifi className="w-3.5 h-3.5" /> Online</>
                            ) : (
                              <><MapPin className="w-3.5 h-3.5" /> {tournament.venue_city || 'LAN'}</>
                            )}
                          </span>
                          <Button className="bg-gaming-purple hover:bg-gaming-purple/80">
                            {isRegistered(tournament.id) ? 'View Details' : 'Join Tournament'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12 bg-gaming-dark border border-gaming-gray/30 rounded-lg">
            <p className="text-gray-400 mb-2">No tournaments found</p>
            <p className="text-sm text-gray-500">
              {hasActiveFilters || activeTab
                ? 'No tournaments match your filters. Try broadening your search.'
                : 'Check back soon for new tournaments!'}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TournamentList;
