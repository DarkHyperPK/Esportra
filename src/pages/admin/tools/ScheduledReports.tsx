import { useState, useCallback } from "react";
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
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  CommandButton,
  CommandIconButton,
  CommandEmptyState,
  CommandSection,
} from "@/components/management/CommandSurface";

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
  { value: "users",       label: "Users",       icon: Users       },
  { value: "tournaments", label: "Tournaments", icon: Trophy      },
  { value: "revenue",     label: "Revenue",     icon: DollarSign  },
  { value: "activity",    label: "Activity",    icon: Activity    },
  { value: "moderation",  label: "Moderation",  icon: Shield      },
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

const FIELD_LABEL = "font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500";

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

function typeBadgeClasses(): string {
  return "border-white/15 text-zinc-300";
}

function runStatusBadge(status: string | null) {
  if (!status) return null;
  switch (status) {
    case "success":
      return (
        <span className="inline-flex items-center gap-1 border border-white/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
          <CheckCircle className="h-3 w-3" /> Success
        </span>
      );
    case "failed":
    case "error":
      return (
        <span className="inline-flex items-center gap-1 border border-red-500/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-300">
          <XCircle className="h-3 w-3" /> Failed
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1 border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
          <Loader2 className="h-3 w-3 animate-spin" /> Running
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {status}
        </span>
      );
  }
}

function runStatusIcon(status: string | null) {
  if (status === "success") return <CheckCircle className="h-5 w-5 text-white" />;
  if (status === "running") return <Loader2 className="h-5 w-5 animate-spin text-amber-300" />;
  return <XCircle className="h-5 w-5 text-red-300" />;
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
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4 border border-white/10 bg-[#0a0a0c]/92 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 -none" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 -none" />
                <Skeleton className="h-4 w-52 -none" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 -none" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-7 w-24 -none" />
            <Skeleton className="h-7 w-32 -none" />
            <Skeleton className="h-7 w-20 -none" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-8 w-20 -none" />
            <Skeleton className="h-8 w-20 -none" />
            <Skeleton className="h-8 w-16 -none" />
            <Skeleton className="h-8 w-16 -none" />
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
        <div key={i} className="flex items-start gap-3 border border-white/10 bg-white/[0.02] p-3">
          <Skeleton className="h-7 w-7 shrink-0 -none" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 -none" />
              <Skeleton className="h-4 w-28 -none" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-4 w-16 -none" />
              <Skeleton className="h-4 w-16 -none" />
              <Skeleton className="h-4 w-16 -none" />
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
  const Icon = meta.icon;
  const isToggling = isTogglingId === schedule.id;
  const { can } = useAdminAccess();

  const visibleRecipients = schedule.recipients.slice(0, 2);
  const extraCount = schedule.recipients.length - 2;

  return (
    <article className="border border-white/10 bg-[#0a0a0c]/92 p-5 transition-colors hover:border-white/25">
      {/* Top row */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
            <h3 className="truncate text-sm font-bold text-white">
              {schedule.name}
            </h3>
            <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${typeBadgeClasses()}`}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-zinc-400">
            {frequencyLabel(schedule)}
          </p>
        </div>

        {/* Active toggle */}
        <div className="flex shrink-0 items-center gap-2">
          {can("reports:edit") && (isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <Switch
              checked={schedule.isActive}
              onCheckedChange={() => onToggleActive(schedule.id, schedule.isActive)}
              aria-label={schedule.isActive ? "Deactivate schedule" : "Activate schedule"}
              className="data-[state=checked]:bg-rose-500"
            />
          ))}
        </div>
      </div>

      {/* Info row */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        {/* Next run */}
        <div className="flex items-center gap-1.5 border border-white/10 bg-white/[0.02] px-2.5 py-1">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <span>
            {schedule.nextRunAt ? (
              <>
                <span className="font-mono tabular-nums text-white">{formatRelative(schedule.nextRunAt)}</span>
                <span className="ml-1 font-mono tabular-nums text-zinc-500">({formatDateTime(schedule.nextRunAt)})</span>
              </>
            ) : (
              <span className="text-zinc-500">No next run</span>
            )}
          </span>
        </div>

        {/* Last run */}
        {schedule.lastRunStatus && (
          <div className="flex items-center gap-1.5 border border-white/10 bg-white/[0.02] px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="font-mono tabular-nums">{formatRelative(schedule.lastRunAt)}</span>
            <span className="ml-1">{runStatusBadge(schedule.lastRunStatus)}</span>
            {schedule.lastRunRowCount !== null && (
              <span className="ml-1 font-mono tabular-nums text-zinc-500">{schedule.lastRunRowCount.toLocaleString()} rows</span>
            )}
          </div>
        )}

        {/* Format */}
        <div className="flex items-center gap-1 border border-white/10 bg-white/[0.02] px-2.5 py-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300">{schedule.format}</span>
        </div>

        {/* Recipients */}
        <div className="flex items-center gap-1.5 border border-white/10 bg-white/[0.02] px-2.5 py-1">
          <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <span className="max-w-[180px] truncate text-zinc-400">
            {visibleRecipients.join(", ")}
            {extraCount > 0 && (
              <span className="ml-1 font-mono tabular-nums text-zinc-500">+{extraCount} more</span>
            )}
          </span>
        </div>
      </div>

      {/* Actions row */}
      <Separator className="mb-3 bg-white/5" />
      <div className="flex flex-wrap items-center gap-2">
        {can("reports:run") && (
          <CommandButton
            variant="ghost"
            size="sm"
            onClick={() => onRunNow(schedule.id)}
            disabled={isRunning}
            aria-label="Run report now"
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run Now
          </CommandButton>
        )}

        <CommandButton variant="ghost" size="sm" onClick={() => onHistory(schedule)} aria-label="View run history">
          <Clock className="h-3.5 w-3.5" />
          History
        </CommandButton>

        {can("reports:edit") && (
          <CommandButton variant="secondary" size="sm" onClick={() => onEdit(schedule)} aria-label="Edit schedule">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </CommandButton>
        )}

        {can("reports:delete") && (
          <CommandButton variant="danger" size="sm" onClick={() => onDelete(schedule)} aria-label="Delete schedule" className="ml-auto">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </CommandButton>
        )}
      </div>
    </article>
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
  const Icon = meta.icon;

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <section className="overflow-hidden border border-white/10 bg-[#0a0a0c]/92">
      {/* Panel header */}
      <div className="flex items-center gap-3 border-b border-white/10 p-5">
        <CommandIconButton
          label="Back to schedules"
          variant="ghost"
          onClick={onClose}
        >
          <ChevronLeft className="h-4 w-4" />
        </CommandIconButton>
        <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-white">{schedule.name}</h3>
          <p className={`${FIELD_LABEL} mt-0.5`}>Run history</p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-zinc-500">
          {data ? `${data.total} runs` : ""}
        </span>
      </div>

      {/* Timeline */}
      <div className="p-5">
        {isLoading ? (
          <HistorySkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-300" />
            <p className="text-sm text-zinc-400">Failed to load history.</p>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Clock className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-400">No runs yet.</p>
            <p className="text-xs text-zinc-500">Run the report manually or wait for the next scheduled run.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5" role="list" aria-label="Run history timeline">
            {data.items.map((run: ReportRunLog) => (
              <div
                key={run.id}
                role="listitem"
                className="flex items-start gap-3 py-3 transition-colors first:pt-0 hover:bg-white/[0.02]"
              >
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {runStatusIcon(run.status)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {runStatusBadge(run.status)}
                    <span className="font-mono text-xs tabular-nums text-zinc-400">{formatDateTime(run.startedAt)}</span>
                    {run.triggeredBy && (
                      <span className="text-xs text-zinc-500">by {run.triggeredBy}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums text-zinc-500">
                    <span>Duration: <span className="text-zinc-300">{formatDuration(run.startedAt, run.completedAt)}</span></span>
                    {run.rowCount !== null && (
                      <span>Rows: <span className="text-zinc-300">{run.rowCount.toLocaleString()}</span></span>
                    )}
                    {run.fileSizeBytes !== null && (
                      <span>Size: <span className="text-zinc-300">{formatBytes(run.fileSizeBytes)}</span></span>
                    )}
                  </div>

                  {run.errorMessage && (
                    <p className="mt-1 line-clamp-2 text-xs text-red-300">{run.errorMessage}</p>
                  )}
                </div>

                {/* Download */}
                {run.downloadUrl && (
                  <a
                    href={run.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download report file"
                    className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors hover:border-white/25 hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <CommandButton
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </CommandButton>
            <span className="font-mono text-xs tabular-nums text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <CommandButton
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </CommandButton>
          </div>
        )}
      </div>
    </section>
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
  const { can } = useAdminAccess();

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

  const inputClasses =
    "-none border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus-visible:ring-rose-500/20 focus:border-rose-500";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto -none border-white/10 bg-[#0a0a0c] text-white" data-lenis-prevent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CalendarClock className="h-4 w-4 text-zinc-400" />
            {isEditMode ? "Edit Schedule" : "New Report Schedule"}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            {isEditMode
              ? "Update the name, recipients, or output format."
              : "Configure an automated report that runs on a schedule."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-name" className={`${FIELD_LABEL} normal-case`}>Schedule name</Label>
            <Input
              id="sr-name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. Weekly Revenue Report"
              className={inputClasses}
            />
            {errors.name && <p className="text-xs text-red-300">{errors.name}</p>}
          </div>

          {/* Report type + Frequency (disabled in edit) */}
          <div className={`grid gap-4 ${isEditMode ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className="space-y-1.5">
              <Label htmlFor="sr-type" className={FIELD_LABEL}>Report type</Label>
              <Select value={form.reportType} onValueChange={set("reportType")} disabled={isEditMode}>
                <SelectTrigger id="sr-type" className={`${inputClasses} disabled:opacity-60`}>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-white">
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="focus:bg-white/10 focus:text-white">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reportType && <p className="text-xs text-red-300">{errors.reportType}</p>}
            </div>

            {!isEditMode && (
              <div className="space-y-1.5">
                <Label htmlFor="sr-freq" className={FIELD_LABEL}>Frequency</Label>
                <Select value={form.frequency} onValueChange={set("frequency")}>
                  <SelectTrigger id="sr-freq" className={inputClasses}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-white">
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="focus:bg-white/10 focus:text-white">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.frequency && <p className="text-xs text-red-300">{errors.frequency}</p>}
              </div>
            )}
          </div>

          {/* Conditional: day-of-week / day-of-month */}
          {!isEditMode && form.frequency === "weekly" && (
            <div className="space-y-1.5">
              <Label htmlFor="sr-dow" className={FIELD_LABEL}>Day of week</Label>
              <Select value={form.dayOfWeek} onValueChange={set("dayOfWeek")}>
                <SelectTrigger id="sr-dow" className={inputClasses}>
                  <SelectValue placeholder="Select day…" />
                </SelectTrigger>
                <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-white">
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.value} value={d.value} className="focus:bg-white/10 focus:text-white">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dayOfWeek && <p className="text-xs text-red-300">{errors.dayOfWeek}</p>}
            </div>
          )}

          {!isEditMode && form.frequency === "monthly" && (
            <div className="space-y-1.5">
              <Label htmlFor="sr-dom" className={FIELD_LABEL}>Day of month <span className="text-zinc-600">(1–31)</span></Label>
              <Input
                id="sr-dom"
                type="number"
                min={1}
                max={31}
                value={form.dayOfMonth}
                onChange={(e) => set("dayOfMonth")(e.target.value)}
                placeholder="e.g. 1"
                className={inputClasses}
              />
              {errors.dayOfMonth && <p className="text-xs text-red-300">{errors.dayOfMonth}</p>}
            </div>
          )}

          {/* Time of day */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-time" className={FIELD_LABEL}>Time of day (UTC)</Label>
            <Input
              id="sr-time"
              type="time"
              value={form.timeOfDay}
              onChange={(e) => set("timeOfDay")(e.target.value)}
              disabled={isEditMode}
              className={`${inputClasses} disabled:opacity-60 [color-scheme:dark]`}
            />
            {errors.timeOfDay && <p className="text-xs text-red-300">{errors.timeOfDay}</p>}
          </div>

          {/* Recipients */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-recipients" className={FIELD_LABEL}>Recipients <span className="text-zinc-600">(comma-separated emails)</span></Label>
            <Textarea
              id="sr-recipients"
              value={form.recipients}
              onChange={(e) => set("recipients")(e.target.value)}
              placeholder="admin@example.com, finance@example.com"
              rows={2}
              className={`${inputClasses} resize-none text-sm`}
            />
            {errors.recipients && <p className="text-xs text-red-300">{errors.recipients}</p>}
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-format" className={FIELD_LABEL}>Output format</Label>
            <Select value={form.format} onValueChange={set("format")}>
              <SelectTrigger id="sr-format" className={inputClasses}>
                <SelectValue placeholder="Select format…" />
              </SelectTrigger>
              <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-white">
                <SelectItem value="csv" className="focus:bg-white/10 focus:text-white">CSV</SelectItem>
                <SelectItem value="json" className="focus:bg-white/10 focus:text-white">JSON</SelectItem>
              </SelectContent>
            </Select>
            {errors.format && <p className="text-xs text-red-300">{errors.format}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <CommandButton
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </CommandButton>
          {can(isEditMode ? "reports:edit" : "reports:create") && (
            <CommandButton
              size="sm"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? "Save Changes" : "Create Schedule"}
            </CommandButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ScheduledReports() {
  const { can } = useAdminAccess();
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

  const count = schedules?.length ?? 0;

  return (
    <>
      <AdminPage
        eyebrow="Operations"
        title="Scheduled Reports"
        description={
          count === 0
            ? "No schedules configured"
            : `${count} schedule${count !== 1 ? "s" : ""} configured`
        }
        actions={
          can("reports:create") && (
            <CommandButton size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add Schedule
            </CommandButton>
          )
        }
      >
        {isLoading ? (
          <PageSkeleton />
        ) : error ? (
          <CommandSection className="space-y-3 py-12 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-300" />
            <p className="text-sm text-zinc-300">Failed to load report schedules.</p>
            <div>
              <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </CommandButton>
            </div>
          </CommandSection>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Schedule list */}
            <div className="space-y-4 lg:col-span-1">
              {!schedules || schedules.length === 0 ? (
                <EmptyState onAdd={handleAdd} />
              ) : (
                schedules.map((s) => (
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
                ))
              )}
            </div>

            {/* Right: History panel (sticky on desktop) */}
            {historySchedule ? (
              <div className="lg:sticky lg:top-6 lg:self-start">
                <RunHistoryPanel
                  schedule={historySchedule}
                  onClose={() => setHistorySchedule(null)}
                />
              </div>
            ) : (
              <div className="hidden items-center justify-center border border-dashed border-white/10 bg-white/[0.02] p-12 text-center lg:flex">
                <div className="space-y-2">
                  <Clock className="mx-auto h-8 w-8 text-zinc-700" />
                  <p className="text-sm text-zinc-600">Select a schedule to view its run history</p>
                </div>
              </div>
            )}
          </div>
        )}
      </AdminPage>

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
        <AlertDialogContent className="-none border-white/10 bg-[#0a0a0c] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <strong className="text-white">{deleteTarget?.name}</strong> will be permanently deleted
              along with all run history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="-none border-white/10 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white">
              Cancel
            </AlertDialogCancel>
            {can("reports:delete") && (
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="gap-2 -none border border-red-500/35 bg-red-950/20 font-mono text-[11px] font-bold uppercase tracking-wider text-red-100 hover:bg-rose-600 hover:text-white"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Schedule
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Sub-components for page layout ────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { can } = useAdminAccess();

  return (
    <CommandEmptyState
      title="No scheduled reports"
      description="Automate data exports by scheduling reports to run daily, weekly, or monthly."
      icon={<CalendarClock className="h-5 w-5" />}
      action={
        can("reports:create") && (
          <CommandButton size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Create first schedule
          </CommandButton>
        )
      }
    />
  );
}
