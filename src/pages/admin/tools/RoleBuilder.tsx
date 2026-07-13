import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 bg-zinc-800" />
        <Skeleton className="h-5 w-16 bg-zinc-800 rounded-full" />
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">
            <span className="text-white font-semibold">{selectedIds.size}</span>{" "}
            of {totalCount} permissions selected
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              placeholder="Filter permissions…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 w-48 bg-zinc-900 border-zinc-800 text-sm text-white placeholder:text-zinc-600"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleAll}
            className="border-zinc-700 text-zinc-300 hover:text-white hover:border-white/25 text-xs h-8"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
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
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden"
            >
              {/* Resource header */}
              <button
                type="button"
                onClick={() => toggleExpand(group.resource)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
              >
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={() => toggleResource(group.resource)}
                  onClick={(e) => e.stopPropagation()}
                  className="border-zinc-600 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500 data-[state=indeterminate]:bg-rose-500/50 data-[state=indeterminate]:border-rose-500/50"
                />
                <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex-1 text-left">
                  {RESOURCE_LABELS[group.resource] || group.resource}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    checkedCount === groupIds.length
                      ? "border-rose-500/50 text-rose-400"
                      : "border-zinc-700 text-zinc-500"
                  }`}
                >
                  {checkedCount}/{groupIds.length}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
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
                    <div className="border-t border-zinc-800 px-4 py-2 space-y-1">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedIds.has(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-rose-500/5 border border-rose-500/20"
                                : "hover:bg-zinc-800/50 border border-transparent"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => togglePermission(perm.id)}
                              className="mt-0.5 border-zinc-600 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">
                                  {perm.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-zinc-700 text-zinc-500 font-mono"
                                >
                                  {perm.action}
                                </Badge>
                              </div>
                              <p className="text-xs text-zinc-500 mt-0.5">
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
          <div className="text-center py-8 text-zinc-500 text-sm">
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
      className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-semibold text-base truncate">
              {role.name}
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-zinc-700 text-zinc-500"
            >
              {role.key}
            </Badge>
            {isProtected ? (
              <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/15">
                <Lock className="w-2.5 h-2.5 mr-1" />
                Built-in
              </Badge>
            ) : (
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15">
                Custom
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-500 mt-1.5 line-clamp-2">
            {role.description || "No description"}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Key className="w-3 h-3 text-rose-400" />
              {role.permission_count} permission
              {role.permission_count !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Users className="w-3 h-3 text-blue-400" />
              {role.user_count} user{role.user_count !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-zinc-600">
              Created {formatDate(role.created_at)}
            </span>
          </div>
        </div>

        {/* Actions — super_admin can edit and delete all roles */}
        {isSuperAdmin && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
              aria-label={`Edit role ${role.name}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
              aria-label={`Delete role ${role.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
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
      <DialogContent className="bg-[#121214] border-zinc-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain sm:rounded-2xl" data-lenis-prevent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-500" />
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
            <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Name & Key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Content Manager"
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:ring-rose-500/20"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Role Key <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={key}
                  onChange={(e) => {
                    setKeyTouched(true);
                    setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                  }}
                  placeholder="e.g. content_manager"
                  disabled={isEditing}
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:border-rose-500/50 focus:ring-rose-500/20"
                  maxLength={50}
                />
                {!isEditing && (
                  <p className="text-[11px] text-zinc-600">
                    Auto-generated from name. Cannot be changed after creation.
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this role is for…"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 resize-none h-20 focus:border-rose-500/50 focus:ring-rose-500/20"
                maxLength={200}
              />
            </div>

            {/* Permissions Matrix */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Permissions <span className="text-rose-500">*</span>
              </label>
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? "Saving…" : "Creating…"}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {isEditing ? "Save Changes" : "Create Role"}
              </>
            )}
          </Button>
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
      <DialogContent className="bg-[#121214] border-zinc-800 text-white sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
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
              <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={hasUsers || deleteRole.isPending}
            className="bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleteRole.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Role
              </>
            )}
          </Button>
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
    <div className="min-h-screen p-4 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
          <Link
            to="/admin"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Admin
          </Link>
          <span>/</span>
          <span className="text-zinc-300">Role Builder</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Shield className="w-6 h-6 text-rose-500" />
              </div>
              Role Builder
            </h1>
            <p className="text-zinc-400 mt-1.5 text-sm">
              Create and manage custom admin roles with granular permissions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
              aria-label="Refresh roles"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {canManageRoles && (
              <Button
                onClick={handleCreate}
                className="bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-lg shadow-rose-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Search */}
      {!isLoading && !error && roles && roles.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search roles…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#0a0a0c] border-zinc-800 text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:ring-rose-500/20"
            />
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <RoleCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center"
        >
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">
            Failed to load roles
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            {(error as Error)?.message || "An unexpected error occurred."}
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </motion.div>
      )}

      {/* Role Lists */}
      {!isLoading && !error && roles && (
        <div className="space-y-8">
          {/* Built-in Roles */}
          {builtInRoles.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                Built-in Roles ({builtInRoles.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
            </motion.section>
          )}

          {/* Custom Roles */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Key className="w-3.5 h-3.5" />
              Custom Roles ({customRoles.length})
            </h2>

            {customRoles.length === 0 ? (
              <div className="bg-[#0a0a0c] border border-white/5 border-dashed rounded-2xl p-8 text-center">
                <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-zinc-600" />
                </div>
                <h3 className="text-white font-medium mb-1">
                  No custom roles yet
                </h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Create a custom role to define granular access for your admin
                  team.
                </p>
                {canManageRoles && (
                  <Button
                    onClick={handleCreate}
                    variant="outline"
                    className="border-white/15 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Role
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
          </motion.section>

          {/* No results from search */}
          {filteredRoles.length === 0 && searchTerm && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">
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
    </div>
  );
};

export default RoleBuilder;
