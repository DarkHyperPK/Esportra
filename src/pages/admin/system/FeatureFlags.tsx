import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Plus,
  Settings,
  Users,
  Percent,
  Search,
  Trash2,
  Edit,
  Copy,
  X,
  Power,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CommandButton,
  CommandEmptyState,
  CommandHeader,
  CommandIconButton,
  CommandSection,
  CommandShell,
  CommandTabs,
} from '@/components/management/CommandSurface';

interface CatalogFeature {
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  flagId: string | null;
  seeded: boolean;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  flag_type: string;
  default_value: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  rule_count: number;
  override_count: number;
}

interface FlagRule {
  id: string;
  flag_id: string;
  priority: number;
  conditions: Record<string, unknown>;
  value: Record<string, unknown>;
  percentage: number | null;
}

interface FlagOverride {
  id: string;
  flag_id: string;
  user_id: string;
  value: Record<string, unknown>;
  reason: string | null;
  created_at: string;
  username?: string;
}

const flagTypes = [
  { value: 'boolean', label: 'Boolean (on/off)' },
  { value: 'percentage', label: 'Percentage Rollout' },
  { value: 'string', label: 'String Value' },
  { value: 'json', label: 'JSON Config' },
];

const conditionTypes = [
  { value: 'role', label: 'User Role' },
  { value: 'is_admin', label: 'Is Admin' },
  { value: 'is_super_admin', label: 'Is Super Admin' },
];

const roleOptions = ['organizer', 'venue_owner', 'player'];

export default function FeatureFlags() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [overridesDialogOpen, setOverridesDialogOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const queryClient = useQueryClient();

  // Flag form state
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('boolean');
  const [formDefaultValue, setFormDefaultValue] = useState('true');

  // Rule form state
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FlagRule | null>(null);
  const [rulePriority, setRulePriority] = useState('0');
  const [ruleConditionType, setRuleConditionType] = useState('role');
  const [ruleConditionValue, setRuleConditionValue] = useState('');
  const [ruleValue, setRuleValue] = useState('true');
  const [rulePercentage, setRulePercentage] = useState('');

  // ── Curated platform feature catalog ────────────────────────────────────
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['admin', 'features-catalog'],
    queryFn: () =>
      apiClient.get<{ features: CatalogFeature[] }>('/api/admin/features/catalog'),
  });
  const catalogFeatures = catalogData?.features ?? [];

  // Group catalog features by category (order of first appearance)
  const catalogGroups: { category: string; features: CatalogFeature[] }[] = [];
  for (const feature of catalogFeatures) {
    const group = catalogGroups.find((g) => g.category === feature.category);
    if (group) group.features.push(feature);
    else catalogGroups.push({ category: feature.category, features: [feature] });
  }

  const toggleCatalogFeature = useMutation({
    mutationFn: async ({ flagId, enabled }: { flagId: string; enabled: boolean }) => {
      await apiClient.put(`/api/admin/feature-flags/${flagId}`, { is_enabled: enabled });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'features-catalog'] });
      // Refresh the public status map so nav gating + page guards react immediately
      queryClient.invalidateQueries({ queryKey: ['platform-features'] });
      toast.success(variables.enabled ? 'Feature enabled' : 'Feature disabled — entry points hidden, APIs guarded');
    },
    onError: () => {
      toast.error('Failed to update feature');
    },
  });

  // ── Raw flag engine (advanced) ──────────────────────────────────────────
  const { data: flags, isLoading } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => apiClient.get<FeatureFlag[]>('/api/admin/feature-flags'),
  });

  const { data: rules, refetch: refetchRules } = useQuery({
    queryKey: ['admin', 'feature-flag-rules', selectedFlag?.id],
    queryFn: () => apiClient.get<FlagRule[]>(`/api/admin/feature-flags/${selectedFlag!.id}/rules`),
    enabled: !!selectedFlag && rulesDialogOpen,
  });

  const { data: overrides } = useQuery({
    queryKey: ['admin', 'feature-flag-overrides', selectedFlag?.id],
    queryFn: () => apiClient.get<FlagOverride[]>(`/api/admin/feature-flags/${selectedFlag!.id}/overrides`),
    enabled: !!selectedFlag && overridesDialogOpen,
  });

  const createFlag = useMutation({
    mutationFn: async () => {
      const defaultValue = parseDefaultValue(formType, formDefaultValue);
      await apiClient.post('/api/admin/feature-flags', {
        key: formKey,
        name: formName,
        description: formDescription || null,
        flag_type: formType,
        default_value: defaultValue,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Flag created');
      resetForm();
      setCreateDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to create flag');
    },
  });

  const updateFlag = useMutation({
    mutationFn: async (updates: Partial<FeatureFlag>) => {
      await apiClient.put(`/api/admin/feature-flags/${editingFlag?.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Flag updated');
      setEditingFlag(null);
    },
    onError: () => {
      toast.error('Failed to update flag');
    },
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      await apiClient.put(`/api/admin/feature-flags/${id}`, { is_enabled: isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Flag updated');
    },
    onError: () => {
      toast.error('Failed to update flag');
    },
  });

  const deleteFlag = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/admin/feature-flags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Flag deleted');
    },
    onError: () => {
      toast.error('Failed to delete flag');
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const conditions = buildConditions();
      const value = parseRuleValue();
      await apiClient.post(`/api/admin/feature-flags/${selectedFlag?.id}/rules`, {
        priority: parseInt(rulePriority, 10) || 0,
        conditions,
        value,
        percentage: rulePercentage ? parseInt(rulePercentage, 10) : null,
      });
    },
    onSuccess: () => {
      refetchRules();
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Rule created');
      resetRuleForm();
      setRuleEditorOpen(false);
    },
    onError: () => {
      toast.error('Failed to create rule');
    },
  });

  const updateRule = useMutation({
    mutationFn: async () => {
      const conditions = buildConditions();
      const value = parseRuleValue();
      await apiClient.put(`/api/admin/feature-flags/${selectedFlag?.id}/rules/${editingRule?.id}`, {
        priority: parseInt(rulePriority, 10) || 0,
        conditions,
        value,
        percentage: rulePercentage ? parseInt(rulePercentage, 10) : null,
      });
    },
    onSuccess: () => {
      refetchRules();
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Rule updated');
      resetRuleForm();
      setRuleEditorOpen(false);
      setEditingRule(null);
    },
    onError: () => {
      toast.error('Failed to update rule');
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      await apiClient.delete(`/api/admin/feature-flags/${selectedFlag?.id}/rules/${ruleId}`);
    },
    onSuccess: () => {
      refetchRules();
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Rule deleted');
    },
    onError: () => {
      toast.error('Failed to delete rule');
    },
  });

  const deleteOverride = useMutation({
    mutationFn: (overrideId: string) =>
      apiClient.delete(`/api/admin/feature-flags/${selectedFlag?.id}/overrides/${overrideId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flag-overrides'] });
      toast.success('Override removed');
    },
  });

  const buildConditions = (): Record<string, unknown> => {
    switch (ruleConditionType) {
      case 'role':
        return { role: ruleConditionValue };
      case 'is_admin':
        return { is_admin: ruleConditionValue === 'true' };
      case 'is_super_admin':
        return { is_super_admin: ruleConditionValue === 'true' };
      default:
        return {};
    }
  };

  const parseRuleValue = (): Record<string, unknown> => {
    if (!selectedFlag) return { enabled: true };
    switch (selectedFlag.flag_type) {
      case 'boolean':
        return { enabled: ruleValue === 'true' };
      case 'percentage':
        return { percentage: parseInt(ruleValue, 10) || 0 };
      case 'json':
        try {
          return JSON.parse(ruleValue);
        } catch {
          return { value: ruleValue };
        }
      default:
        return { value: ruleValue };
    }
  };

  const parseDefaultValue = (type: string, value: string): Record<string, unknown> => {
    switch (type) {
      case 'boolean':
        return { enabled: value === 'true' };
      case 'percentage':
        return { percentage: parseInt(value, 10) || 0 };
      case 'string':
        return { value };
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return { value };
        }
      default:
        return { enabled: true };
    }
  };

  const resetForm = () => {
    setFormKey('');
    setFormName('');
    setFormDescription('');
    setFormType('boolean');
    setFormDefaultValue('true');
  };

  const resetRuleForm = () => {
    setRulePriority('0');
    setRuleConditionType('role');
    setRuleConditionValue('');
    setRuleValue('true');
    setRulePercentage('');
  };

  const openRuleEditor = (rule?: FlagRule) => {
    if (rule) {
      setEditingRule(rule);
      setRulePriority(String(rule.priority));
      if ('role' in rule.conditions) {
        setRuleConditionType('role');
        setRuleConditionValue(String(rule.conditions.role));
      } else if ('is_admin' in rule.conditions) {
        setRuleConditionType('is_admin');
        setRuleConditionValue(String(rule.conditions.is_admin));
      } else if ('is_super_admin' in rule.conditions) {
        setRuleConditionType('is_super_admin');
        setRuleConditionValue(String(rule.conditions.is_super_admin));
      }
      if ('enabled' in rule.value) {
        setRuleValue(String(rule.value.enabled));
      } else if ('percentage' in rule.value) {
        setRuleValue(String(rule.value.percentage));
      } else {
        setRuleValue(JSON.stringify(rule.value, null, 2));
      }
      setRulePercentage(rule.percentage ? String(rule.percentage) : '');
    } else {
      resetRuleForm();
      setEditingRule(null);
    }
    setRuleEditorOpen(true);
  };

  const openEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setFormKey(flag.key);
    setFormName(flag.name);
    setFormDescription(flag.description ?? '');
    setFormType(flag.flag_type);
    setFormDefaultValue(
      flag.flag_type === 'boolean'
        ? String(flag.default_value?.enabled ?? true)
        : flag.flag_type === 'percentage'
          ? String(flag.default_value?.percentage ?? 0)
          : flag.flag_type === 'json'
            ? JSON.stringify(flag.default_value, null, 2)
            : String(flag.default_value?.value ?? '')
    );
  };

  const filteredFlags = flags?.filter(
    (f) =>
      f.key.toLowerCase().includes(search.toLowerCase()) ||
      f.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatConditions = (conditions: Record<string, unknown>): string => {
    if ('role' in conditions) return `Role = ${conditions.role}`;
    if ('is_admin' in conditions) return `Is Admin = ${conditions.is_admin}`;
    if ('is_super_admin' in conditions) return `Is Super Admin = ${conditions.is_super_admin}`;
    return JSON.stringify(conditions);
  };

  return (
    <CommandShell className="p-0">
      <div className="esportra-ambient-content mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
        <CommandHeader
          eyebrow="System"
          title="Feature Flags"
          description="Curated platform features with graceful-off behavior, plus the raw targeting engine underneath."
          actions={
            <CommandButton
              variant="secondary"
              onClick={() => {
                setActiveTab('advanced');
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New Flag
            </CommandButton>
          }
        />

        <CommandTabs
          tabs={[
            { value: 'catalog', label: 'Platform Features' },
            { value: 'advanced', label: 'Advanced Engine' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* ── Platform Features catalog ─────────────────────────────────── */}
        {activeTab === 'catalog' && (
          <>
            <p className="max-w-3xl text-sm leading-relaxed text-zinc-500">
              Every curated platform feature declared in the registry. Disabling a feature hides
              its entry points across the platform and guards its APIs — data is never touched and
              everything returns the moment it is re-enabled.
            </p>

            {catalogLoading ? (
              <CommandSection className="py-16 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-600" />
              </CommandSection>
            ) : catalogGroups.length === 0 ? (
              <CommandEmptyState
                icon={<Power className="h-5 w-5" />}
                title="No registry features found"
                description="The backend FeatureRegistry is empty or the catalog endpoint returned nothing."
              />
            ) : (
              catalogGroups.map((group) => (
                <section key={group.category} className="border border-white/10 bg-[#0a0a0c]/92">
                  <p className="border-b border-white/10 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-rose-400">
                    {group.category}
                  </p>
                  <div className="divide-y divide-white/[0.06]">
                    {group.features.map((feature) => (
                      <div key={feature.key} className="flex items-start justify-between gap-6 p-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-sm font-semibold text-white">{feature.name}</h3>
                            <code className="font-mono text-[11px] text-zinc-500">{feature.key}</code>
                            {feature.enabled ? (
                              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                                <span className="h-1.5 w-1.5 bg-rose-500" />
                                Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                <span className="h-1.5 w-1.5 border border-zinc-600" />
                                Off
                              </span>
                            )}
                          </div>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                            {feature.description}
                          </p>
                          {!feature.seeded && (
                            <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                              <AlertTriangle className="h-3 w-3" />
                              Not seeded — toggling will create its flag row
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-3 pt-1">
                          {feature.flagId ? (
                            <Switch
                              checked={feature.enabled}
                              disabled={toggleCatalogFeature.isPending}
                              className="data-[state=checked]:bg-rose-500"
                              onCheckedChange={(checked) =>
                                toggleCatalogFeature.mutate({ flagId: feature.flagId!, enabled: checked })
                              }
                            />
                          ) : (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                              No flag
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}

        {/* ── Advanced engine ───────────────────────────────────────────── */}
        {activeTab === 'advanced' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search flags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="-none border-white/10 bg-white/[0.03] pl-10 focus-visible:ring-rose-500"
              />
            </div>

            {isLoading ? (
              <CommandSection className="py-16 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-600" />
              </CommandSection>
            ) : filteredFlags?.length === 0 ? (
              <CommandEmptyState
                title={search ? 'No flags match your search' : 'No feature flags configured'}
                description="Raw flags drive rules, segments, rollouts and user overrides. Curated platform features live in the Platform Features tab."
                action={
                  !search ? (
                    <CommandButton onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4" /> Create Flag
                    </CommandButton>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredFlags?.map((flag) => (
                  <section key={flag.id} className="border border-white/10 bg-[#0a0a0c]/92 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <code className="font-mono text-sm text-rose-400">{flag.key}</code>
                          <Badge
                            variant="outline"
                            className={
                              flag.is_enabled
                                ? '-none border-white/25 text-white'
                                : '-none border-zinc-700 text-zinc-500'
                            }
                          >
                            {flag.is_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge variant="outline" className="-none text-xs">
                            {flag.flag_type}
                          </Badge>
                        </div>
                        <h3 className="mt-1 text-sm font-semibold text-white">{flag.name}</h3>
                        {flag.description && (
                          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{flag.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                          <button
                            onClick={() => {
                              setSelectedFlag(flag);
                              setRulesDialogOpen(true);
                            }}
                            className="flex items-center gap-1 transition hover:text-white"
                          >
                            <Settings className="w-3 h-3" />
                            {flag.rule_count} rules
                          </button>
                          <button
                            onClick={() => {
                              setSelectedFlag(flag);
                              setOverridesDialogOpen(true);
                            }}
                            className="flex items-center gap-1 transition hover:text-white"
                          >
                            <Users className="w-3 h-3" />
                            {flag.override_count} overrides
                          </button>
                          {flag.default_value && 'percentage' in flag.default_value && (
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              {String(flag.default_value.percentage)}% rollout
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Switch
                          checked={flag.is_enabled}
                          className="data-[state=checked]:bg-rose-500"
                          onCheckedChange={(checked) =>
                            toggleFlag.mutate({ id: flag.id, isEnabled: checked })
                          }
                        />
                        <CommandIconButton
                          label="Copy key"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(flag.key);
                            toast.success('Key copied');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </CommandIconButton>
                        <CommandIconButton label="Edit flag" variant="ghost" onClick={() => openEdit(flag)}>
                          <Edit className="w-4 h-4" />
                        </CommandIconButton>
                        <CommandIconButton
                          label="Delete flag"
                          variant="danger"
                          onClick={() => {
                            if (confirm('Delete this feature flag?')) {
                              deleteFlag.mutate(flag.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </CommandIconButton>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}

        {/* Create / Edit Flag Dialog */}
        <Dialog
          open={createDialogOpen || !!editingFlag}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditingFlag(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="-none border-white/10 bg-[#0a0a0c]">
            <DialogHeader>
              <DialogTitle>{editingFlag ? 'Edit Flag' : 'Create Feature Flag'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Key</label>
                <Input
                  placeholder="feature_new_dashboard"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="-none border-white/10 bg-white/[0.03] font-mono focus-visible:ring-rose-500"
                  disabled={!!editingFlag}
                />
                <p className="text-xs text-zinc-500 mt-1">Lowercase with underscores only</p>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Name</label>
                <Input
                  placeholder="New Dashboard"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="-none border-white/10 bg-white/[0.03] focus-visible:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Description</label>
                <Textarea
                  placeholder="What this flag controls..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="-none border-white/10 bg-white/[0.03] focus-visible:ring-rose-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Type</label>
                <Select value={formType} onValueChange={setFormType} disabled={!!editingFlag}>
                  <SelectTrigger className="-none border-white/10 bg-white/[0.03]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="-none border-white/10 bg-[#0a0a0c]">
                    {flagTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Default Value</label>
                {formType === 'boolean' ? (
                  <Select value={formDefaultValue} onValueChange={setFormDefaultValue}>
                    <SelectTrigger className="-none border-white/10 bg-white/[0.03]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="-none border-white/10 bg-[#0a0a0c]">
                      <SelectItem value="true">Enabled (true)</SelectItem>
                      <SelectItem value="false">Disabled (false)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : formType === 'percentage' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formDefaultValue}
                      onChange={(e) => setFormDefaultValue(e.target.value)}
                      className="-none border-white/10 bg-white/[0.03] focus-visible:ring-rose-500"
                    />
                    <span className="text-zinc-400">%</span>
                  </div>
                ) : formType === 'json' ? (
                  <Textarea
                    value={formDefaultValue}
                    onChange={(e) => setFormDefaultValue(e.target.value)}
                    className="-none border-white/10 bg-white/[0.03] font-mono text-xs focus-visible:ring-rose-500"
                    rows={4}
                    placeholder='{"key": "value"}'
                  />
                ) : (
                  <Input
                    value={formDefaultValue}
                    onChange={(e) => setFormDefaultValue(e.target.value)}
                    className="-none border-white/10 bg-white/[0.03] focus-visible:ring-rose-500"
                  />
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <CommandButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditingFlag(null);
                  resetForm();
                }}
              >
                Cancel
              </CommandButton>
              <CommandButton
                size="sm"
                onClick={() => {
                  if (editingFlag) {
                    updateFlag.mutate({
                      name: formName,
                      description: formDescription || null,
                      default_value: parseDefaultValue(formType, formDefaultValue),
                    });
                  } else {
                    createFlag.mutate();
                  }
                }}
                disabled={!formKey || !formName || createFlag.isPending || updateFlag.isPending}
              >
                {(createFlag.isPending || updateFlag.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {editingFlag ? 'Save Changes' : 'Create Flag'}
              </CommandButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rules Dialog */}
        <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
          <DialogContent className="max-w-2xl -none border-white/10 bg-[#0a0a0c]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  Rules for <code className="text-rose-400">{selectedFlag?.key}</code>
                </DialogTitle>
                <CommandButton size="sm" onClick={() => openRuleEditor()}>
                  <Plus className="w-3 h-3" />
                  New Rule
                </CommandButton>
              </div>
            </DialogHeader>
            <div className="space-y-3 mt-4 max-h-96 overflow-y-auto">
              {rules?.length === 0 && (
                <p className="text-center text-zinc-500 py-8">
                  No rules configured. Default value will be used for all users.
                </p>
              )}
              {rules?.map((rule) => (
                <div key={rule.id} className="border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="-none text-xs">
                        Priority {rule.priority}
                      </Badge>
                      {rule.percentage !== null && (
                        <Badge variant="secondary" className="-none text-xs">
                          {rule.percentage}% rollout
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <CommandIconButton label="Edit rule" variant="ghost" onClick={() => openRuleEditor(rule)}>
                        <Edit className="w-3 h-3" />
                      </CommandIconButton>
                      <CommandIconButton
                        label="Delete rule"
                        variant="danger"
                        onClick={() => {
                          if (confirm('Delete this rule?')) {
                            deleteRule.mutate(rule.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </CommandIconButton>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-zinc-500">When: </span>
                    <span className="text-zinc-300">{formatConditions(rule.conditions)}</span>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="text-zinc-500">Then: </span>
                    <span className="font-mono text-xs text-emerald-300">{JSON.stringify(rule.value)}</span>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <CommandButton variant="ghost" size="sm" onClick={() => setRulesDialogOpen(false)}>
                Close
              </CommandButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rule Editor Dialog */}
        <Dialog open={ruleEditorOpen} onOpenChange={(open) => {
          if (!open) {
            setRuleEditorOpen(false);
            setEditingRule(null);
            resetRuleForm();
          }
        }}>
          <DialogContent className="-none border-white/10 bg-[#0a0a0c]">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Priority</label>
                <Input
                  type="number"
                  value={rulePriority}
                  onChange={(e) => setRulePriority(e.target.value)}
                  className="-none border-white/10 bg-white/[0.03] focus-visible:ring-rose-500"
                />
                <p className="text-xs text-zinc-500 mt-1">Higher priority rules are evaluated first</p>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Condition Type</label>
                <Select value={ruleConditionType} onValueChange={(v) => {
                  setRuleConditionType(v);
                  setRuleConditionValue('');
                }}>
                  <SelectTrigger className="-none border-white/10 bg-white/[0.03]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="-none border-white/10 bg-[#0a0a0c]">
                    {conditionTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Condition Value</label>
                {ruleConditionType === 'role' ? (
                  <Select value={ruleConditionValue} onValueChange={setRuleConditionValue}>
                    <SelectTrigger className="-none border-white/10 bg-white/[0.03]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="-none border-white/10 bg-[#0a0a0c]">
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={ruleConditionValue} onValueChange={setRuleConditionValue}>
                    <SelectTrigger className="-none border-white/10 bg-white/[0.03]">
                      <SelectValue placeholder="Select value" />
                    </SelectTrigger>
                    <SelectContent className="-none border-white/10 bg-[#0a0a0c]">
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">
                  Value when condition matches
                </label>
                {selectedFlag?.flag_type === 'boolean' ? (
                  <Select value={ruleValue} onValueChange={setRuleValue}>
                    <SelectTrigger className="-none border-white/10 bg-white/[0.03]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="-none border-white/10 bg-[#0a0a0c]">
                      <SelectItem value="true">Enabled (true)</SelectItem>
                      <SelectItem value="false">Disabled (false)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : selectedFlag?.flag_type === 'percentage' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={ruleValue}
                      onChange={(e) => setRuleValue(e.target.value)}
                      className="-none border-white/10 bg-white/[0.03] focus-visible:ring-rose-500"
                    />
                    <span className="text-zinc-400">%</span>
                  </div>
                ) : selectedFlag?.flag_type === 'json' ? (
                  <Textarea
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    className="-none border-white/10 bg-white/[0.03] font-mono text-xs focus-visible:ring-rose-500"
                    rows={4}
                    placeholder='{"key": "value"}'
                  />
                ) : (
                  <Input
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    className="-none border-white/10 bg-white/[0.03] focus-visible:ring-rose-500"
                  />
                )}
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">
                  Percentage Rollout (optional)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={rulePercentage}
                    onChange={(e) => setRulePercentage(e.target.value)}
                    className="-none border-white/10 bg-white/[0.03] focus-visible:ring-rose-500"
                    placeholder="Leave empty for 100%"
                  />
                  <span className="text-zinc-400">%</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Only apply this rule to a percentage of matching users
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <CommandButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRuleEditorOpen(false);
                  setEditingRule(null);
                  resetRuleForm();
                }}
              >
                Cancel
              </CommandButton>
              <CommandButton
                size="sm"
                onClick={() => {
                  if (editingRule) {
                    updateRule.mutate();
                  } else {
                    createRule.mutate();
                  }
                }}
                disabled={!ruleConditionValue || createRule.isPending || updateRule.isPending}
              >
                {(createRule.isPending || updateRule.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {editingRule ? 'Save Rule' : 'Create Rule'}
              </CommandButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Overrides Dialog */}
        <Dialog open={overridesDialogOpen} onOpenChange={setOverridesDialogOpen}>
          <DialogContent className="max-w-2xl -none border-white/10 bg-[#0a0a0c]">
            <DialogHeader>
              <DialogTitle>
                Overrides for <code className="text-rose-400">{selectedFlag?.key}</code>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4 max-h-96 overflow-y-auto">
              {overrides?.length === 0 && (
                <p className="text-center text-zinc-500 py-8">
                  No user overrides. All users receive evaluated flag value.
                </p>
              )}
              {overrides?.map((override) => (
                <div
                  key={override.id}
                  className="flex items-center justify-between border border-white/10 bg-white/[0.025] p-3"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {override.username ?? override.user_id}
                    </p>
                    {override.reason && (
                      <p className="text-xs text-zinc-500 mt-0.5">{override.reason}</p>
                    )}
                    <pre className="mt-1 font-mono text-xs text-emerald-300">
                      {JSON.stringify(override.value)}
                    </pre>
                  </div>
                  <CommandIconButton
                    label="Remove override"
                    variant="danger"
                    onClick={() => deleteOverride.mutate(override.id)}
                  >
                    <X className="w-4 h-4" />
                  </CommandIconButton>
                </div>
              ))}
            </div>
            <DialogFooter>
              <CommandButton variant="ghost" size="sm" onClick={() => setOverridesDialogOpen(false)}>
                Close
              </CommandButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CommandShell>
  );
}