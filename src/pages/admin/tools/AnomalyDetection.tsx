import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Scan,
  Shield,
  CheckCircle,
  Clock,
  Activity,
  Zap,
  Settings,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandEmptyState,
  CommandIconButton,
  CommandPanel,
  CommandSection,
  CommandTabs,
  CommandToolbar,
} from '@/components/management/CommandSurface';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useAnomalies,
  useAnomalyRules,
  useUpdateAnomalyRule,
  useResolveAnomaly,
  useScanAnomalies,
  type AnomalyEvent,
  type AnomalyRule,
} from '@/hooks/useAdminQueries';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const METRIC_LABELS: Record<string, string> = {
  failed_logins: 'Failed Logins',
  new_accounts: 'New Accounts',
  reports: 'Reports Filed',
  disputes: 'Disputes Raised',
  registrations: 'Registrations',
};

const metricLabel = (metric: string) => METRIC_LABELS[metric] ?? metric;

// ── Severity helpers ──────────────────────────────────────────────────────────

interface SeverityStyle {
  badge: string;
  icon: string;
  bar: string;
  border: string;
}

const SEVERITY_STYLES: Record<string, SeverityStyle> = {
  critical: {
    badge: 'text-red-300 border-red-500/30',
    icon: 'text-red-300',
    bar: 'bg-red-500',
    border: 'border-red-500/30',
  },
  high: {
    badge: 'text-amber-300 border-amber-500/30',
    icon: 'text-amber-300',
    bar: 'bg-amber-500',
    border: 'border-amber-500/30',
  },
  medium: {
    badge: 'text-amber-300 border-amber-500/30',
    icon: 'text-amber-300',
    bar: 'bg-amber-500',
    border: 'border-amber-500/30',
  },
  low: {
    badge: 'text-zinc-400 border-zinc-500/30',
    icon: 'text-zinc-400',
    bar: 'bg-zinc-500',
    border: 'border-zinc-500/30',
  },
};

const severityStyle = (severity: string): SeverityStyle =>
  SEVERITY_STYLES[severity.toLowerCase()] ?? SEVERITY_STYLES.low;

// ── Time helpers ──────────────────────────────────────────────────────────────

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
};

// ── Skeletons ─────────────────────────────────────────────────────────────────

const EventCardSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-32 rounded-none bg-white/5" />
    ))}
  </div>
);

const RuleCardSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-24 rounded-none bg-white/5" />
    ))}
  </div>
);

// ── Stats Strip ───────────────────────────────────────────────────────────────

interface StatsStripProps {
  total: number;
  unresolved: number;
  critical: number;
  high: number;
}

const StatsStrip = ({ total, unresolved, critical, high }: StatsStripProps) => {
  const stats = [
    { label: 'Total Events', value: total, icon: Activity, color: 'text-zinc-400' },
    { label: 'Unresolved', value: unresolved, icon: AlertTriangle, color: 'text-amber-300' },
    { label: 'Critical', value: critical, icon: Zap, color: 'text-red-300' },
    { label: 'High', value: high, icon: TrendingUp, color: 'text-amber-300' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <CommandPanel key={label} className="flex items-center gap-3">
          <Icon className={`h-4 w-4 shrink-0 ${color}`} />
          <div>
            <p className="text-xl font-black text-white">{value}</p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              {label}
            </p>
          </div>
        </CommandPanel>
      ))}
    </div>
  );
};

// ── Resolve Dialog ────────────────────────────────────────────────────────────

interface ResolveDialogProps {
  event: AnomalyEvent | null;
  onClose: () => void;
}

const ResolveDialog = ({ event, onClose }: ResolveDialogProps) => {
  const [notes, setNotes] = useState('');
  const resolve = useResolveAnomaly();

  const handleSubmit = () => {
    if (!event) return;
    resolve.mutate(
      { id: event.id, notes: notes.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-zinc-300" />
            Resolve Anomaly
          </DialogTitle>
        </DialogHeader>

        {event && (
          <div className="space-y-4">
            <CommandPanel className="space-y-1 p-3">
              <p className="text-sm font-medium text-white">{event.ruleName}</p>
              <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                {metricLabel(event.metric)} · {event.countObserved}/{event.thresholdCount} in {event.windowMinutes}m
              </p>
            </CommandPanel>

            <div>
              <label
                className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500"
                htmlFor="resolve-notes"
              >
                Resolution notes <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <Textarea
                id="resolve-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe why this is a false positive or what action was taken…"
                rows={3}
                className="rounded-none resize-none border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-600"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <CommandButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </CommandButton>
          <CommandButton size="sm" onClick={handleSubmit} disabled={resolve.isPending}>
            {resolve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Mark Resolved
          </CommandButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Anomaly Event Card ────────────────────────────────────────────────────────

interface EventCardProps {
  event: AnomalyEvent;
  onResolve: (event: AnomalyEvent) => void;
}

const EventCard = ({ event, onResolve }: EventCardProps) => {
  const style = severityStyle(event.severity);
  const pct = Math.min(100, Math.round((event.countObserved / event.thresholdCount) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border bg-[#0a0a0c]/92 p-4 space-y-4 transition-colors duration-200 hover:border-white/25 sm:p-5 ${event.isResolved ? 'border-white/10' : style.border}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{event.ruleName}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              {metricLabel(event.metric)}
            </span>
            {!event.isResolved && (
              <>
                <AlertTriangle className={`inline h-3 w-3 ${style.icon}`} />
                <span className={`border px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                  {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                </span>
              </>
            )}
            {event.isResolved && (
              <span className="border border-zinc-700 px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Resolved
              </span>
            )}
          </div>
        </div>

        {!event.isResolved && (
          <CommandButton
            variant="ghost"
            size="sm"
            onClick={() => onResolve(event)}
            className="shrink-0"
          >
            <CheckCircle className="h-4 w-4" />
            Resolve
          </CommandButton>
        )}
      </div>

      {/* Count vs threshold */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            <span className="font-bold text-white">{event.countObserved}</span>
            {' / '}
            <span className="text-zinc-500">{event.thresholdCount} threshold</span>
          </span>
          <span className="flex items-center gap-1 text-zinc-500">
            <Clock className="h-3 w-3" />
            {event.windowMinutes}m window
          </span>
        </div>
        <div className="h-1.5 overflow-hidden bg-white/5">
          <div
            className={`h-full transition-all duration-500 ${style.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Detected {timeAgo(event.detectedAt)}
        </span>
        {event.isResolved && event.resolvedAt && (
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Resolved {timeAgo(event.resolvedAt)}
            {event.resolvedByUsername && ` by ${event.resolvedByUsername}`}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// ── Edit Rule Dialog ──────────────────────────────────────────────────────────

interface EditRuleDialogProps {
  rule: AnomalyRule | null;
  onClose: () => void;
}

const EditRuleDialog = ({ rule, onClose }: EditRuleDialogProps) => {
  const [threshold, setThreshold] = useState('');
  const [window, setWindow] = useState('');
  const [cooldown, setCooldown] = useState('');
  const [severity, setSeverity] = useState('');
  const updateRule = useUpdateAnomalyRule();

  // Sync form fields whenever the rule prop changes (e.g. opening a different rule)
  useEffect(() => {
    if (rule) {
      setThreshold(String(rule.thresholdCount));
      setWindow(String(rule.windowMinutes));
      setCooldown(String(rule.cooldownMinutes));
      setSeverity(rule.severity);
    }
  }, [rule]);

  // Reset on open
  const handleOpenChange = (open: boolean) => {
    if (!open) { onClose(); return; }
    if (rule) {
      setThreshold(String(rule.thresholdCount));
      setWindow(String(rule.windowMinutes));
      setCooldown(String(rule.cooldownMinutes));
      setSeverity(rule.severity);
    }
  };

  const handleSave = () => {
    if (!rule) return;
    updateRule.mutate(
      {
        id: rule.id,
        thresholdCount: threshold ? Number(threshold) : undefined,
        windowMinutes: window ? Number(window) : undefined,
        cooldownMinutes: cooldown ? Number(cooldown) : undefined,
        severity: severity || undefined,
      },
      { onSuccess: onClose },
    );
  };

  const fieldLabel = 'mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500';

  return (
    <Dialog open={!!rule} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-zinc-300" />
            Edit Detection Rule
          </DialogTitle>
        </DialogHeader>

        {rule && (
          <div className="space-y-4">
            <CommandPanel className="p-3">
              <p className="text-sm font-semibold text-white">{rule.name}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {metricLabel(rule.metric)}
              </p>
            </CommandPanel>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>Threshold count</label>
                <Input
                  type="number"
                  min={1}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="h-9 rounded-none border-white/10 bg-white/[0.03] text-white"
                />
              </div>
              <div>
                <label className={fieldLabel}>Window (minutes)</label>
                <Input
                  type="number"
                  min={1}
                  value={window}
                  onChange={(e) => setWindow(e.target.value)}
                  className="h-9 rounded-none border-white/10 bg-white/[0.03] text-white"
                />
              </div>
              <div>
                <label className={fieldLabel}>Cooldown (minutes)</label>
                <Input
                  type="number"
                  min={0}
                  value={cooldown}
                  onChange={(e) => setCooldown(e.target.value)}
                  className="h-9 rounded-none border-white/10 bg-white/[0.03] text-white"
                />
              </div>
              <div>
                <label className={fieldLabel}>Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="h-9 w-full rounded-none border border-white/10 bg-white/[0.03] px-3 font-mono text-xs uppercase tracking-wider text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                >
                  <option value="low" className="bg-[#121214]">Low</option>
                  <option value="medium" className="bg-[#121214]">Medium</option>
                  <option value="high" className="bg-[#121214]">High</option>
                  <option value="critical" className="bg-[#121214]">Critical</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <CommandButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </CommandButton>
          <CommandButton size="sm" onClick={handleSave} disabled={updateRule.isPending}>
            {updateRule.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </CommandButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Rule Card ─────────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule: AnomalyRule;
  onEdit: (rule: AnomalyRule) => void;
}

const RuleCard = ({ rule, onEdit }: RuleCardProps) => {
  const style = severityStyle(rule.severity);
  const updateRule = useUpdateAnomalyRule();

  const handleToggle = (active: boolean) => {
    updateRule.mutate({ id: rule.id, isActive: active });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border border-white/10 bg-[#0a0a0c]/92 p-4 transition-colors duration-200 hover:border-white/25 sm:p-5 ${!rule.isActive ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Shield className={`h-4 w-4 shrink-0 ${style.icon}`} />
            <p className="text-sm font-semibold text-white">{rule.name}</p>
            <span className={`border px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
              {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
            </span>
            <span className="border border-zinc-700 px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {metricLabel(rule.metric)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {rule.thresholdCount} events / {rule.windowMinutes}m window
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {rule.cooldownMinutes}m cooldown
            </span>
            {rule.lastTriggeredAt && (
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Last triggered {timeAgo(rule.lastTriggeredAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={rule.isActive}
            onCheckedChange={handleToggle}
            disabled={updateRule.isPending}
            aria-label={`Toggle ${rule.name}`}
            className="data-[state=checked]:bg-rose-500"
          />
          <CommandIconButton
            label={`Edit ${rule.name}`}
            variant="ghost"
            onClick={() => onEdit(rule)}
          >
            <Settings className="h-4 w-4" />
          </CommandIconButton>
        </div>
      </div>
    </motion.div>
  );
};

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

const Pagination = ({ page, total, pageSize, onChange }: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <CommandIconButton
        label="Previous page"
        variant="ghost"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </CommandIconButton>
      <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
        Page <span className="font-bold text-white">{page}</span> of {totalPages}
      </span>
      <CommandIconButton
        label="Next page"
        variant="ghost"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </CommandIconButton>
    </div>
  );
};

// ── Tab: Active Anomalies ─────────────────────────────────────────────────────

const AnomaliesTab = () => {
  const [page, setPage] = useState(1);
  const [showResolved, setShowResolved] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<AnomalyEvent | null>(null);
  const scan = useScanAnomalies();

  const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
  if (showResolved) params.isResolved = 'true';

  const { data, isLoading, error, refetch } = useAnomalies(params);

  const events = data?.items ?? [];
  const total = data?.total ?? 0;

  // Use server-provided aggregate totals — these span all pages, not just the current one.
  const unresolvedCount = data?.unresolvedTotal ?? 0;
  const criticalCount   = data?.criticalTotal   ?? 0;
  const highCount       = data?.highTotal        ?? 0;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <CommandToolbar>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-resolved"
            checked={showResolved}
            onChange={(e) => { setShowResolved(e.target.checked); setPage(1); }}
            className="h-4 w-4 cursor-pointer border border-white/20 bg-white/[0.03] accent-rose-500"
          />
          <label htmlFor="show-resolved" className="cursor-pointer select-none font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            Show resolved
          </label>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {total} anomaly events loaded
          </span>
        </div>

        <CommandButton
          size="sm"
          slide
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          aria-label="Run manual anomaly scan"
          className="self-start sm:self-auto"
        >
          {scan.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <Scan className="h-4 w-4" />
              Scan Now
            </>
          )}
        </CommandButton>
      </CommandToolbar>

      {/* Stats strip */}
      {!isLoading && !error && (
        <StatsStrip
          total={total}
          unresolved={unresolvedCount}
          critical={criticalCount}
          high={highCount}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <EventCardSkeleton />
      ) : error ? (
        <CommandEmptyState
          title="Failed to load anomaly events."
          description="The scan data could not be retrieved. Retry when ready."
          icon={<AlertTriangle className="h-5 w-5" />}
          action={
            <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </CommandButton>
          }
        />
      ) : events.length === 0 ? (
        <CommandEmptyState
          title="No anomalies detected"
          description="All systems are operating within normal thresholds."
          icon={<Shield className="h-5 w-5" />}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onResolve={setResolveTarget} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* Resolve dialog */}
      <ResolveDialog event={resolveTarget} onClose={() => setResolveTarget(null)} />
    </div>
  );
};

// ── Tab: Detection Rules ──────────────────────────────────────────────────────

const RulesTab = () => {
  const [editTarget, setEditTarget] = useState<AnomalyRule | null>(null);
  const { data: rules, isLoading, error, refetch } = useAnomalyRules();

  return (
    <div className="space-y-4">
      {isLoading ? (
        <RuleCardSkeleton />
      ) : error ? (
        <CommandEmptyState
          title="Failed to load detection rules."
          description="The rules could not be retrieved. Retry when ready."
          icon={<AlertTriangle className="h-5 w-5" />}
          action={
            <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </CommandButton>
          }
        />
      ) : !rules || rules.length === 0 ? (
        <CommandEmptyState
          title="No detection rules found"
          description="System detection rules will appear here once configured."
          icon={<Settings className="h-5 w-5" />}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} onEdit={setEditTarget} />
            ))}
          </div>
        </AnimatePresence>
      )}

      <EditRuleDialog rule={editTarget} onClose={() => setEditTarget(null)} />
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const AnomalyDetection = () => {
  const [activeTab, setActiveTab] = useState('anomalies');

  return (
    <AdminPage
      eyebrow="System"
      title="Anomaly Detection"
      description="Real-time platform threat monitoring"
    >
      <CommandTabs
        tabs={[
          { value: 'anomalies', label: 'Active Anomalies' },
          { value: 'rules', label: 'Detection Rules' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <CommandSection className="space-y-5">
        {activeTab === 'anomalies' ? <AnomaliesTab /> : <RulesTab />}
      </CommandSection>
    </AdminPage>
  );
};

export default AnomalyDetection;
