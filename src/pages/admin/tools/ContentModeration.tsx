import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Trash2,
  MessageSquare,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Flag,
  ImageIcon,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  useModerationQueue,
  useModerationStats,
  useReviewModeration,
  useDismissModeration,
} from "@/hooks/useAdminQueries";
import type { ModerationItem } from "@/hooks/useAdminQueries";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  CommandButton,
  CommandEmptyState,
  CommandIconButton,
  CommandMetric,
  CommandSection,
  CommandToolbar,
} from "@/components/management/CommandSurface";

// ── Constants ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 12;

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

const CONTENT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "tournament", label: "Tournament" },
  { value: "team", label: "Team" },
  { value: "profile", label: "Profile" },
  { value: "match_evidence", label: "Match Evidence" },
] as const;

const CONTENT_TYPE_BADGE =
  "border-white/15 text-zinc-400";

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-500/30 text-amber-300",
  approved: "border-white/25 text-white",
  rejected: "border-red-500/30 text-red-300",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function formatContentType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isImageUrl(url: string | null): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url);
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function StatsBar() {
  const { data: stats, isLoading } = useModerationStats();

  const statItems = [
    { label: "Pending", value: stats?.pending ?? 0, tone: "warning" as const, icon: <Clock className="h-4 w-4" /> },
    { label: "Approved", value: stats?.approved ?? 0, tone: "neutral" as const, icon: <CheckCircle className="h-4 w-4" /> },
    { label: "Rejected", value: stats?.rejected ?? 0, tone: "danger" as const, icon: <XCircle className="h-4 w-4" /> },
    { label: "Total", value: stats?.total ?? 0, tone: "neutral" as const, icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statItems.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          {isLoading ? (
            <div className="border border-white/10 bg-white/[0.025] p-3">
              <Skeleton className="h-16 w-full rounded-none" />
            </div>
          ) : (
            <CommandMetric
              label={stat.label}
              value={stat.value.toLocaleString()}
              icon={stat.icon}
              tone={stat.tone}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function ModerationSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border border-white/10 bg-[#0a0a0c]/92 p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-20 rounded-none" />
            <Skeleton className="h-4 w-24 rounded-none" />
          </div>
          <Skeleton className="h-16 w-full rounded-none" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-none" />
            <Skeleton className="h-4 w-32 rounded-none" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-none" />
            <Skeleton className="h-9 w-24 rounded-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ModerationCardProps {
  item: ModerationItem;
  onApprove: (item: ModerationItem) => void;
  onReject: (item: ModerationItem) => void;
  onDismiss: (id: string) => void;
}

function ModerationCard({ item, onApprove, onReject, onDismiss }: ModerationCardProps) {
  const isPending = item.status === "pending";
  const statusBadge = STATUS_BADGE[item.status] || STATUS_BADGE.pending;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`group relative border bg-[#0a0a0c]/92 p-5 transition-colors ${
        isPending
          ? "border-white/10 hover:border-white/25"
          : "border-white/[0.06] opacity-70 hover:opacity-100"
      }`}
    >
      {/* Dismiss button */}
      <CommandIconButton
        label="Dismiss item"
        variant="danger"
        onClick={() => onDismiss(item.id)}
        className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </CommandIconButton>

      {/* Header: type badge + status + auto-flagged */}
      <div className="flex items-center gap-2 mb-3 flex-wrap pr-10">
        <span
          className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${CONTENT_TYPE_BADGE}`}
        >
          {formatContentType(item.content_type)}
        </span>
        <span
          className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${statusBadge}`}
        >
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
        {item.auto_flagged && (
          <span className="border border-rose-500/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300">
            <Zap className="mr-1 inline w-3 h-3" />
            Auto-flagged
          </span>
        )}
      </div>

      {/* Field name */}
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
        {item.field_name}
      </p>

      {/* Content preview */}
      <div className="mb-4">
        {item.content_url && isImageUrl(item.content_url) ? (
          <div className="relative overflow-hidden border border-white/10 bg-black/40">
            <img
              src={item.content_url}
              alt="Reported content"
              className="w-full h-32 object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/70">
              <ImageIcon className="w-3 h-3" />
              Image
            </div>
          </div>
        ) : item.content_url ? (
          <a
            href={item.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate border border-white/10 bg-black/40 p-3 text-sm text-rose-300 transition-colors hover:text-rose-200"
          >
            <Eye className="mr-1.5 inline w-3.5 h-3.5" />
            {item.content_url}
          </a>
        ) : item.content_text ? (
          <div className="border border-white/10 bg-black/40 p-3">
            <p className="text-sm text-zinc-300 line-clamp-3 whitespace-pre-wrap">
              {item.content_text}
            </p>
          </div>
        ) : (
          <div className="border border-white/10 bg-white/[0.02] p-3">
            <p className="text-sm italic text-zinc-600">No content preview available</p>
          </div>
        )}
      </div>

      {/* Reported reason */}
      <div className="flex items-start gap-2 mb-4 border border-red-500/10 bg-red-500/5 p-2.5">
        <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
        <p className="text-xs text-red-300/80 line-clamp-2">{item.reported_reason}</p>
      </div>

      {/* Reporter info */}
      <div className="flex items-center gap-2 mb-4">
        {item.reporter_avatar_url ? (
          <img
            src={item.reporter_avatar_url}
            alt=""
            className="w-6 h-6 rounded-full border border-white/10"
            loading="lazy"
          />
        ) : (
          <User className="w-4 h-4 text-zinc-500" />
        )}
        <span className="text-xs text-zinc-400">
          {item.reporter_username || "System"}
        </span>
        <span className="ml-auto flex items-center gap-1 font-mono text-xs text-zinc-600">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(item.created_at)}
        </span>
      </div>

      {/* Review info (for already-reviewed items) */}
      {!isPending && item.reviewed_at && (
        <div className="mb-4 space-y-1 border border-white/10 bg-black/40 p-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            <Eye className="w-3 h-3" />
            Reviewed {formatTimeAgo(item.reviewed_at)}
          </div>
          {item.review_notes && (
            <div className="flex items-start gap-2 text-xs text-zinc-500">
              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{item.review_notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {isPending && (
        <div className="flex gap-2">
          <CommandButton
            size="sm"
            onClick={() => onApprove(item)}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Approve
          </CommandButton>
          <CommandButton
            variant="danger"
            size="sm"
            onClick={() => onReject(item)}
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Reject
          </CommandButton>
        </div>
      )}
    </motion.div>
  );
}

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ModerationItem | null;
  action: "approve" | "reject";
  onConfirm: (notes: string) => void;
  isSubmitting: boolean;
}

function ReviewDialog({ open, onOpenChange, item, action, onConfirm, isSubmitting }: ReviewDialogProps) {
  const [notes, setNotes] = useState("");
  const isReject = action === "reject";
  const canSubmit = isReject ? notes.trim().length > 0 : true;

  const handleSubmit = () => {
    onConfirm(notes.trim());
    setNotes("");
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setNotes("");
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {isReject ? (
              <XCircle className="w-5 h-5 text-red-300" />
            ) : (
              <CheckCircle className="w-5 h-5 text-white" />
            )}
            {isReject ? "Reject Content" : "Approve Content"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isReject
              ? "Please provide a reason for rejecting this content. This is required."
              : "Optionally add notes for this approval."}
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-1 border border-white/10 bg-black/40 p-3 text-sm text-zinc-400">
            <p>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Type:</span>{" "}
              <span className="text-zinc-300">{formatContentType(item.content_type)}</span>
            </p>
            <p>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Field:</span>{" "}
              <span className="font-mono text-xs text-zinc-300">{item.field_name}</span>
            </p>
            {item.content_text && (
              <p className="mt-2 line-clamp-2 text-zinc-300">{item.content_text}</p>
            )}
          </div>
        )}

        <Textarea
          placeholder={isReject ? "Reason for rejection (required)..." : "Notes (optional)..."}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[100px] resize-none rounded-none border-white/10 bg-black/40 text-white placeholder:text-zinc-600"
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <CommandButton
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </CommandButton>
          {isReject ? (
            <CommandButton
              variant="danger"
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting && <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />}
              Reject
            </CommandButton>
          ) : (
            <CommandButton
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting && <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />}
              Approve
            </CommandButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

const ContentModeration = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Review dialog state
  const [reviewItem, setReviewItem] = useState<ModerationItem | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Dismiss confirmation state
  const [dismissTarget, setDismissTarget] = useState<string | null>(null);

  const queryParams = {
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(typeFilter !== "all" ? { content_type: typeFilter } : {}),
    page,
    limit: ITEMS_PER_PAGE,
  };

  const { data, isLoading, error, refetch } = useModerationQueue(queryParams);
  const reviewMutation = useReviewModeration();
  const dismissMutation = useDismissModeration();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const handleApprove = useCallback((item: ModerationItem) => {
    setReviewItem(item);
    setReviewAction("approve");
    setDialogOpen(true);
  }, []);

  const handleReject = useCallback((item: ModerationItem) => {
    setReviewItem(item);
    setReviewAction("reject");
    setDialogOpen(true);
  }, []);

  const handleDismiss = useCallback(
    (id: string) => {
      setDismissTarget(id);
    },
    []
  );

  const handleConfirmDismiss = useCallback(() => {
    if (!dismissTarget) return;
    dismissMutation.mutate(dismissTarget, {
      onSettled: () => setDismissTarget(null),
    });
  }, [dismissTarget, dismissMutation]);

  const handleConfirmReview = useCallback(
    (notes: string) => {
      if (!reviewItem) return;
      reviewMutation.mutate(
        { id: reviewItem.id, action: reviewAction, notes: notes || undefined },
        { onSuccess: () => setDialogOpen(false) }
      );
    },
    [reviewItem, reviewAction, reviewMutation]
  );

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value);
    setPage(1);
  }, []);

  return (
    <AdminPage
      eyebrow="Content"
      title="Moderation"
      description="Review reported and flagged content"
      actions={
        <CommandButton variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </CommandButton>
      }
    >
      {/* Stats Bar */}
      <StatsBar />

      {/* Filter Controls */}
      <CommandToolbar className="mt-5">
        <div className="flex w-full flex-col gap-3 lg:flex-row">
          <div className="w-full lg:w-48">
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 rounded-none border-white/10 bg-[#0a0a0c]/92 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-white/10 bg-[#0a0a0c]">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-zinc-300">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-48">
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-10 rounded-none border-white/10 bg-[#0a0a0c]/92 text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-white/10 bg-[#0a0a0c]">
                {CONTENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-zinc-300">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden flex-1 lg:block" />

          <p className="self-center font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 hidden lg:block">
            {total} item{total !== 1 ? "s" : ""} found
          </p>
        </div>
      </CommandToolbar>

      {/* Content Grid */}
      <div className="mt-5">
        {isLoading ? (
          <ModerationSkeleton />
        ) : error ? (
          <CommandSection className="py-16 text-center">
            <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-rose-400" />
            <h3 className="mb-2 text-lg font-semibold text-white">Failed to load moderation queue</h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-zinc-500">
              {(error as Error)?.message || "An unexpected error occurred while fetching the moderation queue."}
            </p>
            <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </CommandButton>
          </CommandSection>
        ) : items.length === 0 ? (
          <CommandEmptyState
            title="No items in moderation queue"
            description="All content looks good! Items that need review will appear here when reported by users or flagged by automated systems."
            icon={<Shield className="h-5 w-5" />}
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`${statusFilter}-${typeFilter}-${page}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {items.map((item) => (
                <ModerationCard
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDismiss={handleDismiss}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex items-center justify-center gap-2"
        >
          <CommandIconButton
            label="Previous page"
            variant="ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </CommandIconButton>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  aria-label={`Page ${pageNum}`}
                  className={`h-8 w-8 border px-0 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                    page === pageNum
                      ? "border-transparent bg-rose-500 text-white"
                      : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <CommandIconButton
            label="Next page"
            variant="ghost"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </CommandIconButton>
        </motion.div>
      )}

      {/* Review Dialog */}
      <ReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={reviewItem}
        action={reviewAction}
        onConfirm={handleConfirmReview}
        isSubmitting={reviewMutation.isPending}
      />

      {/* Dismiss Confirmation Dialog */}
      <AlertDialog open={dismissTarget !== null} onOpenChange={(open) => { if (!open) setDismissTarget(null); }}>
        <AlertDialogContent className="rounded-none border-white/10 bg-[#0a0a0c]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Dismiss moderation item?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to dismiss this item? This will remove it from the moderation queue permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-none border-white/10 bg-transparent text-zinc-400 hover:bg-white/[0.03] hover:text-white"
              disabled={dismissMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDismiss}
              className="rounded-none border border-red-500/35 bg-red-950/20 text-red-100 hover:bg-rose-600 hover:text-white"
              disabled={dismissMutation.isPending}
            >
              {dismissMutation.isPending ? "Dismissing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
};

export default ContentModeration;
