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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const CONTENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  tournament: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  team: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  profile: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
  match_evidence: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-400" },
  approved: { bg: "bg-green-500/10", text: "text-green-400" },
  rejected: { bg: "bg-red-500/10", text: "text-red-400" },
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
    { label: "Pending", value: stats?.pending ?? 0, color: "amber", icon: Clock },
    { label: "Approved", value: stats?.approved ?? 0, color: "green", icon: CheckCircle },
    { label: "Rejected", value: stats?.rejected ?? 0, color: "red", icon: XCircle },
    { label: "Total", value: stats?.total ?? 0, color: "zinc", icon: Shield },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statItems.map((stat, idx) => {
        const colorMap: Record<string, string> = {
          amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          green: "bg-green-500/10 text-green-400 border-green-500/20",
          red: "bg-red-500/10 text-red-400 border-red-500/20",
          zinc: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
        };
        const classes = colorMap[stat.color] || colorMap.zinc;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`relative overflow-hidden rounded-2xl border p-4 ${classes}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                  {stat.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1">{stat.value.toLocaleString()}</p>
                )}
              </div>
              <stat.icon className="w-8 h-8 opacity-20" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function ModerationSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-6">
        <Shield className="w-10 h-10 text-zinc-600" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No items in moderation queue</h3>
      <p className="text-sm text-zinc-500 max-w-md">
        All content looks good! Items that need review will appear here when reported by users or
        flagged by automated systems.
      </p>
    </motion.div>
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
  const typeColors = CONTENT_TYPE_COLORS[item.content_type] || CONTENT_TYPE_COLORS.profile;
  const statusColors = STATUS_COLORS[item.status] || STATUS_COLORS.pending;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`group relative rounded-2xl border bg-[#0a0a0c] p-5 transition-all duration-200 ${
        isPending
          ? "border-white/5 hover:border-rose-500/20"
          : "border-white/[0.03] opacity-70 hover:opacity-90"
      }`}
    >
      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(item.id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Dismiss item"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Header: type badge + status + auto-flagged */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge
          variant="outline"
          className={`${typeColors.bg} ${typeColors.text} ${typeColors.border} border text-xs font-medium`}
        >
          {formatContentType(item.content_type)}
        </Badge>
        <Badge
          variant="outline"
          className={`${statusColors.bg} ${statusColors.text} border-transparent text-xs`}
        >
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
        {item.auto_flagged && (
          <Badge
            variant="outline"
            className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-xs"
          >
            <Zap className="w-3 h-3 mr-1" />
            Auto-flagged
          </Badge>
        )}
      </div>

      {/* Field name */}
      <p className="text-xs text-zinc-500 mb-2 font-mono">{item.field_name}</p>

      {/* Content preview */}
      <div className="mb-4">
        {item.content_url && isImageUrl(item.content_url) ? (
          <div className="relative rounded-xl overflow-hidden border border-white/5 bg-zinc-900/50">
            <img
              src={item.content_url}
              alt="Reported content"
              className="w-full h-32 object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white/70">
              <ImageIcon className="w-3 h-3" />
              Image
            </div>
          </div>
        ) : item.content_url ? (
          <a
            href={item.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl bg-zinc-900/50 border border-white/5 text-sm text-blue-400 hover:text-blue-300 truncate transition-colors"
          >
            <Eye className="w-3.5 h-3.5 inline mr-1.5" />
            {item.content_url}
          </a>
        ) : item.content_text ? (
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
            <p className="text-sm text-zinc-300 line-clamp-3 whitespace-pre-wrap">
              {item.content_text}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-zinc-900/30 border border-white/5">
            <p className="text-sm text-zinc-600 italic">No content preview available</p>
          </div>
        )}
      </div>

      {/* Reported reason */}
      <div className="flex items-start gap-2 mb-4 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
        <Flag className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
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
          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
            <User className="w-3 h-3 text-zinc-500" />
          </div>
        )}
        <span className="text-xs text-zinc-400">
          {item.reporter_username || "System"}
        </span>
        <span className="text-xs text-zinc-600 ml-auto flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(item.created_at)}
        </span>
      </div>

      {/* Review info (for already-reviewed items) */}
      {!isPending && item.reviewed_at && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-900/50 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Eye className="w-3 h-3" />
            Reviewed {formatTimeAgo(item.reviewed_at)}
          </div>
          {item.review_notes && (
            <div className="flex items-start gap-2 text-xs text-zinc-500">
              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{item.review_notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {isPending && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onApprove(item)}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white border-0 h-9"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Approve
          </Button>
          <Button
            size="sm"
            onClick={() => onReject(item)}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white border-0 h-9"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Reject
          </Button>
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
      <DialogContent className="bg-[#0a0a0c] border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {isReject ? (
              <XCircle className="w-5 h-5 text-red-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-400" />
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
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5 text-sm text-zinc-400 space-y-1">
            <p>
              <span className="text-zinc-500">Type:</span>{" "}
              <span className="text-zinc-300">{formatContentType(item.content_type)}</span>
            </p>
            <p>
              <span className="text-zinc-500">Field:</span>{" "}
              <span className="text-zinc-300 font-mono text-xs">{item.field_name}</span>
            </p>
            {item.content_text && (
              <p className="text-zinc-300 line-clamp-2 mt-2">{item.content_text}</p>
            )}
          </div>
        )}

        <Textarea
          placeholder={isReject ? "Reason for rejection (required)..." : "Notes (optional)..."}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 min-h-[100px] resize-none"
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-zinc-800 text-zinc-400 hover:text-white"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className={
              isReject
                ? "bg-red-600 hover:bg-red-500 text-white border-0"
                : "bg-green-600 hover:bg-green-500 text-white border-0"
            }
          >
            {isSubmitting && <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />}
            {isReject ? "Reject" : "Approve"}
          </Button>
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
    <div className="min-h-screen p-4 lg:p-8 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white font-[Poppins]">
              Content Moderation
            </h1>
            <p className="text-zinc-500 text-sm">Review reported and flagged content</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-zinc-800 text-zinc-400 hover:text-white hover:border-rose-500/30 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </motion.header>

      {/* Stats Bar */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <StatsBar />
      </motion.section>

      {/* Filter Controls */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="bg-[#0a0a0c] border-white/10 text-white h-10">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#121214] border-white/10">
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-zinc-300">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="bg-[#0a0a0c] border-white/10 text-white h-10">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-[#121214] border-white/10">
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-zinc-300">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <p className="text-xs text-zinc-500 self-center hidden sm:block">
          {total} item{total !== 1 ? "s" : ""} found
        </p>
      </motion.section>

      {/* Content Grid */}
      {isLoading ? (
        <ModerationSkeleton />
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to load moderation queue</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-md">
            {(error as Error)?.message || "An unexpected error occurred while fetching the moderation queue."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-zinc-800 text-zinc-400 hover:text-white hover:border-rose-500/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </motion.div>
      ) : items.length === 0 ? (
        <EmptyState />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 mt-8"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

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
                <Button
                  key={pageNum}
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 border-zinc-800 ${
                    page === pageNum
                      ? "bg-rose-500/20 border-rose-500/30 text-rose-400"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
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
        <AlertDialogContent className="bg-[#121214] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Dismiss moderation item?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to dismiss this item? This will remove it from the moderation queue permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-zinc-800 text-zinc-400 hover:text-white"
              disabled={dismissMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDismiss}
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={dismissMutation.isPending}
            >
              {dismissMutation.isPending ? "Dismissing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContentModeration;
