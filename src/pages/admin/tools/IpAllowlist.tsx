import { useState, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  CommandButton,
  CommandIconButton,
  CommandEmptyState,
  CommandSection,
  CommandToolbar,
} from "@/components/management/CommandSurface";
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

const STATUS_CHIP: Record<"active" | "inactive" | "expired", string> = {
  active: "border-rose-500/30 text-rose-300",
  expired: "border-amber-500/30 text-amber-300",
  inactive: "border-white/15 text-zinc-400",
};

const FIELD_CLASS =
  "w-full -none border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20";

const LABEL_CLASS =
  "block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-white/10 bg-white/[0.025] p-5">
          <Skeleton className="h-3 w-24 -none" />
          <Skeleton className="mt-3 h-7 w-12 -none" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <CommandSection className="p-0">
      <div className="divide-y divide-white/5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-5 w-36 -none" />
            <Skeleton className="h-3 w-48 -none" />
            <Skeleton className="ml-auto h-5 w-16 -none" />
            <Skeleton className="h-8 w-28 -none" />
          </div>
        ))}
      </div>
    </CommandSection>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "active" | "inactive" | "expired" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${STATUS_CHIP[status]}`}
    >
      {status === "expired" ? <Clock className="h-3 w-3" /> : null}
      {status}
    </span>
  );
}

// ── Entry Meta / Actions ────────────────────────────────────────────────────

function EntryMeta({ entry }: { entry: IpAllowlistEntry }) {
  const expired = entry.expiresAt ? isExpired(entry.expiresAt) : false;
  return (
    <>
      {entry.createdByUsername && (
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {entry.createdByUsername}
        </span>
      )}
      <span className="flex items-center gap-1 font-mono tabular-nums">
        <Clock className="h-3 w-3" />
        {formatDate(entry.createdAt)}
      </span>
      {entry.expiresAt && (
        <span className={`font-mono tabular-nums ${expired ? "text-amber-300" : ""}`}>
          {expired ? "Expired" : "Expires"}: {formatDate(entry.expiresAt)}
        </span>
      )}
    </>
  );
}

function EntryActions({
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
  return (
    <>
      <CommandIconButton
        label={`Edit IP ${entry.ipAddress}`}
        variant="ghost"
        onClick={() => onEdit(entry)}
      >
        <Pencil />
      </CommandIconButton>
      <CommandIconButton
        label={entry.isActive ? `Deactivate IP ${entry.ipAddress}` : `Activate IP ${entry.ipAddress}`}
        variant={entry.isActive ? "danger" : "ghost"}
        onClick={() => onToggle(entry)}
      >
        {entry.isActive ? <XCircle /> : <CheckCircle />}
      </CommandIconButton>
      <CommandIconButton
        label={`Delete IP ${entry.ipAddress}`}
        variant="danger"
        onClick={() => onDelete(entry)}
      >
        <Trash2 />
      </CommandIconButton>
    </>
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
      <DialogContent className="-none border-white/10 bg-[#0a0a0c] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
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
            <label htmlFor="ip-address" className={LABEL_CLASS}>
              IP Address
            </label>
            {isEdit ? (
              <p className="-none border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm tabular-nums text-zinc-400">
                {entry.ipAddress}
              </p>
            ) : (
              <>
                <input
                  id="ip-address"
                  placeholder="e.g. 192.168.1.1"
                  value={ipAddress}
                  onChange={(e) => {
                    setIpAddress(e.target.value);
                    if (ipError) setIpError("");
                  }}
                  onBlur={validate}
                  className={`${FIELD_CLASS} font-mono`}
                  autoFocus
                />
                {ipError && (
                  <p className="flex items-center gap-1 text-xs text-red-300">
                    <AlertTriangle className="h-3 w-3" />
                    {ipError}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="ip-label" className={LABEL_CLASS}>
              Label <span className="font-mono normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="ip-label"
              placeholder="e.g. Office VPN, Home Network"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="ip-expiry" className={LABEL_CLASS}>
              Expires At <span className="font-mono normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="ip-expiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={`${FIELD_CLASS} font-mono tabular-nums [color-scheme:dark]`}
            />
            <p className="text-xs text-zinc-500">Leave empty for no expiry.</p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <CommandButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </CommandButton>
            <CommandButton type="submit" size="sm" disabled={isPending}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : isEdit ? <CheckCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEdit ? "Save Changes" : "Add IP"}
            </CommandButton>
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
      <AlertDialogContent className="-none border-white/10 bg-[#0a0a0c]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-white">
            {enabling ? (
              <AlertTriangle className="h-4 w-4 text-amber-300" />
            ) : (
              <Globe className="h-4 w-4 text-zinc-400" />
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
          <AlertDialogCancel asChild>
            <CommandButton variant="ghost" size="sm">Cancel</CommandButton>
          </AlertDialogCancel>
          <AlertDialogAction
            asChild
            onClick={onConfirm}
            disabled={isPending}
          >
            <CommandButton variant={enabling ? "primary" : "secondary"} size="sm">
              {isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
              {enabling ? "Enable Allowlist" : "Disable Allowlist"}
            </CommandButton>
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
      <AlertDialogContent className="-none border-white/10 bg-[#0a0a0c]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-white">
            <Trash2 className="h-4 w-4 text-red-300" />
            Delete IP Entry
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-zinc-400">
            <span className="block">
              Are you sure you want to remove{" "}
              <span className="font-mono tabular-nums text-white">{entry?.ipAddress}</span>
              {entry?.label ? ` (${entry.label})` : ""} from the allowlist?
            </span>
            {isLastActive && allowlistEnabled && (
              <span className="flex items-start gap-2 -none border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This is the last active IP entry. Deleting it while the allowlist is enabled
                  may lock you out of the admin panel.
                </span>
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <CommandButton variant="ghost" size="sm">Cancel</CommandButton>
          </AlertDialogCancel>
          <AlertDialogAction asChild onClick={onConfirm} disabled={isPending}>
            <CommandButton variant="danger" size="sm">
              {isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
              Delete IP
            </CommandButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Error State ─────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border border-red-500/20 bg-red-500/5 p-8 text-center">
      <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-red-300" />
      <h3 className="mb-2 font-semibold text-white">Failed to load</h3>
      <p className="mb-4 text-sm text-zinc-400">{message}</p>
      <CommandButton variant="danger" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Try Again
      </CommandButton>
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
    <AdminPage
      eyebrow="Security"
      title="IP Allowlist"
      description="Restrict admin panel access to trusted IP addresses"
      actions={
        <div className="flex items-center gap-3">
          <label htmlFor="allowlist-toggle" className="sr-only">
            Toggle IP Allowlist
          </label>
          <span
            className={`border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
              allowlistEnabled ? "border-rose-500/30 text-rose-300" : "border-white/15 text-zinc-500"
            }`}
          >
            {allowlistEnabled ? "Enabled" : "Disabled"}
          </span>
          <Switch
            id="allowlist-toggle"
            checked={allowlistEnabled}
            onCheckedChange={() => setToggleConfirmOpen(true)}
            aria-label={allowlistEnabled ? "Disable IP allowlist" : "Enable IP allowlist"}
          />
        </div>
      }
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-mono text-[11px]" aria-label="Breadcrumb">
        <Link
          to="/admin"
          className="flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Admin
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-300">IP Allowlist</span>
      </nav>

      {/* Stats */}
      {isLoading ? (
        <StatsSkeleton />
      ) : hasError ? null : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="border border-white/10 bg-white/[0.025] p-4 sm:p-5">
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Status</p>
            <p className={`text-lg font-black ${allowlistEnabled ? "text-rose-300" : "text-zinc-400"}`}>
              {allowlistEnabled ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="border border-white/10 bg-white/[0.025] p-4 sm:p-5">
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Total IPs</p>
            <p className="text-lg font-black tabular-nums text-white">{status?.totalEntries ?? 0}</p>
          </div>
          <div className="col-span-2 border border-white/10 bg-white/[0.025] p-4 sm:col-span-1 sm:p-5">
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Active IPs</p>
            <p className="text-lg font-black tabular-nums text-white">{status?.activeEntries ?? 0}</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {!isLoading && !hasError && (
        <CommandToolbar>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              placeholder="Search by IP, label, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search IP entries"
              className="w-full -none border border-white/10 bg-black/40 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <CommandIconButton
              label="Refresh list"
              variant="ghost"
              onClick={() => {
                refetchList();
                refetchStatus();
              }}
            >
              <RefreshCw />
            </CommandIconButton>
            <CommandButton size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add IP
            </CommandButton>
          </div>
        </CommandToolbar>
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
        <CommandEmptyState
          title="No IP addresses yet"
          description="Add IP addresses to restrict admin panel access to trusted networks only."
          icon={<Globe className="h-5 w-5" />}
          action={
            <CommandButton size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add First IP
            </CommandButton>
          }
        />
      ) : sorted.length === 0 ? (
        <CommandSection className="py-10 text-center">
          <Search className="mx-auto mb-3 h-6 w-6 text-zinc-600" />
          <p className="text-sm text-zinc-400">
            No IPs matching "<span className="text-white">{search}</span>"
          </p>
        </CommandSection>
      ) : (
        <CommandSection className="overflow-hidden p-0">
          {/* Desktop table */}
          <table className="hidden w-full text-left text-sm sm:table">
            <thead className="bg-black/40">
              <tr className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((entry) => {
                const entryStatus = getEntryStatus(entry);
                const dimmed = entryStatus === "expired" || entryStatus === "inactive";
                const expired = entry.expiresAt ? isExpired(entry.expiresAt) : false;
                return (
                  <tr key={entry.id} className={`transition-colors hover:bg-white/[0.02] ${dimmed ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 font-mono text-sm tabular-nums text-white">{entry.ipAddress}</td>
                    <td className="max-w-[220px] px-4 py-3">
                      {entry.label && <p className="truncate text-zinc-300">{entry.label}</p>}
                      {entry.createdByUsername && (
                        <p className="flex items-center gap-1 truncate text-xs text-zinc-500">
                          <User className="h-3 w-3" />
                          {entry.createdByUsername}
                        </p>
                      )}
                      {!entry.label && !entry.createdByUsername && <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={entryStatus} /></td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-zinc-500">{formatDate(entry.createdAt)}</td>
                    <td className={`px-4 py-3 font-mono text-xs tabular-nums ${expired ? "text-amber-300" : entry.expiresAt ? "text-zinc-400" : "text-zinc-600"}`}>
                      {entry.expiresAt ? formatDate(entry.expiresAt) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <EntryActions
                          entry={entry}
                          onEdit={setEditEntry}
                          onToggle={handleToggleEntry}
                          onDelete={setDeleteEntry}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile stacked rows */}
          <div className="divide-y divide-white/5 sm:hidden">
            {sorted.map((entry) => {
              const entryStatus = getEntryStatus(entry);
              const dimmed = entryStatus === "expired" || entryStatus === "inactive";
              return (
                <div key={entry.id} className={`space-y-3 p-4 ${dimmed ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm tabular-nums text-white">{entry.ipAddress}</p>
                      {entry.label && <p className="mt-0.5 truncate text-xs text-zinc-400">{entry.label}</p>}
                    </div>
                    <StatusBadge status={entryStatus} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <EntryMeta entry={entry} />
                  </div>

                  <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                    <EntryActions
                      entry={entry}
                      onEdit={setEditEntry}
                      onToggle={handleToggleEntry}
                      onDelete={setDeleteEntry}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CommandSection>
      )}

      {/* Info bar when enabled */}
      {!isLoading && !hasError && allowlistEnabled && ipList.length > 0 && (
        <div className="flex items-start gap-3 border border-white/10 bg-white/[0.025] p-4">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <p className="text-xs text-zinc-300">
            IP allowlist is active. Only the {activeCount} active IP{activeCount !== 1 ? "s" : ""} listed above can access the admin panel.
          </p>
        </div>
      )}

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
    </AdminPage>
  );
}
