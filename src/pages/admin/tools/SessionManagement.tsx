import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Shield,
  LogOut,
  Clock,
  Activity,
  Search,
  Monitor,
  Globe,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CommandButton,
  CommandIconButton,
} from "@/components/management/CommandSurface";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  useActiveSessions,
  useSessionAudit,
  useOnlineCount,
  useRevokeSession,
} from "@/hooks/useAdminQueries";
import type { ActiveSession } from "@/hooks/useAdminQueries";
import { useAuth } from "@/hooks/useAuth";

// ── Constants ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 12;

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function truncateUA(ua: string | null, maxLen = 40): string {
  if (!ua) return "—";
  return ua.length > maxLen ? ua.slice(0, maxLen) + "…" : ua;
}

const FIELD_LABEL =
  "font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500";

// ── Skeleton Components ─────────────────────────────────────────────────────

function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="border border-white/10 bg-[#0a0a0c]/92 p-5"
        >
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

function SessionTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="border border-white/10 bg-[#0a0a0c]/92 p-4 flex items-center gap-4"
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function AuditTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="border border-white/10 bg-[#0a0a0c]/92 p-4 space-y-2"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-48" />
        </div>
      ))}
    </div>
  );
}

// ── Empty / Error States ────────────────────────────────────────────────────

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
      <Icon className="h-8 w-8 text-zinc-600 mb-4" />
      <p className={FIELD_LABEL}>{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-red-500/20 bg-red-950/10 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400 mb-4" />
      <p className="text-zinc-400 text-sm mb-4">{message}</p>
      <CommandButton variant="ghost" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </CommandButton>
    </div>
  );
}

// ── Pagination ──────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  limit,
  onPageChange,
}: {
  page: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className={`tabular-nums ${FIELD_LABEL}`}>
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <CommandIconButton
          label="Previous page"
          variant="ghost"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </CommandIconButton>
        <CommandIconButton
          label="Next page"
          variant="ghost"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </CommandIconButton>
      </div>
    </div>
  );
}

// ── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: onlineData, isLoading: onlineLoading } = useOnlineCount();
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
  } = useActiveSessions({ page: 1, limit: 1 });

  if (onlineLoading || sessionsLoading) return <StatsBarSkeleton />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Online Now */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-white/10 bg-[#0a0a0c]/92 p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className={FIELD_LABEL}>
            Online Now
          </span>
        </div>
        <p className="text-3xl font-black text-white tabular-nums" aria-live="polite">
          {onlineData?.count ?? 0}
        </p>
      </motion.div>

      {/* Total Registered */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border border-white/10 bg-[#0a0a0c]/92 p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-zinc-500" />
          <span className={FIELD_LABEL}>
            Total Users
          </span>
        </div>
        <p className="text-3xl font-black text-white tabular-nums">
          {sessionsData?.total ?? 0}
        </p>
      </motion.div>
    </div>
  );
}

// ── Active Sessions Tab ─────────────────────────────────────────────────────

function ActiveSessionsTab() {
  const { profile } = useAuth();
  const currentUserId = profile?.id;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Revoke dialog state
  const [revokeTarget, setRevokeTarget] = useState<ActiveSession | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const revokeMutation = useRevokeSession();

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
    },
    []
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useActiveSessions({
    page,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
  });

  const handleRevoke = () => {
    if (!revokeTarget) return;
    revokeMutation.mutate(
      { userId: revokeTarget.userId, reason: revokeReason || undefined },
      {
        onSettled: () => {
          setRevokeTarget(null);
          setRevokeReason("");
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Search by email or username…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="-none border-white/10 bg-[#0a0a0c]/90 pl-10 text-white placeholder:text-zinc-600 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
          aria-label="Search sessions"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <SessionTableSkeleton />
      ) : error ? (
        <ErrorState message="Failed to load active sessions." onRetry={refetch} />
      ) : !data?.items?.length ? (
        <EmptyState message="No active sessions found." icon={Monitor} />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((session, idx) => {
              const isOwnSession = session.userId === currentUserId;
              return (
                <motion.div
                  key={session.userId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border border-white/10 bg-[#0a0a0c]/92 p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-white/25 transition-colors"
                >
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={session.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="-none border border-white/10 bg-black/40 text-zinc-400 font-mono text-xs font-bold">
                        {getInitials(session.fullName, session.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">
                          {session.username ?? session.email}
                        </p>
                        {isOwnSession && (
                          <Badge className="-none border border-white/25 bg-transparent text-zinc-300 font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-xs text-zinc-500 truncate">{session.email}</p>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {session.roles.map((role) => (
                      <Badge
                        key={role}
                        className="-none border border-white/15 bg-transparent text-zinc-300 font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0"
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        {role.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>

                  {/* Last Sign-In */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">{timeAgo(session.lastSignInAt)}</span>
                  </div>

                  {/* Created */}
                  <div className="hidden lg:flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
                    <Activity className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">{formatDate(session.createdAt)}</span>
                  </div>

                  {/* Revoke Button */}
                  {!isOwnSession && (
                    <CommandButton
                      variant="danger"
                      size="sm"
                      onClick={() => setRevokeTarget(session)}
                      className="shrink-0"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Revoke
                    </CommandButton>
                  )}
                </motion.div>
              );
            })}
          </div>

          <Pagination
            page={data.page}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
            setRevokeReason("");
          }
        }}
      >
        <AlertDialogContent className="max-w-md -none border border-white/10 bg-[#0a0a0c]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <LogOut className="h-4 w-4 text-red-400" />
              Force Logout User
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to force logout{" "}
              <span className="font-semibold text-white">
                {revokeTarget?.username ?? revokeTarget?.email}
              </span>
              ? Their active session will be immediately terminated.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <label
              htmlFor="revoke-reason"
              className={FIELD_LABEL}
            >
              Reason (optional)
            </label>
            <Textarea
              id="revoke-reason"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Why are you revoking this session?"
              className="resize-none -none border border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="-none border border-white/15 bg-transparent font-mono text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/[0.03] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
              className="-none border border-red-500/35 bg-red-950/20 font-mono text-xs font-bold uppercase tracking-wider text-red-100 hover:bg-red-950/50 hover:text-red-50"
            >
              {revokeMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Revoking…
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Revoke Session
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Session Audit Tab ───────────────────────────────────────────────────────

function SessionAuditTab() {
  const [userIdFilter, setUserIdFilter] = useState("");
  const [debouncedUserId, setDebouncedUserId] = useState("");
  const [page, setPage] = useState(1);

  const auditTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleFilterChange = useCallback((value: string) => {
    setUserIdFilter(value);
    setPage(1);
    clearTimeout(auditTimerRef.current);
    auditTimerRef.current = setTimeout(() => setDebouncedUserId(value), 300);
  }, []);

  const { data, isLoading, error, refetch } = useSessionAudit({
    page,
    limit: ITEMS_PER_PAGE,
    userId: debouncedUserId || undefined,
  });

  const getActionBadge = (actionType: string) => {
    const lower = actionType.toLowerCase();
    if (lower.includes("login") || lower.includes("sign_in") || lower.includes("signin")) {
      return (
        <Badge className="-none border border-white/40 bg-transparent text-white font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
          <LogOut className="mr-1 h-3 w-3 rotate-180" />
          Login
        </Badge>
      );
    }
    if (lower.includes("logout") || lower.includes("sign_out") || lower.includes("signout") || lower.includes("revoke")) {
      return (
        <Badge className="-none border border-amber-500/35 bg-transparent text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
          <LogOut className="mr-1 h-3 w-3" />
          Logout
        </Badge>
      );
    }
    return (
      <Badge className="-none border border-white/10 bg-transparent text-zinc-400 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
        <Activity className="mr-1 h-3 w-3" />
        {actionType}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Filter by user ID…"
          value={userIdFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="-none border-white/10 bg-[#0a0a0c]/90 pl-10 text-white placeholder:text-zinc-600 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
          aria-label="Filter audit by user ID"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <AuditTableSkeleton />
      ) : error ? (
        <ErrorState message="Failed to load audit log." onRetry={refetch} />
      ) : !data?.items?.length ? (
        <EmptyState message="No audit entries found." icon={Activity} />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((raw, idx) => {
              // Defense-in-depth: jsonb details can arrive as object OR string —
              // normalize at the data boundary so no sink can ever render an object.
              const entry = {
                ...raw,
                details:
                  typeof raw.details === 'object' && raw.details !== null
                    ? JSON.stringify(raw.details)
                    : raw.details ?? null,
              };
              return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="border border-white/10 bg-[#0a0a0c]/92 p-4 space-y-3 hover:border-white/25 transition-colors"
              >
                {/* Top row: time + action + user */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  {getActionBadge(entry.actionType)}

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-sm font-medium text-white">
                      {entry.actorUsername ?? entry.actorEmail ?? entry.actorId}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 sm:ml-auto shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">{timeAgo(entry.createdAt)}</span>
                  </div>
                </div>

                {/* Details row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-zinc-500">
                  {entry.ipAddress && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="font-mono">{entry.ipAddress}</span>
                    </div>
                  )}
                  {entry.userAgent && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Monitor className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-mono" title={entry.userAgent}>
                        {truncateUA(entry.userAgent)}
                      </span>
                    </div>
                  )}
                  {entry.details && (
                    <div className="truncate italic text-zinc-400">
                      {typeof entry.details === 'object' && entry.details !== null
                        ? JSON.stringify(entry.details)
                        : String(entry.details)}
                    </div>
                  )}
                 </div>
               </motion.div>
              );
            })}
          </div>

          <Pagination
            page={data.page}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function SessionManagement() {
  return (
    <AdminPage
      eyebrow="Users & Access"
      title="Sessions"
      description="Monitor active sessions and audit authentication activity"
    >
      {/* Stats */}
      <StatsBar />

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="-none border border-white/10 bg-[#0a0a0c]/92 p-1">
          <TabsTrigger
            value="active"
            className="-none px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <Users className="mr-2 h-4 w-4" />
            Active Sessions
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="-none px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <Activity className="mr-2 h-4 w-4" />
            Session Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveSessionsTab />
        </TabsContent>

        <TabsContent value="audit">
          <SessionAuditTab />
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}
