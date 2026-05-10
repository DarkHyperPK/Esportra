import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { useArchiveSeason, useCompleteSeason, usePublishSeason, useSeason, useStartSeason, useSyncSeasonStatus } from '@/hooks/useSeasons';
import {
  useRecalculateStandings,
  useProcessSeasonAdvancement,
  useCreatePointRule,
  useCreateAdvancementRule,
  useSeasonTournaments,
  useLinkTournamentToSeason,
  useUnlinkTournamentFromSeason,
} from '@/hooks/useSeasonStandings';
import { useSeasonParticipants, useUpdateParticipantStatus, useRemoveParticipant } from '@/hooks/useSeasonParticipants';
import { useTournaments } from '@/hooks/useTournaments';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Trophy, RefreshCw, Plus, Workflow, Play, CheckCircle2, Archive, Users, ShieldAlert } from 'lucide-react';
import StandingsCard from '@/components/organizer/season/StandingsCard';
import PointRulesCard from '@/components/organizer/season/PointRulesCard';
import AdvancementRulesCard from '@/components/organizer/season/AdvancementRulesCard';
import type { QualificationStatus, SeedMode } from '@/types/season';

interface SeasonDispute {
  id: string;
  title: string;
  status: string;
  tournament_name: string;
  created_at: string;
}

const SeasonManage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: season, isLoading, isError } = useSeason(id || '');
  const { data: linkedTournaments = [], isLoading: linkedTournamentsLoading } = useSeasonTournaments(id || '');
  const { data: tournaments = [] } = useTournaments(season?.game ? { game: season.game } : undefined);
  const recalculateStandings = useRecalculateStandings();
  const processAdvancement = useProcessSeasonAdvancement();
  const publishSeason = usePublishSeason();
  const startSeason = useStartSeason();
  const completeSeason = useCompleteSeason();
  const archiveSeason = useArchiveSeason();
  const syncSeasonStatus = useSyncSeasonStatus();
  const createPointRule = useCreatePointRule();
  const createAdvancementRule = useCreateAdvancementRule();
  const linkTournament = useLinkTournamentToSeason();
  const unlinkTournament = useUnlinkTournamentFromSeason();
  const { data: participants = [], isLoading: participantsLoading } = useSeasonParticipants(id || '');
  const updateParticipant = useUpdateParticipantStatus();
  const removeParticipant = useRemoveParticipant();
  const [participantFilter, setParticipantFilter] = useState('all');
  const [showPointRuleForm, setShowPointRuleForm] = useState(false);
  const [showAdvancementRuleForm, setShowAdvancementRuleForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [pointRuleForm, setPointRuleForm] = useState({
    tournament_id: '',
    placement_start: '1',
    placement_end: '1',
    points: '10',
    qualification_status: '',
  });
  const [advancementRuleForm, setAdvancementRuleForm] = useState({
    source_tournament_id: '',
    target_tournament_id: '',
    placement_start: '1',
    placement_end: '1',
    advancement_count: '1',
    seed_mode: 'top_seeded',
  });
  const [linkForm, setLinkForm] = useState({
    tournament_id: '',
    season_role: 'event',
    season_stage_order: '1',
  });
  const [disputes, setDisputes] = useState<SeasonDispute[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);

  useEffect(() => {
    if (!id || linkedTournaments.length === 0) return;
    const tournamentIds = new Set(linkedTournaments.map((t) => t.id));
    let cancelled = false;
    setDisputesLoading(true);
    apiClient
      .get<any[]>('/api/disputes')
      .then((all) => {
        if (cancelled) return;
        const filtered = (all || []).filter((d) => tournamentIds.has(d.tournament_id));
        setDisputes(
          filtered.map((d) => ({
            id: d.id,
            title: d.title,
            status: d.status,
            tournament_name: d.tournament_name || 'Unknown tournament',
            created_at: d.created_at,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setDisputes([]);
      })
      .finally(() => {
        if (!cancelled) setDisputesLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, linkedTournaments]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-400">Loading season...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !season) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">Failed to load season. It may not exist or an error occurred.</p>
            <Link to="/organizer/dashboard">
              <Button variant="outline" className="border-gray-700 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'published':
        return 'bg-blue-500';
      case 'live':
        return 'bg-green-500';
      case 'completed':
        return 'bg-purple-500';
      case 'archived':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const availableTournaments = tournaments.filter((tournament) =>
    !linkedTournaments.some((linkedTournament) => linkedTournament.id === tournament.id)
  );

  const submitPointRule = () => {
    if (!id) return;
    createPointRule.mutate({
      id,
      rule: {
        tournament_id: pointRuleForm.tournament_id || undefined,
        placement_start: Number(pointRuleForm.placement_start),
        placement_end: Number(pointRuleForm.placement_end),
        points: Number(pointRuleForm.points),
        qualification_status: pointRuleForm.qualification_status as QualificationStatus || undefined,
      },
    }, {
      onSuccess: () => {
        setShowPointRuleForm(false);
      },
    });
  };

  const submitAdvancementRule = () => {
    if (!id || !advancementRuleForm.source_tournament_id) return;
    createAdvancementRule.mutate({
      id,
      rule: {
        source_tournament_id: advancementRuleForm.source_tournament_id,
        target_tournament_id: advancementRuleForm.target_tournament_id || undefined,
        placement_start: Number(advancementRuleForm.placement_start),
        placement_end: Number(advancementRuleForm.placement_end),
        advancement_count: Number(advancementRuleForm.advancement_count),
        seed_mode: advancementRuleForm.seed_mode as SeedMode || undefined,
      },
    }, {
      onSuccess: () => {
        setShowAdvancementRuleForm(false);
      },
    });
  };

  const [linkFormErrors, setLinkFormErrors] = useState<Record<string, string>>({});

  const submitLinkTournament = () => {
    if (!id) return;
    const errs: Record<string, string> = {};
    if (!linkForm.tournament_id) errs.tournament_id = 'SELECT A TOURNAMENT';
    if (!linkForm.season_role) errs.season_role = 'SELECT A ROLE';
    const order = Number(linkForm.season_stage_order);
    if (!linkForm.season_stage_order || isNaN(order) || order < 1) errs.order = 'INVALID STAGE ORDER';
    // Check for duplicate stage order
    if (linkedTournaments.some(t => t.season_stage_order === order)) errs.order = 'STAGE ORDER ALREADY EXISTS';
    if (Object.keys(errs).length > 0) {
      setLinkFormErrors(errs);
      return;
    }
    setLinkFormErrors({});
    linkTournament.mutate({
      tournamentId: linkForm.tournament_id,
      seasonId: id,
      seasonRole: linkForm.season_role,
      seasonStageOrder: order,
    }, {
      onSuccess: () => {
        setShowLinkForm(false);
        setLinkForm({ tournament_id: '', season_role: 'event', season_stage_order: '1' });
      },
    });
  };

  const isLifecyclePending =
    publishSeason.isPending ||
    startSeason.isPending ||
    completeSeason.isPending ||
    archiveSeason.isPending ||
    syncSeasonStatus.isPending;

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <Link to="/organizer/seasons" className="inline-flex items-center gap-2 text-[10px] font-bold text-[#808080] uppercase tracking-widest hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-3 h-3" />
            BACK TO SEASONS
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-[2px] bg-rose-500" />
                <span className="text-rose-400 text-[10px] font-bold tracking-[0.25em] uppercase">SEASON MANAGE</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-[0.95] mb-4">{season.name}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${getStatusColor(season.status)} text-white`}>
                  {season.status}
                </span>
                <span className="text-[#808080] text-sm">{season.game}</span>
                <span className="text-[#808080] text-sm">
                  {season.start_date ? new Date(season.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                  {' — '}
                  {season.end_date ? new Date(season.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {season.status === 'draft' && (
                <button
                  onClick={() => publishSeason.mutate(id || '')}
                  disabled={isLifecyclePending || linkedTournaments.length === 0}
                  className="flex items-center gap-2 h-10 px-4 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#e0e0e0] active:bg-[#cccccc] disabled:opacity-40 disabled:cursor-not-allowed transition-none"
                >
                  <Workflow className="w-4 h-4" />
                  PUBLISH
                </button>
              )}
              {season.status === 'published' && (
                <button
                  onClick={() => startSeason.mutate(id || '')}
                  disabled={isLifecyclePending}
                  className="flex items-center gap-2 h-10 px-4 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#e0e0e0] active:bg-[#cccccc] disabled:opacity-40 disabled:cursor-not-allowed transition-none"
                >
                  <Play className="w-4 h-4" />
                  START
                </button>
              )}
              {(season.status === 'published' || season.status === 'live') && (
                <button
                  onClick={() => completeSeason.mutate(id || '')}
                  disabled={isLifecyclePending}
                  className="flex items-center gap-2 h-10 px-4 border border-[#2a2a2a] text-white text-[10px] font-bold uppercase tracking-widest hover:border-[#404040] hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  COMPLETE
                </button>
              )}
              {season.status !== 'archived' && (
                <button
                  onClick={() => archiveSeason.mutate(id || '')}
                  disabled={isLifecyclePending}
                  className="flex items-center gap-2 h-10 px-4 border border-[#2a2a2a] text-white text-[10px] font-bold uppercase tracking-widest hover:border-[#404040] hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-none"
                >
                  <Archive className="w-4 h-4" />
                  ARCHIVE
                </button>
              )}
              <button
                onClick={() => syncSeasonStatus.mutate(id || '')}
                disabled={isLifecyclePending}
                className="flex items-center gap-2 h-10 px-4 border border-[#2a2a2a] text-white text-[10px] font-bold uppercase tracking-widest hover:border-[#404040] hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-none"
              >
                <RefreshCw className={`w-4 h-4 ${syncSeasonStatus.isPending ? 'animate-spin' : ''}`} />
                SYNC
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1a1a1a] mb-8">
          <div className="bg-[#0a0a0a] p-6">
            <Trophy className="w-5 h-5 text-rose-400 mb-3" />
            <p className="text-3xl font-black text-white mb-1">{season.tournament_count}</p>
            <p className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">TOURNAMENTS</p>
          </div>
          <div className="bg-[#0a0a0a] p-6">
            <Calendar className="w-5 h-5 text-blue-400 mb-3" />
            <p className="text-sm font-bold text-white mb-1">
              {season.start_date ? new Date(season.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
            </p>
            <p className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">START DATE</p>
          </div>
          <div className="bg-[#0a0a0a] p-6">
            <Trophy className="w-5 h-5 text-purple-400 mb-3" />
            <p className="text-3xl font-black text-white mb-1">{season.point_rules_count}</p>
            <p className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">POINT RULES</p>
          </div>
          <div className="bg-[#0a0a0a] p-6">
            <Users className="w-5 h-5 text-emerald-400 mb-3" />
            <p className="text-3xl font-black text-white mb-1">{season.participant_count}</p>
            <p className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">TEAMS</p>
          </div>
        </div>

        {/* Automation + Pipeline */}
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em]">AUTOMATION</h3>
            <div className="flex gap-2">
              <button
                onClick={() => processAdvancement.mutate({ id: id || '' })}
                disabled={processAdvancement.isPending || linkedTournaments.length === 0}
                className="flex items-center gap-2 h-9 px-3 border border-[#2a2a2a] text-[#808080] text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-[#404040] disabled:opacity-40 disabled:cursor-not-allowed transition-none"
              >
                <Workflow className="w-3 h-3" />
                PROCESS
              </button>
              <button
                onClick={() => recalculateStandings.mutate(id || '')}
                disabled={recalculateStandings.isPending}
                className="flex items-center gap-2 h-9 px-3 border border-[#2a2a2a] text-[#808080] text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-[#404040] disabled:opacity-40 disabled:cursor-not-allowed transition-none"
              >
                <RefreshCw className={`w-3 h-3 ${recalculateStandings.isPending ? 'animate-spin' : ''}`} />
                RECALCULATE
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1a1a1a]">
            <div className="bg-[#050505] p-4">
              <p className="text-[10px] font-bold text-[#555555] uppercase tracking-wider mb-1">LINKED</p>
              <p className="text-2xl font-black text-white">{linkedTournaments.length}</p>
            </div>
            <div className="bg-[#050505] p-4">
              <p className="text-[10px] font-bold text-[#555555] uppercase tracking-wider mb-1">POINT RULES</p>
              <p className="text-2xl font-black text-white">{season.point_rules_count}</p>
            </div>
            <div className="bg-[#050505] p-4">
              <p className="text-[10px] font-bold text-[#555555] uppercase tracking-wider mb-1">ADVANCEMENT</p>
              <p className="text-2xl font-black text-white">{season.advancement_rules_count}</p>
            </div>
            <div className="bg-[#050505] p-4">
              <p className="text-[10px] font-bold text-[#555555] uppercase tracking-wider mb-1">HEALTH</p>
              <p className="text-xs font-medium text-[#808080]">
                {linkedTournaments.length === 0 ? 'Link tournaments before publishing.' : 'Ready for automation.'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="mb-8 bg-transparent border-b border-[#1a1a1a] rounded-none w-full justify-start h-auto p-0 gap-0">
            {['teams', 'standings', 'point-rules', 'advancement-rules', 'tournaments', 'disputes'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="data-[state=active]:border-b-2 data-[state=active]:border-rose-500 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:bg-transparent text-[#555555] text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-3 rounded-none border-0 bg-transparent hover:text-white transition-colors"
              >
                {tab === 'teams' && 'TEAMS'}
                {tab === 'standings' && 'STANDINGS'}
                {tab === 'point-rules' && 'POINT RULES'}
                {tab === 'advancement-rules' && 'ADVANCEMENT'}
                {tab === 'tournaments' && 'TOURNAMENTS'}
                {tab === 'disputes' && 'DISPUTES'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="teams">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Season Teams</h2>
              <div className="flex gap-2">
                <Button variant={participantFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setParticipantFilter('all')}>
                  All
                </Button>
                <Button variant={participantFilter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setParticipantFilter('pending')}>
                  Pending
                </Button>
                <Button variant={participantFilter === 'approved' ? 'default' : 'outline'} size="sm" onClick={() => setParticipantFilter('approved')}>
                  Approved
                </Button>
              </div>
            </div>
            <Card className="bg-[#0d0d10] border border-white/10">
              <CardContent className="p-6">
                {participantsLoading ? (
                  <p className="text-gray-400 text-center">Loading participants...</p>
                ) : participants.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-300 font-semibold mb-1">No teams registered yet</p>
                    <p className="text-gray-500 text-sm">Teams will appear here when they register for this season.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {participants
                      .filter((p) => participantFilter === 'all' || p.status === participantFilter)
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-4">
                          <div className="flex items-center gap-3">
                            {p.team_logo_url ? (
                              <img src={p.team_logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                                <Users className="w-5 h-5 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-white">{p.team_name}</p>
                              <p className="text-sm text-gray-400">{p.status} · {new Date(p.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {p.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => updateParticipant.mutate({ seasonId: id || '', participantId: p.id, status: 'approved' })}
                                disabled={updateParticipant.isPending}
                              >
                                Approve
                              </Button>
                            )}
                            {p.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                onClick={() => updateParticipant.mutate({ seasonId: id || '', participantId: p.id, status: 'rejected' })}
                                disabled={updateParticipant.isPending}
                              >
                                Reject
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              onClick={() => removeParticipant.mutate({ seasonId: id || '', participantId: p.id })}
                              disabled={removeParticipant.isPending}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="standings">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Season Standings</h2>
              <Button
                onClick={() => recalculateStandings.mutate(id || '')}
                disabled={recalculateStandings.isPending}
                variant="outline"
                className="border-gray-700 hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${recalculateStandings.isPending ? 'animate-spin' : ''}`} />
                Recalculate
              </Button>
            </div>
            <StandingsCard seasonId={id || ''} />
          </TabsContent>

          <TabsContent value="point-rules">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Point Rules</h2>
              <Button onClick={() => setShowPointRuleForm((open) => !open)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Point Rule
              </Button>
            </div>
            {showPointRuleForm && (
              <Card className="bg-[#0d0d10] border border-white/10 mb-4">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
                  <select value={pointRuleForm.tournament_id} onChange={(e) => setPointRuleForm((prev) => ({ ...prev, tournament_id: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white md:col-span-2">
                    <option value="">All tournaments</option>
                    {linkedTournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={pointRuleForm.placement_start} onChange={(e) => setPointRuleForm((prev) => ({ ...prev, placement_start: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="From rank" />
                  <input type="number" min="1" value={pointRuleForm.placement_end} onChange={(e) => setPointRuleForm((prev) => ({ ...prev, placement_end: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="To rank" />
                  <input type="number" min="0" value={pointRuleForm.points} onChange={(e) => setPointRuleForm((prev) => ({ ...prev, points: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Points" />
                  <Button onClick={submitPointRule} disabled={createPointRule.isPending}>Save</Button>
                </CardContent>
              </Card>
            )}
            <PointRulesCard seasonId={id || ''} />
          </TabsContent>

          <TabsContent value="advancement-rules">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Advancement Rules</h2>
              <Button onClick={() => setShowAdvancementRuleForm((open) => !open)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Advancement Rule
              </Button>
            </div>
            {showAdvancementRuleForm && (
              <Card className="bg-[#0d0d10] border border-white/10 mb-4">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
                  <select value={advancementRuleForm.source_tournament_id} onChange={(e) => setAdvancementRuleForm((prev) => ({ ...prev, source_tournament_id: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white md:col-span-2">
                    <option value="">Source tournament</option>
                    {linkedTournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                    ))}
                  </select>
                  <select value={advancementRuleForm.target_tournament_id} onChange={(e) => setAdvancementRuleForm((prev) => ({ ...prev, target_tournament_id: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white md:col-span-2">
                    <option value="">No target</option>
                    {linkedTournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={advancementRuleForm.placement_start} onChange={(e) => setAdvancementRuleForm((prev) => ({ ...prev, placement_start: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="From rank" />
                  <input type="number" min="1" value={advancementRuleForm.placement_end} onChange={(e) => setAdvancementRuleForm((prev) => ({ ...prev, placement_end: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="To rank" />
                  <input type="number" min="1" value={advancementRuleForm.advancement_count} onChange={(e) => setAdvancementRuleForm((prev) => ({ ...prev, advancement_count: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Advance count" />
                  <Button onClick={submitAdvancementRule} disabled={createAdvancementRule.isPending || !advancementRuleForm.source_tournament_id}>Save</Button>
                </CardContent>
              </Card>
            )}
            <AdvancementRulesCard seasonId={id || ''} />
          </TabsContent>

          <TabsContent value="tournaments">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">SEASON TOURNAMENTS</h2>
              <div className="flex gap-2">
                <Link to={`/tournaments/create?mode=event&seasonId=${id}&game=${encodeURIComponent(season.game)}`}>
                  <button className="flex items-center gap-2 h-9 px-4 border border-[#2a2a2a] text-[#808080] text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-[#404040] transition-none">
                    <Plus className="w-3 h-3" />
                    CREATE
                  </button>
                </Link>
                <button
                  onClick={() => setShowLinkForm((open) => !open)}
                  className={`flex items-center gap-2 h-9 px-4 text-[10px] font-bold uppercase tracking-widest transition-none ${
                    showLinkForm
                      ? 'bg-white text-black'
                      : 'border border-[#2a2a2a] text-[#808080] hover:text-white hover:border-[#404040]'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  LINK EXISTING
                </button>
              </div>
            </div>

            {showLinkForm && (
              <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-6 mb-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-3 mb-6">LINK TOURNAMENT</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#808080] uppercase tracking-widest mb-2">TOURNAMENT *</label>
                    <select
                      value={linkForm.tournament_id}
                      onChange={(e) => { setLinkForm((prev) => ({ ...prev, tournament_id: e.target.value })); setLinkFormErrors(prev => { const n = {...prev}; delete n.tournament_id; return n; }); }}
                      className={`w-full h-12 px-4 bg-[#050505] text-white text-sm border-2 ${linkFormErrors.tournament_id ? 'border-[#ef4444]' : 'border-[#2a2a2a]'} focus:border-white focus:outline-none transition-colors`}
                    >
                      <option value="">Select tournament</option>
                      {availableTournaments.length === 0 && (
                        <option value="" disabled>No available tournaments for {season.game}</option>
                      )}
                      {availableTournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                      ))}
                    </select>
                    {linkFormErrors.tournament_id && <p className="text-[#ef4444] text-[10px] uppercase tracking-wider mt-2">{linkFormErrors.tournament_id}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#808080] uppercase tracking-widest mb-2">ROLE *</label>
                    <select
                      value={linkForm.season_role}
                      onChange={(e) => setLinkForm((prev) => ({ ...prev, season_role: e.target.value }))}
                      className="w-full h-12 px-4 bg-[#050505] text-white text-sm border-2 border-[#2a2a2a] focus:border-white focus:outline-none transition-colors"
                    >
                      <option value="qualifier">Qualifier</option>
                      <option value="event">Event</option>
                      <option value="finals">Finals</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#808080] uppercase tracking-widest mb-2">STAGE ORDER *</label>
                    <input
                      type="number"
                      min="1"
                      value={linkForm.season_stage_order}
                      onChange={(e) => { setLinkForm((prev) => ({ ...prev, season_stage_order: e.target.value })); setLinkFormErrors(prev => { const n = {...prev}; delete n.order; return n; }); }}
                      className={`w-full h-12 px-4 bg-[#050505] text-white text-sm border-2 ${linkFormErrors.order ? 'border-[#ef4444]' : 'border-[#2a2a2a]'} focus:border-white focus:outline-none transition-colors`}
                      placeholder="1"
                    />
                    {linkFormErrors.order && <p className="text-[#ef4444] text-[10px] uppercase tracking-wider mt-2">{linkFormErrors.order}</p>}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={submitLinkTournament}
                    disabled={linkTournament.isPending}
                    className="flex items-center gap-2 h-10 px-6 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#e0e0e0] active:bg-[#cccccc] disabled:opacity-40 transition-none"
                  >
                    {linkTournament.isPending ? 'LINKING...' : 'LINK TOURNAMENT'}
                  </button>
                  <button
                    onClick={() => { setShowLinkForm(false); setLinkFormErrors({}); }}
                    className="flex items-center gap-2 h-10 px-6 border border-[#2a2a2a] text-[#808080] text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-[#404040] transition-none"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            {linkedTournamentsLoading ? (
              <p className="text-[#808080] text-sm uppercase tracking-wider text-center py-10">Loading tournaments...</p>
            ) : linkedTournaments.length === 0 ? (
              <div className="border border-[#2a2a2a] bg-[#0a0a0a] p-10 text-center">
                <Trophy className="w-10 h-10 text-[#2a2a2a] mx-auto mb-4" />
                <p className="text-white font-semibold mb-2 uppercase tracking-wider text-sm">No tournaments linked</p>
                <p className="text-[#808080] text-xs mb-6 max-w-sm mx-auto">Create a tournament for this season, then link it here to track standings and apply point rules.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to={`/tournaments/create?mode=event&seasonId=${id}&game=${encodeURIComponent(season.game)}`}>
                    <button className="flex items-center justify-center gap-2 h-12 px-6 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-[#e0e0e0] transition-none">
                      <Plus className="w-4 h-4" />
                      CREATE TOURNAMENT
                    </button>
                  </Link>
                  <button
                    onClick={() => setShowLinkForm(true)}
                    className="flex items-center justify-center gap-2 h-12 px-6 border border-[#2a2a2a] text-[#808080] text-xs font-bold uppercase tracking-widest hover:text-white hover:border-[#404040] transition-none"
                  >
                    <Plus className="w-4 h-4" />
                    LINK EXISTING
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-[#1a1a1a]">
                <div className="grid grid-cols-12 gap-0 border-b border-[#2a2a2a] bg-[#0a0a0a]">
                  <div className="col-span-5 px-4 py-3 text-[10px] font-bold text-[#555555] uppercase tracking-wider">TOURNAMENT</div>
                  <div className="col-span-2 px-4 py-3 text-[10px] font-bold text-[#555555] uppercase tracking-wider text-center">ROLE</div>
                  <div className="col-span-2 px-4 py-3 text-[10px] font-bold text-[#555555] uppercase tracking-wider text-center">STAGE</div>
                  <div className="col-span-2 px-4 py-3 text-[10px] font-bold text-[#555555] uppercase tracking-wider text-center">PARTICIPANTS</div>
                  <div className="col-span-1 px-4 py-3 text-[10px] font-bold text-[#555555] uppercase tracking-wider text-right"></div>
                </div>
                {linkedTournaments.map((tournament) => (
                  <div key={tournament.id} className="grid grid-cols-12 gap-0 border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                    <div className="col-span-5 px-4 py-4 flex items-center">
                      <span className="font-semibold text-white">{tournament.name}</span>
                    </div>
                    <div className="col-span-2 px-4 py-4 flex items-center justify-center">
                      <span className="text-xs text-[#808080] uppercase tracking-wider">{tournament.season_role || 'event'}</span>
                    </div>
                    <div className="col-span-2 px-4 py-4 flex items-center justify-center">
                      <span className="text-xs text-white font-mono">{tournament.season_stage_order || '-'}</span>
                    </div>
                    <div className="col-span-2 px-4 py-4 flex items-center justify-center">
                      <span className="text-xs text-[#808080]">{tournament.current_participants}</span>
                    </div>
                    <div className="col-span-1 px-4 py-4 flex items-center justify-end">
                      <button
                        onClick={() => unlinkTournament.mutate({ tournamentId: tournament.id, seasonId: id || '' })}
                        disabled={unlinkTournament.isPending}
                        className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest hover:text-red-300 disabled:opacity-40 transition-none"
                      >
                        UNLINK
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="disputes">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Season Disputes</h2>
            </div>
            <Card className="bg-[#0d0d10] border border-white/10">
              <CardContent className="p-6">
                {disputesLoading ? (
                  <p className="text-gray-400 text-center">Loading disputes...</p>
                ) : disputes.length === 0 ? (
                  <div className="text-center py-10">
                    <ShieldAlert className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-300 font-semibold mb-1">No disputes found</p>
                    <p className="text-gray-500 text-sm">
                      Disputes raised for tournaments in this season will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {disputes.map((dispute) => (
                      <div key={dispute.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <ShieldAlert className="w-5 h-5 text-yellow-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{dispute.title}</p>
                            <p className="text-sm text-gray-400">{dispute.tournament_name} · {new Date(dispute.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge className={
                          dispute.status === 'open' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40' :
                          dispute.status === 'resolved' ? 'bg-green-500/15 text-green-300 border-green-500/40' :
                          'bg-zinc-500/15 text-zinc-300 border-zinc-500/40'
                        } variant="secondary">
                          {dispute.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SeasonManage;
