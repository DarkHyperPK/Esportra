import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  ChevronLeft,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  useIpAllowlist,
  useIpAllowlistStatus,
  useAddIpAllowlist,
  useUpdateIpAllowlist,
  useDeleteIpAllowlist,
  useToggleIpAllowlist,
} from "@/hooks/useAdminQueries";
import type { IpAllowlistEntry } from "@/hooks/useAdminQueries";
import { Link } from "react-router-dom";

// ── Constants ───────────────────────────────────────────────────────────────

const IP_REGEX = /^(?:(?:\d{1,3}\.){3}\d{1,3}|[a-fA-F0-9:]+)$/;

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function getEntryStatus(entry: IpAllowlistEntry): "active" | "inactive" | "expired" {
  if (entry.expiresAt && isExpired(entry.expiresAt)) return "expired";
  return entry.isActive ? "active" : "inactive";
}

// ── Skeleton Components ─────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 flex items-center gap-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "active" | "inactive" | "expired" }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1.5 font-medium">
        <Clock className="h-3 w-3" />
        Expired
      </Badge>
    );
  }
  return (
    <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 gap-1.5 font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
      Inactive
    </Badge>
  );
}

// ── Entry Card ──────────────────────────────────────────────────────────────

function IpEntryCard({
  entry,
  onEdit,
  onToggle,
  onDelete,
}: {
  entry: IpAllowlistEntry;
  onEdit: (entry: IpAllowlistEntry) => void;
  onToggle: (entry: IpAllowlistEntry) => void;
  onDelete: (entry: IpAllowlistEntry) => void;
}) {
  const status = getEntryStatus(entry);
  const dimmed = status === "expired" || status === "inactive";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border bg-[#0a0a0c] p-4 sm:p-5 transition-colors ${
        dimmed ? "border-white/[0.03] opacity-60" : "border-white/5 hover:border-white/10"
      }`}
    >
      {/* Mobile layout */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm text-white font-medium truncate">{entry.ipAddress}</p>
            {entry.label && (
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{entry.label}</p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {entry.createdByUsername && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {entry.createdByUsername}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(entry.createdAt)}
          </span>
        </div>

        {entry.expiresAt && (
          <p className={`text-xs ${isExpired(entry.expiresAt) ? "text-amber-400" : "text-zinc-500"}`}>
            {isExpired(entry.expiresAt) ? "Expired" : "Expires"}: {formatDate(entry.expiresAt)}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 flex-1 text-zinc-400 hover:text-white hover:bg-white/5"
            onClick={() => onEdit(entry)}
            aria-label={`Edit IP ${entry.ipAddress}`}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 flex-1 ${
              entry.isActive
                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            }`}
            onClick={() => onToggle(entry)}
            aria-label={entry.isActive ? `Deactivate IP ${entry.ipAddress}` : `Activate IP ${entry.ipAddress}`}
          >
            {entry.isActive ? <XCircle className="h-3.5 w-3.5 mr-1.5" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
            {entry.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2"
            onClick={() => onDelete(entry)}
            aria-label={`Delete IP ${entry.ipAddress}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:flex sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <p className="font-mono text-sm text-white font-medium">{entry.ipAddress}</p>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-500">
            {entry.label && <span className="text-zinc-400">{entry.label}</span>}
            {entry.createdByUsername && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {entry.createdByUsername}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(entry.createdAt)}
            </span>
            {entry.expiresAt && (
              <span className={isExpired(entry.expiresAt) ? "text-amber-400" : ""}>
                {isExpired(entry.expiresAt) ? "Expired" : "Expires"}: {formatDate(entry.expiresAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/5"
            onClick={() => onEdit(entry)}
            aria-label={`Edit IP ${entry.ipAddress}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 w-8 p-0 ${
              entry.isActive
                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            }`}
            onClick={() => onToggle(entry)}
            aria-label={entry.isActive ? `Deactivate IP ${entry.ipAddress}` : `Activate IP ${entry.ipAddress}`}
          >
            {entry.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => onDelete(entry)}
            aria-label={`Delete IP ${entry.ipAddress}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Add / Edit Dialog ───────────────────────────────────────────────────────

function IpFormDialog({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: IpAllowlistEntry | null;
  onSubmit: (data: { ipAddress: string; label: string; expiresAt: string }) => void;
  isPending: boolean;
}) {
  const isEdit = !!entry;
  const [ipAddress, setIpAddress] = useState(entry?.ipAddress ?? "");
  const [label, setLabel] = useState(entry?.label ?? "");
  const [expiresAt, setExpiresAt] = useState(
    entry?.expiresAt ? new Date(entry.expiresAt).toISOString().slice(0, 16) : ""
  );
  const [ipError, setIpError] = useState("");

  // Reset form when dialog opens/closes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setIpAddress(entry?.ipAddress ?? "");
        setLabel(entry?.label ?? "");
        setExpiresAt(entry?.expiresAt ? new Date(entry.expiresAt).toISOString().slice(0, 16) : "");
        setIpError("");
      }
      onOpenChange(nextOpen);
    },
    [entry, onOpenChange]
  );

  const validate = (): boolean => {
    if (!isEdit && !ipAddress.trim()) {
      setIpError("IP address is required");
      return false;
    }
    if (!isEdit && !IP_REGEX.test(ipAddress.trim())) {
      setIpError("Enter a valid IPv4 or IPv6 address");
      return false;
    }
    setIpError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ipAddress: ipAddress.trim(),
      label: label.trim(),
      expiresAt: expiresAt || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#121214] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white font-poppins flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4 text-rose-400" /> : <Plus className="h-4 w-4 text-rose-400" />}
            {isEdit ? "Edit IP Entry" : "Add IP Address"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isEdit
              ? "Update the label or expiry for this IP entry."
              : "Add an IP address to the allowlist. Only allowlisted IPs can access the admin panel when enabled."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="ip-address" className="text-zinc-300 text-sm">
              IP Address
            </Label>
            {isEdit ? (
              <p className="font-mono text-sm text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-2 border border-white/5">
                {entry.ipAddress}
              </p>
            ) : (
              <>
                <Input
                  id="ip-address"
                  placeholder="e.g. 192.168.1.1"
                  value={ipAddress}
                  onChange={(e) => {
                    setIpAddress(e.target.value);
                    if (ipError) setIpError("");
                  }}
                  onBlur={validate}
                  className="font-mono bg-[#0a0a0c] border-white/10 text-white placeholder:text-zinc-600 focus:border-rose-500/50"
                  autoFocus
                />
                {ipError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {ipError}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-label" className="text-zinc-300 text-sm">
              Label <span className="text-zinc-600">(optional)</span>
            </Label>
            <Input
              id="ip-label"
              placeholder="e.g. Office VPN, Home Network"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-[#0a0a0c] border-white/10 text-white placeholder:text-zinc-600 focus:border-rose-500/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-expiry" className="text-zinc-300 text-sm">
              Expires At <span className="text-zinc-600">(optional)</span>
            </Label>
            <Input
              id="ip-expiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="bg-[#0a0a0c] border-white/10 text-white focus:border-rose-500/50 [color-scheme:dark]"
            />
            <p className="text-xs text-zinc-500">Leave empty for no expiry.</p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="text-zinc-400 hover:text-white hover:bg-white/5"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-rose-500 hover:bg-rose-400 text-white"
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : isEdit ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {isEdit ? "Save Changes" : "Add IP"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Toggle Confirmation Dialog ──────────────────────────────────────────────

function ToggleConfirmDialog({
  open,
  onOpenChange,
  enabling,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabling: boolean;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#121214] border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white font-poppins flex items-center gap-2">
            {enabling ? (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            ) : (
              <Globe className="h-5 w-5 text-blue-400" />
            )}
            {enabling ? "Enable IP Allowlist?" : "Disable IP Allowlist?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            {enabling
              ? "Only IPs in this allowlist will be able to access the admin panel. Make sure your current IP is listed before enabling."
              : "All IPs will be able to access the admin panel. This removes the IP restriction layer."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={
              enabling
                ? "bg-amber-500 hover:bg-amber-400 text-black"
                : "bg-blue-500 hover:bg-blue-400 text-white"
            }
          >
            {isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {enabling ? "Enable Allowlist" : "Disable Allowlist"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Delete Confirmation Dialog ──────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  onOpenChange,
  entry,
  isLastActive,
  allowlistEnabled,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: IpAllowlistEntry | null;
  isLastActive: boolean;
  allowlistEnabled: boolean;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#121214] border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white font-poppins flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            Delete IP Entry
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400 space-y-2">
            <span className="block">
              Are you sure you want to remove{" "}
              <span className="font-mono text-white">{entry?.ipAddress}</span>
              {entry?.label ? ` (${entry.label})` : ""} from the allowlist?
            </span>
            {isLastActive && allowlistEnabled && (
              <span className="flex items-start gap-2 bg-red-500/10 text-red-400 rounded-lg p-3 text-xs border border-red-500/20">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  This is the last active IP entry. Deleting it while the allowlist is enabled
                  may lock you out of the admin panel.
                </span>
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-500 hover:bg-red-400 text-white"
          >
            {isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Delete IP
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed border-white/10 bg-[#0a0a0c]/50 p-12 text-center"
    >
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-rose-500/10 mb-4">
        <Globe className="h-7 w-7 text-rose-400" />
      </div>
      <h3 className="text-white font-poppins font-semibold text-lg mb-2">No IP addresses yet</h3>
      <p className="text-zinc-400 text-sm mb-6 max-w-sm mx-auto">
        Add IP addresses to restrict admin panel access to trusted networks only.
      </p>
      <Button
        onClick={onAdd}
        className="bg-rose-500 hover:bg-rose-400 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add First IP
      </Button>
    </motion.div>
  );
}

// ── Error State ─────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
      <h3 className="text-white font-poppins font-semibold mb-2">Failed to load</h3>
      <p className="text-zinc-400 text-sm mb-4">{message}</p>
      <Button variant="ghost" onClick={onRetry} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function IpAllowlist() {
  const { data: entries, isLoading: listLoading, error: listError, refetch: refetchList } = useIpAllowlist();
  const { data: status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useIpAllowlistStatus();

  const addMutation = useAddIpAllowlist();
  const updateMutation = useUpdateIpAllowlist();
  const deleteMutation = useDeleteIpAllowlist();
  const toggleMutation = useToggleIpAllowlist();

  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<IpAllowlistEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<IpAllowlistEntry | null>(null);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);

  const isLoading = listLoading || statusLoading;
  const hasError = listError || statusError;

  const ipList = entries ?? [];
  const allowlistEnabled = status?.enabled ?? false;

  const activeCount = ipList.filter((e) => getEntryStatus(e) === "active").length;

  const filtered = ipList.filter((entry) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      entry.ipAddress.toLowerCase().includes(q) ||
      (entry.label && entry.label.toLowerCase().includes(q)) ||
      (entry.createdByUsername && entry.createdByUsername.toLowerCase().includes(q))
    );
  });

  // Sort: active first, then inactive, then expired
  const sorted = [...filtered].sort((a, b) => {
    const order = { active: 0, inactive: 1, expired: 2 };
    return order[getEntryStatus(a)] - order[getEntryStatus(b)];
  });

  const handleAdd = useCallback(
    (data: { ipAddress: string; label: string; expiresAt: string }) => {
      addMutation.mutate(
        {
          ipAddress: data.ipAddress,
          label: data.label || undefined,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
        },
        { onSuccess: () => setAddDialogOpen(false) }
      );
    },
    [addMutation]
  );

  const handleEdit = useCallback(
    (data: { ipAddress: string; label: string; expiresAt: string }) => {
      if (!editEntry) return;
      updateMutation.mutate(
        {
          id: editEntry.id,
          label: data.label || undefined,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        },
        { onSuccess: () => setEditEntry(null) }
      );
    },
    [editEntry, updateMutation]
  );

  const handleToggleEntry = useCallback(
    (entry: IpAllowlistEntry) => {
      updateMutation.mutate({
        id: entry.id,
        isActive: !entry.isActive,
      });
    },
    [updateMutation]
  );

  const handleDelete = useCallback(() => {
    if (!deleteEntry) return;
    deleteMutation.mutate(deleteEntry.id, {
      onSuccess: () => setDeleteEntry(null),
    });
  }, [deleteEntry, deleteMutation]);

  const handleToggleAllowlist = useCallback(() => {
    toggleMutation.mutate(undefined, {
      onSuccess: () => setToggleConfirmOpen(false),
    });
  }, [toggleMutation]);

  const isLastActiveEntry =
    deleteEntry != null && activeCount <= 1 && getEntryStatus(deleteEntry) === "active";

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Link
            to="/admin"
            className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Admin
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300">IP Allowlist</span>
        </nav>

        {/* Header Card */}
        {isLoading ? (
          <HeaderSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-poppins font-bold text-white flex items-center gap-2">
                    IP Allowlist
                    {allowlistEnabled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 bg-zinc-500/10 rounded-full px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                        Disabled
                      </span>
                    )}
                  </h1>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    Restrict admin panel access to trusted IP addresses
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="allowlist-toggle" className="text-sm text-zinc-400 sr-only">
                  Toggle IP Allowlist
                </Label>
                <Switch
                  id="allowlist-toggle"
                  checked={allowlistEnabled}
                  onCheckedChange={() => setToggleConfirmOpen(true)}
                  aria-label={allowlistEnabled ? "Disable IP allowlist" : "Enable IP allowlist"}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        {isLoading ? (
          <StatsSkeleton />
        ) : hasError ? null : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
          >
            <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 sm:p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
              <p className={`text-lg font-bold font-poppins ${allowlistEnabled ? "text-emerald-400" : "text-zinc-400"}`}>
                {allowlistEnabled ? "Active" : "Inactive"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 sm:p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total IPs</p>
              <p className="text-lg font-bold font-poppins text-white">{status?.totalEntries ?? 0}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 sm:p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Active IPs</p>
              <p className="text-lg font-bold font-poppins text-emerald-400">{status?.activeEntries ?? 0}</p>
            </div>
          </motion.div>
        )}

        {/* Toolbar */}
        {!isLoading && !hasError && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <Input
                placeholder="Search by IP, label, or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#0a0a0c] border-white/10 text-white placeholder:text-zinc-600 focus:border-rose-500/50"
                aria-label="Search IP entries"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  refetchList();
                  refetchStatus();
                }}
                className="text-zinc-400 hover:text-white hover:bg-white/5 h-9"
                aria-label="Refresh list"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-rose-500 hover:bg-rose-400 text-white h-9"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add IP
              </Button>
            </div>
          </motion.div>
        )}

        {/* Content */}
        {isLoading ? (
          <TableSkeleton />
        ) : hasError ? (
          <ErrorState
            message="Could not load IP allowlist data."
            onRetry={() => {
              refetchList();
              refetchStatus();
            }}
          />
        ) : ipList.length === 0 ? (
          <EmptyState onAdd={() => setAddDialogOpen(true)} />
        ) : sorted.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-8 text-center"
          >
            <Search className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">
              No IPs matching "<span className="text-white">{search}</span>"
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3" role="list" aria-label="IP allowlist entries">
              {sorted.map((entry) => (
                <IpEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={setEditEntry}
                  onToggle={handleToggleEntry}
                  onDelete={setDeleteEntry}
                />
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Info bar when enabled */}
        {!isLoading && !hasError && allowlistEnabled && ipList.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4 flex items-start gap-3"
          >
            <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-300/80">
              IP allowlist is active. Only the {activeCount} active IP{activeCount !== 1 ? "s" : ""} listed above can access the admin panel.
            </p>
          </motion.div>
        )}
      </div>

      {/* Add Dialog */}
      <IpFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        entry={null}
        onSubmit={handleAdd}
        isPending={addMutation.isPending}
      />

      {/* Edit Dialog */}
      <IpFormDialog
        open={!!editEntry}
        onOpenChange={(open) => {
          if (!open) setEditEntry(null);
        }}
        entry={editEntry}
        onSubmit={handleEdit}
        isPending={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteEntry}
        onOpenChange={(open) => {
          if (!open) setDeleteEntry(null);
        }}
        entry={deleteEntry}
        isLastActive={isLastActiveEntry}
        allowlistEnabled={allowlistEnabled}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />

      {/* Toggle Confirmation */}
      <ToggleConfirmDialog
        open={toggleConfirmOpen}
        onOpenChange={setToggleConfirmOpen}
        enabling={!allowlistEnabled}
        onConfirm={handleToggleAllowlist}
        isPending={toggleMutation.isPending}
      />
    </div>
  );
}
