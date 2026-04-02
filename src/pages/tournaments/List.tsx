import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';

import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Calendar, MapPin, Wifi, ChevronDown, X, Search, Flame, Clock, CheckCircle, Archive } from 'lucide-react';
import { Tournament } from '@/types/tournament';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { TournamentCard } from '@/components/TournamentCard';
import { formatDate } from '@/utils/dateFormat';

interface TournamentFilters {
  cities: string[];
  countries: string[];
  games: string[];
}

const STATUS_TABS = [
  { key: '',          label: 'All',       icon: Trophy },
  { key: 'upcoming',  label: 'Upcoming',  icon: Clock },
  { key: 'live',      label: 'Live',      icon: Flame },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', icon: Archive },
] as const;

// Map tab keys to DB statuses
function getEffectiveStatus(t: any): string {
  if (t.status === 'cancelled') return 'cancelled';
  if (t.status === 'completed') return 'completed';
  if (t.status === 'ongoing') return 'live';
  return 'upcoming'; // open, published, check_in, draft
}

const TournamentList = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Build query params for tournaments
  const tournamentsQueryParams = useMemo(() => {
    const params = new URLSearchParams({ limit: '100', offset: '0' });
    if (selectedGame) params.set('game', selectedGame);
    if (selectedFormat === 'online') params.set('is_online', 'true');
    if (selectedFormat === 'lan') params.set('is_online', 'false');
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedCity) params.set('city', selectedCity);
    return params.toString();
  }, [selectedGame, selectedFormat, selectedCountry, selectedCity]);

  // Fetch tournaments via useQuery (cached, no refetch on tab-switch)
  const { data: allTournaments = [], isLoading: loading } = useQuery<Tournament[]>({
    queryKey: ['browse-tournaments', tournamentsQueryParams],
    queryFn: async () => {
      const tournamentsData = await apiClient.get<any[]>(`/api/tournaments?${tournamentsQueryParams}`);
      return (tournamentsData || []).map(tournament => ({
        ...tournament,
        image_url: tournament.banner_url ?? tournament.logo_url ?? null,
        current_participants: tournament.current_participants ?? 0,
        status: tournament.status ?? 'open',
        team_size: tournament.team_size ?? 1,
        is_online: !tournament.venue_id,
        venue_city: tournament.venue_city ?? null,
        venue_country: tournament.venue_country ?? null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user registrations via useQuery
  const { data: registeredTournaments = [] } = useQuery<string[]>({
    queryKey: ['my-tournament-registrations', user?.id],
    queryFn: async () => {
      const data = await apiClient.get<{ tournament_id: string }[]>('/api/tournaments/me/registration-status');
      return (data || []).map(reg => reg.tournament_id.toString());
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Filter by status tab
  const tournaments = useMemo(() => {
    if (!activeTab) return allTournaments;
    return allTournaments.filter(t => getEffectiveStatus(t) === activeTab);
  }, [allTournaments, activeTab]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <div key={tournament.id}>
                <TournamentCard
                  id={tournament.id}
                  name={tournament.name}
                  game={tournament.game}
                  date={tournament.date || formatDate(tournament.start_date)}
                  time={tournament.time || ''}
                  venue={tournament.venue || ''}
                  max_participants={tournament.max_participants}
                  current_participants={tournament.current_participants}
                  status={tournament.status as any}
                  team_size={tournament.team_size}
                  prize_pool={tournament.prize_pool}
                  entry_fee={tournament.entry_fee || undefined}
                  is_online={tournament.is_online}
                  image_url={tournament.image_url || tournament.banner_url || undefined}
                  slug={tournament.slug || tournament.id}
                  organizer_name={tournament.organizer_name}
                  start_date={tournament.start_date}
                  end_date={tournament.end_date}
                  registrationData={isRegistered(tournament.id) ? { id: tournament.id } : null}
                  currentUserId={user?.id}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gaming-dark border border-gaming-gray/30 rounded-lg">
            <p className="text-gray-400 mb-2">No {activeTab ? (STATUS_TABS.find(t => t.key === activeTab)?.label.toLowerCase() ?? '') : ''} tournaments found</p>
            <p className="text-sm text-gray-500">
              {activeTab === 'ongoing'
                ? 'No tournaments are currently live. Check the Upcoming tab for scheduled events.'
                : activeTab === 'completed'
                ? 'No completed tournaments yet.'
                : activeTab === 'cancelled'
                ? 'No cancelled tournaments.'
                : hasActiveFilters
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
