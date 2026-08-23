import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Users,
  Lock,
  Key,
  Loader2,
  RefreshCw,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  CommandButton,
  CommandIconButton,
  CommandSection,
  CommandToolbar,
} from "@/components/management/CommandSurface";
import { useAdmin } from "@/hooks/useAdmin";
import {
  useAdminRoles,
  useAdminPermissions,
  useAdminRoleDetail,
  useCreateAdminRole,
  useUpdateAdminRole,
  useDeleteAdminRole,
} from "@/hooks/useAdminQueries";

// ── Constants ─────────────────────────────────────────────────────────────────

const PROTECTED_ROLE_KEYS = [
  "super_admin",
  "ops_admin",
  "moderator",
  "finance_admin",
  "support_admin",
];

const RESOURCE_LABELS: Record<string, string> = {
  users: "Users",
  tournaments: "Tournaments",
  disputes: "Disputes",
  venues: "Venues",
  sponsors: "Sponsors",
  analytics: "Analytics",
  system: "System",
  content: "Content",
};

const RESOURCE_ORDER = [
  "users",
  "tournaments",
  "disputes",
  "venues",
  "sponsors",
  "analytics",
  "system",
  "content",
];

const LABEL_CLASS =
  "font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500";

// ── Helper ────────────────────────────────────────────────────────────────────

function generateKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function RoleCardSkeleton() {
  return (
    <div className="border border-white/10 bg-[#0a0a0c]/92 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 bg-zinc-800" />
        <Skeleton className="h-5 w-16 bg-zinc-800" />
      </div>
      <Skeleton className="h-4 w-48 bg-zinc-800" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20 bg-zinc-800" />
        <Skeleton className="h-4 w-20 bg-zinc-800" />
      </div>
    </div>
  );
}

// ── Permission Matrix ─────────────────────────────────────────────────────────

interface PermissionGroup {
  resource: string;
  permissions: Array<{
    id: string;
    name: string;
    description: string;
    action: string;
  }>;
}

function PermissionMatrix({
  groups,
  selectedIds,
  onChange,
  totalCount,
}: {
  groups: PermissionGroup[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  totalCount: number;
}) {
  const [expandedResources, setExpandedResources] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.resource))
  );
  const [searchTerm, setSearchTerm] = useState("");

  const allSelected = selectedIds.size === totalCount && totalCount > 0;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onChange(new Set());
    } else {
      const all = new Set<string>();
      groups.forEach((g) => g.permissions.forEach((p) => all.add(p.id)));
      onChange(all);
    }
  }, [allSelected, groups, onChange]);

  const toggleResource = useCallback(
    (resource: string) => {
      const group = groups.find((g) => g.resource === resource);
      if (!group) return;
      const groupIds = group.permissions.map((p) => p.id);
      const allChecked = groupIds.every((id) => selectedIds.has(id));
      const next = new Set(selectedIds);
      groupIds.forEach((id) => {
        if (allChecked) next.delete(id);
        else next.add(id);
      });
      onChange(next);
    },
    [groups, selectedIds, onChange]
  );

  const togglePermission = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(next);
    },
    [selectedIds, onChange]
  );

  const toggleExpand = (resource: string) => {
    setExpandedResources((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const lower = searchTerm.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            p.description.toLowerCase().includes(lower) ||
            p.action.toLowerCase().includes(lower)
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [groups, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header with count + master toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className={LABEL_CLASS}>
          <span className="text-white">{selectedIds.size}</span> of{" "}
          {totalCount} permissions selected
        </span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <Input
              placeholder="Filter permissions…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-48 rounded-none border-white/10 bg-black/60 pl-8 text-xs text-white placeholder:text-zinc-600 focus-visible:border-rose-500 focus-visible:ring-rose-500"
            />
          </div>
          <CommandButton variant="ghost" size="sm" onClick={toggleAll}>
            {allSelected ? "Deselect All" : "Select All"}
          </CommandButton>
        </div>
      </div>

      {/* Resource groups */}
      <div className="space-y-2">
        {filteredGroups.map((group) => {
          const groupIds = group.permissions.map((p) => p.id);
          const checkedCount = groupIds.filter((id) =>
            selectedIds.has(id)
          ).length;
          const allChecked =
            checkedCount === groupIds.length && groupIds.length > 0;
          const someChecked = checkedCount > 0 && !allChecked;
          const isExpanded = expandedResources.has(group.resource);

          return (
            <div
              key={group.resource}
              className="overflow-hidden border border-white/10 bg-white/[0.025]"
            >
              {/* Resource header */}
              <button
                type="button"
                onClick={() => toggleExpand(group.resource)}
                className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={() => toggleResource(group.resource)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-none border-zinc-600 accent-[#f43f5e] data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500 data-[state=indeterminate]:bg-rose-500/50 data-[state=indeterminate]:border-rose-500/50"
                />
                <span className={`${LABEL_CLASS} flex-1 text-left !tracking-widest`}>
                  {RESOURCE_LABELS[group.resource] || group.resource}
                </span>
                <span
                  className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tabular-nums tracking-wider ${
                    allChecked
                      ? "border-rose-500/50 text-rose-400"
                      : "border-white/15 text-zinc-500"
                  }`}
                >
                  {checkedCount}/{groupIds.length}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                )}
              </button>

              {/* Permission rows */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-white/5">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedIds.has(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex cursor-pointer items-start gap-3 border-l-2 px-4 py-2.5 transition-colors ${
                              isChecked
                                ? "border-l-rose-500 bg-rose-500/[0.06]"
                                : "border-l-transparent hover:bg-white/[0.03]"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => togglePermission(perm.id)}
                              className="mt-0.5 rounded-none border-zinc-600 accent-[#f43f5e] data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">
                                  {perm.name}
                                </span>
                                <span className="border border-white/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                  {perm.action}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {perm.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredGroups.length === 0 && searchTerm && (
          <div className="py-8 text-center text-sm text-zinc-500">
            No permissions matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}

// ── Role Card ─────────────────────────────────────────────────────────────────

interface RoleCardProps {
  role: {
    id: string;
    name: string;
    key: string;
    description: string;
    created_at: string;
    permission_count: number;
    user_count: number;
  };
  isProtected: boolean;
  isSuperAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function RoleCard({
  role,
  isProtected,
  isSuperAdmin,
  onEdit,
  onDelete,
}: RoleCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="group border border-white/10 bg-[#0a0a0c]/92 p-5 transition-colors hover:border-white/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Name + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">
              {role.name}
            </h3>
            <span className="border border-white/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              {role.key}
            </span>
            {isProtected ? (
              <span
                className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                  role.key === "super_admin"
                    ? "border-white bg-white/[0.08] text-white"
                    : "border-white/15 text-zinc-400"
                }`}
              >
                <Lock className="h-2.5 w-2.5" />
                Built-in
              </span>
            ) : (
              <span className="border border-white/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                Custom
              </span>
            )}
          </div>

          {/* Description */}
          <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500">
            {role.description || "No description"}
          </p>

          {/* Meta */}
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Key className="h-3 w-3 text-rose-400" />
              {role.permission_count} permission
              {role.permission_count !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Users className="h-3 w-3 text-zinc-500" />
              {role.user_count} user{role.user_count !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-zinc-600">
              Created {formatDate(role.created_at)}
            </span>
          </div>
        </div>

        {/* Actions — super_admin can edit and delete all roles */}
        {isSuperAdmin && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <CommandIconButton
              label={`Edit role ${role.name}`}
              variant="ghost"
              onClick={onEdit}
              className="h-8 w-8 text-zinc-500 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
            </CommandIconButton>
            <CommandIconButton
              label={`Delete role ${role.name}`}
              variant="danger"
              onClick={onDelete}
              className="h-8 w-8"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </CommandIconButton>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Create/Edit Dialog ────────────────────────────────────────────────────────

function RoleFormDialog({
  open,
  onOpenChange,
  editRoleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRoleId: string | null;
}) {
  const { data: permissions, isLoading: permLoading } = useAdminPermissions();
  const { data: roleDetail, isLoading: detailLoading } = useAdminRoleDetail(
    editRoleId || ""
  );
  const createRole = useCreateAdminRole();
  const updateRole = useUpdateAdminRole();

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<
    Set<string>
  >(new Set());
  const [keyTouched, setKeyTouched] = useState(false);

  const isEditing = !!editRoleId;

  // Populate form for editing
  useEffect(() => {
    if (isEditing && roleDetail) {
      setName(roleDetail.name);
      setKey(roleDetail.key);
      setDescription(roleDetail.description || "");
      setSelectedPermissionIds(new Set(roleDetail.permissions.map((p) => p.id)));
      setKeyTouched(true);
    } else if (!isEditing && open) {
      setName("");
      setKey("");
      setDescription("");
      setSelectedPermissionIds(new Set());
      setKeyTouched(false);
    }
  }, [isEditing, roleDetail, open]);

  // Auto-generate key from name
  useEffect(() => {
    if (!isEditing && !keyTouched && name) {
      setKey(generateKey(name));
    }
  }, [name, isEditing, keyTouched]);

  const permissionGroups: PermissionGroup[] = useMemo(() => {
    if (!permissions) return [];
    const grouped = new Map<string, PermissionGroup>();
    permissions.forEach((p) => {
      if (!grouped.has(p.resource)) {
        grouped.set(p.resource, { resource: p.resource, permissions: [] });
      }
      grouped.get(p.resource)!.permissions.push(p);
    });
    return RESOURCE_ORDER.filter((r) => grouped.has(r)).map(
      (r) => grouped.get(r)!
    );
  }, [permissions]);

  const totalPermCount = permissions?.length || 0;
  const isLoading = permLoading || (isEditing && detailLoading);
  const isSaving = createRole.isPending || updateRole.isPending;

  const canSubmit =
    name.trim().length >= 2 &&
    key.trim().length >= 3 &&
    selectedPermissionIds.size > 0 &&
    !isSaving;

  const handleSubmit = () => {
    if (!canSubmit) return;

    const permissionIds = Array.from(selectedPermissionIds);

    if (isEditing && editRoleId) {
      updateRole.mutate(
        {
          roleId: editRoleId,
          name: name.trim(),
          description: description.trim(),
          permissionIds,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createRole.mutate(
        {
          name: name.trim(),
          key: key.trim(),
          description: description.trim(),
          permissionIds,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto overscroll-contain rounded-none border-white/10 bg-[#0a0a0c]"
        data-lenis-prevent
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <Shield className="h-4 w-4 text-rose-500" />
            {isEditing ? "Edit Role" : "Create New Role"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isEditing
              ? "Update the role name, description, and permissions."
              : "Define a new custom admin role with specific permissions."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Name & Key */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="rb-role-name" className={LABEL_CLASS}>
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="rb-role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Content Manager"
                  className="rounded-none border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus-visible:border-rose-500 focus-visible:ring-rose-500"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="rb-role-key" className={LABEL_CLASS}>
                  Role Key <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="rb-role-key"
                  value={key}
                  onChange={(e) => {
                    setKeyTouched(true);
                    setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                  }}
                  placeholder="e.g. content_manager"
                  disabled={isEditing}
                  className="rounded-none border-white/10 bg-black/60 font-mono text-sm text-white placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-rose-500 focus-visible:ring-rose-500"
                  maxLength={50}
                />
                {!isEditing && (
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                    Auto-generated from name. Cannot be changed after creation.
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="rb-role-description" className={LABEL_CLASS}>
                Description
              </label>
              <Textarea
                id="rb-role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this role is for…"
                className="h-20 resize-none rounded-none border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus-visible:border-rose-500 focus-visible:ring-rose-500"
                maxLength={200}
              />
            </div>

            {/* Permissions Matrix */}
            <div className="space-y-2">
              <p className={LABEL_CLASS}>
                Permissions <span className="text-rose-500">*</span>
              </p>
              <PermissionMatrix
                groups={permissionGroups}
                selectedIds={selectedPermissionIds}
                onChange={setSelectedPermissionIds}
                totalCount={totalPermCount}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <CommandButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </CommandButton>
          <CommandButton size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditing ? "Saving…" : "Creating…"}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {isEditing ? "Save Changes" : "Create Role"}
              </>
            )}
          </CommandButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Dialog ─────────────────────────────────────────────────────────────

function DeleteRoleDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: { id: string; name: string; user_count: number } | null;
}) {
  const deleteRole = useDeleteAdminRole();
  const hasUsers = (role?.user_count ?? 0) > 0;

  const handleDelete = () => {
    if (!role || hasUsers) return;
    deleteRole.mutate(role.id, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
            <AlertTriangle className="h-4 w-4 text-red-300" />
            Delete Role
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {role && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-zinc-300">
              Are you sure you want to delete the role{" "}
              <span className="font-semibold text-white">"{role.name}"</span>?
            </p>

            {hasUsers && (
              <div className="flex items-start gap-3 border border-red-500/30 bg-red-950/20 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <p className="text-sm text-red-300">
                  This role is assigned to{" "}
                  <span className="font-semibold text-red-200">
                    {role.user_count} user{role.user_count !== 1 ? "s" : ""}
                  </span>
                  . Unassign them first before deleting.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <CommandButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </CommandButton>
          <CommandButton
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={hasUsers || deleteRole.isPending}
          >
            {deleteRole.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Role
              </>
            )}
          </CommandButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const RoleBuilder = () => {
  const { roles: adminRoles, hasPermission } = useAdmin();
  const isSuperAdmin = adminRoles.includes("super_admin");
  const canManageRoles = isSuperAdmin || hasPermission('system:settings');

  const { data: roles, isLoading, error, refetch } = useAdminRoles();

  const [formOpen, setFormOpen] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    user_count: number;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    if (!searchTerm.trim()) return roles;
    const lower = searchTerm.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.key.toLowerCase().includes(lower) ||
        r.description?.toLowerCase().includes(lower)
    );
  }, [roles, searchTerm]);

  // Separate built-in from custom
  const builtInRoles = filteredRoles.filter((r) =>
    PROTECTED_ROLE_KEYS.includes(r.key)
  );
  const customRoles = filteredRoles.filter(
    (r) => !PROTECTED_ROLE_KEYS.includes(r.key)
  );

  const handleCreate = () => {
    setEditRoleId(null);
    setFormOpen(true);
  };

  const handleEdit = (roleId: string) => {
    setEditRoleId(roleId);
    setFormOpen(true);
  };

  const handleDeletePrompt = (role: {
    id: string;
    name: string;
    user_count: number;
  }) => {
    setDeleteTarget(role);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminPage
      eyebrow="Security"
      title="Role Builder"
      description="Create and manage custom admin roles with granular permissions"
      actions={
        <>
          <CommandIconButton
            label="Refresh roles"
            variant="ghost"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </CommandIconButton>
          {canManageRoles && (
            <CommandButton onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Create Role
            </CommandButton>
          )}
        </>
      }
    >
      {/* Search */}
      {!isLoading && !error && roles && roles.length > 0 && (
        <CommandToolbar>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <Input
              placeholder="Search roles…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-none border-white/10 bg-black/60 pl-9 text-xs text-white placeholder:text-zinc-600 focus-visible:border-rose-500 focus-visible:ring-rose-500"
            />
          </div>
        </CommandToolbar>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <RoleCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <CommandSection className="border-red-500/30 bg-red-950/20 text-center">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-red-300" />
          <h3 className="mb-1 font-semibold text-white">
            Failed to load roles
          </h3>
          <p className="mx-auto mb-4 max-w-md text-sm leading-relaxed text-zinc-400">
            {(error as Error)?.message || "An unexpected error occurred."}
          </p>
          <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </CommandButton>
        </CommandSection>
      )}

      {/* Role Lists */}
      {!isLoading && !error && roles && (
        <div className="space-y-6">
          {/* Built-in Roles */}
          {builtInRoles.length > 0 && (
            <section>
              <h2 className={`${LABEL_CLASS} mb-3 flex items-center gap-2`}>
                <Lock className="h-3 w-3" />
                Built-in Roles ({builtInRoles.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {builtInRoles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      isProtected
                      isSuperAdmin={canManageRoles}
                      onEdit={() => handleEdit(role.id)}
                      onDelete={() => handleDeletePrompt(role)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Custom Roles */}
          <section>
            <h2 className={`${LABEL_CLASS} mb-3 flex items-center gap-2`}>
              <Key className="h-3 w-3" />
              Custom Roles ({customRoles.length})
            </h2>

            {customRoles.length === 0 ? (
              <div className="border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <Shield className="mx-auto mb-3 h-5 w-5 text-zinc-600" />
                <h3 className="mb-1 font-medium text-white">
                  No custom roles yet
                </h3>
                <p className="mb-4 text-sm text-zinc-500">
                  Create a custom role to define granular access for your admin
                  team.
                </p>
                {canManageRoles && (
                  <CommandButton variant="ghost" size="sm" onClick={handleCreate}>
                    <Plus className="h-4 w-4" />
                    Create First Role
                  </CommandButton>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {customRoles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      isProtected={false}
                      isSuperAdmin={canManageRoles}
                      onEdit={() => handleEdit(role.id)}
                      onDelete={() => handleDeletePrompt(role)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* No results from search */}
          {filteredRoles.length === 0 && searchTerm && (
            <div className="py-12 text-center">
              <Search className="mx-auto mb-3 h-6 w-6 text-zinc-600" />
              <p className="text-sm text-zinc-400">
                No roles matching "{searchTerm}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editRoleId={editRoleId}
      />

      <DeleteRoleDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        role={deleteTarget}
      />
    </AdminPage>
  );
};

export default RoleBuilder;
