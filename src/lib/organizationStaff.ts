/**
 * organizationStaff — Domain 9: Organization & Staff Management
 *
 * Migrated from Supabase direct calls to .NET API via apiClient.
 *
 * Key improvements:
 *   fetchOrganizationStaff: N+1 (assignments query per staff) → single jsonb_agg query
 *   inviteOrganizationStaff: 5 sequential round-trips → 1 server-side call
 *   logAuditEvent: inline in backend endpoints (no client call needed — kept as no-op for backwards-compat)
 *
 * All function signatures are backward-compatible with existing callers.
 */

import { apiClient } from "@/lib/apiClient";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types (unchanged)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type StaffPermission =
    | "scores:update"
    | "teams:manage"
    | "bracket:edit"
    | "announcements:send"
    | "disputes:assist";

export interface OrganizationStaffRecord {
    id: string;
    organization_id: string;
    user_id: string;
    role: string;
    permissions: StaffPermission[];
    status: string;
    assigned_by: string | null;
    created_at: string;
    updated_at: string;
    accepted_at?: string | null;
    responded_at?: string | null;
    profiles?: {
        full_name: string | null;
        username: string | null;
        email: string | null;
        avatar_url?: string | null;
    };
    tournament_assignments?: TournamentAssignment[];
}

export interface OrganizationStaffInvite extends OrganizationStaffRecord {
    organization?: {
        id: string;
        name: string;
        slug?: string | null;
        logo_url?: string | null;
        owner_id?: string;
    };
    assigner_profile?: {
        full_name: string | null;
        username: string | null;
        email: string | null;
    };
}

export interface TournamentAssignment {
    id: string;
    organization_staff_id: string;
    tournament_id: string;
    assigned_by: string | null;
    created_at: string;
    tournament?: {
        id: string;
        name: string;
        status: string;
    };
}

export interface AuditLogEntry {
    id: string;
    organization_id: string;
    actor_id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    details: Record<string, unknown>;
    ip_address: string | null;
    created_at: string;
    actor?: {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Core Staff CRUD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Fetch all staff for an organization (N+1 eliminated via jsonb_agg) */
export const fetchOrganizationStaff = async (
    organizationId: string
): Promise<OrganizationStaffRecord[]> =>
    apiClient.get<OrganizationStaffRecord[]>(`/api/organizations/${organizationId}/staff`);

/** Invite a user to organization staff (resolve + upsert + notify + email + audit in one call) */
export const inviteOrganizationStaff = async ({
    organizationId,
    userEmail,
    role,
    permissions,
    assignedBy: _assignedBy,
    orgName,
    orgLogo,
    inviterName,
    tournamentIds,
}: {
    organizationId: string;
    userEmail: string;
    role: string;
    permissions: StaffPermission[];
    assignedBy: string;
    orgName?: string;
    orgLogo?: string | null;
    inviterName?: string;
    tournamentIds?: string[];
}) =>
    apiClient.post(`/api/organizations/${organizationId}/staff/invite`, {
        userEmail,
        role,
        permissions,
        orgName,
        orgLogo,
        inviterName,
        tournamentIds: tournamentIds ?? [],
    });

/** Update role & permissions for an existing staff record */
export const updateOrganizationStaff = async ({
    staffId,
    role,
    permissions,
    organizationId,
}: {
    staffId: string;
    role: string;
    permissions: StaffPermission[];
    organizationId: string;
    actorId: string;
}) =>
    apiClient.put(`/api/organizations/${organizationId}/staff/${staffId}`, { role, permissions });

/** Remove a staff member from the organization */
export const removeOrganizationStaff = async ({
    staffId,
    organizationId,
}: {
    staffId: string;
    organizationId: string;
    actorId: string;
    staffEmail?: string;
}) =>
    apiClient.delete(`/api/organizations/${organizationId}/staff/${staffId}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Invite Response
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Fetch all pending invites for a user (across all orgs) */
export const fetchPendingOrgStaffInvites = async (
    _userId: string
): Promise<OrganizationStaffInvite[]> =>
    // userId implicit from JWT — backend reads from UserContext
    apiClient.get<OrganizationStaffInvite[]>('/api/organizations/staff/invites');

/** Fetch all active staff assignments for a user */
export const fetchUserOrgStaffAssignments = async (
    _userId: string
): Promise<OrganizationStaffInvite[]> =>
    apiClient.get<OrganizationStaffInvite[]>('/api/organizations/staff/assignments');

/** Accept or decline an organization staff invite */
export const respondToOrgStaffInvite = async ({
    inviteId,
    accept,
}: {
    inviteId: string;
    accept: boolean;
    userId: string;
}) =>
    apiClient.post(`/api/organizations/staff/${inviteId}/respond`, { accept });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tournament Assignments
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Bulk assign a staff member to multiple tournaments */
export const assignStaffToTournaments = async ({
    orgStaffId,
    tournamentIds,
    organizationId,
}: {
    orgStaffId: string;
    tournamentIds: string[];
    assignedBy: string;
    organizationId: string;
}) =>
    apiClient.post(`/api/organizations/${organizationId}/staff/${orgStaffId}/assign-tournaments`, { tournamentIds });

/** Remove a staff member from a tournament */
export const removeStaffFromTournament = async ({
    assignmentId,
    organizationId,
}: {
    assignmentId: string;
    organizationId: string;
    actorId: string;
    tournamentId?: string;
    orgStaffId?: string;
}) =>
    apiClient.delete(`/api/organizations/${organizationId}/staff/assignments/${assignmentId}`);

/** Fetch all staff assigned to a specific tournament */
export const fetchTournamentAssignedStaff = async (
    tournamentId: string
): Promise<TournamentAssignment[]> =>
    apiClient.get<TournamentAssignment[]>(`/api/tournaments/${tournamentId}/assigned-staff`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Audit Logging
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Audit logging is now handled server-side inside each .NET endpoint.
 * This stub is preserved for callers that reference it directly — it is a no-op.
 * Remove call sites when convenient.
 */
export const logAuditEvent = async (_args: {
    organizationId: string;
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
}) => { /* handled server-side */ };

/** Fetch audit logs for an organization */
export const fetchAuditLogs = async ({
    organizationId,
    limit = 50,
    offset = 0,
    actionFilter,
}: {
    organizationId: string;
    limit?: number;
    offset?: number;
    actionFilter?: string;
}): Promise<{ logs: AuditLogEntry[]; total: number }> => {
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (actionFilter) qs.set('action', actionFilter);
    return apiClient.get(`/api/organizations/${organizationId}/audit-logs?${qs}`);
};

/** Fetch org's tournaments for assignment dropdown */
export const fetchOrgTournaments = async (
    organizationId: string
): Promise<{ id: string; name: string; status: string }[]> =>
    apiClient.get(`/api/organizations/${organizationId}/tournaments`);
