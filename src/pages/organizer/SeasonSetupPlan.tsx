import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle2, ChevronLeft, Link2, Plus, Save, Target, Trash2, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useSeason, useSyncSeasonNodes, useSyncSeasonRules } from '@/hooks/useSeason';
import { buildSeasonTreeFromDrafts, hydrateSeasonBuilderNodes, isProgressionOnlyNode, nodeRequiresRegistrationDeadline, readOutgoingConnections, readTournamentConfig, toSeasonNodeDraftPayload, validateSeasonBuilderNodes, validateSeasonSetupDomain } from '@/components/season/builder/seasonBuilderUtils';
import SeasonTreePreview from '@/components/season/SeasonTreePreview';
import { cn } from '@/lib/utils';
import type { AdvancementConnection, SeasonBuilderNode, SeasonNodeType, SeasonQualificationType, SeasonRuleDraft } from '@/types/season';

const NODE_TYPES: Exclude<SeasonNodeType, 'root'>[] = ['qualifier', 'event', 'stage', 'final', 'custom'];
const QUALIFICATION_TYPES: SeasonQualificationType[] = ['qualified', 'wildcard', 'reserve'];
const FORMAT_OPTIONS = ['single_elimination', 'double_elimination', 'round_robin', 'swiss', 'battle_royale'];
const REGISTRATION_TYPES = ['open', 'invite_only', 'application', 'closed'];
const RESERVED_INVITE_SLOT_OPTIONS = [0, 1, 2, 4, 8, 16, 32, 64, 128];
const INVITE_EXPIRY_DAY_OPTIONS = [1, 3, 7, 14, 30];

const toNullable = (value: string | null | undefined) => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

const formatDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');

const createEmptyRule = (sourceNodeId: string): SeasonRuleDraft => ({
  sourceNodeId,
  placementFrom: 1,
  placementTo: 1,
  pointsAwarded: 0,
  sourceStageId: null,
  destinationNodeId: null,
  qualificationStatus: 'qualified',
  autoCreateQualification: true,
  regionKey: null,
});

const createDraftNode = (seasonId: string, parentNodeId: string | null, displayOrder: number): SeasonBuilderNode => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    seasonId,
    parentNodeId,
    name: `Tournament ${displayOrder}`,
    slug: null,
    nodeType: 'qualifier',
    displayOrder,
    region: null,
    city: null,
    country: null,
    linkedTournamentId: null,
    linkedStageId: null,
    status: 'draft',
    registrationDeadline: null,
    startsAt: null,
    endsAt: null,
    metadata: {
      format: 'single_elimination',
      teamSize: 5,
      maxTeams: 16,
      registrationType: 'open',
      reservedInviteSlots: 0,
      inviteExpiryDays: 7,
      bestOf: 1,
      connections: [],
    },
    createdAt: now,
    updatedAt: now,
    linkedTournamentName: null,
    linkedStageName: null,
  };
};

const getPlanIssues = validateSeasonSetupDomain;

const SeasonSetupPlan = () => {
  const { id: seasonId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useSeason(seasonId);
  const syncNodes = useSyncSeasonNodes(seasonId ?? '');
  const syncRules = useSyncSeasonRules(seasonId ?? '');
  const [nodeRows, setNodeRows] = useState<SeasonBuilderNode[]>([]);
  const [ruleRows, setRuleRows] = useState<SeasonRuleDraft[]>([]);

  useEffect(() => {
    if (!data) return;
    setNodeRows(hydrateSeasonBuilderNodes(data.nodes));
    setRuleRows(data.rules.map((rule) => ({
      id: rule.id,
      sourceNodeId: rule.sourceNodeId,
      sourceStageId: rule.sourceStageId,
      destinationNodeId: rule.destinationNodeId,
      placementFrom: rule.placementFrom,
      placementTo: rule.placementTo,
      pointsAwarded: rule.pointsAwarded,
      qualificationStatus: rule.qualificationStatus,
      autoCreateQualification: rule.autoCreateQualification,
      regionKey: rule.regionKey,
    })));
  }, [data]);

  const rootNode = nodeRows.find((node) => node.nodeType === 'root') ?? null;
  const planIssues = useMemo(() => getPlanIssues(nodeRows, ruleRows), [nodeRows, ruleRows]);
  const plannedNodes = planIssues.planned;
  const treePreview = useMemo(() => (seasonId ? buildSeasonTreeFromDrafts(seasonId, nodeRows) : []), [nodeRows, seasonId]);
  const nodeOptions = plannedNodes.map((node, index) => ({ id: node.id, label: node.name || `Tournament ${index + 1}` }));

  const updateNode = (nodeId: string, patch: Partial<SeasonBuilderNode>) => {
    setNodeRows((current) => current.map((node) => {
      if (node.id !== nodeId) return node;
      const next = { ...node, ...patch };
      if (patch.nodeType && isProgressionOnlyNode(next)) {
        return {
          ...next,
          registrationDeadline: null,
          metadata: {
            ...(next.metadata ?? {}),
            registrationType: 'closed',
            reservedInviteSlots: 0,
            registrationPolicy: 'inbound_only',
            qualificationSource: patch.nodeType === 'final' ? 'upstream_results' : 'prior_stage',
          },
        };
      }
      if (patch.nodeType && nodeRequiresRegistrationDeadline(next)) {
        return {
          ...next,
          metadata: {
            ...(next.metadata ?? {}),
            registrationType: 'open',
            reservedInviteSlots: (next.metadata as Record<string, unknown> | null | undefined)?.reservedInviteSlots ?? 0,
            inviteExpiryDays: (next.metadata as Record<string, unknown> | null | undefined)?.inviteExpiryDays ?? 7,
            registrationPolicy: 'direct_entry',
            qualificationSource: 'registration',
          },
        };
      }
      return next;
    }));
  };

  const updateMetadata = (nodeId: string, patch: Record<string, unknown>) => {
    setNodeRows((current) => current.map((node) => {
      if (node.id !== nodeId) return node;
      const nextMetadata = { ...(node.metadata ?? {}), ...patch };
      if (isProgressionOnlyNode(node)) {
        nextMetadata.registrationType = 'closed';
        nextMetadata.reservedInviteSlots = 0;
        nextMetadata.registrationPolicy = 'inbound_only';
        nextMetadata.qualificationSource = node.nodeType === 'final' ? 'upstream_results' : 'prior_stage';
      }
      return { ...node, metadata: nextMetadata };
    }));
  };

  const updateConnection = (nodeId: string, patch: Partial<AdvancementConnection>) => {
    setNodeRows((current) => current.map((node) => {
      if (node.id !== nodeId) return node;
      const currentConnections = readOutgoingConnections(node);
      const existing = currentConnections[0] ?? { sourceNodeId: node.id, targetNodeId: '', placementStart: 1, placementEnd: 1, advancementCount: 1 };
      return { ...node, metadata: { ...(node.metadata ?? {}), connections: [{ ...existing, ...patch, sourceNodeId: node.id }] } };
    }));
  };

  const clearConnection = (nodeId: string) => {
    setNodeRows((current) => current.map((node) => (
      node.id === nodeId ? { ...node, metadata: { ...(node.metadata ?? {}), connections: [] } } : node
    )));
  };

  const savePlan = async () => {
    if (!seasonId) return false;
    const nodeValidation = validateSeasonBuilderNodes(nodeRows);
    if (!nodeValidation.valid) {
      toast({ title: 'Plan validation failed', description: nodeValidation.message ?? 'Fix the tournament structure before saving.', variant: 'destructive' });
      return false;
    }

    const nodePayload = toSeasonNodeDraftPayload(nodeRows).map((node) => ({
      ...node,
      id: node.id?.startsWith('draft-') ? undefined : node.id,
      slug: toNullable(node.slug),
      region: toNullable(node.region),
      city: toNullable(node.city),
      country: toNullable(node.country),
      linkedTournamentId: node.linkedTournamentId ?? null,
      linkedStageId: toNullable(node.linkedStageId),
      registrationDeadline: toNullable(node.registrationDeadline),
      startsAt: toNullable(node.startsAt),
      endsAt: toNullable(node.endsAt),
    }));

    const rulePayload = ruleRows
      .filter((rule) => rule.sourceNodeId)
      .map((rule) => ({
        ...rule,
        id: rule.id?.startsWith('draft-') ? undefined : rule.id,
        sourceStageId: toNullable(rule.sourceStageId),
        destinationNodeId: rule.destinationNodeId ?? null,
        qualificationStatus: rule.qualificationStatus ?? null,
        regionKey: toNullable(rule.regionKey),
      }));

    try {
      await syncNodes.mutateAsync(nodePayload);
      await syncRules.mutateAsync(rulePayload);
      toast({ title: 'Plan saved', description: 'Tournament structure, schedules, rules, and advancement links are saved.' });
      await refetch();
      return true;
    } catch (saveError) {
      toast({ title: 'Plan save failed', description: saveError instanceof Error ? saveError.message : 'Could not save this season plan.', variant: 'destructive' });
      return false;
    }
  };

  const handleContinue = async () => {
    if (planIssues.issues.length > 0) {
      toast({ title: 'Plan needs attention', description: planIssues.issues[0], variant: 'destructive' });
      return;
    }
    const saved = await savePlan();
    if (saved) navigate(`/season/setup/${seasonId}/review`);
  };

  if (!seasonId) return <div className="min-h-screen bg-[#050505]" />;

  if (isLoading) {
    return <div className="min-h-screen bg-[#050505] px-6 py-24 text-center text-zinc-500">Loading season plan...</div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] px-6 py-24 text-white">
        <div className="mx-auto max-w-2xl border border-red-500/20 bg-red-500/10 p-8">
          <p className="font-semibold text-red-100">Could not load this season.</p>
          <p className="mt-2 text-sm text-red-200/80">{error instanceof Error ? error.message : 'Season not found.'}</p>
          <Button onClick={() => refetch()} className="mt-5 rounded-none bg-white text-black hover:bg-zinc-200">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 border border-white/10 bg-[#08080a] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to="/organizer/seasons" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500 hover:text-zinc-200">
              <ChevronLeft className="h-3.5 w-3.5" />
              Seasons
            </Link>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.4em] text-rose-400">Season setup · Plan</p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-white">{data.season.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Build the tournament plan before entering management: tournaments, schedules, scoring rules, and advancement links.</p>
          </div>
          <div className="grid grid-cols-4 border border-white/10 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {['Shell', 'Plan', 'Review', 'Manage'].map((step) => (
              <div key={step} className={cn('px-4 py-3', step === 'Plan' ? 'bg-rose-500 text-white' : 'bg-white/[0.03]')}>{step}</div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="border border-white/10 bg-[#08080a] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Tournaments</p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Plan tournament nodes</h2>
                </div>
                <Button className="rounded-none bg-rose-500 text-white hover:bg-rose-400" onClick={() => setNodeRows((current) => [...current, createDraftNode(seasonId, rootNode?.id ?? null, plannedNodes.length + 1)])}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add tournament
                </Button>
              </div>

              <div className="mt-6 space-y-4">
                {plannedNodes.length === 0 && (
                  <div className="border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-zinc-500">No tournaments planned yet.</div>
                )}
                {plannedNodes.map((node, index) => {
                  const config = readTournamentConfig(node);
                  const connection = readOutgoingConnections(node)[0];
                  return (
                    <div key={node.id} className="border border-white/10 bg-white/[0.03] p-5">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-600">Tournament {index + 1}</p>
                          <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-white">{node.name || 'Unnamed tournament'}</h3>
                        </div>
                        <button type="button" className="border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20" onClick={() => setNodeRows((current) => current.filter((item) => item.id !== node.id))}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2 xl:col-span-2">
                          <Label>Name</Label>
                          <Input value={node.name} onChange={(event) => updateNode(node.id, { name: event.target.value })} className="rounded-none border-white/10 bg-black/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={node.nodeType} onValueChange={(value: SeasonNodeType) => updateNode(node.id, { nodeType: value })}>
                            <SelectTrigger className="rounded-none border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent>{NODE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Region</Label>
                          <Input value={node.region ?? ''} onChange={(event) => updateNode(node.id, { region: event.target.value })} className="rounded-none border-white/10 bg-black/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label>Format</Label>
                          <Select value={config.format ?? ''} onValueChange={(value) => updateMetadata(node.id, { format: value })}>
                            <SelectTrigger className="rounded-none border-white/10 bg-black/20 text-white"><SelectValue placeholder="Format" /></SelectTrigger>
                            <SelectContent>{FORMAT_OPTIONS.map((format) => <SelectItem key={format} value={format}>{format.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Registration</Label>
                          <Select value={config.registrationType ?? ''} onValueChange={(value) => updateMetadata(node.id, { registrationType: value })} disabled={isProgressionOnlyNode(node)}>
                            <SelectTrigger className="rounded-none border-white/10 bg-black/20 text-white"><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>{REGISTRATION_TYPES.map((type) => <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                          </Select>
                          {isProgressionOnlyNode(node) && <p className="text-xs text-zinc-600">Inbound-only: entrants come from upstream results.</p>}
                        </div>
                        {!isProgressionOnlyNode(node) && config.registrationType !== 'closed' && (
                          <div className="space-y-2">
                            <Label>Reserved invite slots</Label>
                            <Select value={String(config.reservedInviteSlots ?? 0)} onValueChange={(value) => updateMetadata(node.id, { reservedInviteSlots: Number(value) })}>
                              <SelectTrigger className="rounded-none border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {RESERVED_INVITE_SLOT_OPTIONS.filter((value) => value <= (config.maxTeams ?? 128)).map((value) => (
                                  <SelectItem key={value} value={String(value)}>{value} slot{value === 1 ? '' : 's'}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-zinc-600">Open registrations cannot consume these reserved invitation slots.</p>
                          </div>
                        )}
                        {!isProgressionOnlyNode(node) && (config.registrationType === 'invite_only' || (config.reservedInviteSlots ?? 0) > 0) && (
                          <div className="space-y-2">
                            <Label>Invite expiry</Label>
                            <Select value={String(config.inviteExpiryDays ?? 7)} onValueChange={(value) => updateMetadata(node.id, { inviteExpiryDays: Number(value) })}>
                              <SelectTrigger className="rounded-none border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {INVITE_EXPIRY_DAY_OPTIONS.map((value) => (
                                  <SelectItem key={value} value={String(value)}>{value} day{value === 1 ? '' : 's'}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Max teams</Label>
                          <Input type="number" min={2} value={config.maxTeams ?? ''} onChange={(event) => updateMetadata(node.id, { maxTeams: Number(event.target.value) })} className="rounded-none border-white/10 bg-black/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label>Team size</Label>
                          <Input type="number" min={1} value={config.teamSize ?? ''} onChange={(event) => updateMetadata(node.id, { teamSize: Number(event.target.value) })} className="rounded-none border-white/10 bg-black/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label>Registration deadline</Label>
                          <Input type="date" value={formatDateInput(node.registrationDeadline)} onChange={(event) => updateNode(node.id, { registrationDeadline: event.target.value })} disabled={!nodeRequiresRegistrationDeadline(node)} className="rounded-none border-white/10 bg-black/20 text-white" />
                          {!nodeRequiresRegistrationDeadline(node) && <p className="text-xs text-zinc-600">No direct registration for finals/stages.</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Start date</Label>
                          <Input type="date" value={formatDateInput(node.startsAt)} onChange={(event) => updateNode(node.id, { startsAt: event.target.value })} className="rounded-none border-white/10 bg-black/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label>End date</Label>
                          <Input type="date" value={formatDateInput(node.endsAt)} onChange={(event) => updateNode(node.id, { endsAt: event.target.value })} className="rounded-none border-white/10 bg-black/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label>Advances to</Label>
                          <Select value={connection?.targetNodeId || '__none__'} onValueChange={(value) => value === '__none__' ? clearConnection(node.id) : updateConnection(node.id, { targetNodeId: value })}>
                            <SelectTrigger className="rounded-none border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No linked tournament</SelectItem>
                              {nodeOptions.filter((option) => option.id !== node.id).map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-2 xl:col-span-3">
                          <div className="space-y-2">
                            <Label>From place</Label>
                            <Input type="number" min={1} value={connection?.placementStart ?? 1} onChange={(event) => updateConnection(node.id, { placementStart: Number(event.target.value) })} className="rounded-none border-white/10 bg-black/20 text-white" />
                          </div>
                          <div className="space-y-2">
                            <Label>To place</Label>
                            <Input type="number" min={1} value={connection?.placementEnd ?? 1} onChange={(event) => updateConnection(node.id, { placementEnd: Number(event.target.value) })} className="rounded-none border-white/10 bg-black/20 text-white" />
                          </div>
                          <div className="space-y-2">
                            <Label>Advance count</Label>
                            <Input type="number" min={1} value={connection?.advancementCount ?? 1} onChange={(event) => updateConnection(node.id, { advancementCount: Number(event.target.value) })} className="rounded-none border-white/10 bg-black/20 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="border border-white/10 bg-[#08080a] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Rules</p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Scoring and qualification rules</h2>
                </div>
                <Button variant="outline" className="rounded-none border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]" onClick={() => setRuleRows((current) => [...current, { ...createEmptyRule(nodeOptions[0]?.id ?? ''), id: `draft-rule-${Date.now()}` }])}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add rule
                </Button>
              </div>
              <div className="mt-6 space-y-4">
                {ruleRows.length === 0 && <div className="border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-zinc-500">No rules configured yet.</div>}
                {ruleRows.map((rule, index) => (
                  <div key={rule.id ?? `rule-${index}`} className="border border-white/10 bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">Rule {index + 1}</p>
                      <button type="button" className="border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20" onClick={() => setRuleRows((current) => current.filter((_, currentIndex) => currentIndex !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Source tournament</Label>
                        <Select value={rule.sourceNodeId || '__none__'} onValueChange={(value) => setRuleRows((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, sourceNodeId: value === '__none__' ? '' : value } : item))}>
                          <SelectTrigger className="rounded-none border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select source</SelectItem>
                            {nodeOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Destination</Label>
                        <Select value={rule.destinationNodeId ?? '__none__'} onValueChange={(value) => setRuleRows((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, destinationNodeId: value === '__none__' ? null : value } : item))}>
                          <SelectTrigger className="rounded-none border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No destination</SelectItem>
                            {nodeOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Placement from</Label>
                        <Input type="number" min={1} value={rule.placementFrom} onChange={(event) => setRuleRows((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, placementFrom: Number(event.target.value) } : item))} className="rounded-none border-white/10 bg-black/20 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label>Placement to</Label>
                        <Input type="number" min={1} value={rule.placementTo} onChange={(event) => setRuleRows((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, placementTo: Number(event.target.value) } : item))} className="rounded-none border-white/10 bg-black/20 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input type="number" min={0} value={rule.pointsAwarded} onChange={(event) => setRuleRows((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, pointsAwarded: Number(event.target.value) } : item))} className="rounded-none border-white/10 bg-black/20 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label>Qualification</Label>
                        <Select value={rule.qualificationStatus ?? '__none__'} onValueChange={(value) => setRuleRows((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, qualificationStatus: value === '__none__' ? null : value } : item))}>
                          <SelectTrigger className="rounded-none border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No qualification</SelectItem>
                            {QUALIFICATION_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-3 border border-white/10 bg-black/20 p-3 xl:col-span-2">
                        <Switch checked={rule.autoCreateQualification} onCheckedChange={(checked) => setRuleRows((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, autoCreateQualification: checked } : item))} />
                        <div>
                          <p className="text-sm font-semibold text-white">Auto-create qualification</p>
                          <p className="text-xs text-zinc-500">Matching teams become qualification records.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="sticky top-24 space-y-6">
              <div className="border border-white/10 bg-[#08080a] p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Plan validation</p>
                <div className="mt-5 space-y-3">
                  {planIssues.issues.length === 0 ? (
                    <div className="flex items-start gap-3 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4" />Plan is ready for review.</div>
                  ) : planIssues.issues.map((issue) => (
                    <div key={issue} className="flex items-start gap-3 text-sm text-amber-300"><XCircle className="mt-0.5 h-4 w-4" />{issue}</div>
                  ))}
                </div>
                <div className="mt-6 grid gap-3">
                  <Button className="rounded-none bg-white text-black hover:bg-zinc-200" onClick={savePlan} disabled={syncNodes.isPending || syncRules.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Save plan
                  </Button>
                  <Button className="rounded-none bg-rose-500 text-white hover:bg-rose-400" onClick={handleContinue} disabled={syncNodes.isPending || syncRules.isPending || planIssues.issues.length > 0}>
                    Continue to review
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="border border-white/10 bg-[#08080a] p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Structure preview</p>
                <SeasonTreePreview tree={treePreview} className="mt-5" compact />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-white/10 bg-[#08080a] p-4"><Trophy className="h-4 w-4 text-rose-400" /><p className="mt-3 text-2xl font-black">{plannedNodes.length}</p><p className="text-xs text-zinc-500">Tournaments</p></div>
                <div className="border border-white/10 bg-[#08080a] p-4"><Calendar className="h-4 w-4 text-amber-400" /><p className="mt-3 text-2xl font-black">{plannedNodes.length - planIssues.missingSchedule.length}</p><p className="text-xs text-zinc-500">Scheduled</p></div>
                <div className="border border-white/10 bg-[#08080a] p-4"><Target className="h-4 w-4 text-cyan-400" /><p className="mt-3 text-2xl font-black">{ruleRows.filter((rule) => rule.sourceNodeId).length}</p><p className="text-xs text-zinc-500">Rules</p></div>
                <div className="border border-white/10 bg-[#08080a] p-4"><Link2 className="h-4 w-4 text-violet-400" /><p className="mt-3 text-2xl font-black">{planIssues.connectionCount}</p><p className="text-xs text-zinc-500">Links</p></div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default SeasonSetupPlan;
