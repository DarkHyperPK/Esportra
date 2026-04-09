import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Key,
  UserCog,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  use2faStatus,
  use2faUsers,
  useSave2faSettings,
  useDeleteMfaFactor,
} from "@/hooks/useAdminQueries";
import type { TwoFactorUser, TwoFactorFactor } from "@/hooks/useAdminQueries";
import { Link } from "react-router-dom";

// ── Constants ────────────────────────────────────────────────────────────────

const KNOWN_ROLES = [
  { key: "super_admin", label: "Super Admin" },
  { key: "moderator", label: "Moderator" },
  { key: "support", label: "Support" },
];

const PER_PAGE = 15;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a0a0c] border border-white/5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500 truncate">{label}</p>
        <div className="text-lg font-bold text-white leading-tight">{value}</div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[#0a0a0c] border border-white/5">
          <Skeleton className="w-9 h-9 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40 bg-zinc-800" />
            <Skeleton className="h-3 w-56 bg-zinc-800" />
          </div>
          <Skeleton className="h-5 w-20 bg-zinc-800 rounded-full" />
          <Skeleton className="h-5 w-16 bg-zinc-800 rounded-full" />
          <Skeleton className="h-8 w-24 bg-zinc-800 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ── Factor Chip ──────────────────────────────────────────────────────────────

function FactorChip({ factor }: { factor: TwoFactorFactor }) {
  const isVerified = factor.status === "verified";
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-900 border border-white/5 text-xs">
      <Key className="w-3 h-3 text-zinc-400 shrink-0" />
      <span className="text-zinc-300 uppercase font-mono tracking-wide">{factor.type}</span>
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isVerified ? "bg-green-400" : "bg-amber-400"
        }`}
      />
    </div>
  );
}

// ── MFA Status Badge ─────────────────────────────────────────────────────────

function MfaBadge({ user }: { user: TwoFactorUser }) {
  if (user.mfaEnabled) {
    return (
      <Badge className="bg-green-500/10 text-green-400 border-green-500/20 gap-1.5 select-none">
        <ShieldCheck className="w-3 h-3" />
        Enabled
      </Badge>
    );
  }
  if (user.requiresMfa && !user.mfaEnabled) {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1.5 select-none">
        <ShieldAlert className="w-3 h-3" />
        Required, missing
      </Badge>
    );
  }
  return (
    <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 gap-1.5 select-none">
      <ShieldOff className="w-3 h-3" />
      Disabled
    </Badge>
  );
}

// ── Factors Dialog ───────────────────────────────────────────────────────────

function FactorsDialog({
  user,
  open,
  onClose,
}: {
  user: TwoFactorUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const deleteFactor = useDeleteMfaFactor();
  const [pendingDelete, setPendingDelete] = useState<TwoFactorFactor | null>(null);

  if (!user) return null;

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteFactor.mutate(
      { userId: user.userId, factorId: pendingDelete.id },
      {
        onSuccess: () => {
          setPendingDelete(null);
          onClose();
        },
      },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="bg-[#0a0a0c] border border-white/5 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Key className="w-4 h-4 text-rose-400" />
              MFA Factors — {user.fullName || user.email}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              {user.email} · {user.roleName}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            {user.mfaFactors.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-3 text-zinc-500">
                <ShieldOff className="w-8 h-8 opacity-40" />
                <p className="text-sm">No MFA factors registered</p>
              </div>
            ) : (
              user.mfaFactors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-white/5"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                        {factor.type}
                      </span>
                      <Badge
                        className={`text-[10px] px-1.5 py-0 h-4 select-none ${
                          factor.status === "verified"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {factor.status}
                      </Badge>
                    </div>
                    {factor.friendlyName && (
                      <p className="text-xs text-zinc-400 truncate">{factor.friendlyName}</p>
                    )}
                    <p className="text-[11px] text-zinc-600">Registered {formatDate(factor.createdAt)}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(factor)}
                    className="shrink-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 px-3"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Force Remove
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-zinc-800 text-zinc-400 hover:text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent className="bg-[#0a0a0c] border border-white/5 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Force Remove Factor?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently remove the{" "}
              <span className="font-semibold text-white uppercase">{pendingDelete?.type}</span> factor from{" "}
              <span className="font-semibold text-white">{user.email}</span>. The user will need to
              re-enroll their authenticator app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-zinc-800 text-zinc-400 hover:text-white bg-transparent"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteFactor.isPending}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {deleteFactor.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              )}
              Force Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({
  initialEnabled,
  initialRoles,
}: {
  initialEnabled: boolean;
  initialRoles: string[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);
  const saveSettings = useSave2faSettings();

  const toggleRole = (key: string) => {
    setSelectedRoles((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key],
    );
  };

  const handleSave = () => {
    saveSettings.mutate({ enforcementEnabled: enabled, requiredRoles: selectedRoles });
  };

  return (
    <div className="p-6 rounded-3xl bg-[#0a0a0c] border border-white/5 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
          <UserCog className="w-4.5 h-4.5 text-rose-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Enforcement Settings</h2>
          <p className="text-xs text-zinc-500">Configure which roles must have 2FA active</p>
        </div>
      </div>

      {/* Enforcement toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-white/5">
        <div>
          <Label htmlFor="enforcement-toggle" className="text-sm font-medium text-white cursor-pointer">
            Enforcement Enabled
          </Label>
          <p className="text-xs text-zinc-500 mt-0.5">
            Admins in required roles without 2FA will be flagged
          </p>
        </div>
        <Switch
          id="enforcement-toggle"
          checked={enabled}
          onCheckedChange={setEnabled}
          className="data-[state=checked]:bg-rose-500"
        />
      </div>

      {/* Required roles */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Required Roles
        </Label>
        <div className="flex flex-wrap gap-2">
          {KNOWN_ROLES.map((role) => {
            const active = selectedRoles.includes(role.key);
            return (
              <button
                key={role.key}
                type="button"
                onClick={() => toggleRole(role.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all select-none ${
                  active
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : "bg-zinc-900 text-zinc-500 border-white/5 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-zinc-600">
          {selectedRoles.length === 0 ? "No roles selected — enforcement will have no effect." : `Enforced on: ${selectedRoles.join(", ")}`}
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={saveSettings.isPending}
        className="bg-rose-500 hover:bg-rose-400 text-white font-semibold h-9 px-5"
      >
        {saveSettings.isPending ? (
          <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
        ) : (
          <Shield className="w-3.5 h-3.5 mr-2" />
        )}
        Save Settings
      </Button>
    </div>
  );
}

// ── Users Table ───────────────────────────────────────────────────────────────

function UsersTable() {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [mfaFilter, setMfaFilter] = useState<string>("all");
  const [viewUser, setViewUser] = useState<TwoFactorUser | null>(null);

  const { data, isLoading, isError, refetch } = use2faUsers(
    page,
    PER_PAGE,
    roleFilter === "all" ? "" : roleFilter,
    mfaFilter === "all" ? "" : mfaFilter,
  );

  const users: TwoFactorUser[] = data?.users ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44 bg-[#0a0a0c] border-white/5 text-zinc-300 text-sm h-9">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0c] border-white/5 text-zinc-200">
            <SelectItem value="all">All Roles</SelectItem>
            {KNOWN_ROLES.map((r) => (
              <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mfaFilter} onValueChange={(v) => { setMfaFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44 bg-[#0a0a0c] border-white/5 text-zinc-300 text-sm h-9">
            <SelectValue placeholder="Filter by 2FA" />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0c] border-white/5 text-zinc-200">
            <SelectItem value="all">All 2FA Status</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-zinc-800 text-zinc-400 hover:text-white h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#0a0a0c] border border-white/5 overflow-hidden">
        {/* Header — hidden on mobile */}
        <div className="hidden md:grid grid-cols-[1fr_140px_160px_160px_120px] gap-4 px-5 py-3 border-b border-white/5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          <span>User</span>
          <span>Role</span>
          <span>2FA Status</span>
          <span>Factors</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : isError ? (
          <div className="py-16 flex flex-col items-center gap-3 text-zinc-500">
            <AlertTriangle className="w-8 h-8 opacity-40" />
            <p className="text-sm">Failed to load users</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-zinc-800 text-zinc-400 hover:text-white mt-1"
            >
              Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-zinc-500">
            <Shield className="w-8 h-8 opacity-40" />
            <p className="text-sm">No admin users found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {users.map((user, idx) => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group grid grid-cols-1 md:grid-cols-[1fr_140px_160px_160px_120px] gap-3 md:gap-4 items-start md:items-center px-5 py-4 hover:bg-zinc-900/40 transition-colors"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-white/5 shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || user.email}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-semibold">
                        {(user.fullName || user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.fullName || "—"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex md:block items-center gap-2">
                  <span className="md:hidden text-[10px] text-zinc-600 uppercase tracking-wider w-20 shrink-0">Role</span>
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono text-[10px] select-none">
                    {user.roleName || user.roleKey}
                  </Badge>
                </div>

                {/* 2FA Status */}
                <div className="flex md:block items-center gap-2">
                  <span className="md:hidden text-[10px] text-zinc-600 uppercase tracking-wider w-20 shrink-0">2FA</span>
                  <MfaBadge user={user} />
                </div>

                {/* Factors */}
                <div className="flex md:flex-wrap items-center gap-2">
                  <span className="md:hidden text-[10px] text-zinc-600 uppercase tracking-wider w-20 shrink-0">Factors</span>
                  {user.mfaFactors.length === 0 ? (
                    <span className="text-xs text-zinc-600">—</span>
                  ) : (
                    user.mfaFactors.map((f) => <FactorChip key={f.id} factor={f} />)
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-start md:justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewUser(user)}
                    className="h-8 px-3 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View Factors
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-zinc-500">
            {total.toLocaleString()} user{total !== 1 ? "s" : ""} · page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 border-zinc-800 text-zinc-400 hover:text-white"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0 border-zinc-800 text-zinc-400 hover:text-white"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Factor detail dialog */}
      <FactorsDialog user={viewUser} open={!!viewUser} onClose={() => setViewUser(null)} />
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TwoFactorEnforcement() {
  const { data: status, isLoading: statusLoading, isError: statusError, refetch: refetchStatus } = use2faStatus();

  const coveragePercent =
    status && status.totalAdmins > 0
      ? Math.round((status.mfaEnabledCount / status.totalAdmins) * 100)
      : 0;

  return (
    <div className="min-h-screen p-4 lg:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-white h-8 w-8 p-0"
              aria-label="Back to admin dashboard"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-5.5 h-5.5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">2FA Enforcement</h1>
            <p className="text-sm text-zinc-500">
              Manage two-factor authentication requirements for admin roles
            </p>
          </div>
        </div>

        {status?.note && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm max-w-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{status.note}</span>
          </div>
        )}
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard
          label="Total Admin Users"
          icon={UserCog}
          accent="bg-rose-500/10 text-rose-400"
          value={statusLoading ? <Skeleton className="h-6 w-12 bg-zinc-800" /> : (status?.totalAdmins ?? 0).toLocaleString()}
        />
        <StatCard
          label="2FA Enabled"
          icon={ShieldCheck}
          accent="bg-green-500/10 text-green-400"
          value={statusLoading ? <Skeleton className="h-6 w-12 bg-zinc-800" /> : (
            <span>
              {(status?.mfaEnabledCount ?? 0).toLocaleString()}
              <span className="text-sm font-normal text-zinc-500 ml-1">({coveragePercent}%)</span>
            </span>
          )}
        />
        <StatCard
          label="Enforcement"
          icon={Shield}
          accent={status?.enforcementEnabled ? "bg-green-500/10 text-green-400" : "bg-zinc-500/10 text-zinc-400"}
          value={statusLoading ? (
            <Skeleton className="h-6 w-20 bg-zinc-800" />
          ) : status?.enforcementEnabled ? (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 select-none">Enabled</Badge>
          ) : (
            <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 select-none">Disabled</Badge>
          )}
        />
        <StatCard
          label="Required Roles"
          icon={Key}
          accent="bg-rose-500/10 text-rose-400"
          value={statusLoading ? (
            <Skeleton className="h-6 w-28 bg-zinc-800" />
          ) : (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {(status?.requiredRoles ?? []).length === 0 ? (
                <span className="text-zinc-500 text-sm font-normal">None</span>
              ) : (
                (status?.requiredRoles ?? []).map((r) => (
                  <Badge key={r} className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] select-none">
                    {r}
                  </Badge>
                ))
              )}
            </div>
          )}
        />
      </motion.div>

      {/* Body: Settings + Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start"
      >
        {/* Settings panel */}
        {statusLoading ? (
          <div className="p-6 rounded-3xl bg-[#0a0a0c] border border-white/5 space-y-4">
            <Skeleton className="h-5 w-48 bg-zinc-800" />
            <Skeleton className="h-16 w-full rounded-xl bg-zinc-800" />
            <Skeleton className="h-10 w-full rounded-xl bg-zinc-800" />
            <Skeleton className="h-9 w-28 rounded-lg bg-zinc-800" />
          </div>
        ) : statusError ? (
          <div className="p-6 rounded-3xl bg-[#0a0a0c] border border-white/5 flex flex-col items-center gap-3 text-zinc-500 py-12">
            <AlertTriangle className="w-7 h-7 opacity-40" />
            <p className="text-sm">Failed to load settings</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              className="border-zinc-800 text-zinc-400 hover:text-white"
            >
              Retry
            </Button>
          </div>
        ) : (
          <SettingsPanel
            key={`${status?.enforcementEnabled ?? 'false'}-${(status?.requiredRoles ?? []).join(',')}`}
            initialEnabled={status?.enforcementEnabled ?? false}
            initialRoles={status?.requiredRoles ?? []}
          />
        )}

        {/* Users table section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Admin Users</h2>
            <span className="text-xs text-zinc-600 ml-1">2FA compliance overview</span>
          </div>
          <UsersTable />
        </div>
      </motion.div>
    </div>
  );
}
