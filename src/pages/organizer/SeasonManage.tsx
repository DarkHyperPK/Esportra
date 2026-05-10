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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
            <Link to="/organizer/seasons">
              <Button variant="outline" className="border-gray-700 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Seasons
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

  const submitLinkTournament = () => {
    if (!id || !linkForm.tournament_id) return;
    linkTournament.mutate({
      tournamentId: linkForm.tournament_id,
      seasonId: id,
      seasonRole: linkForm.season_role,
      seasonStageOrder: Number(linkForm.season_stage_order),
    }, {
      onSuccess: () => {
        setShowLinkForm(false);
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
        <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center">
          <Link to="/organizer/seasons">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Seasons
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{season.name}</h1>
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(season.status)}>{season.status}</Badge>
              <span className="text-gray-400">{season.game}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {season.status === 'draft' && (
              <Button onClick={() => publishSeason.mutate(id || '')} disabled={isLifecyclePending || linkedTournaments.length === 0}>
                <Workflow className="w-4 h-4 mr-2" />
                Publish
              </Button>
            )}
            {season.status === 'published' && (
              <Button onClick={() => startSeason.mutate(id || '')} disabled={isLifecyclePending}>
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
            )}
            {(season.status === 'published' || season.status === 'live') && (
              <Button onClick={() => completeSeason.mutate(id || '')} disabled={isLifecyclePending} variant="outline" className="border-gray-700 hover:bg-white/10">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
            {season.status !== 'archived' && (
              <Button onClick={() => archiveSeason.mutate(id || '')} disabled={isLifecyclePending} variant="outline" className="border-gray-700 hover:bg-white/10">
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            )}
            <Button onClick={() => syncSeasonStatus.mutate(id || '')} disabled={isLifecyclePending} variant="outline" className="border-gray-700 hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 mr-2 ${syncSeasonStatus.isPending ? 'animate-spin' : ''}`} />
              Sync Status
            </Button>
          </div>
        </div>

        {/* Season Info */}
        <Card className="bg-[#0d0d10] border border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Season Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <Trophy className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Tournaments</p>
                  <p className="text-2xl font-bold">{season.tournament_count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date Range</p>
                  <p className="text-sm font-medium">
                    {season.start_date ? new Date(season.start_date).toLocaleDateString() : 'Not set'}
                    {' - '}
                    {season.end_date ? new Date(season.end_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Trophy className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Point Rules</p>
                  <p className="text-2xl font-bold">{season.point_rules_count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/10 rounded-lg">
                  <Users className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Teams</p>
                  <p className="text-2xl font-bold">{season.participant_count}</p>
                </div>
              </div>
            </div>
            {season.description && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-gray-300">{season.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0d0d10] border border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Automation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-gray-400">Linked tournaments</p>
                <p className="mt-1 text-2xl font-bold">{linkedTournaments.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-gray-400">Point rules</p>
                <p className="mt-1 text-2xl font-bold">{season.point_rules_count}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-gray-400">Advancement rules</p>
                <p className="mt-1 text-2xl font-bold">{season.advancement_rules_count}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-gray-400">Health</p>
                <p className="mt-1 text-sm text-gray-300">
                  {linkedTournaments.length === 0 ? 'Link tournaments before publishing.' : 'Ready for automation checks.'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => processAdvancement.mutate({ id: id || '' })} disabled={processAdvancement.isPending || linkedTournaments.length === 0} variant="outline" className="border-gray-700 hover:bg-white/10">
                <Workflow className="w-4 h-4 mr-2" />
                Process Advancement
              </Button>
              <Button onClick={() => recalculateStandings.mutate(id || '')} disabled={recalculateStandings.isPending} variant="outline" className="border-gray-700 hover:bg-white/10">
                <RefreshCw className={`w-4 h-4 mr-2 ${recalculateStandings.isPending ? 'animate-spin' : ''}`} />
                Recalculate Standings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
            <TabsTrigger value="point-rules">Point Rules</TabsTrigger>
            <TabsTrigger value="advancement-rules">Advancement Rules</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Season Tournaments</h2>
              <div className="flex gap-2">
                <Link to={`/tournaments/create?mode=event&seasonId=${id}&game=${encodeURIComponent(season.game)}`}>
                  <Button variant="outline" className="border-gray-700 hover:bg-white/10">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Tournament
                  </Button>
                </Link>
                <Button onClick={() => setShowLinkForm((open) => !open)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Link Existing
                </Button>
              </div>
            </div>
            {showLinkForm && (
              <Card className="bg-[#0d0d10] border border-white/10 mb-4">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select value={linkForm.tournament_id} onChange={(e) => setLinkForm((prev) => ({ ...prev, tournament_id: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white md:col-span-2">
                    <option value="">Select tournament</option>
                    {availableTournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                    ))}
                  </select>
                  <select value={linkForm.season_role} onChange={(e) => setLinkForm((prev) => ({ ...prev, season_role: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white">
                    <option value="qualifier">Qualifier</option>
                    <option value="event">Event</option>
                    <option value="finals">Finals</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input type="number" min="1" value={linkForm.season_stage_order} onChange={(e) => setLinkForm((prev) => ({ ...prev, season_stage_order: e.target.value }))} className="bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Order" />
                  <Button onClick={submitLinkTournament} disabled={linkTournament.isPending || !linkForm.tournament_id}>Link</Button>
                </CardContent>
              </Card>
            )}
            <Card className="bg-[#0d0d10] border border-white/10">
              <CardContent className="p-6">
                {linkedTournamentsLoading ? (
                  <p className="text-gray-400 text-center">Loading tournaments...</p>
                ) : linkedTournaments.length === 0 ? (
                  <div className="text-center py-10">
                    <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-300 font-semibold mb-1">No tournaments linked yet</p>
                    <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                      Create a tournament for this season, then link it here to track standings and apply point rules.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link to={`/tournaments/create?mode=event&seasonId=${id}&game=${encodeURIComponent(season.game)}`}>
                        <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Tournament
                        </Button>
                      </Link>
                      <Button variant="outline" className="border-gray-700 hover:bg-white/10" onClick={() => setShowLinkForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Link Existing Tournament
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedTournaments.map((tournament) => (
                      <div key={tournament.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-4">
                        <div>
                          <p className="font-semibold text-white">{tournament.name}</p>
                          <p className="text-sm text-gray-400">
                            {tournament.season_role || 'event'} · Stage {tournament.season_stage_order || '-'} · {tournament.current_participants} participants
                          </p>
                        </div>
                        <Button variant="ghost" className="text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => unlinkTournament.mutate({ tournamentId: tournament.id, seasonId: id || '' })} disabled={unlinkTournament.isPending}>
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
