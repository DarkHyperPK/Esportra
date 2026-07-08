import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { toast } from 'sonner';

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

  const { data: flags, isLoading } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke<FeatureFlag[]>('admin-api', {
        body: { path: '/api/admin/feature-flags', method: 'GET' },
      });
      return data ?? [];
    },
  });

  const { data: rules, refetch: refetchRules } = useQuery({
    queryKey: ['admin', 'feature-flag-rules', selectedFlag?.id],
    queryFn: async () => {
      if (!selectedFlag) return [];
      const { data } = await supabase.functions.invoke<FlagRule[]>('admin-api', {
        body: { path: `/api/admin/feature-flags/${selectedFlag.id}/rules`, method: 'GET' },
      });
      return data ?? [];
    },
    enabled: !!selectedFlag && rulesDialogOpen,
  });

  const { data: overrides } = useQuery({
    queryKey: ['admin', 'feature-flag-overrides', selectedFlag?.id],
    queryFn: async () => {
      if (!selectedFlag) return [];
      const { data } = await supabase.functions.invoke<FlagOverride[]>('admin-api', {
        body: { path: `/api/admin/feature-flags/${selectedFlag.id}/overrides`, method: 'GET' },
      });
      return data ?? [];
    },
    enabled: !!selectedFlag && overridesDialogOpen,
  });

  const createFlag = useMutation({
    mutationFn: async () => {
      const defaultValue = parseDefaultValue(formType, formDefaultValue);
      await supabase.functions.invoke('admin-api', {
        body: {
          path: '/api/admin/feature-flags',
          method: 'POST',
          data: {
            key: formKey,
            name: formName,
            description: formDescription || null,
            flag_type: formType,
            default_value: defaultValue,
          },
        },
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
      await supabase.functions.invoke('admin-api', {
        body: {
          path: `/api/admin/feature-flags/${editingFlag?.id}`,
          method: 'PUT',
          data: updates,
        },
      });
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
      await supabase.functions.invoke('admin-api', {
        body: {
          path: `/api/admin/feature-flags/${id}`,
          method: 'PUT',
          data: { is_enabled: isEnabled },
        },
      });
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
      await supabase.functions.invoke('admin-api', {
        body: { path: `/api/admin/feature-flags/${id}`, method: 'DELETE' },
      });
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
      await supabase.functions.invoke('admin-api', {
        body: {
          path: `/api/admin/feature-flags/${selectedFlag?.id}/rules`,
          method: 'POST',
          data: {
            priority: parseInt(rulePriority, 10) || 0,
            conditions,
            value,
            percentage: rulePercentage ? parseInt(rulePercentage, 10) : null,
          },
        },
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
      await supabase.functions.invoke('admin-api', {
        body: {
          path: `/api/admin/feature-flags/${selectedFlag?.id}/rules/${editingRule?.id}`,
          method: 'PUT',
          data: {
            priority: parseInt(rulePriority, 10) || 0,
            conditions,
            value,
            percentage: rulePercentage ? parseInt(rulePercentage, 10) : null,
          },
        },
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
      await supabase.functions.invoke('admin-api', {
        body: {
          path: `/api/admin/feature-flags/${selectedFlag?.id}/rules/${ruleId}`,
          method: 'DELETE',
        },
      });
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
    mutationFn: async (overrideId: string) => {
      await supabase.functions.invoke('admin-api', {
        body: {
          path: `/api/admin/feature-flags/${selectedFlag?.id}/overrides/${overrideId}`,
          method: 'DELETE',
        },
      });
    },
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
          <p className="text-zinc-400 mt-1">
            Control feature rollouts with flags, rules, and user overrides
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Flag
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Search flags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-zinc-900/50 border-zinc-800"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFlags?.map((flag) => (
            <div
              key={flag.id}
              className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono text-rose-400">{flag.key}</code>
                    <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>
                      {flag.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {flag.flag_type}
                    </Badge>
                  </div>
                  <h3 className="text-white font-medium mt-1">{flag.name}</h3>
                  {flag.description && (
                    <p className="text-sm text-zinc-400 mt-1">{flag.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                    <button
                      onClick={() => {
                        setSelectedFlag(flag);
                        setRulesDialogOpen(true);
                      }}
                      className="flex items-center gap-1 hover:text-white transition"
                    >
                      <Settings className="w-3 h-3" />
                      {flag.rule_count} rules
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFlag(flag);
                        setOverridesDialogOpen(true);
                      }}
                      className="flex items-center gap-1 hover:text-white transition"
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
                <div className="flex items-center gap-3">
                  <Switch
                    checked={flag.is_enabled}
                    onCheckedChange={(checked) =>
                      toggleFlag.mutate({ id: flag.id, isEnabled: checked })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(flag.key);
                      toast.success('Key copied');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(flag)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      if (confirm('Delete this feature flag?')) {
                        deleteFlag.mutate(flag.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {filteredFlags?.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              {search ? 'No flags match your search' : 'No feature flags configured'}
            </div>
          )}
        </div>
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
        <DialogContent className="bg-zinc-900 border-zinc-800">
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
                className="bg-zinc-800 border-zinc-700 font-mono"
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
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Description</label>
              <Textarea
                placeholder="What this flag controls..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Type</label>
              <Select value={formType} onValueChange={setFormType} disabled={!!editingFlag}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
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
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
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
                    className="bg-zinc-800 border-zinc-700"
                  />
                  <span className="text-zinc-400">%</span>
                </div>
              ) : formType === 'json' ? (
                <Textarea
                  value={formDefaultValue}
                  onChange={(e) => setFormDefaultValue(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                  rows={4}
                  placeholder='{"key": "value"}'
                />
              ) : (
                <Input
                  value={formDefaultValue}
                  onChange={(e) => setFormDefaultValue(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingFlag(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
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
              {createFlag.isPending || updateFlag.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingFlag ? 'Save Changes' : 'Create Flag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rules Dialog */}
      <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Rules for <code className="text-rose-400">{selectedFlag?.key}</code>
              </DialogTitle>
              <Button size="sm" onClick={() => openRuleEditor()} className="gap-1">
                <Plus className="w-3 h-3" />
                New Rule
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-3 mt-4 max-h-96 overflow-y-auto">
            {rules?.length === 0 && (
              <p className="text-center text-zinc-500 py-8">
                No rules configured. Default value will be used for all users.
              </p>
            )}
            {rules?.map((rule) => (
              <div
                key={rule.id}
                className="p-3 bg-zinc-800 rounded-lg border border-zinc-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Priority {rule.priority}
                    </Badge>
                    {rule.percentage !== null && (
                      <Badge variant="secondary" className="text-xs">
                        {rule.percentage}% rollout
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRuleEditor(rule)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => {
                        if (confirm('Delete this rule?')) {
                          deleteRule.mutate(rule.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-zinc-500">When: </span>
                  <span className="text-zinc-300">{formatConditions(rule.conditions)}</span>
                </div>
                <div className="text-sm mt-1">
                  <span className="text-zinc-500">Then: </span>
                  <span className="text-emerald-300">{JSON.stringify(rule.value)}</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRulesDialogOpen(false)}>
              Close
            </Button>
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
        <DialogContent className="bg-zinc-900 border-zinc-800">
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
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-zinc-500 mt-1">Higher priority rules are evaluated first</p>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Condition Type</label>
              <Select value={ruleConditionType} onValueChange={(v) => {
                setRuleConditionType(v);
                setRuleConditionValue('');
              }}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
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
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={ruleConditionValue} onValueChange={setRuleConditionValue}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
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
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
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
                    className="bg-zinc-800 border-zinc-700"
                  />
                  <span className="text-zinc-400">%</span>
                </div>
              ) : selectedFlag?.flag_type === 'json' ? (
                <Textarea
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                  rows={4}
                  placeholder='{"key": "value"}'
                />
              ) : (
                <Input
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
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
                  className="bg-zinc-800 border-zinc-700"
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
            <Button
              variant="outline"
              onClick={() => {
                setRuleEditorOpen(false);
                setEditingRule(null);
                resetRuleForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingRule) {
                  updateRule.mutate();
                } else {
                  createRule.mutate();
                }
              }}
              disabled={!ruleConditionValue || createRule.isPending || updateRule.isPending}
            >
              {createRule.isPending || updateRule.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingRule ? 'Save Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overrides Dialog */}
      <Dialog open={overridesDialogOpen} onOpenChange={setOverridesDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
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
                className="p-3 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-between"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {override.username ?? override.user_id}
                  </p>
                  {override.reason && (
                    <p className="text-xs text-zinc-500 mt-0.5">{override.reason}</p>
                  )}
                  <pre className="text-xs mt-1 text-emerald-300">
                    {JSON.stringify(override.value)}
                  </pre>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => deleteOverride.mutate(override.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverridesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
