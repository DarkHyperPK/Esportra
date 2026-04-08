import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
  glow: string;
  border: string;
}

const SEVERITY_STYLES: Record<string, SeverityStyle> = {
  critical: {
    badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    icon: 'text-rose-400',
    bar: 'bg-rose-500',
    glow: 'shadow-rose-500/20',
    border: 'border-rose-500/30',
  },
  high: {
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: 'text-orange-400',
    bar: 'bg-orange-500',
    glow: 'shadow-orange-500/20',
    border: 'border-orange-500/30',
  },
  medium: {
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: 'text-amber-400',
    bar: 'bg-amber-500',
    glow: 'shadow-amber-500/20',
    border: 'border-amber-500/30',
  },
  low: {
    badge: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    icon: 'text-zinc-400',
    bar: 'bg-zinc-500',
    glow: 'shadow-zinc-500/20',
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
      <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />
    ))}
  </div>
);

const RuleCardSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />
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
    { label: 'Total Events', value: total, icon: Activity, color: 'text-zinc-300', bg: 'bg-zinc-800/60' },
    { label: 'Unresolved', value: unresolved, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Critical', value: critical, icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'High', value: high, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className={`${bg} rounded-2xl p-4 border border-white/5 flex items-center gap-3`}
        >
          <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        </div>
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
      <DialogContent className="bg-[#0a0a0c] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Resolve Anomaly
          </DialogTitle>
        </DialogHeader>

        {event && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <p className="text-sm font-medium text-white">{event.ruleName}</p>
              <p className="text-xs text-zinc-500">
                {metricLabel(event.metric)} · {event.countObserved}/{event.thresholdCount} in {event.windowMinutes}m
              </p>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5" htmlFor="resolve-notes">
                Resolution notes <span className="text-zinc-600">(optional)</span>
              </label>
              <Textarea
                id="resolve-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe why this is a false positive or what action was taken…"
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/10 text-zinc-300 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={resolve.isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {resolve.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Mark Resolved
          </Button>
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
      className={`bg-[#0a0a0c] border ${event.isResolved ? 'border-white/5' : style.border} rounded-2xl p-4 sm:p-5 space-y-4 hover:border-white/10 transition-all duration-200`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0`}>
            <AlertTriangle className={`w-4 h-4 ${style.icon}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{event.ruleName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-zinc-500">{metricLabel(event.metric)}</span>
              {event.isResolved ? (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-400 border-emerald-500/25 border">
                  Resolved
                </Badge>
              ) : (
                <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${style.badge}`}>
                  {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {!event.isResolved && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onResolve(event)}
            className="shrink-0 border-white/10 text-zinc-300 hover:text-white hover:border-emerald-500/30 text-xs h-8 px-3"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Resolve
          </Button>
        )}
      </div>

      {/* Count vs threshold */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-400">
            <span className="font-bold text-white">{event.countObserved}</span>
            {' / '}
            <span className="text-zinc-500">{event.thresholdCount} threshold</span>
          </span>
          <span className="text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {event.windowMinutes}m window
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Detected {timeAgo(event.detectedAt)}
        </span>
        {event.isResolved && event.resolvedAt && (
          <span className="flex items-center gap-1 text-emerald-500/70">
            <CheckCircle className="w-3 h-3" />
            Resolved {timeAgo(event.resolvedAt)}
            {event.resolvedBy && ` by ${event.resolvedBy}`}
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

  // Sync form when rule changes
  useState(() => {
    if (rule) {
      setThreshold(String(rule.thresholdCount));
      setWindow(String(rule.windowMinutes));
      setCooldown(String(rule.cooldownMinutes));
      setSeverity(rule.severity);
    }
  });

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

  return (
    <Dialog open={!!rule} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#0a0a0c] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-rose-400" />
            Edit Detection Rule
          </DialogTitle>
        </DialogHeader>

        {rule && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-sm font-semibold text-white">{rule.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{metricLabel(rule.metric)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Threshold count</label>
                <Input
                  type="number"
                  min={1}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-9"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Window (minutes)</label>
                <Input
                  type="number"
                  min={1}
                  value={window}
                  onChange={(e) => setWindow(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-9"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Cooldown (minutes)</label>
                <Input
                  type="number"
                  min={0}
                  value={cooldown}
                  onChange={(e) => setCooldown(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-9"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
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
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/10 text-zinc-300 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateRule.isPending}
            className="bg-rose-600 hover:bg-rose-500 text-white"
          >
            {updateRule.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
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
      className={`bg-[#0a0a0c] border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-white/10 transition-all duration-200 ${!rule.isActive ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className={`w-4 h-4 ${style.icon}`} />
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">{rule.name}</p>
              <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${style.badge}`}>
                {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
              </Badge>
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-zinc-800 text-zinc-400 border border-zinc-700">
                {metricLabel(rule.metric)}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {rule.thresholdCount} events / {rule.windowMinutes}m window
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {rule.cooldownMinutes}m cooldown
              </span>
              {rule.lastTriggeredAt && (
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Last triggered {timeAgo(rule.lastTriggeredAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={rule.isActive}
            onCheckedChange={handleToggle}
            disabled={updateRule.isPending}
            aria-label={`Toggle ${rule.name}`}
            className="data-[state=checked]:bg-rose-500"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(rule)}
            className="border-white/10 text-zinc-400 hover:text-white h-8 w-8 p-0"
            aria-label={`Edit ${rule.name}`}
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="border-white/10 text-zinc-400 hover:text-white h-8 w-8 p-0"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm text-zinc-400">
        Page <span className="text-white font-medium">{page}</span> of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="border-white/10 text-zinc-400 hover:text-white h-8 w-8 p-0"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
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

  // Derive stats from current page — backend should ideally provide these,
  // but we compute from the unfiltered total (rough) or current page items
  const unresolvedCount = events.filter((e) => !e.isResolved).length;
  const criticalCount = events.filter((e) => e.severity === 'critical' && !e.isResolved).length;
  const highCount = events.filter((e) => e.severity === 'high' && !e.isResolved).length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-resolved"
            checked={showResolved}
            onChange={(e) => { setShowResolved(e.target.checked); setPage(1); }}
            className="w-4 h-4 rounded border-white/20 bg-white/5 accent-rose-500 cursor-pointer"
          />
          <label htmlFor="show-resolved" className="text-sm text-zinc-400 cursor-pointer select-none">
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

        <Button
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          className="bg-rose-600 hover:bg-rose-500 text-white h-9 text-sm self-start sm:self-auto"
          aria-label="Run manual anomaly scan"
        >
          {scan.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <Scan className="w-4 h-4 mr-2" />
              Scan Now
            </>
          )}
        </Button>
      </div>

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
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-400 opacity-60" />
          <p className="text-zinc-400 text-sm">Failed to load anomaly events.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-white/10 text-zinc-400 hover:text-white mt-1"
          >
            Retry
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Shield className="w-10 h-10 text-emerald-400 opacity-60" />
          <p className="text-white font-medium">No anomalies detected</p>
          <p className="text-zinc-500 text-sm">All systems are operating within normal thresholds.</p>
        </div>
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
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-400 opacity-60" />
          <p className="text-zinc-400 text-sm">Failed to load detection rules.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-white/10 text-zinc-400 hover:text-white mt-1"
          >
            Retry
          </Button>
        </div>
      ) : !rules || rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Settings className="w-10 h-10 text-zinc-600 opacity-60" />
          <p className="text-white font-medium">No detection rules found</p>
          <p className="text-zinc-500 text-sm">System detection rules will appear here once configured.</p>
        </div>
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

const AnomalyDetection = () => (
  <div className="min-h-screen p-4 lg:p-8 max-w-[1400px] mx-auto">
    {/* Header */}
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8"
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
            Anomaly Detection
          </h1>
          <p className="text-zinc-500 text-sm">Real-time platform threat monitoring</p>
        </div>
      </div>
    </motion.header>

    {/* Tabs */}
    <Tabs defaultValue="anomalies" className="space-y-6">
      <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto flex-wrap">
        <TabsTrigger
          value="anomalies"
          className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 text-zinc-400 rounded-lg text-sm px-4 py-2"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Active Anomalies
        </TabsTrigger>
        <TabsTrigger
          value="rules"
          className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 text-zinc-400 rounded-lg text-sm px-4 py-2"
        >
          <Shield className="w-4 h-4 mr-2" />
          Detection Rules
        </TabsTrigger>
      </TabsList>

      <TabsContent value="anomalies" className="mt-0">
        <AnomaliesTab />
      </TabsContent>

      <TabsContent value="rules" className="mt-0">
        <RulesTab />
      </TabsContent>
    </Tabs>
  </div>
);

export default AnomalyDetection;
