import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  Play,
  Clock,
  Trash2,
  Pencil,
  CheckCircle,
  XCircle,
  Download,
  Users,
  Trophy,
  DollarSign,
  Activity,
  Shield,
  Mail,
  Plus,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useReportSchedules,
  useReportHistory,
  useCreateReportSchedule,
  useUpdateReportSchedule,
  useDeleteReportSchedule,
  useRunReportNow,
} from "@/hooks/useAdminQueries";
import type { ReportSchedule, ReportRunLog } from "@/hooks/useAdminQueries";
import { Link } from "react-router-dom";

// ── Types ────────────────────────────────────────────────────────────────────

interface ScheduleFormData {
  name: string;
  reportType: string;
  frequency: string;
  dayOfWeek: string;
  dayOfMonth: string;
  timeOfDay: string;
  recipients: string;
  format: string;
}

const EMPTY_FORM: ScheduleFormData = {
  name: "",
  reportType: "",
  frequency: "",
  dayOfWeek: "",
  dayOfMonth: "",
  timeOfDay: "08:00",
  recipients: "",
  format: "csv",
};

// ── Constants ─────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { value: "users",       label: "Users",       icon: Users,       color: "blue"    },
  { value: "tournaments", label: "Tournaments", icon: Trophy,      color: "purple"  },
  { value: "revenue",     label: "Revenue",     icon: DollarSign,  color: "emerald" },
  { value: "activity",    label: "Activity",    icon: Activity,    color: "amber"   },
  { value: "moderation",  label: "Moderation",  icon: Shield,      color: "rose"    },
] as const;

const FREQUENCIES = [
  { value: "daily",   label: "Daily"   },
  { value: "weekly",  label: "Weekly"  },
  { value: "monthly", label: "Monthly" },
];

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday"    },
  { value: "1", label: "Monday"    },
  { value: "2", label: "Tuesday"   },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday"  },
  { value: "5", label: "Friday"    },
  { value: "6", label: "Saturday"  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = new Date(dateStr).getTime() - Date.now();
  const abs = Math.abs(diff);
  const past = diff < 0;
  if (abs < 60_000) return past ? "just now" : "in seconds";
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000);
    return past ? `${m}m ago` : `in ${m}m`;
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000);
    return past ? `${h}h ago` : `in ${h}h`;
  }
  const d = Math.round(abs / 86_400_000);
  return past ? `${d}d ago` : `in ${d}d`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getReportTypeMeta(type: string) {
  return REPORT_TYPES.find((r) => r.value === type) ?? REPORT_TYPES[0];
}

function typeColorClasses(color: string): { badge: string; icon: string; bg: string } {
  const map: Record<string, { badge: string; icon: string; bg: string }> = {
    blue:    { badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",    icon: "text-blue-400",    bg: "bg-blue-500/10"    },
    purple:  { badge: "bg-purple-500/15 text-purple-400 border-purple-500/20", icon: "text-purple-400", bg: "bg-purple-500/10"  },
    emerald: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: "text-emerald-400", bg: "bg-emerald-500/10" },
    amber:   { badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",  icon: "text-amber-400",   bg: "bg-amber-500/10"   },
    rose:    { badge: "bg-rose-500/15 text-rose-400 border-rose-500/20",     icon: "text-rose-400",    bg: "bg-rose-500/10"    },
  };
  return map[color] ?? map.blue;
}

function runStatusBadge(status: string | null) {
  if (!status) return null;
  switch (status) {
    case "success":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="h-3 w-3" /> Success
        </span>
      );
    case "failed":
    case "error":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
          <XCircle className="h-3 w-3" /> Failed
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
          <Loader2 className="h-3 w-3 animate-spin" /> Running
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-white/5 text-zinc-400 border border-white/10">
          {status}
        </span>
      );
  }
}

function frequencyLabel(schedule: ReportSchedule): string {
  switch (schedule.frequency) {
    case "daily":
      return `Daily at ${schedule.timeOfDay.slice(0, 5)}`;
    case "weekly": {
      const day = DAYS_OF_WEEK.find((d) => d.value === String(schedule.dayOfWeek))?.label ?? "?";
      return `Every ${day} at ${schedule.timeOfDay.slice(0, 5)}`;
    }
    case "monthly":
      return `Monthly on day ${schedule.dayOfMonth ?? "?"} at ${schedule.timeOfDay.slice(0, 5)}`;
    default:
      return schedule.frequency;
  }
}

function validateForm(data: ScheduleFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name.trim()) errors.name = "Name is required.";
  if (!data.reportType) errors.reportType = "Report type is required.";
  if (!data.frequency) errors.frequency = "Frequency is required.";
  if (data.frequency === "weekly" && !data.dayOfWeek) errors.dayOfWeek = "Day of week is required.";
  if (data.frequency === "monthly") {
    const n = Number(data.dayOfMonth);
    if (!data.dayOfMonth || isNaN(n) || n < 1 || n > 31) errors.dayOfMonth = "Enter a day between 1 and 31.";
  }
  if (!data.timeOfDay) errors.timeOfDay = "Time is required.";
  if (!data.format) errors.format = "Format is required.";

  const emails = data.recipients.split(",").map((e) => e.trim()).filter(Boolean);
  if (emails.length === 0) {
    errors.recipients = "At least one recipient is required.";
  } else {
    const bad = emails.filter((e) => !EMAIL_REGEX.test(e));
    if (bad.length > 0) errors.recipients = `Invalid email(s): ${bad.join(", ")}`;
  }
  return errors;
}

// ── Skeleton Components ───────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      {/* Cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
          <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Schedule Card ─────────────────────────────────────────────────────────────

interface ScheduleCardProps {
  schedule: ReportSchedule;
  onEdit: (s: ReportSchedule) => void;
  onDelete: (s: ReportSchedule) => void;
  onHistory: (s: ReportSchedule) => void;
  onRunNow: (id: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
  isRunning: boolean;
  isTogglingId: string | null;
}

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onHistory,
  onRunNow,
  onToggleActive,
  isRunning,
  isTogglingId,
}: ScheduleCardProps) {
  const meta = getReportTypeMeta(schedule.reportType);
  const colors = typeColorClasses(meta.color);
  const Icon = meta.icon;
  const isToggling = isTogglingId === schedule.id;

  const visibleRecipients = schedule.recipients.slice(0, 2);
  const extraCount = schedule.recipients.length - 2;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 hover:border-white/10 transition-colors"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`flex-shrink-0 h-9 w-9 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${colors.icon}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white text-sm truncate font-[Inter]">
                {schedule.name}
              </h3>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${colors.badge}`}>
                {meta.label}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-[Inter]">
              {frequencyLabel(schedule)}
            </p>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <Switch
              checked={schedule.isActive}
              onCheckedChange={() => onToggleActive(schedule.id, schedule.isActive)}
              aria-label={schedule.isActive ? "Deactivate schedule" : "Activate schedule"}
              className="data-[state=checked]:bg-rose-500"
            />
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-zinc-400 font-[Inter]">
        {/* Next run */}
        <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/5 px-2.5 py-1">
          <CalendarClock className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
          <span>
            {schedule.nextRunAt ? (
              <>
                <span className="text-white">{formatRelative(schedule.nextRunAt)}</span>
                <span className="text-zinc-500 ml-1">({formatDateTime(schedule.nextRunAt)})</span>
              </>
            ) : (
              <span className="text-zinc-500">No next run</span>
            )}
          </span>
        </div>

        {/* Last run */}
        {schedule.lastRunStatus && (
          <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/5 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
            <span className="text-zinc-400">{formatRelative(schedule.lastRunAt)}</span>
            <span className="ml-1">{runStatusBadge(schedule.lastRunStatus)}</span>
            {schedule.lastRunRowCount !== null && (
              <span className="text-zinc-500 ml-1">{schedule.lastRunRowCount.toLocaleString()} rows</span>
            )}
          </div>
        )}

        {/* Format */}
        <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] border border-white/5 px-2.5 py-1">
          <span className="uppercase font-medium text-zinc-300">{schedule.format}</span>
        </div>

        {/* Recipients */}
        <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/5 px-2.5 py-1">
          <Mail className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
          <span className="text-zinc-400 truncate max-w-[180px]">
            {visibleRecipients.join(", ")}
            {extraCount > 0 && (
              <span className="text-zinc-500 ml-1">+{extraCount} more</span>
            )}
          </span>
        </div>
      </div>

      {/* Actions row */}
      <Separator className="mb-3 bg-white/5" />
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRunNow(schedule.id)}
          disabled={isRunning}
          aria-label="Run report now"
          className="h-8 gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all"
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run Now
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onHistory(schedule)}
          aria-label="View run history"
          className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
        >
          <Clock className="h-3.5 w-3.5" />
          History
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(schedule)}
          aria-label="Edit schedule"
          className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(schedule)}
          aria-label="Delete schedule"
          className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </motion.div>
  );
}

// ── Run History Panel ─────────────────────────────────────────────────────────

interface RunHistoryPanelProps {
  schedule: ReportSchedule;
  onClose: () => void;
}

function RunHistoryPanel({ schedule, onClose }: RunHistoryPanelProps) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data, isLoading, error } = useReportHistory(schedule.id, { page, limit });

  const meta = getReportTypeMeta(schedule.reportType);
  const colors = typeColorClasses(meta.color);
  const Icon = meta.icon;

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-2xl border border-white/5 bg-[#0a0a0c] overflow-hidden"
    >
      {/* Panel header */}
      <div className="flex items-center gap-3 p-5 border-b border-white/5">
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Back to schedules"
          className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/5"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className={`h-8 w-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-4 w-4 ${colors.icon}`} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white font-[Poppins] truncate">{schedule.name}</h3>
          <p className="text-xs text-zinc-500 font-[Inter]">Run history</p>
        </div>
        <span className="ml-auto text-xs text-zinc-500 font-[Inter]">
          {data ? `${data.total} runs` : ""}
        </span>
      </div>

      {/* Timeline */}
      <div className="p-5">
        {isLoading ? (
          <HistorySkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-zinc-400 font-[Inter]">Failed to load history.</p>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Clock className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-400 font-[Inter]">No runs yet.</p>
            <p className="text-xs text-zinc-500 font-[Inter]">Run the report manually or wait for the next scheduled run.</p>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Run history timeline">
            {data.items.map((run: ReportRunLog, idx: number) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.2 }}
                role="listitem"
                className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                {/* Status icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {run.status === "success" ? (
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  ) : run.status === "running" ? (
                    <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {runStatusBadge(run.status)}
                    <span className="text-xs text-zinc-400 font-[Inter]">{formatDateTime(run.startedAt)}</span>
                    {run.triggeredBy && (
                      <span className="text-xs text-zinc-500 font-[Inter]">by {run.triggeredBy}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-500 font-[Inter]">
                    <span>Duration: <span className="text-zinc-300">{formatDuration(run.startedAt, run.completedAt)}</span></span>
                    {run.rowCount !== null && (
                      <span>Rows: <span className="text-zinc-300">{run.rowCount.toLocaleString()}</span></span>
                    )}
                    {run.fileSizeBytes !== null && (
                      <span>Size: <span className="text-zinc-300">{formatBytes(run.fileSizeBytes)}</span></span>
                    )}
                  </div>

                  {run.errorMessage && (
                    <p className="text-xs text-red-400 mt-1 font-[Inter] line-clamp-2">{run.errorMessage}</p>
                  )}
                </div>

                {/* Download */}
                {run.downloadUrl && (
                  <a
                    href={run.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download report file"
                    className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
              className="h-8 gap-1 text-xs text-zinc-400 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <span className="text-xs text-zinc-500 font-[Inter]">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              className="h-8 gap-1 text-xs text-zinc-400 hover:text-white disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Add / Edit Dialog ─────────────────────────────────────────────────────────

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ReportSchedule | null;
}

function ScheduleDialog({ open, onOpenChange, editing }: ScheduleDialogProps) {
  const createMutation = useCreateReportSchedule();
  const updateMutation = useUpdateReportSchedule();

  const [form, setForm] = useState<ScheduleFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v && editing) {
        setForm({
          name: editing.name,
          reportType: editing.reportType,
          frequency: editing.frequency,
          dayOfWeek: editing.dayOfWeek !== null ? String(editing.dayOfWeek) : "",
          dayOfMonth: editing.dayOfMonth !== null ? String(editing.dayOfMonth) : "",
          timeOfDay: editing.timeOfDay,
          recipients: editing.recipients.join(", "),
          format: editing.format,
        });
      } else if (v) {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      onOpenChange(v);
    },
    [editing, onOpenChange]
  );

  const set = (field: keyof ScheduleFormData) => (val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async () => {
    const errs = editing ? {} : validateForm(form); // edit: backend validates only changed fields
    if (editing) {
      // lighter validation for edit
      const emails = form.recipients.split(",").map((e) => e.trim()).filter(Boolean);
      if (emails.length === 0) errs.recipients = "At least one recipient is required.";
      else {
        const bad = emails.filter((e) => !EMAIL_REGEX.test(e));
        if (bad.length > 0) errs.recipients = `Invalid email(s): ${bad.join(", ")}`;
      }
      if (!form.name.trim()) errs.name = "Name is required.";
    }
    if (Object.values(errs).some(Boolean)) { setErrors(errs); return; }

    if (editing) {
      try {
        await updateMutation.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          recipients: form.recipients.split(",").map((e) => e.trim()).filter(Boolean),
          format: form.format,
        });
        onOpenChange(false);
      } catch {
        // onError already shows toast
      }
    } else {
      const payload: Parameters<typeof createMutation.mutateAsync>[0] = {
        name: form.name.trim(),
        reportType: form.reportType,
        frequency: form.frequency,
        timeOfDay: form.timeOfDay,
        recipients: form.recipients.split(",").map((e) => e.trim()).filter(Boolean),
        format: form.format,
      };
      if (form.frequency === "weekly") payload.dayOfWeek = Number(form.dayOfWeek);
      if (form.frequency === "monthly") payload.dayOfMonth = Number(form.dayOfMonth);
      try {
        await createMutation.mutateAsync(payload);
        onOpenChange(false);
      } catch {
        // onError already shows toast
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditMode = !!editing;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#0a0a0c] border-white/10 max-w-lg w-full text-white">
        <DialogHeader>
          <DialogTitle className="font-[Poppins] font-semibold text-white flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-rose-400" />
            {isEditMode ? "Edit Schedule" : "New Report Schedule"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 font-[Inter] text-sm">
            {isEditMode
              ? "Update the name, recipients, or output format."
              : "Configure an automated report that runs on a schedule."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 font-[Inter]">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-name" className="text-sm text-zinc-300">Schedule name</Label>
            <Input
              id="sr-name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. Weekly Revenue Report"
              className="bg-[#121214] border-white/10 text-white placeholder:text-zinc-600 focus:border-rose-500/50"
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          {/* Report type + Frequency (disabled in edit) */}
          <div className={`grid gap-4 ${isEditMode ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className="space-y-1.5">
              <Label htmlFor="sr-type" className="text-sm text-zinc-300">Report type</Label>
              <Select value={form.reportType} onValueChange={set("reportType")} disabled={isEditMode}>
                <SelectTrigger id="sr-type" className="bg-[#121214] border-white/10 text-white focus:ring-rose-500/30 disabled:opacity-60">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10 text-white">
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="focus:bg-white/10">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reportType && <p className="text-xs text-red-400">{errors.reportType}</p>}
            </div>

            {!isEditMode && (
              <div className="space-y-1.5">
                <Label htmlFor="sr-freq" className="text-sm text-zinc-300">Frequency</Label>
                <Select value={form.frequency} onValueChange={set("frequency")}>
                  <SelectTrigger id="sr-freq" className="bg-[#121214] border-white/10 text-white focus:ring-rose-500/30">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121214] border-white/10 text-white">
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="focus:bg-white/10">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.frequency && <p className="text-xs text-red-400">{errors.frequency}</p>}
              </div>
            )}
          </div>

          {/* Conditional: day-of-week / day-of-month */}
          {!isEditMode && form.frequency === "weekly" && (
            <div className="space-y-1.5">
              <Label htmlFor="sr-dow" className="text-sm text-zinc-300">Day of week</Label>
              <Select value={form.dayOfWeek} onValueChange={set("dayOfWeek")}>
                <SelectTrigger id="sr-dow" className="bg-[#121214] border-white/10 text-white focus:ring-rose-500/30">
                  <SelectValue placeholder="Select day…" />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10 text-white">
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.value} value={d.value} className="focus:bg-white/10">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dayOfWeek && <p className="text-xs text-red-400">{errors.dayOfWeek}</p>}
            </div>
          )}

          {!isEditMode && form.frequency === "monthly" && (
            <div className="space-y-1.5">
              <Label htmlFor="sr-dom" className="text-sm text-zinc-300">Day of month <span className="text-zinc-500">(1–31)</span></Label>
              <Input
                id="sr-dom"
                type="number"
                min={1}
                max={31}
                value={form.dayOfMonth}
                onChange={(e) => set("dayOfMonth")(e.target.value)}
                placeholder="e.g. 1"
                className="bg-[#121214] border-white/10 text-white placeholder:text-zinc-600 focus:border-rose-500/50"
              />
              {errors.dayOfMonth && <p className="text-xs text-red-400">{errors.dayOfMonth}</p>}
            </div>
          )}

          {/* Time of day */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-time" className="text-sm text-zinc-300">Time of day (UTC)</Label>
            <Input
              id="sr-time"
              type="time"
              value={form.timeOfDay}
              onChange={(e) => set("timeOfDay")(e.target.value)}
              disabled={isEditMode}
              className="bg-[#121214] border-white/10 text-white focus:border-rose-500/50 disabled:opacity-60 [color-scheme:dark]"
            />
            {errors.timeOfDay && <p className="text-xs text-red-400">{errors.timeOfDay}</p>}
          </div>

          {/* Recipients */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-recipients" className="text-sm text-zinc-300">Recipients <span className="text-zinc-500">(comma-separated emails)</span></Label>
            <Textarea
              id="sr-recipients"
              value={form.recipients}
              onChange={(e) => set("recipients")(e.target.value)}
              placeholder="admin@example.com, finance@example.com"
              rows={2}
              className="bg-[#121214] border-white/10 text-white placeholder:text-zinc-600 focus:border-rose-500/50 resize-none font-[Inter] text-sm"
            />
            {errors.recipients && <p className="text-xs text-red-400">{errors.recipients}</p>}
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-format" className="text-sm text-zinc-300">Output format</Label>
            <Select value={form.format} onValueChange={set("format")}>
              <SelectTrigger id="sr-format" className="bg-[#121214] border-white/10 text-white focus:ring-rose-500/30">
                <SelectValue placeholder="Select format…" />
              </SelectTrigger>
              <SelectContent className="bg-[#121214] border-white/10 text-white">
                <SelectItem value="csv" className="focus:bg-white/10">CSV</SelectItem>
                <SelectItem value="json" className="focus:bg-white/10">JSON</SelectItem>
              </SelectContent>
            </Select>
            {errors.format && <p className="text-xs text-red-400">{errors.format}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white font-[Inter] font-medium gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditMode ? "Save Changes" : "Create Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ScheduledReports() {
  const { data: schedules, isLoading, error, refetch } = useReportSchedules();
  const deleteMutation = useDeleteReportSchedule();
  const updateMutation = useUpdateReportSchedule();
  const runMutation = useRunReportNow();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportSchedule | null>(null);
  const [historySchedule, setHistorySchedule] = useState<ReportSchedule | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  const handleAdd = useCallback(() => {
    setEditingSchedule(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((s: ReportSchedule) => {
    setEditingSchedule(s);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((s: ReportSchedule) => {
    setDeleteTarget(s);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    if (historySchedule?.id === deleteTarget.id) setHistorySchedule(null);
  }, [deleteTarget, deleteMutation, historySchedule]);

  const handleToggleActive = useCallback(async (id: string, current: boolean) => {
    setTogglingId(id);
    try {
      await updateMutation.mutateAsync({ id, isActive: !current });
    } finally {
      setTogglingId(null);
    }
  }, [updateMutation]);

  const handleRunNow = useCallback(async (id: string) => {
    setRunningIds((prev) => new Set(prev).add(id));
    try {
      await runMutation.mutateAsync(id);
    } finally {
      setRunningIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [runMutation]);

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-[Inter]">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Link to="/admin" className="hover:text-zinc-300 transition-colors">Admin</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-400">Scheduled Reports</span>
        </nav>

        {isLoading ? (
          <PageSkeleton />
        ) : error ? (
          <>
            {/* Header (still rendered) */}
            <PageHeader onAdd={handleAdd} count={0} />
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
              <p className="text-sm text-zinc-300 font-[Inter]">Failed to load report schedules.</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                className="gap-2 text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          </>
        ) : (
          <>
            <PageHeader onAdd={handleAdd} count={schedules?.length ?? 0} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Schedule list */}
              <div className="space-y-4 lg:col-span-1">
                {!schedules || schedules.length === 0 ? (
                  <EmptyState onAdd={handleAdd} />
                ) : (
                  <AnimatePresence mode="popLayout">
                    {schedules.map((s) => (
                      <ScheduleCard
                        key={s.id}
                        schedule={s}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onHistory={setHistorySchedule}
                        onRunNow={handleRunNow}
                        onToggleActive={handleToggleActive}
                        isRunning={runningIds.has(s.id)}
                        isTogglingId={togglingId}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Right: History panel (sticky on desktop) */}
              <AnimatePresence mode="wait">
                {historySchedule ? (
                  <div key="history" className="lg:sticky lg:top-6 lg:self-start">
                    <RunHistoryPanel
                      schedule={historySchedule}
                      onClose={() => setHistorySchedule(null)}
                    />
                  </div>
                ) : (
                  <motion.div
                    key="history-placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hidden lg:flex rounded-2xl border border-white/5 border-dashed bg-transparent items-center justify-center p-12 text-center"
                  >
                    <div className="space-y-2">
                      <Clock className="h-8 w-8 text-zinc-700 mx-auto" />
                      <p className="text-sm text-zinc-600 font-[Inter]">Select a schedule to view its run history</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit dialog */}
      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingSchedule(null);
        }}
        editing={editingSchedule}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#0a0a0c] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-[Poppins] text-white">Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 font-[Inter]">
              <strong className="text-white">{deleteTarget?.name}</strong> will be permanently deleted
              along with all run history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-[Inter] gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sub-components for page layout ────────────────────────────────────────────

function PageHeader({ onAdd, count }: { onAdd: () => void; count: number }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-[Poppins]">Scheduled Reports</h1>
            <p className="text-sm text-zinc-400 font-[Inter]">
              {count === 0 ? "No schedules configured" : `${count} schedule${count !== 1 ? "s" : ""} configured`}
            </p>
          </div>
        </div>
        <Button
          onClick={onAdd}
          className="gap-2 bg-rose-500 hover:bg-rose-600 text-white font-[Inter] font-medium self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Schedule
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/5 border-dashed bg-[#0a0a0c]/50 p-12 text-center space-y-4"
    >
      <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto">
        <CalendarClock className="h-7 w-7 text-rose-400" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-white font-[Poppins]">No scheduled reports</h3>
        <p className="text-sm text-zinc-400 font-[Inter] max-w-xs mx-auto">
          Automate data exports by scheduling reports to run daily, weekly, or monthly.
        </p>
      </div>
      <Button
        onClick={onAdd}
        className="gap-2 bg-rose-500 hover:bg-rose-600 text-white font-[Inter] font-medium"
      >
        <Plus className="h-4 w-4" />
        Create first schedule
      </Button>
    </motion.div>
  );
}
