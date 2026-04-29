import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Footer from '@/components/Footer';
import SeasonQualificationsPanel from '@/components/season/SeasonQualificationsPanel';
import SeasonStandingsTable from '@/components/season/SeasonStandingsTable';
import SeasonTreePreview from '@/components/season/SeasonTreePreview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useOrganizerTournamentOptions,
  useRecalculateSeason,
  useSeason,
  useSeasonQualifications,
  useSeasonStandings,
  useSyncSeasonNodes,
  useSyncSeasonRules,
  useSyncSeasonStaff,
  useUpdateSeasonQualification,
} from '@/hooks/useSeason';
import { useUpdateSeason } from '@/hooks/useSeasons';
import { useToast } from '@/hooks/use-toast';
import type {
  SeasonNodeDraft,
  SeasonNodeStatus,
  SeasonNodeType,
  SeasonParticipantMode,
  SeasonQualificationType,
  SeasonRuleDraft,
  SeasonStaffMember,
  SeasonStatus,
  SeasonTreeNode,
  UpdateSeasonPayload,
} from '@/types/season';
import { ExternalLink, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import esportsGames from '@/data/esportsGames.json';

const TABS = [
  ['overview', 'Overview'],
  ['staff', 'Staff'],
  ['structure', 'Structure'],
  ['rules', 'Points rules'],
  ['standings', 'Standings'],
  ['qualifications', 'Qualifications'],
] as const;

const SEASON_STATUSES: SeasonStatus[] = ['draft', 'published', 'active', 'completed', 'archived'];
const PARTICIPANT_MODES: SeasonParticipantMode[] = ['team', 'solo'];
const NODE_TYPES: SeasonNodeType[] = ['root', 'qualifier', 'event', 'stage', 'final', 'custom'];
const NODE_STATUSES: SeasonNodeStatus[] = ['draft', 'scheduled', 'live', 'completed', 'archived'];
const STAFF_ROLES: SeasonStaffMember['role'][] = ['co_organizer', 'admin'];
const QUALIFICATION_TYPES: SeasonQualificationType[] = ['qualified', 'wildcard', 'reserve'];

type OverviewState = {
  name: string;
  game: string;
  participantMode: SeasonParticipantMode;
  status: SeasonStatus;
  slug: string;
  description: string;
  isPublic: boolean;
  allowManualOverrides: boolean;
  startDate: string;
  endDate: string;
};

const emptyOverview: OverviewState = {
  name: '',
  game: '',
  participantMode: 'team',
  status: 'draft',
  slug: '',
  description: '',
  isPublic: false,
  allowManualOverrides: true,
  startDate: '',
  endDate: '',
};

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const formatDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');

const buildTreeFromDrafts = (seasonId: string, nodes: SeasonNodeDraft[]): SeasonTreeNode[] => {
  const mappedNodes = nodes.map((node, index) => ({
    id: node.id ?? `draft-${index}`,
    seasonId,
    parentNodeId: node.parentNodeId,
    name: node.name || `Node ${index + 1}`,
    slug: node.slug ?? null,
    nodeType: node.nodeType,
    displayOrder: node.displayOrder,
    region: node.region ?? null,
    city: node.city ?? null,
    country: node.country ?? null,
    linkedTournamentId: node.linkedTournamentId ?? null,
    linkedStageId: node.linkedStageId ?? null,
    status: node.status,
    registrationDeadline: node.registrationDeadline ?? null,
    startsAt: node.startsAt ?? null,
    endsAt: node.endsAt ?? null,
    metadata: node.metadata ?? null,
    createdAt: '',
    updatedAt: '',
    linkedTournamentName: null,
    linkedStageName: null,
    children: [] as SeasonTreeNode[],
  }));

  const nodeMap = new Map(mappedNodes.map((node) => [node.id, node]));
  const roots: SeasonTreeNode[] = [];

  mappedNodes.forEach((node) => {
    if (node.parentNodeId && nodeMap.has(node.parentNodeId)) {
      nodeMap.get(node.parentNodeId)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  const sortRecursively = (items: SeasonTreeNode[]) => {
    items.sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name));
    items.forEach((item) => sortRecursively(item.children));
  };

  sortRecursively(roots);
  return roots;
};

const createEmptyNode = (parentNodeId: string | null, displayOrder: number): SeasonNodeDraft => ({
  parentNodeId,
  name: '',
  nodeType: 'qualifier',
  displayOrder,
  status: 'draft',
  slug: '',
  region: '',
  city: '',
  country: '',
  linkedTournamentId: null,
  linkedStageId: '',
  registrationDeadline: '',
  startsAt: '',
  endsAt: '',
  metadata: null,
});

const createEmptyRule = (sourceNodeId: string): SeasonRuleDraft => ({
  sourceNodeId,
  placementFrom: 1,
  placementTo: 1,
  pointsAwarded: 0,
  sourceStageId: null,
  destinationNodeId: null,
  qualificationStatus: 'qualified',
  autoCreateQualification: true,
  regionKey: '',
});

const SeasonManage = () => {
  const { id: seasonId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useSeason(seasonId);
  const standingsQuery = useSeasonStandings(seasonId);
  const qualificationsQuery = useSeasonQualifications(seasonId);
  const tournamentOptionsQuery = useOrganizerTournamentOptions();

  const updateSeason = useUpdateSeason(seasonId ?? '');
  const syncStaff = useSyncSeasonStaff(seasonId ?? '');
  const syncNodes = useSyncSeasonNodes(seasonId ?? '');
  const syncRules = useSyncSeasonRules(seasonId ?? '');
  const recalculateSeason = useRecalculateSeason(seasonId ?? '');
  const updateQualification = useUpdateSeasonQualification(seasonId ?? '');

  const [overview, setOverview] = useState<OverviewState>(emptyOverview);
  const [staffRows, setStaffRows] = useState<SeasonStaffMember[]>([]);
  const [nodeRows, setNodeRows] = useState<SeasonNodeDraft[]>([]);
  const [ruleRows, setRuleRows] = useState<SeasonRuleDraft[]>([]);
  const [qualificationBusyId, setQualificationBusyId] = useState<string | null>(null);

  const activeTab = searchParams.get('tab') ?? 'overview';

  useEffect(() => {
    if (!data) return;

    setOverview({
      name: data.season.name,
      game: data.season.game,
      participantMode: data.season.participantMode,
      status: data.season.status,
      slug: data.season.slug,
      description: data.season.description ?? '',
      isPublic: data.season.isPublic,
      allowManualOverrides: data.season.allowManualOverrides,
      startDate: formatDateInput(data.season.startDate),
      endDate: formatDateInput(data.season.endDate),
    });

    setStaffRows(
      (data.staff ?? []).map((member) => ({
        ...member,
        userId: member.userId,
      })),
    );

    setNodeRows(
      data.nodes
        .slice()
        .sort((left, right) => left.displayOrder - right.displayOrder)
        .map((node) => ({
          id: node.id,
          parentNodeId: node.parentNodeId,
          name: node.name,
          nodeType: node.nodeType,
          displayOrder: node.displayOrder,
          status: node.status,
          slug: node.slug ?? '',
          region: node.region ?? '',
          city: node.city ?? '',
          country: node.country ?? '',
          linkedTournamentId: node.linkedTournamentId ?? null,
          linkedStageId: node.linkedStageId ?? '',
          registrationDeadline: formatDateInput(node.registrationDeadline),
          startsAt: formatDateInput(node.startsAt),
          endsAt: formatDateInput(node.endsAt),
          metadata: null,
        })),
    );

    setRuleRows(
      data.rules.map((rule) => ({
        id: rule.id,
        sourceNodeId: rule.sourceNodeId,
        placementFrom: rule.placementFrom,
        placementTo: rule.placementTo,
        pointsAwarded: rule.pointsAwarded,
        sourceStageId: rule.sourceStageId ?? '',
        destinationNodeId: rule.destinationNodeId ?? null,
        qualificationStatus: rule.qualificationStatus ?? 'qualified',
        autoCreateQualification: rule.autoCreateQualification,
        regionKey: rule.regionKey ?? '',
      })),
    );
  }, [data]);

  const seasonTreePreview = useMemo(
    () => (seasonId ? buildTreeFromDrafts(seasonId, nodeRows) : []),
    [nodeRows, seasonId],
  );

  const nodeOptions = useMemo(
    () =>
      nodeRows.map((node, index) => ({
        id: node.id ?? `draft-${index}`,
        name: node.name || `Node ${index + 1}`,
        nodeType: node.nodeType,
      })),
    [nodeRows],
  );

  const gameOptions = useMemo(() => esportsGames.games.map((game) => game.name), []);

  const setTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  const handleOverviewSave = async () => {
    if (!seasonId) return;

    const payload: UpdateSeasonPayload = {
      name: overview.name.trim(),
      game: overview.game,
      participantMode: overview.participantMode,
      status: overview.status,
      slug: overview.slug.trim(),
      description: toNullable(overview.description),
      isPublic: overview.isPublic,
      allowManualOverrides: overview.allowManualOverrides,
      startDate: toNullable(overview.startDate),
      endDate: toNullable(overview.endDate),
    };

    try {
      await updateSeason.mutateAsync(payload);
      toast({ title: 'Season updated', description: 'Overview changes are now saved.' });
    } catch (saveError) {
      toast({
        title: 'Overview update failed',
        description: saveError instanceof Error ? saveError.message : 'Could not save the season overview.',
        variant: 'destructive',
      });
    }
  };

  const handleStaffSave = async () => {
    if (!seasonId) return;

    const payload = staffRows
      .map((member) => ({ ...member, userId: member.userId.trim() }))
      .filter((member) => member.userId.length > 0);

    try {
      await syncStaff.mutateAsync(payload);
      toast({ title: 'Staff updated', description: 'Season staff access has been synced.' });
    } catch (saveError) {
      toast({
        title: 'Staff sync failed',
        description: saveError instanceof Error ? saveError.message : 'Could not save season staff.',
        variant: 'destructive',
      });
    }
  };

  const handleNodesSave = async () => {
    if (!seasonId) return;

    const payload = nodeRows.map((node) => ({
      ...node,
      slug: toNullable(node.slug ?? ''),
      region: toNullable(node.region ?? ''),
      city: toNullable(node.city ?? ''),
      country: toNullable(node.country ?? ''),
      linkedTournamentId: node.linkedTournamentId ?? null,
      linkedStageId: toNullable(node.linkedStageId ?? ''),
      registrationDeadline: toNullable(node.registrationDeadline ?? ''),
      startsAt: toNullable(node.startsAt ?? ''),
      endsAt: toNullable(node.endsAt ?? ''),
    }));

    try {
      await syncNodes.mutateAsync(payload);
      toast({ title: 'Structure saved', description: 'Season nodes are now synced to the backend.' });
    } catch (saveError) {
      toast({
        title: 'Structure sync failed',
        description: saveError instanceof Error ? saveError.message : 'Could not save season nodes.',
        variant: 'destructive',
      });
    }
  };

  const handleRulesSave = async () => {
    if (!seasonId) return;

    const payload = ruleRows
      .filter((rule) => rule.sourceNodeId)
      .map((rule) => ({
        ...rule,
        sourceStageId: toNullable(rule.sourceStageId ?? ''),
        destinationNodeId: rule.destinationNodeId ?? null,
        qualificationStatus: rule.qualificationStatus ?? null,
        regionKey: toNullable(rule.regionKey ?? ''),
      }));

    try {
      await syncRules.mutateAsync(payload);
      toast({ title: 'Rules saved', description: 'Points and qualification rules are now updated.' });
    } catch (saveError) {
      toast({
        title: 'Rule sync failed',
        description: saveError instanceof Error ? saveError.message : 'Could not save season rules.',
        variant: 'destructive',
      });
    }
  };

  const handleRecalculate = async () => {
    if (!seasonId) return;

    try {
      await recalculateSeason.mutateAsync();
      toast({ title: 'Season recalculated', description: 'Standings and qualification records were refreshed.' });
    } catch (recalculateError) {
      toast({
        title: 'Recalculation failed',
        description: recalculateError instanceof Error ? recalculateError.message : 'Could not recalculate this season.',
        variant: 'destructive',
      });
    }
  };

  const handleQualificationManage = async (payload: {
    recordId: string;
    status?: string;
    qualificationType?: SeasonQualificationType;
    destinationNodeId?: string;
    notes?: string;
  }) => {
    if (!seasonId) return;
    setQualificationBusyId(payload.recordId);

    try {
      await updateQualification.mutateAsync(payload);
      toast({ title: 'Qualification updated', description: 'The qualification workflow state is now saved.' });
    } catch (qualificationError) {
      toast({
        title: 'Qualification update failed',
        description: qualificationError instanceof Error ? qualificationError.message : 'Could not update the qualification.',
        variant: 'destructive',
      });
    } finally {
      setQualificationBusyId(null);
    }
  };

  if (!seasonId) {
    return <div className="min-h-screen bg-[#050505]" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-zinc-400">
            Loading season workspace...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
            <p className="font-semibold text-red-100">Could not load this season.</p>
            <p className="mt-2 text-sm text-red-200/80">{error instanceof Error ? error.message : 'Season not found.'}</p>
            <Button onClick={() => refetch()} className="mt-4 bg-white/10 text-white hover:bg-white/20">
              Retry
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-400">Season manager</p>
              <Badge className="bg-rose-500/10 text-rose-300 hover:bg-rose-500/10">{data.season.status}</Badge>
              <Badge className="bg-white/10 text-white hover:bg-white/10">{data.season.participantMode}</Badge>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight">{data.season.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Edit the season shell, wire tournaments into the tree, manage qualifiers, and refresh standings from one
              workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              <Link to={`/seasons/${seasonId}`}>
                Public view
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button className="bg-rose-500 text-white hover:bg-rose-600" onClick={handleRecalculate} disabled={recalculateSeason.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalculate
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {TABS.map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={
                activeTab === tab
                  ? 'rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white'
              }
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">Season overview</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={overview.name}
                    onChange={(event) => setOverview((current) => ({ ...current, name: event.target.value }))}
                    className="border-white/10 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Game</Label>
                  <Select value={overview.game} onValueChange={(value) => setOverview((current) => ({ ...current, game: value }))}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select a game" />
                    </SelectTrigger>
                    <SelectContent>
                      {gameOptions.map((game) => (
                        <SelectItem key={game} value={game}>{game}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Participant mode</Label>
                  <Select
                    value={overview.participantMode}
                    onValueChange={(value: SeasonParticipantMode) => setOverview((current) => ({ ...current, participantMode: value }))}
                  >
                    <SelectTrigger className="border-white/10 bg-white/5 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTICIPANT_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={overview.status}
                    onValueChange={(value: SeasonStatus) => setOverview((current) => ({ ...current, status: value }))}
                  >
                    <SelectTrigger className="border-white/10 bg-white/5 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEASON_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={overview.slug}
                    onChange={(event) => setOverview((current) => ({ ...current, slug: event.target.value }))}
                    className="border-white/10 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={overview.startDate}
                    onChange={(event) => setOverview((current) => ({ ...current, startDate: event.target.value }))}
                    className="border-white/10 bg-white/5 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={overview.endDate}
                    onChange={(event) => setOverview((current) => ({ ...current, endDate: event.target.value }))}
                    className="border-white/10 bg-white/5 text-white"
                  />
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">Public season page</p>
                      <p className="mt-1 text-sm text-zinc-400">Expose the season tree, standings, and qualification state publicly.</p>
                    </div>
                    <Switch
                      checked={overview.isPublic}
                      onCheckedChange={(checked) => setOverview((current) => ({ ...current, isPublic: checked }))}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">Manual overrides</p>
                      <p className="mt-1 text-sm text-zinc-400">Allow organizer corrections for qualification routing.</p>
                    </div>
                    <Switch
                      checked={overview.allowManualOverrides}
                      onCheckedChange={(checked) => setOverview((current) => ({ ...current, allowManualOverrides: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={overview.description}
                    onChange={(event) => setOverview((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[180px] border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>

              <Button className="mt-6 bg-rose-500 text-white hover:bg-rose-600" onClick={handleOverviewSave} disabled={updateSeason.isPending}>
                Save overview
              </Button>
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                <h2 className="text-xl font-semibold">Quick snapshot</h2>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Owner</p>
                    <p className="mt-1 font-semibold text-white">{data.season.ownerFullName || data.season.ownerUsername || 'Unknown'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Tree nodes</p>
                    <p className="mt-1 font-semibold text-white">{data.nodes.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Points rules</p>
                    <p className="mt-1 font-semibold text-white">{data.rules.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                <h2 className="text-xl font-semibold">Tree preview</h2>
                <SeasonTreePreview tree={seasonTreePreview} className="mt-5" compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Season staff</h2>
                <p className="mt-2 text-sm text-zinc-400">Add co-organizers and season admins who can manage this tree.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setStaffRows((current) => [...current, { userId: '', role: 'co_organizer' }])}
              >
                <Users className="mr-2 h-4 w-4" />
                Add staff row
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              {staffRows.length === 0 && (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-zinc-400">
                  No extra staff yet. The season owner always retains management access.
                </div>
              )}

              {staffRows.map((member, index) => (
                <div key={`${member.userId}-${index}`} className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-[1fr_220px_auto]">
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input
                      value={member.userId}
                      onChange={(event) => {
                        const next = [...staffRows];
                        next[index] = { ...next[index], userId: event.target.value };
                        setStaffRows(next);
                      }}
                      placeholder="Supabase user UUID"
                      className="border-white/10 bg-black/20 text-white"
                    />
                    {(member.fullName || member.username) && (
                      <p className="text-sm text-zinc-400">{member.fullName || member.username}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={member.role}
                      onValueChange={(value: SeasonStaffMember['role']) => {
                        const next = [...staffRows];
                        next[index] = { ...next[index], role: value };
                        setStaffRows(next);
                      }}
                    >
                      <SelectTrigger className="border-white/10 bg-black/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                      onClick={() => setStaffRows((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button className="mt-6 bg-rose-500 text-white hover:bg-rose-600" onClick={handleStaffSave} disabled={syncStaff.isPending}>
              Save staff
            </Button>
          </div>
        )}

        {activeTab === 'structure' && (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Season structure</h2>
                  <p className="mt-2 text-sm text-zinc-400">Model the qualifier tree, choose parent nodes, and link each branch to a tournament.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={() =>
                    setNodeRows((current) => [...current, createEmptyNode(current[0]?.id ?? null, current.length)])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add node
                </Button>
              </div>

              <div className="mt-6 space-y-5">
                {nodeRows.map((node, index) => {
                  const rowId = node.id ?? `draft-${index}`;
                  const availableParents = nodeOptions.filter((option) => option.id !== rowId);
                  const isRoot = index === 0 || node.nodeType === 'root';

                  return (
                    <div key={rowId} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Node {index + 1}</p>
                          <p className="text-lg font-semibold text-white">{node.name || 'Untitled node'}</p>
                        </div>
                        {!isRoot && (
                          <Button
                            type="button"
                            variant="outline"
                            className="border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                            onClick={() => setNodeRows((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={node.name}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], name: event.target.value };
                              setNodeRows(next);
                            }}
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Slug</Label>
                          <Input
                            value={node.slug ?? ''}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], slug: event.target.value };
                              setNodeRows(next);
                            }}
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Node type</Label>
                          <Select
                            value={node.nodeType}
                            onValueChange={(value: SeasonNodeType) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], nodeType: value };
                              setNodeRows(next);
                            }}
                            disabled={isRoot}
                          >
                            <SelectTrigger className="border-white/10 bg-black/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {NODE_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={node.status}
                            onValueChange={(value: SeasonNodeStatus) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], status: value };
                              setNodeRows(next);
                            }}
                          >
                            <SelectTrigger className="border-white/10 bg-black/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {NODE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Parent node</Label>
                          <Select
                            value={node.parentNodeId ?? '__root__'}
                            onValueChange={(value) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], parentNodeId: value === '__root__' ? null : value };
                              setNodeRows(next);
                            }}
                            disabled={isRoot}
                          >
                            <SelectTrigger className="border-white/10 bg-black/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__root__">No parent</SelectItem>
                              {availableParents.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.name} · {option.nodeType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Display order</Label>
                          <Input
                            type="number"
                            min={0}
                            value={node.displayOrder}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], displayOrder: Number(event.target.value) };
                              setNodeRows(next);
                            }}
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Linked tournament</Label>
                          <Select
                            value={node.linkedTournamentId ?? '__none__'}
                            onValueChange={(value) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], linkedTournamentId: value === '__none__' ? null : value };
                              setNodeRows(next);
                            }}
                          >
                            <SelectTrigger className="border-white/10 bg-black/20 text-white">
                              <SelectValue placeholder="Optional linked tournament" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No linked tournament</SelectItem>
                              {(tournamentOptionsQuery.data ?? []).map((option) => (
                                <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Linked stage ID</Label>
                          <Input
                            value={node.linkedStageId ?? ''}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], linkedStageId: event.target.value };
                              setNodeRows(next);
                            }}
                            placeholder="Optional stage UUID"
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Region</Label>
                          <Input
                            value={node.region ?? ''}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], region: event.target.value };
                              setNodeRows(next);
                            }}
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            value={node.city ?? ''}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], city: event.target.value };
                              setNodeRows(next);
                            }}
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Input
                            value={node.country ?? ''}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], country: event.target.value };
                              setNodeRows(next);
                            }}
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Registration deadline</Label>
                          <Input
                            type="date"
                            value={node.registrationDeadline ?? ''}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], registrationDeadline: event.target.value };
                              setNodeRows(next);
                            }}
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Starts at</Label>
                          <Input
                            type="date"
                            value={node.startsAt ?? ''}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], startsAt: event.target.value };
                              setNodeRows(next);
                            }}
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Ends at</Label>
                          <Input
                            type="date"
                            value={node.endsAt ?? ''}
                            onChange={(event) => {
                              const next = [...nodeRows];
                              next[index] = { ...next[index], endsAt: event.target.value };
                              setNodeRows(next);
                            }}
                            className="border-white/10 bg-black/20 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button className="mt-6 bg-rose-500 text-white hover:bg-rose-600" onClick={handleNodesSave} disabled={syncNodes.isPending}>
                Save structure
              </Button>
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                <h2 className="text-xl font-semibold">Live preview</h2>
                <SeasonTreePreview tree={seasonTreePreview} className="mt-5" />
              </div>

              {tournamentOptionsQuery.error && (
                <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
                  Tournament options are unavailable right now. You can still save node metadata and wire tournament IDs later.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Points and qualification rules</h2>
                <p className="mt-2 text-sm text-zinc-400">Award season points, create qualification records automatically, and route entries into downstream nodes.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setRuleRows((current) => [...current, createEmptyRule(nodeOptions[0]?.id ?? '')])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add rule
              </Button>
            </div>

            <div className="mt-6 space-y-5">
              {ruleRows.length === 0 && (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-zinc-400">
                  No rules yet. Add one or more rules to award points or qualify entries into downstream nodes.
                </div>
              )}

              {ruleRows.map((rule, index) => (
                <div key={rule.id ?? `rule-${index}`} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Rule {index + 1}</p>
                      <p className="text-lg font-semibold text-white">Placement {rule.placementFrom} to {rule.placementTo}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                      onClick={() => setRuleRows((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Source node</Label>
                      <Select
                        value={rule.sourceNodeId}
                        onValueChange={(value) => {
                          const next = [...ruleRows];
                          next[index] = { ...next[index], sourceNodeId: value };
                          setRuleRows(next);
                        }}
                      >
                        <SelectTrigger className="border-white/10 bg-black/20 text-white">
                          <SelectValue placeholder="Select source node" />
                        </SelectTrigger>
                        <SelectContent>
                          {nodeOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>{option.name} · {option.nodeType}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Source stage ID</Label>
                      <Input
                        value={rule.sourceStageId ?? ''}
                        onChange={(event) => {
                          const next = [...ruleRows];
                          next[index] = { ...next[index], sourceStageId: event.target.value };
                          setRuleRows(next);
                        }}
                        placeholder="Optional stage UUID"
                        className="border-white/10 bg-black/20 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Destination node</Label>
                      <Select
                        value={rule.destinationNodeId ?? '__none__'}
                        onValueChange={(value) => {
                          const next = [...ruleRows];
                          next[index] = { ...next[index], destinationNodeId: value === '__none__' ? null : value };
                          setRuleRows(next);
                        }}
                      >
                        <SelectTrigger className="border-white/10 bg-black/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No destination node</SelectItem>
                          {nodeOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Placement from</Label>
                      <Input
                        type="number"
                        min={1}
                        value={rule.placementFrom}
                        onChange={(event) => {
                          const next = [...ruleRows];
                          next[index] = { ...next[index], placementFrom: Number(event.target.value) };
                          setRuleRows(next);
                        }}
                        className="border-white/10 bg-black/20 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Placement to</Label>
                      <Input
                        type="number"
                        min={rule.placementFrom}
                        value={rule.placementTo}
                        onChange={(event) => {
                          const next = [...ruleRows];
                          next[index] = { ...next[index], placementTo: Number(event.target.value) };
                          setRuleRows(next);
                        }}
                        className="border-white/10 bg-black/20 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Points awarded</Label>
                      <Input
                        type="number"
                        min={0}
                        value={rule.pointsAwarded}
                        onChange={(event) => {
                          const next = [...ruleRows];
                          next[index] = { ...next[index], pointsAwarded: Number(event.target.value) };
                          setRuleRows(next);
                        }}
                        className="border-white/10 bg-black/20 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Qualification type</Label>
                      <Select
                        value={rule.qualificationStatus ?? '__none__'}
                        onValueChange={(value) => {
                          const next = [...ruleRows];
                          next[index] = {
                            ...next[index],
                            qualificationStatus: value === '__none__' ? null : (value as SeasonQualificationType),
                          };
                          setRuleRows(next);
                        }}
                      >
                        <SelectTrigger className="border-white/10 bg-black/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No qualification</SelectItem>
                          {QUALIFICATION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Region key</Label>
                      <Input
                        value={rule.regionKey ?? ''}
                        onChange={(event) => {
                          const next = [...ruleRows];
                          next[index] = { ...next[index], regionKey: event.target.value };
                          setRuleRows(next);
                        }}
                        placeholder="Optional partition key"
                        className="border-white/10 bg-black/20 text-white"
                      />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">Auto-create qualification</p>
                          <p className="mt-1 text-sm text-zinc-400">Generate a qualification record automatically when this rule matches.</p>
                        </div>
                        <Switch
                          checked={rule.autoCreateQualification}
                          onCheckedChange={(checked) => {
                            const next = [...ruleRows];
                            next[index] = { ...next[index], autoCreateQualification: checked };
                            setRuleRows(next);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button className="mt-6 bg-rose-500 text-white hover:bg-rose-600" onClick={handleRulesSave} disabled={syncRules.isPending}>
              Save rules
            </Button>
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Standings</h2>
                <p className="mt-2 text-sm text-zinc-400">This table is driven by the season ledger and downstream recalculation engine.</p>
              </div>
              <Button className="bg-rose-500 text-white hover:bg-rose-600" onClick={handleRecalculate} disabled={recalculateSeason.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalculate
              </Button>
            </div>
            <SeasonStandingsTable standings={standingsQuery.data ?? []} />
          </div>
        )}

        {activeTab === 'qualifications' && (
          <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Qualification workflow</h2>
                <p className="mt-2 text-sm text-zinc-400">Review earned spots, invite reserves, and route winners into downstream brackets.</p>
              </div>
              <Button className="bg-rose-500 text-white hover:bg-rose-600" onClick={handleRecalculate} disabled={recalculateSeason.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh records
              </Button>
            </div>

            <SeasonQualificationsPanel
              qualifications={qualificationsQuery.data ?? []}
              canManage
              destinationOptions={nodeOptions.map((option) => ({ id: option.id, name: option.name }))}
              pendingRecordId={qualificationBusyId}
              onManage={handleQualificationManage}
            />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default SeasonManage;

