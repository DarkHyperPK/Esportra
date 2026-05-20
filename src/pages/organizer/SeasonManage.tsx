import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import Footer from '@/components/Footer';
import SeasonStructureBuilder from '@/components/season/builder/SeasonStructureBuilder';
import ImageUploader from '@/components/tournament/wizard/ImageUploader';
import {
  buildSeasonTreeFromDrafts,
  getPhaseMetaForType,
  hydrateSeasonBuilderNodes,
  isTournamentConfigComplete,
  readOutgoingConnections,
  readTournamentConfig,
  toSeasonNodeDraftPayload,
  validateSeasonBuilderNodes,
  validateSeasonSetupDomain,
} from '@/components/season/builder/seasonBuilderUtils';
import { formatDistanceToNow } from 'date-fns';
import SeasonQualificationsPanel from '@/components/season/SeasonQualificationsPanel';
import SeasonStandingsTable from '@/components/season/SeasonStandingsTable';
import SeasonTreePreview from '@/components/season/SeasonTreePreview';
import SeasonAnnouncements from '@/components/season/management/SeasonAnnouncements';
import SeasonAdvancementDashboard from '@/components/season/management/SeasonAdvancementDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useRecalculateSeason,
  useSeason,
  useSeasonQualifications,
  useSeasonStandings,
  useSyncSeasonNodes,
  useSyncSeasonRules,
  useSyncSeasonStaff,
  useUpdateSeasonQualification,
} from '@/hooks/useSeason';
import { usePublishSeason, useUpdateSeason, useArchiveSeason, useCancelSeason, useDuplicateSeason, useSeasonTournaments, useSeasonAdvancement, useSeasonAuditLog, useAddSeasonTournament } from '@/hooks/useSeasons';
import { useToast } from '@/hooks/use-toast';
import { seasonBasicsSchema } from '@/schemas/seasonSchema';
import type {
  AdvancementConnection,
  SeasonNodeDraft,
  SeasonBuilderNode,
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
import { CheckCircle2, ExternalLink, Plus, RefreshCw, Trash2, Users, Archive, XCircle, Copy, Settings, FileText, TrendingUp, GitBranch, AlertCircle, ArrowRight, Bell, Clock, Info, Shield, Activity, X, AlertTriangle, Lock, ShieldOff, LayoutDashboard, Workflow, Trophy, ClipboardList, Target, Menu, ChevronLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import esportsGames from '@/data/esportsGames.json';

type SeasonManageNavItem = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const NAV_GROUPS: Array<{ label: string; items: SeasonManageNavItem[] }> = [
  {
    label: 'COMMAND',
    items: [
      { id: 'overview', label: 'Overview', description: 'Season operations and health', icon: LayoutDashboard },
    ],
  },
  {
    label: 'COMPETITION',
    items: [
      { id: 'tournaments', label: 'Tournaments', description: 'Season tournament registry', icon: Trophy },
      { id: 'registrations', label: 'Registrations', description: 'Entry windows and participants', icon: ClipboardList },
      { id: 'standings', label: 'Leaderboards', description: 'Standings and recalculation', icon: TrendingUp },
      { id: 'advancement', label: 'Advancement', description: 'Promotions between tournaments', icon: ArrowRight },
      { id: 'qualifications', label: 'Qualifications', description: 'Qualified teams pipeline', icon: CheckCircle2 },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { id: 'structure', label: 'Structure editor', description: 'Adjust the tournament graph', icon: GitBranch },
      { id: 'rules', label: 'Rules', description: 'Scoring and qualification logic', icon: Target },
      { id: 'flow', label: 'Flow map', description: 'Preview tournament routing', icon: Workflow },
      { id: 'staff', label: 'Staff Access', description: 'Admins and co-organizers', icon: Users },
      { id: 'announcements', label: 'Announcements', description: 'Broadcast season updates', icon: Bell },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { id: 'analytics', label: 'Analytics', description: 'Readiness and health', icon: Activity },
      { id: 'settings', label: 'Settings', description: 'Policies and lifecycle', icon: Settings },
      { id: 'audit', label: 'Audit Log', description: 'Change history', icon: FileText },
    ],
  },
];

const STATUS_STYLES: Record<SeasonStatus, string> = {
  draft: 'border-zinc-700/40 text-zinc-400 bg-zinc-500/10',
  published: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  active: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  completed: 'border-white/20 text-zinc-300 bg-white/10',
  archived: 'border-zinc-700/30 text-zinc-600 bg-zinc-700/10',
  cancelled: 'border-red-500/30 text-red-400 bg-red-500/10',
};

const SEASON_STATUSES: SeasonStatus[] = ['draft', 'published', 'active', 'completed', 'archived'];
const NODE_TYPES: SeasonNodeType[] = ['root', 'qualifier', 'event', 'stage', 'final', 'custom'];
const NODE_STATUSES: SeasonNodeStatus[] = ['draft', 'scheduled', 'live', 'completed', 'archived'];
const STAFF_ROLES: SeasonStaffMember['role'][] = ['co_organizer', 'admin'];
const QUALIFICATION_TYPES: SeasonQualificationType[] = ['qualified', 'wildcard', 'reserve'];
const SEASON_TOURNAMENT_ROLES = ['qualifier', 'event', 'regional_final', 'last_chance_qualifier', 'playoff', 'grand_final', 'custom'];

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
  bannerUrl: string | null;
  logoUrl: string | null;
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
  bannerUrl: null,
  logoUrl: null,
};

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const formatDisplayDate = (value?: string | null) => {
  if (!value) return 'Unscheduled';

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');

const getTournamentStatusClass = (status?: string | null) => {
  const styles: Record<string, string> = {
    draft: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
    scheduled: 'border-blue-500/25 bg-blue-500/10 text-blue-300',
    live: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    completed: 'border-white/20 bg-white/10 text-white',
    cancelled: 'border-red-500/25 bg-red-500/10 text-red-300',
  };

  return styles[status ?? 'draft'] ?? styles.draft;
};

const getTournamentRoleClass = (role?: string | null) => {
  const styles: Record<string, string> = {
    qualifier: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
    event: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
    regional_final: 'border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300',
    grand_final: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    playoff: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    last_chance_qualifier: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
    custom: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
  };

  return styles[role ?? 'custom'] ?? styles.custom;
};

const formatTournamentLabel = (value?: string | null) => (value ? value.replace(/_/g, ' ') : 'custom');

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
  const updateSeason = useUpdateSeason(seasonId ?? '');
  const syncStaff = useSyncSeasonStaff(seasonId ?? '');
  const syncNodes = useSyncSeasonNodes(seasonId ?? '');
  const syncRules = useSyncSeasonRules(seasonId ?? '');
  const recalculateSeason = useRecalculateSeason(seasonId ?? '');
  const updateQualification = useUpdateSeasonQualification(seasonId ?? '');
  const publishSeason = usePublishSeason();
  const archiveSeason = useArchiveSeason();
  const cancelSeason = useCancelSeason();
  const duplicateSeason = useDuplicateSeason();
  const addSeasonTournament = useAddSeasonTournament();
  const tournamentsQuery = useSeasonTournaments(seasonId ?? '');
  const advancementQuery = useSeasonAdvancement(seasonId ?? '');
  const auditLogQuery = useSeasonAuditLog(seasonId ?? '');

  const [overview, setOverview] = useState<OverviewState>(emptyOverview);
  const [staffRows, setStaffRows] = useState<SeasonStaffMember[]>([]);
  const [newStaff, setNewStaff] = useState<{ userId: string; role: SeasonStaffMember['role'] }>({ userId: '', role: 'co_organizer' });
  const [nodeRows, setNodeRows] = useState<SeasonBuilderNode[]>([]);
  const [ruleRows, setRuleRows] = useState<SeasonRuleDraft[]>([]);
  const [qualificationBusyId, setQualificationBusyId] = useState<string | null>(null);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [showStructureSaveConfirm, setShowStructureSaveConfirm] = useState(false);
  const [rosterLock, setRosterLock] = useState(false);
  const [allowRosterChangesBetween, setAllowRosterChangesBetween] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isAddTournamentOpen, setIsAddTournamentOpen] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: '',
    role: 'qualifier',
    region: '',
    format: 'single_elimination',
    maxTeams: '16',
    teamSize: '5',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
  });

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
      bannerUrl: data.season.bannerUrl ?? null,
      logoUrl: data.season.logoUrl ?? null,
    });

    setStaffRows(
      (data.staff ?? []).map((member) => ({
        ...member,
        userId: member.userId,
      })),
    );

    setNodeRows(hydrateSeasonBuilderNodes(data.nodes));

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

    const seasonSettings = data.season.settings as Record<string, unknown> | null | undefined;
    setRosterLock(typeof seasonSettings?.rosterLock === 'boolean' ? seasonSettings.rosterLock : false);
    setAllowRosterChangesBetween(typeof seasonSettings?.allowRosterChangesBetween === 'boolean' ? seasonSettings.allowRosterChangesBetween : true);
  }, [data]);

  const seasonTreePreview = useMemo(
    () => (seasonId ? buildSeasonTreeFromDrafts(seasonId, nodeRows) : []),
    [nodeRows, seasonId],
  );

  const nodeOptions = useMemo(
    () =>
      nodeRows.map((node, index) => ({
        id: node.id || `draft-${index}`,
        name: node.name || `Node ${index + 1}`,
        nodeType: node.nodeType,
      })),
    [nodeRows],
  );

  const gameOptions = useMemo(() => esportsGames.games.map((game) => game.name), []);

  const setTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  const resetNewTournament = () => {
    setNewTournament({
      name: '',
      role: 'qualifier',
      region: '',
      format: 'single_elimination',
      maxTeams: '16',
      teamSize: '5',
      startDate: '',
      endDate: '',
      registrationDeadline: '',
    });
  };

  const handleAddTournament = async () => {
    if (!seasonId) return;
    const name = newTournament.name.trim();

    if (name.length < 3) {
      toast({
        title: 'Validation failed',
        description: 'Tournament name must be at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addSeasonTournament.mutateAsync({
        seasonId,
        tournament: {
          name,
          role: newTournament.role,
          region: newTournament.region.trim() || undefined,
          displayName: name,
          format: newTournament.format,
          maxTeams: Number(newTournament.maxTeams) || 16,
          teamSize: Number(newTournament.teamSize) || 5,
          startDate: newTournament.startDate || undefined,
          endDate: newTournament.endDate || undefined,
          registrationDeadline: newTournament.registrationDeadline || undefined,
        },
      });
      resetNewTournament();
      setIsAddTournamentOpen(false);
      await tournamentsQuery.refetch();
    } catch {}
  };

  const handleOverviewSave = async () => {
    if (!seasonId) return;

    const validation = seasonBasicsSchema.safeParse(overview);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: 'Validation failed',
        description: firstError?.message ?? 'Please check the overview fields.',
        variant: 'destructive',
      });
      return;
    }

    if (overview.startDate && overview.endDate && new Date(overview.endDate) < new Date(overview.startDate)) {
      toast({
        title: 'Validation failed',
        description: 'End date must be on or after the start date.',
        variant: 'destructive',
      });
      return;
    }

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
      bannerUrl: overview.bannerUrl,
      logoUrl: overview.logoUrl,
      settings: { rosterLock, allowRosterChangesBetween },
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

    const nodeValidation = validateSeasonBuilderNodes(nodeRows);
    if (!nodeValidation.valid) {
      toast({
        title: 'Validation failed',
        description: nodeValidation.message ?? 'Please finish the tournament flow before saving.',
        variant: 'destructive',
      });
      return;
    }

    const payload = toSeasonNodeDraftPayload(nodeRows).map((node) => ({
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
      toast({ title: 'Tournament flow saved', description: 'Planned tournaments and advancement are now synced to the backend.' });
    } catch (saveError) {
      toast({
        title: 'Structure sync failed',
        description: saveError instanceof Error ? saveError.message : 'Could not save season nodes.',
        variant: 'destructive',
      });
    }
  };

  const handleNodesSaveWithGuard = () => {
    const isStructureLocked =
      data?.season.status === 'published' ||
      data?.season.status === 'active' ||
      data?.season.status === 'completed';
    if (isStructureLocked) {
      setShowStructureSaveConfirm(true);
    } else {
      handleNodesSave();
    }
  };

  const handleRevokeQualification = async (recordId: string, displayName: string) => {
    if (!confirm(`Revoke qualification for ${displayName}? This cannot be automatically undone.`)) return;
    setQualificationBusyId(recordId);
    try {
      await updateQualification.mutateAsync({ recordId, status: 'revoked', notes: 'Manually revoked by organizer' });
      toast({ title: `Qualification revoked for ${displayName}` });
    } catch (err) {
      toast({
        title: 'Revoke failed',
        description: err instanceof Error ? err.message : 'Could not revoke.',
        variant: 'destructive',
      });
    } finally {
      setQualificationBusyId(null);
    }
  };

  const handleRulesSave = async () => {    if (!seasonId) return;

    const invalidRule = ruleRows.find((rule) => rule.sourceNodeId && rule.placementFrom > rule.placementTo);
    if (invalidRule) {
      toast({
        title: 'Validation failed',
        description: `Placement range is invalid: "from" (${invalidRule.placementFrom}) cannot be greater than "to" (${invalidRule.placementTo}).`,
        variant: 'destructive',
      });
      return;
    }

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

  const handlePublish = async () => {
    if (!seasonId) return;

    try {
      const result = await publishSeason.mutateAsync({
        seasonId,
        req: { allowIncomplete: false, activate: false },
      });
      toast({
        title: 'Season published',
        description: `${result.tournamentsCreated} tournaments created, ${result.connectionsWired} advancement connections wired.`,
      });
      refetch();
    } catch (publishError) {
      toast({
        title: 'Publish failed',
        description: publishError instanceof Error ? publishError.message : 'Could not publish this season.',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async () => {
    if (!seasonId) return;

    try {
      await archiveSeason.mutateAsync(seasonId);
      toast({ title: 'Season archived', description: 'The season has been archived.' });
      refetch();
    } catch (archiveError) {
      toast({
        title: 'Archive failed',
        description: archiveError instanceof Error ? archiveError.message : 'Could not archive this season.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async () => {
    if (!seasonId) return;

    const reason = prompt('Please provide a reason for cancelling this season:');
    if (!reason) return;

    try {
      await cancelSeason.mutateAsync({ seasonId, reason });
      toast({ title: 'Season cancelled', description: 'The season has been cancelled.' });
      refetch();
    } catch (cancelError) {
      toast({
        title: 'Cancel failed',
        description: cancelError instanceof Error ? cancelError.message : 'Could not cancel this season.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async () => {
    if (!seasonId || !data) return;

    const newName = prompt('Enter a name for the duplicated season:', `${data.season.name} (Copy)`);
    if (!newName) return;

    const newSlug = prompt('Enter a slug for the duplicated season:', `${data.season.slug}-copy`);
    if (!newSlug) return;

    try {
      const result = await duplicateSeason.mutateAsync({ seasonId, newName, newSlug });
      toast({ title: 'Season duplicated', description: `New season created: ${result.seasonId}` });
      window.location.href = `/season/manage/${result.seasonId}`;
    } catch (duplicateError) {
      toast({
        title: 'Duplicate failed',
        description: duplicateError instanceof Error ? duplicateError.message : 'Could not duplicate this season.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!seasonId || !data) return;

    if (data.season.status !== 'draft') {
      toast({
        title: 'Cannot delete',
        description: 'Only draft seasons can be deleted.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this season? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/seasons/${seasonId}`);
      toast({ title: 'Season deleted', description: 'The season has been deleted.' });
      window.location.href = '/organizer/seasons';
    } catch (deleteError) {
      toast({
        title: 'Deletion failed',
        description: deleteError instanceof Error ? deleteError.message : 'Could not delete this season.',
        variant: 'destructive',
      });
    }
  };

  if (!seasonId) {
    return <div className="min-h-screen bg-transparent" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent text-white">
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
      <div className="min-h-screen bg-transparent text-white">
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

  const seasonTournaments = tournamentsQuery.data ?? [];
  const plannedTournamentNodes = nodeRows.filter((node) => node.nodeType !== 'root');
  const readyPlannedTournamentCount = plannedTournamentNodes.filter((node) => isTournamentConfigComplete(readTournamentConfig(node))).length;
  const liveTournamentCount = seasonTournaments.filter((tournament) => (tournament.tournamentStatus ?? tournament.status) === 'live').length;
  const invalidSeasonDates = Boolean(overview.startDate && overview.endDate && new Date(overview.endDate) < new Date(overview.startDate));
  const totalAdvancementConnections = plannedTournamentNodes.reduce((total, node) => total + readOutgoingConnections(node).length, 0);
  const hasRuleRows = ruleRows.some((rule) => rule.sourceNodeId);
  const hasInvalidRuleRows = ruleRows.some((rule) => rule.sourceNodeId && rule.placementFrom > rule.placementTo);
  const hasRuleDestination = ruleRows.some((rule) => Boolean(rule.destinationNodeId));
  const identityReady = Boolean(overview.name.trim() && overview.slug.trim() && overview.game && overview.startDate && overview.endDate && !invalidSeasonDates);
  const rulesReady = hasRuleRows && !hasInvalidRuleRows;
  const flowReady = plannedTournamentNodes.length <= 1 || totalAdvancementConnections > 0 || hasRuleDestination;
  const leaderboardReady = rulesReady && (standingsQuery.data?.length ?? 0) > 0;
  const setupDomainValidation = validateSeasonSetupDomain(nodeRows, ruleRows);

  const canPublishSeason = identityReady && setupDomainValidation.issues.length === 0;
  const managementChecks = [
    { label: 'Linked tournaments', value: seasonTournaments.length, complete: seasonTournaments.length > 0, tab: 'tournaments' },
    { label: 'Registrations scheduled', value: plannedTournamentNodes.length - setupDomainValidation.missingSchedule.length, complete: setupDomainValidation.missingSchedule.length === 0 && setupDomainValidation.invalidSchedule.length === 0, tab: 'registrations' },
    { label: 'Rules configured', value: ruleRows.filter((rule) => rule.sourceNodeId).length, complete: rulesReady, tab: 'rules' },
    { label: 'Advancement wired', value: totalAdvancementConnections, complete: flowReady, tab: 'advancement' },
    { label: 'Leaderboard rows', value: standingsQuery.data?.length ?? 0, complete: leaderboardReady, tab: 'standings' },
  ];
  const allNavItems = NAV_GROUPS.flatMap((group) => group.items);
  const activeNavItem = allNavItems.find((item) => item.id === activeTab) ?? allNavItems[0];
  const ActiveNavIcon = activeNavItem.icon;

  const renderSidebarContent = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-white/[0.08] p-4">
        <Link
          to="/organizer/seasons"
          className="mb-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Seasons
        </Link>
        <div className="overflow-hidden border border-white/10 bg-white/[0.03]">
          {data.season.bannerUrl && (
            <div className="h-14 border-b border-white/10 bg-cover bg-center" style={{ backgroundImage: `url(${data.season.bannerUrl})` }} />
          )}
          <div className="p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-black">
                {data.season.logoUrl
                  ? <img src={data.season.logoUrl} alt="" className="h-full w-full object-cover" />
                  : <Trophy className="h-5 w-5 text-rose-400" />
                }
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black uppercase tracking-tight text-white">{data.season.name}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{data.season.game}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${STATUS_STYLES[data.season.status]}`}>
                {data.season.status}
              </span>
              <span className="inline-flex items-center border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                {data.season.participantMode}
              </span>
            </div>
          </div>
        </div>

        {data.season.status === 'draft' && (
          <button
            onClick={() => { setIsMobileNavOpen(false); handlePublish(); }}
            disabled={!canPublishSeason || publishSeason.isPending}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 bg-rose-500 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-rose-400 active:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {publishSeason.isPending ? 'Publishing…' : 'Publish'}
          </button>
        )}
        {data.season.status === 'completed' && (
          <button
            onClick={() => { setIsMobileNavOpen(false); handleArchive(); }}
            disabled={archiveSeason.isPending}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 border border-white/10 bg-white/[0.04] font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-white/[0.08] disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            {archiveSeason.isPending ? 'Archiving…' : 'Archive'}
          </button>
        )}
      </div>

      <nav className="relative z-10 block min-h-[240px] flex-1 space-y-4 overflow-y-auto border-y border-white/[0.06] bg-[#070707] px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-700">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map(({ id, label, description, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => { setTab(id); setIsMobileNavOpen(false); }}
                    className={cn(
                      'group flex w-full items-start gap-2 border p-2.5 text-left transition-colors',
                      isActive
                        ? 'border-rose-500/40 bg-rose-500/[0.08] text-white'
                        : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white',
                    )}
                  >
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', isActive ? 'text-rose-400' : 'text-zinc-600 group-hover:text-zinc-300')} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-4">{label}</span>
                      <span className="mt-1 block text-xs leading-4 text-zinc-600 group-hover:text-zinc-500">{description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative z-20 shrink-0 space-y-2 border-t border-white/[0.08] bg-[#070707] p-4">
        <button
          onClick={() => { setIsMobileNavOpen(false); handleRecalculate(); }}
          disabled={recalculateSeason.isPending}
          className="flex h-10 w-full items-center gap-3 border border-white/10 bg-white/[0.03] px-3 text-left text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 shrink-0 ${recalculateSeason.isPending ? 'animate-spin' : ''}`} />
          Recalculate season
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setIsMobileNavOpen(false); handleDuplicate(); }}
            disabled={duplicateSeason.isPending}
            className="flex h-10 items-center justify-center gap-2 border border-white/10 bg-white/[0.03] text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5 shrink-0" />
            Duplicate
          </button>
          <Button asChild variant="ghost" size="sm" className="h-10 rounded-none border border-white/10 bg-white/[0.03] text-xs font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white">
            <Link to={`/season/${data.season.slug}`} target="_blank">
              <ExternalLink className="mr-2 h-3.5 w-3.5 shrink-0" />
              Public
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-white">
      {/* Fixed sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden border-r border-white/[0.08] bg-[#070707] lg:flex">
        {renderSidebarContent()}
      </aside>

      {/* Mobile nav drawer */}
      {isMobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 lg:hidden"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-[22rem] max-w-[90vw] flex-col overflow-hidden border-r border-white/[0.08] bg-[#070707] lg:hidden">
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06] shrink-0">
              <span className="text-white text-sm font-semibold truncate">{data.season.name}</span>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0 ml-2"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderSidebarContent()}
          </div>
        </>
      )}

      {/* Sticky top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#050505]/85 px-4 backdrop-blur-xl lg:hidden">
        <button
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={`hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLES[data.season.status]}`}>
            {data.season.status}
          </span>
          <span className="text-white text-sm font-semibold truncate">{data.season.name}</span>
        </div>
      </header>

      <main className="relative z-10 px-4 py-6 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">
        <section className="mb-8 overflow-hidden border border-white/10 bg-[#08080a]">
          {data.season.bannerUrl && (
            <div className="h-32 border-b border-white/10 bg-cover bg-center opacity-70" style={{ backgroundImage: `url(${data.season.bannerUrl})` }} />
          )}
          <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 border border-rose-500/25 bg-rose-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-rose-300">
                    <ActiveNavIcon className="h-3.5 w-3.5" />
                    {activeNavItem.label}
                  </span>
                  <span className={`inline-flex items-center border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${STATUS_STYLES[data.season.status]}`}>
                    {data.season.status}
                  </span>
                </div>
                <h1 className="max-w-5xl truncate text-4xl font-black uppercase tracking-[-0.05em] text-white md:text-6xl">
                  {data.season.name}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400 md:text-base">
                  {activeNavItem.description}. Manage the complete season lifecycle from structure and tournaments to teams, standings, communications, and publishing.
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:max-w-[460px]">
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">Nodes</p>
                  <p className="mt-2 text-2xl font-black text-white">{plannedTournamentNodes.length}</p>
                </div>
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">Ready</p>
                  <p className="mt-2 text-2xl font-black text-emerald-400">{readyPlannedTournamentCount}</p>
                </div>
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">Linked</p>
                  <p className="mt-2 text-2xl font-black text-white">{seasonTournaments.length}</p>
                </div>
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">Live</p>
                  <p className="mt-2 text-2xl font-black text-rose-400">{liveTournamentCount}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="rounded-none bg-rose-500 text-white hover:bg-rose-400" onClick={() => setTab('tournaments')}>
                Manage tournaments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button asChild variant="outline" className="rounded-none border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]">
                <Link to={`/season/setup/${seasonId}/plan`}>
                  <GitBranch className="mr-2 h-4 w-4" />
                  Edit setup plan
                </Link>
              </Button>
              <Button variant="outline" className="rounded-none border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]" onClick={handleRecalculate} disabled={recalculateSeason.isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${recalculateSeason.isPending ? 'animate-spin' : ''}`} />
                Recalculate
              </Button>
              <Button asChild variant="outline" className="rounded-none border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]">
                <Link to={`/season/${data.season.slug}`} target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Public Page
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {activeTab === 'overview' && (
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className="border border-white/10 bg-[#08080a] p-6 lg:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-rose-400">Management realm</p>
                    <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">Season operations dashboard</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                      Operate the season after planning: monitor tournaments, registrations, standings, advancement, staff, announcements, and lifecycle controls from their own tabs.
                    </p>
                  </div>
                  <Button asChild className="rounded-none bg-white text-black hover:bg-zinc-200">
                    <Link to={`/season/setup/${seasonId}/review`}>
                      Review setup tree
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {managementChecks.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setTab(item.tab)}
                      className="group border border-white/10 bg-white/[0.03] p-5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn('flex h-6 w-6 items-center justify-center border', item.complete ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-amber-500/30 bg-amber-500/10 text-amber-300')}>
                          {item.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        </span>
                        <ArrowRight className="h-4 w-4 text-zinc-700 transition-colors group-hover:text-rose-400" />
                      </div>
                      <p className="mt-5 text-2xl font-black text-white">{item.value}</p>
                      <p className="mt-1 text-xs text-zinc-500">{item.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-white/10 bg-[#08080a] p-6 lg:p-8">
                <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Season identity</p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Public profile and lifecycle</h2>
                  </div>
                  <Button className="rounded-none bg-white text-black hover:bg-zinc-200" onClick={handleOverviewSave} disabled={updateSeason.isPending}>
                    Save identity
                  </Button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={overview.name} onChange={(event) => setOverview((current) => ({ ...current, name: event.target.value }))} className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Game</Label>
                    <Select value={overview.game} onValueChange={(value) => setOverview((current) => ({ ...current, game: value }))}>
                      <SelectTrigger className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white">
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
                    <Label>Participant format</Label>
                    <div className="flex min-h-12 items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-4 py-3">
                      <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white">
                        {overview.participantMode}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Derived from the selected game mode
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={overview.status} onValueChange={(value: SeasonStatus) => setOverview((current) => ({ ...current, status: value }))}>
                      <SelectTrigger className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{SEASON_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={overview.slug} onChange={(event) => setOverview((current) => ({ ...current, slug: event.target.value }))} className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Input type="date" value={overview.startDate} onChange={(event) => setOverview((current) => ({ ...current, startDate: event.target.value }))} className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>End</Label>
                      <Input type="date" value={overview.endDate} onChange={(event) => setOverview((current) => ({ ...current, endDate: event.target.value }))} className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white" />
                    </div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">Public season page</p>
                        <p className="mt-1 text-sm text-zinc-500">Expose tree, standings, and qualification state publicly.</p>
                      </div>
                      <Switch checked={overview.isPublic} onCheckedChange={(checked) => setOverview((current) => ({ ...current, isPublic: checked }))} />
                    </div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">Manual overrides</p>
                        <p className="mt-1 text-sm text-zinc-500">Allow organizer corrections for routing.</p>
                      </div>
                      <Switch checked={overview.allowManualOverrides} onCheckedChange={(checked) => setOverview((current) => ({ ...current, allowManualOverrides: checked }))} />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Mission brief</Label>
                    <Textarea value={overview.description} onChange={(event) => setOverview((current) => ({ ...current, description: event.target.value }))} className="min-h-[150px] rounded-none border-white/10 bg-white/[0.03] text-white" />
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="border border-white/10 bg-[#08080a] p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Lifecycle</p>
                <h3 className="mt-3 text-xl font-black uppercase tracking-tight text-white">{canPublishSeason ? 'Ready to publish' : 'Review setup first'}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Setup edits live in the dedicated Plan and Review pages. Management actions stay inside the operational tabs.
                </p>
                {data.season.status === 'draft' && (
                  <Button className="mt-5 w-full rounded-none bg-rose-500 text-white hover:bg-rose-400 disabled:opacity-50" onClick={handlePublish} disabled={!canPublishSeason || publishSeason.isPending}>
                    {publishSeason.isPending ? 'Publishing...' : 'Publish season'}
                  </Button>
                )}
                <Button asChild variant="outline" className="mt-3 w-full rounded-none border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]">
                  <Link to={`/season/setup/${seasonId}/plan`}>Open setup plan</Link>
                </Button>
              </div>

              <div className="border border-white/10 bg-[#08080a] p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Operational health</p>
                <div className="mt-5 space-y-3">
                  {managementChecks.map((item) => (
                    <button key={item.label} onClick={() => setTab(item.tab)} className="flex w-full items-start gap-3 text-left">
                      <div className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border', item.complete ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-amber-500/40 bg-amber-500/10 text-amber-300')}>
                        {item.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-300">{item.label}</p>
                        <p className="mt-0.5 text-xs text-zinc-600">{item.value} recorded</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-white/10 bg-[#08080a] p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Tree Preview</p>
                <SeasonTreePreview tree={seasonTreePreview} className="mt-5" compact />
              </div>
            </aside>
          </div>
        )}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-white">Season Staff</h2>
                  <p className="mt-1 font-body text-sm text-zinc-400">Add co-organizers and admins who can manage this season.</p>
                </div>
                {staffRows.length > 0 && (
                  <Badge className="w-fit bg-white/[0.06] text-zinc-300 hover:bg-white/[0.06]">
                    {staffRows.length} member{staffRows.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            {/* Staff list + add form */}
            <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
              {/* Empty state */}
              {staffRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] py-14 text-center">
                  <Users className="h-10 w-10 text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-400">No staff members added.</p>
                  <p className="text-xs text-zinc-600">Add co-organizers or admins below.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {staffRows.map((member, index) => {
                    const displayName = member.fullName || member.username || member.userId;
                    const initials = member.userId.slice(0, 2).toUpperCase();
                    const isCoOrganizer = member.role === 'co_organizer';
                    return (
                      <div
                        key={`${member.userId}-${index}`}
                        className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                      >
                        {/* Avatar */}
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isCoOrganizer ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-white">{displayName}</p>
                          {displayName !== member.userId && (
                            <p className="truncate font-body text-xs text-zinc-500">{member.userId}</p>
                          )}
                        </div>

                        {/* Role badge */}
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${isCoOrganizer ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
                          {isCoOrganizer ? 'Co-organizer' : 'Admin'}
                        </span>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => setStaffRows((current) => current.filter((_, i) => i !== index))}
                          className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          aria-label="Remove staff member"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline add form */}
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
                <Input
                  value={newStaff.userId}
                  onChange={(e) => setNewStaff((s) => ({ ...s, userId: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = newStaff.userId.trim();
                      if (!trimmed) return;
                      setStaffRows((current) => [...current, { userId: trimmed, role: newStaff.role }]);
                      setNewStaff({ userId: '', role: 'co_organizer' });
                    }
                  }}
                  placeholder="User ID"
                  className="border-white/[0.08] bg-black/20 text-white placeholder:text-zinc-600 sm:flex-1"
                />
                <Select
                  value={newStaff.role}
                  onValueChange={(value: SeasonStaffMember['role']) => setNewStaff((s) => ({ ...s, role: value }))}
                >
                  <SelectTrigger className="border-white/[0.08] bg-black/20 text-white sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role === 'co_organizer' ? 'Co-organizer' : 'Admin'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-white/[0.08] bg-white/[0.05] text-white hover:bg-white/[0.10]"
                  onClick={() => {
                    const trimmed = newStaff.userId.trim();
                    if (!trimmed) return;
                    setStaffRows((current) => [...current, { userId: trimmed, role: newStaff.role }]);
                    setNewStaff({ userId: '', role: 'co_organizer' });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {/* Save */}
            <Button className="bg-rose-500 text-white hover:bg-rose-600" onClick={handleStaffSave} disabled={syncStaff.isPending}>
              Save staff
            </Button>
          </div>
        )}

        {activeTab === 'structure' && (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-4">
              {(data.season.status === 'published' || data.season.status === 'active' || data.season.status === 'completed') && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="font-body text-sm text-amber-300">
                    <span className="font-semibold">This season has been published.</span> Changes to the tournament structure may conflict with active registration and advancement. Make structural changes only during maintenance windows.
                  </p>
                </div>
              )}
              <SeasonStructureBuilder
                title="Season structure"
                description="Configure each tournament inline — format, team size, prize pool — and wire advancement between them. Select a card to edit it in the Inspector."
                nodes={nodeRows}
                onChange={setNodeRows}
                onSave={handleNodesSaveWithGuard}
                isSaving={syncNodes.isPending}
                surface="manage"
              />
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-[#08080a] p-6">
                <h2 className="text-xl font-semibold">Live preview</h2>
                <SeasonTreePreview tree={seasonTreePreview} className="mt-5" />
              </div>
            </div>
          </div>
        )}

        <AlertDialog open={showStructureSaveConfirm} onOpenChange={setShowStructureSaveConfirm}>
          <AlertDialogContent className="border-white/10 bg-[#0a0a0c] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-heading text-white">Update published season structure?</AlertDialogTitle>
              <AlertDialogDescription className="font-body text-zinc-400">
                Modifying the structure of a published season may affect teams currently in registration or advancement. This change cannot be automatically reversed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10">Go back</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-500 text-white hover:bg-rose-600"
                onClick={() => {
                  setShowStructureSaveConfirm(false);
                  handleNodesSave();
                }}
              >
                Save anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {activeTab === 'rules' && (
          <div className="rounded-[32px] border border-white/10 bg-[#08080a] p-6">
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
          <div className="rounded-[32px] border border-white/10 bg-[#08080a] p-6">
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
          <div className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-[#08080a] p-6">
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

            {data.permissions.canManage && (() => {
              const revokable = (qualificationsQuery.data ?? []).filter(
                (record) =>
                  (record.status === 'earned' || record.status === 'confirmed' || record.status === 'accepted') &&
                  record.displayName !== null,
              );
              if (revokable.length === 0) return null;
              return (
                <div className="rounded-3xl border border-red-500/15 bg-red-500/[0.04] p-6">
                  <div className="mb-1 flex items-center gap-2">
                    <ShieldOff className="h-4 w-4 text-red-400" />
                    <h3 className="font-heading text-lg font-semibold text-red-400">Revoke qualification</h3>
                  </div>
                  <p className="mb-5 font-body text-sm text-amber-300/70">
                    Revoking a qualification permanently changes its status to revoked. Use this to DQ a team from advancing. This cannot be automatically undone.
                  </p>
                  <div className="space-y-2">
                    {revokable.map((record) => (
                      <div
                        key={record.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0a0a0c] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{record.displayName}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            {record.sourceNodeName && <span>{record.sourceNodeName}</span>}
                            {record.sourceNodeName && <span className="text-zinc-700">·</span>}
                            <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 capitalize">
                              {record.status}
                            </span>
                            {record.qualificationType && (
                              <>
                                <span className="text-zinc-700">·</span>
                                <span className="capitalize text-zinc-400">{record.qualificationType}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 bg-rose-500 text-white hover:bg-rose-600"
                          disabled={qualificationBusyId === record.id}
                          onClick={() => handleRevokeQualification(record.id, record.displayName!)}
                        >
                          <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                          {qualificationBusyId === record.id ? 'Revoking...' : 'Revoke'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'registrations' && (() => {
          const nonRootNodes = (data.nodes ?? []).filter((n) => n.nodeType !== 'root');
          const now = new Date();
          const upcoming = nonRootNodes.filter((n) => n.registrationDeadline && new Date(n.registrationDeadline) > now);
          const closed = nonRootNodes.filter((n) => n.registrationDeadline && new Date(n.registrationDeadline) <= now);
          const noDeadline = nonRootNodes.filter((n) => !n.registrationDeadline);

          return (
            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-[#08080a] p-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-heading text-2xl font-semibold text-white">Registrations</h2>
                    <p className="mt-1 font-body text-sm text-zinc-400">Registration windows and deadlines across all season tournaments.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 font-body text-[12px] font-semibold text-emerald-400">{upcoming.length} Open</span>
                    <span className="rounded-full border border-zinc-500/25 bg-zinc-500/10 px-3 py-1.5 font-body text-[12px] font-semibold text-zinc-400">{closed.length} Closed</span>
                    {noDeadline.length > 0 && (
                      <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 font-body text-[12px] font-semibold text-amber-400">{noDeadline.length} No deadline</span>
                    )}
                  </div>
                </div>

                {nonRootNodes.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-12 text-center">
                    <p className="font-body text-sm text-zinc-500">No tournaments in this season yet. Build the tournament flow in the Structure tab.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 border-white/10 text-zinc-400 hover:bg-white/[0.06]"
                      onClick={() => setSearchParams({ tab: 'flow' })}
                    >
                      Go to Flow
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {nonRootNodes
                      .slice()
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((node) => {
                        const deadline = node.registrationDeadline ? new Date(node.registrationDeadline) : null;
                        const isOpen = deadline ? deadline > now : false;
                        const isClosed = deadline ? deadline <= now : false;
                        const registrationType = (node as any).registrationType as string | null;
                        return (
                          <div
                            key={node.id}
                            className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-[#0a0a0c] p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn(
                                  'rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                                  node.nodeType === 'qualifier' ? 'border-amber-500/25 bg-amber-500/10 text-amber-400' :
                                  node.nodeType === 'event' ? 'border-violet-500/25 bg-violet-500/10 text-violet-400' :
                                  node.nodeType === 'final' ? 'border-rose-500/25 bg-rose-500/10 text-rose-400' :
                                  'border-white/10 bg-white/[0.04] text-zinc-400'
                                )}>{node.nodeType}</span>
                                <span className="font-body font-semibold text-white">{node.name || 'Unnamed'}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 font-body text-[12px] text-zinc-500">
                                {deadline ? (
                                  <span className={cn('flex items-center gap-1', isOpen ? 'text-emerald-400' : 'text-zinc-500')}>
                                    <Clock className="h-3 w-3" />
                                    {isOpen ? 'Closes' : 'Closed'} {formatDistanceToNow(deadline, { addSuffix: true })}
                                    <span className="text-zinc-600">({deadline.toLocaleDateString()})</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-400/70">No registration deadline set</span>
                                )}
                                {registrationType && (
                                  <span className="rounded border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 capitalize text-zinc-400">
                                    {registrationType.replace('_', ' ')}
                                  </span>
                                )}
                                {node.region && <span className="text-zinc-600">{node.region}</span>}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {isClosed && (
                                <span className="rounded-full border border-zinc-500/25 bg-zinc-500/10 px-2.5 py-1 font-body text-[11px] font-semibold text-zinc-500">Closed</span>
                              )}
                              {isOpen && (
                                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-body text-[11px] font-semibold text-emerald-400">Open</span>
                              )}
                              {node.publishedTournamentId && (
                                <Link
                                  to={`/tournaments/${node.publishedTournamentId}`}
                                  target="_blank"
                                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-body text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08]"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Tournament
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {activeTab === 'flow' && (
          <div className="space-y-6">
            {/* Header card */}
            <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-white">{data.season.name}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{data.season.game} · {nodeRows.filter(n => n.nodeType !== 'root').length}-tournament circuit</p>
                </div>
                <Badge className="w-fit bg-white/[0.06] text-zinc-300 hover:bg-white/[0.06]">
                  {data.season.status}
                </Badge>
              </div>
            </div>

            {/* Tree preview */}
            <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
              <h3 className="mb-4 font-heading text-lg font-semibold text-white">Circuit visualization</h3>
              {nodeRows.filter(n => n.nodeType !== 'root').length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] py-16 text-center">
                  <GitBranch className="h-10 w-10 text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-400">No tournaments planned yet</p>
                  <p className="text-xs text-zinc-600">Go to the Structure tab to build the circuit</p>
                </div>
              ) : (
                <SeasonTreePreview tree={seasonTreePreview} />
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['qualifier', 'Qualifiers'],
                  ['event', 'Events'],
                  ['final', 'Finals'],
                ] as [SeasonNodeType, string][]
              ).map(([type, label]) => {
                const count = nodeRows.filter(n => n.nodeType === type).length;
                const meta = getPhaseMetaForType(type as Exclude<SeasonNodeType, 'root'>);
                return (
                  <div key={type} className="rounded-2xl border border-white/[0.06] bg-[#0a0a0c] p-4">
                    <p className={`text-xs uppercase tracking-widest ${meta.accent}`}>{label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{count}</p>
                  </div>
                );
              })}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0c] p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Connections</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {nodeRows.reduce((acc, n) => acc + readOutgoingConnections(n).length, 0)}
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
              <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-widest text-zinc-500">Legend</h3>
              <div className="flex flex-wrap gap-3">
                {(['qualifier', 'event', 'stage', 'final', 'custom'] as Exclude<SeasonNodeType, 'root'>[]).map((type) => {
                  const meta = getPhaseMetaForType(type);
                  return (
                    <div key={type} className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium ${meta.accentBg} ${meta.accentBorder} ${meta.accent}`}>
                      <span className={`h-2 w-2 rounded-full ${meta.accentBg} border ${meta.accentBorder}`} />
                      {meta.label}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-white/10 border border-white/20" />
                  Root
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            <div className="relative overflow-hidden border border-white/[0.08] bg-[#09090b] p-6 md:p-8">
              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-rose-300">
                    <Trophy className="h-3.5 w-3.5" />
                    Tournament command
                  </div>
                  <h2 className="font-heading text-3xl font-black tracking-tight text-white md:text-4xl">Build the circuit without the clutter.</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                    Manage live tournament records, planned season nodes, readiness, status, and schedule from one consistent workspace.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px]">
                  {[
                    ['Live', liveTournamentCount],
                    ['Created', seasonTournaments.length],
                    ['Planned', plannedTournamentNodes.length],
                    ['Ready', readyPlannedTournamentCount],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/[0.08] bg-[#08080a] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
                      <p className="mt-2 text-2xl font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Tournament registry</p>
                    <p className="mt-1 text-xs text-zinc-500">Created season tournaments appear here with status, role, schedule, and quick access.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-zinc-300 hover:bg-white/[0.04]">
                      {seasonTournaments.length} records
                    </Badge>
                    <Button
                      size="sm"
                      className="rounded-full bg-rose-500 px-4 text-white hover:bg-rose-400"
                      onClick={() => setIsAddTournamentOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tournament
                    </Button>
                  </div>
                </div>

                {tournamentsQuery.isLoading ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-52 animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.03]" />
                    ))}
                  </div>
                ) : tournamentsQuery.error ? (
                  <div className="flex items-start gap-3 rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <div>
                      <p className="text-sm font-semibold text-red-200">Failed to load tournaments</p>
                      <p className="mt-1 text-xs text-red-300/70">Please retry after checking the season API response.</p>
                    </div>
                  </div>
                ) : seasonTournaments.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {seasonTournaments.map((st, index) => {
                      const status = st.tournamentStatus ?? st.status ?? 'draft';
                      const role = st.role ?? st.season_role ?? 'custom';
                      const title = st.displayName || st.tournamentName || st.name || 'Untitled tournament';
                      const hrefId = st.slug || st.tournamentId || st.id;

                      return (
                        <div key={st.id} className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0a0a0c] p-5 transition hover:-translate-y-0.5 hover:border-rose-500/25 hover:bg-[#0d0d10]">
                          <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-white/[0.025]" />
                          <div className="relative flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-sm font-black text-white">
                                {String(index + 1).padStart(2, '0')}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-heading text-lg font-bold text-white">{title}</p>
                                <p className="mt-1 truncate text-xs text-zinc-500">{st.region ? `${st.region} region` : 'Global circuit node'}</p>
                              </div>
                            </div>
                            <Button asChild size="sm" variant="ghost" className="h-9 w-9 shrink-0 rounded-full p-0 text-zinc-500 hover:bg-white/10 hover:text-white">
                              <a href={`/organizer/tournament/${hrefId}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>

                          <div className="relative mt-5 flex flex-wrap gap-2">
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold capitalize ${getTournamentRoleClass(role)}`}>
                              {formatTournamentLabel(role)}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold capitalize ${getTournamentStatusClass(status)}`}>
                              {formatTournamentLabel(status)}
                            </span>
                          </div>

                          <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Starts</p>
                              <p className="mt-1 text-xs font-semibold text-zinc-300">{formatDisplayDate(st.start_date)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Ends</p>
                              <p className="mt-1 text-xs font-semibold text-zinc-300">{formatDisplayDate(st.end_date)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Teams</p>
                              <p className="mt-1 text-xs font-semibold text-zinc-300">{st.current_participants ?? 0} joined</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.04]">
                      <Activity className="h-8 w-8 text-zinc-500" />
                    </div>
                    <p className="mt-5 text-lg font-bold text-white">No created tournaments yet</p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                      Start with the planned nodes from your structure, or create a tournament directly from this registry.
                    </p>
                    <Button
                      size="sm"
                      className="mt-6 rounded-full bg-rose-500 px-5 text-white hover:bg-rose-400"
                      onClick={() => setIsAddTournamentOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tournament
                    </Button>
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                {data.season.status === 'draft' && (
                  <div className="rounded-3xl border border-blue-500/15 bg-blue-500/[0.04] p-5">
                    <div className="flex items-center gap-2 text-blue-300">
                      <Info className="h-4 w-4" />
                      <p className="text-sm font-semibold">Draft workflow</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-blue-200/70">
                      Planned nodes are your blueprint. Publishing turns ready nodes into real tournament records and wires advancement.
                    </p>
                  </div>
                )}

                <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Planned flow</p>
                      <p className="mt-1 text-xs text-zinc-500">{readyPlannedTournamentCount} of {plannedTournamentNodes.length} ready</p>
                    </div>
                    <GitBranch className="h-5 w-5 text-zinc-500" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {plannedTournamentNodes.length > 0 ? plannedTournamentNodes.map((node) => {
                      const config = readTournamentConfig(node);
                      const isReady = isTournamentConfigComplete(config);
                      const meta = getPhaseMetaForType(node.nodeType as Exclude<SeasonNodeType, 'root'>);

                      return (
                        <div key={node.id} className="rounded-2xl border border-white/[0.05] bg-white/[0.025] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${meta.accentBg} ${meta.accentBorder} ${meta.accent}`}>
                                {meta.label.replace(/s$/, '')}
                              </span>
                              <p className="mt-3 truncate text-sm font-semibold text-zinc-200">{node.name || 'Unnamed tournament'}</p>
                              <p className="mt-1 text-xs text-zinc-600">
                                {config.format ? `${formatTournamentLabel(config.format)} · ${config.teamSize ? `${config.teamSize}v${config.teamSize}` : 'Team size unset'}` : 'Format not configured'}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${isReady ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-300'}`}>
                              {isReady ? 'Ready' : 'Setup'}
                            </span>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-5 text-center">
                        <p className="text-sm font-medium text-zinc-400">No planned nodes</p>
                        <p className="mt-1 text-xs text-zinc-600">Use Structure to design the season flow.</p>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        <Dialog open={isAddTournamentOpen} onOpenChange={setIsAddTournamentOpen}>
          <DialogContent className="max-w-2xl border-white/10 bg-[#0a0a0c] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Add season tournament</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Create a draft tournament owned by this season. It will appear in the tournament list immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Name</Label>
                <Input
                  value={newTournament.name}
                  onChange={(event) => setNewTournament((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Open Qualifier 1"
                  className="border-white/10 bg-[#08080a] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newTournament.role}
                  onValueChange={(value) => setNewTournament((current) => ({ ...current, role: value }))}
                >
                  <SelectTrigger className="border-white/10 bg-[#08080a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEASON_TOURNAMENT_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  value={newTournament.region}
                  onChange={(event) => setNewTournament((current) => ({ ...current, region: event.target.value }))}
                  placeholder="MENA"
                  className="border-white/10 bg-[#08080a] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={newTournament.format}
                  onValueChange={(value) => setNewTournament((current) => ({ ...current, format: value }))}
                >
                  <SelectTrigger className="border-white/10 bg-[#08080a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_elimination">Single elimination</SelectItem>
                    <SelectItem value="double_elimination">Double elimination</SelectItem>
                    <SelectItem value="round_robin">Round robin</SelectItem>
                    <SelectItem value="swiss">Swiss</SelectItem>
                    <SelectItem value="battle_royale">Battle royale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max teams</Label>
                <Input
                  type="number"
                  min={2}
                  value={newTournament.maxTeams}
                  onChange={(event) => setNewTournament((current) => ({ ...current, maxTeams: event.target.value }))}
                  className="border-white/10 bg-[#08080a] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Team size</Label>
                <Input
                  type="number"
                  min={1}
                  value={newTournament.teamSize}
                  onChange={(event) => setNewTournament((current) => ({ ...current, teamSize: event.target.value }))}
                  className="border-white/10 bg-[#08080a] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Registration deadline</Label>
                <Input
                  type="date"
                  value={newTournament.registrationDeadline}
                  onChange={(event) => setNewTournament((current) => ({ ...current, registrationDeadline: event.target.value }))}
                  className="border-white/10 bg-[#08080a] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={newTournament.startDate}
                  onChange={(event) => setNewTournament((current) => ({ ...current, startDate: event.target.value }))}
                  className="border-white/10 bg-[#08080a] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={newTournament.endDate}
                  onChange={(event) => setNewTournament((current) => ({ ...current, endDate: event.target.value }))}
                  className="border-white/10 bg-[#08080a] text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setIsAddTournamentOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-rose-500 text-white hover:bg-rose-600"
                onClick={handleAddTournament}
                disabled={addSeasonTournament.isPending}
              >
                {addSeasonTournament.isPending ? 'Creating...' : 'Create Tournament'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {activeTab === 'advancement' && (
          <SeasonAdvancementDashboard seasonId={seasonId} />
        )}

        {activeTab === 'announcements' && (
          <SeasonAnnouncements seasonId={seasonId} />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
              <h2 className="font-heading text-2xl font-bold text-white">Season Settings</h2>
              <p className="mt-1 text-sm text-zinc-400">Configure season-wide policies and manage lifecycle actions.</p>
            </div>

            {/* Season Policies */}
            <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
              <h3 className="mb-1 font-heading text-lg font-semibold text-white">Season policies</h3>
              <p className="mb-5 text-sm text-zinc-500">These settings affect how the season behaves once active.</p>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">Manual overrides</p>
                      <p className="mt-0.5 text-sm text-zinc-400">Allow organizer corrections for qualification routing.</p>
                    </div>
                    <Switch
                      checked={overview.allowManualOverrides}
                      onCheckedChange={(checked) => {
                        setOverview((current) => ({ ...current, allowManualOverrides: checked }));
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">Public season page</p>
                      <p className="mt-0.5 text-sm text-zinc-400">Expose the season tree, standings, and qualification state publicly.</p>
                    </div>
                    <Switch
                      checked={overview.isPublic}
                      onCheckedChange={(checked) => {
                        setOverview((current) => ({ ...current, isPublic: checked }));
                      }}
                    />
                  </div>
                </div>
              </div>
              <Button className="mt-5 bg-rose-500 text-white hover:bg-rose-600" onClick={handleOverviewSave} disabled={updateSeason.isPending}>
                Save policies
              </Button>
            </div>

            {/* Roster Management */}
            <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
              <div className="mb-1 flex items-center gap-2">
                <Lock className="h-4 w-4 text-zinc-400" />
                <h3 className="font-heading text-lg font-semibold text-white">Roster Management</h3>
              </div>
              <p className="mb-5 font-body text-sm text-zinc-500">Control how team rosters are managed across the season circuit.</p>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">Lock rosters after first tournament</p>
                      <p className="mt-0.5 text-sm text-zinc-400">
                        Once a team competes in their first tournament, their roster is frozen for the remainder of the season.
                      </p>
                    </div>
                    <Switch
                      checked={rosterLock}
                      onCheckedChange={setRosterLock}
                    />
                  </div>
                </div>

                <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-opacity ${rosterLock ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">Allow roster changes between tournaments</p>
                      <p className="mt-0.5 text-sm text-zinc-400">
                        Teams may adjust their roster in the window between tournament events. Disabled when roster lock is on.
                      </p>
                    </div>
                    <Switch
                      checked={allowRosterChangesBetween}
                      onCheckedChange={setAllowRosterChangesBetween}
                      disabled={rosterLock}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">Manual override allowed</p>
                      <p className="mt-0.5 text-sm text-zinc-400">Allow organizer corrections to roster assignments regardless of lock state.</p>
                    </div>
                    <Switch
                      checked={overview.allowManualOverrides}
                      onCheckedChange={(checked) => {
                        setOverview((current) => ({ ...current, allowManualOverrides: checked }));
                      }}
                    />
                  </div>
                </div>
              </div>
              <Button className="mt-5 bg-rose-500 text-white hover:bg-rose-600" onClick={handleOverviewSave} disabled={updateSeason.isPending}>
                Save roster settings
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="rounded-3xl border border-red-500/20 bg-[#0a0a0c] p-6">
              <div className="mb-5 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <h3 className="font-heading text-lg font-semibold text-red-400">Danger Zone</h3>
              </div>
              <div className="space-y-4">
                {data.season.status === 'completed' && (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-500/10 bg-red-500/5 p-4">
                    <div>
                      <p className="font-medium text-white">Archive season</p>
                      <p className="mt-0.5 text-sm text-zinc-400">Move this season to archived state. It will no longer appear in active listings.</p>
                    </div>
                    <Button
                      variant="outline"
                      className="shrink-0 border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      onClick={handleArchive}
                      disabled={archiveSeason.isPending}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </Button>
                  </div>
                )}

                {(data.season.status === 'draft' || data.season.status === 'published' || data.season.status === 'active') && (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-500/10 bg-red-500/5 p-4">
                    <div>
                      <p className="font-medium text-white">Cancel season</p>
                      <p className="mt-0.5 text-sm text-zinc-400">Permanently cancel this season. All participants will be notified. This cannot be undone.</p>
                    </div>
                    <Button
                      variant="outline"
                      className="shrink-0 border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      onClick={handleCancel}
                      disabled={cancelSeason.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel season
                    </Button>
                  </div>
                )}

                {data.season.status !== 'completed' && data.season.status !== 'draft' && data.season.status !== 'published' && data.season.status !== 'active' && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <p className="text-sm text-zinc-500">No destructive actions available for a season in <span className="font-medium text-zinc-400">{data.season.status}</span> status.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-white">Audit Log</h2>
                  <p className="mt-1 text-sm text-zinc-400">A full record of all changes made to this season.</p>
                </div>
                {auditLogQuery.data && (
                  <Badge className="bg-white/[0.06] text-zinc-300 hover:bg-white/[0.06]">
                    {auditLogQuery.data.length} entries
                  </Badge>
                )}
              </div>
            </div>

            {auditLogQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
                ))}
              </div>
            ) : auditLogQuery.data && auditLogQuery.data.length > 0 ? (
              <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                <div className="relative space-y-0">
                  {auditLogQuery.data.map((log, index) => {
                    const actionColors: Record<string, string> = {
                      publish: 'bg-emerald-500 border-emerald-500/50',
                      cancel: 'bg-red-500 border-red-500/50',
                      archive: 'bg-amber-500 border-amber-500/50',
                      update: 'bg-zinc-500 border-zinc-500/50',
                    };
                    const actionKey = Object.keys(actionColors).find(key => log.action.toLowerCase().includes(key));
                    const dotClass = actionKey ? actionColors[actionKey] : 'bg-zinc-600 border-zinc-600/50';
                    const isLast = index === auditLogQuery.data!.length - 1;
                    return (
                      <div key={log.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`relative z-10 h-3 w-3 shrink-0 rounded-full border-2 mt-1.5 ${dotClass}`} />
                          {!isLast && <div className="w-px flex-1 bg-white/[0.06] my-1" />}
                        </div>
                        <div className={`pb-5 min-w-0 flex-1 ${isLast ? 'pb-0' : ''}`}>
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold text-white capitalize">{log.action.replace(/_/g, ' ')}</span>
                            {log.actorUsername && <span className="text-xs text-zinc-500">by {log.actorUsername}</span>}
                            <span className="ml-auto flex items-center gap-1 text-xs text-zinc-600">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          {log.reason && (
                            <p className="mt-0.5 text-sm text-zinc-500">"{log.reason}"</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] py-16 text-center">
                <FileText className="h-10 w-10 text-zinc-600" />
                <p className="text-sm font-medium text-zinc-400">No audit entries yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (() => {
          const nonRootNodes = nodeRows.filter(n => n.nodeType !== 'root');
          const configuredCount = nonRootNodes.filter(n => isTournamentConfigComplete(readTournamentConfig(n))).length;
          const totalConnections = nodeRows.reduce((acc, n) => acc + readOutgoingConnections(n).length, 0);
          const topStandings = (standingsQuery.data ?? []).slice(0, 5);
          const quals = qualificationsQuery.data ?? [];
          const confirmedCount = quals.filter(q => q.status === 'confirmed' || q.status === 'accepted').length;
          const pendingCount = quals.filter(q => q.status === 'invited').length;
          const revokedCount = quals.filter(q => q.status === 'revoked').length;
          const linkedTournaments = tournamentsQuery.data ?? [];
          const draftCount = linkedTournaments.filter(t => (t.tournamentStatus ?? t.status) === 'draft').length;
          const scheduledCount = linkedTournaments.filter(t => (t.tournamentStatus ?? t.status) === 'scheduled').length;
          const liveCount = linkedTournaments.filter(t => (t.tournamentStatus ?? t.status) === 'live').length;
          const completedCount = linkedTournaments.filter(t => (t.tournamentStatus ?? t.status) === 'completed').length;

          return (
            <div className="space-y-6">

              {/* Header */}
              <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-rose-400" />
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-white">Analytics</h2>
                    <p className="mt-0.5 text-sm text-zinc-400">Season health at a glance — structure, standings, and qualification pipeline.</p>
                  </div>
                </div>
              </div>

              {/* Registration Funnel */}
              <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                <div className="mb-5 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-zinc-400" />
                  <h3 className="font-heading text-lg font-semibold text-white">Registration Funnel</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <p className="font-body text-xs uppercase tracking-widest text-zinc-500">Planned</p>
                    <p className="mt-2 font-heading text-3xl font-bold text-white">{nonRootNodes.length}</p>
                    <p className="mt-1 font-body text-xs text-zinc-600">Tournaments in circuit</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <p className="font-body text-xs uppercase tracking-widest text-zinc-500">Configured</p>
                    <p className={`mt-2 font-heading text-3xl font-bold ${configuredCount === nonRootNodes.length && nonRootNodes.length > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {configuredCount}
                      <span className="ml-1 font-body text-base font-normal text-zinc-600">/ {nonRootNodes.length}</span>
                    </p>
                    <p className="mt-1 font-body text-xs text-zinc-600">Format, size, and registration set</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <p className="font-body text-xs uppercase tracking-widest text-zinc-500">Connections</p>
                    <p className={`mt-2 font-heading text-3xl font-bold ${totalConnections > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>{totalConnections}</p>
                    <p className="mt-1 font-body text-xs text-zinc-600">Advancement edges wired</p>
                  </div>
                </div>
              </div>

              {/* Qualifier Participation — tournament readiness table */}
              {nonRootNodes.length > 0 && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-400" />
                    <h3 className="font-heading text-lg font-semibold text-white">Tournament Readiness</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="pb-3 text-left font-body text-xs font-semibold uppercase tracking-widest text-zinc-500">Tournament</th>
                          <th className="pb-3 text-left font-body text-xs font-semibold uppercase tracking-widest text-zinc-500">Type</th>
                          <th className="pb-3 text-left font-body text-xs font-semibold uppercase tracking-widest text-zinc-500">Configured</th>
                          <th className="pb-3 text-left font-body text-xs font-semibold uppercase tracking-widest text-zinc-500">Starts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {nonRootNodes.map((node) => {
                          const isReady = isTournamentConfigComplete(readTournamentConfig(node));
                          const meta = getPhaseMetaForType(node.nodeType as Exclude<SeasonNodeType, 'root'>);
                          return (
                            <tr key={node.id ?? node.name} className="group">
                              <td className="py-3 pr-4 font-semibold text-white">{node.name || 'Unnamed'}</td>
                              <td className="py-3 pr-4">
                                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${meta.accentBg} ${meta.accentBorder} ${meta.accent}`}>
                                  {meta.label}
                                </span>
                              </td>
                              <td className="py-3 pr-4">
                                {isReady
                                  ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Ready</span>
                                  : <span className="flex items-center gap-1 text-xs font-semibold text-amber-400"><AlertCircle className="h-3.5 w-3.5" />Needs config</span>
                                }
                              </td>
                              <td className="py-3 font-body text-xs text-zinc-500">
                                {node.startsAt
                                  ? new Date(node.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                  : <span className="text-zinc-700">—</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Standings Snapshot */}
              <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-zinc-400" />
                    <h3 className="font-heading text-lg font-semibold text-white">Standings Snapshot</h3>
                  </div>
                  <span className="font-body text-xs text-zinc-600">Top 5</span>
                </div>
                {topStandings.length > 0 ? (
                  <div className="space-y-2">
                    {topStandings.map((entry) => (
                      <div key={entry.entityId} className="flex items-center gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                        <span className={`w-6 shrink-0 font-heading text-sm font-bold ${(entry.standingRank ?? 0) <= 3 ? 'text-amber-400' : 'text-zinc-600'}`}>
                          #{entry.standingRank ?? '-'}
                        </span>
                        <p className="min-w-0 flex-1 truncate font-semibold text-white">{entry.displayName}</p>
                        <span className="shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-body text-xs font-semibold text-emerald-400">
                          {entry.totalPoints} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-sm text-zinc-500">
                    Standings are calculated after tournaments complete.
                  </p>
                )}
              </div>

              {/* Qualification Summary */}
              <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                <div className="mb-5 flex items-center gap-2">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <h3 className="font-heading text-lg font-semibold text-white">Qualification Pipeline</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <p className="font-body text-xs uppercase tracking-widest text-zinc-500">Total</p>
                    <p className="mt-2 font-heading text-2xl font-bold text-white">{quals.length}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4 text-center">
                    <p className="font-body text-xs uppercase tracking-widest text-emerald-600">Confirmed</p>
                    <p className="mt-2 font-heading text-2xl font-bold text-emerald-400">{confirmedCount}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-4 text-center">
                    <p className="font-body text-xs uppercase tracking-widest text-amber-600">Pending</p>
                    <p className="mt-2 font-heading text-2xl font-bold text-amber-400">{pendingCount}</p>
                  </div>
                  <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-4 text-center">
                    <p className="font-body text-xs uppercase tracking-widest text-red-600">Revoked</p>
                    <p className="mt-2 font-heading text-2xl font-bold text-red-400">{revokedCount}</p>
                  </div>
                </div>
              </div>

              {/* Linked Tournaments Health */}
              {linkedTournaments.length > 0 && (
                <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-zinc-400" />
                      <h3 className="font-heading text-lg font-semibold text-white">Linked Tournaments</h3>
                    </div>
                    <span className="font-body text-xs text-zinc-500">{linkedTournaments.length} total</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draftCount > 0 && (
                      <span className="rounded-full border border-zinc-500/20 bg-zinc-500/10 px-3 py-1 font-body text-xs font-semibold text-zinc-400">
                        {draftCount} Draft
                      </span>
                    )}
                    {scheduledCount > 0 && (
                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 font-body text-xs font-semibold text-blue-400">
                        {scheduledCount} Scheduled
                      </span>
                    )}
                    {liveCount > 0 && (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-body text-xs font-semibold text-emerald-400">
                        {liveCount} Live
                      </span>
                    )}
                    {completedCount > 0 && (
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-body text-xs font-semibold text-zinc-300">
                        {completedCount} Completed
                      </span>
                    )}
                  </div>
                </div>
              )}

            </div>
          );
        })()}
      </main>
    </div>
  );
};

export default SeasonManage;






