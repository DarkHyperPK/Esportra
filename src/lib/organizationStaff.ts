import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/hooks/useEmail";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
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

/** Fetch all staff for an organization (with profile joins) */
export const fetchOrganizationStaff = async (
    organizationId: string
): Promise<OrganizationStaffRecord[]> => {
    const { data, error } = await supabase
        .from("organization_staff")
        .select(
            `
        *,
        profiles:user_id(
          full_name,
          username,
          email,
          avatar_url
        )
      `
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });

    if (error) throw error;

    // Fetch tournament assignments for each staff member
    const staffIds = (data || []).map((s: { id: string }) => s.id);
    let assignmentsMap: Record<string, TournamentAssignment[]> = {};

    if (staffIds.length > 0) {
        const { data: assignments } = await supabase
            .from("staff_tournament_assignments")
            .select(`
                *,
                tournament:tournament_id(
                    id, name, status
                )
            `)
            .in("organization_staff_id", staffIds);

        if (assignments) {
            for (const a of assignments as TournamentAssignment[]) {
                if (!assignmentsMap[a.organization_staff_id]) {
                    assignmentsMap[a.organization_staff_id] = [];
                }
                assignmentsMap[a.organization_staff_id].push(a);
            }
        }
    }

    return (data || []).map((s: OrganizationStaffRecord) => ({
        ...s,
        tournament_assignments: assignmentsMap[s.id] || [],
    }));
};

/** Invite a user to organization staff by email — sends notification + email */
export const inviteOrganizationStaff = async ({
    organizationId,
    userEmail,
    role,
    permissions,
    assignedBy,
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
}) => {
    // 1. Resolve user by email
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", userEmail)
        .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error("User not found. They must have an Esportra account first.");

    // 2. Upsert staff record
    const { data: existing } = await supabase
        .from("organization_staff")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", profile.id)
        .maybeSingle();

    const payload = {
        organization_id: organizationId,
        user_id: profile.id,
        role,
        permissions,
        assigned_by: assignedBy,
        status: "pending",
        accepted_at: null,
        responded_at: null,
    };

    let staffId: string;

    if (existing?.id) {
        const { error } = await supabase
            .from("organization_staff")
            .update(payload)
            .eq("id", existing.id);
        if (error) throw error;
        staffId = existing.id;
    } else {
        const { data: inserted, error } = await supabase
            .from("organization_staff")
            .insert(payload)
            .select("id")
            .single();
        if (error) throw error;
        staffId = inserted.id;
    }

    // 3. Assign tournaments if provided (for mod role)
    if (tournamentIds && tournamentIds.length > 0) {
        const assignmentPayloads = tournamentIds.map((tid) => ({
            organization_staff_id: staffId,
            tournament_id: tid,
            assigned_by: assignedBy,
        }));
        await supabase
            .from("staff_tournament_assignments")
            .upsert(assignmentPayloads, { onConflict: "organization_staff_id,tournament_id" });
    }

    // 4. Create in-app notification (real-time via Supabase subscription)
    const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: profile.id,
        type: "staff_invite",
        title: "Staff Invitation",
        message: `${inviterName || "An organizer"} invited you to staff ${orgName || "an organization"} as ${role === "admin" ? "an Administrator" : role === "mod" ? "a Moderator" : "a Co-Host"}.`,
        data: {
            link: "/staff/dashboard",
            organization_staff_id: staffId,
            organization_id: organizationId,
            org_name: orgName || "Organization",
            role,
        },
    });

    if (notificationError) {
        console.error("Failed to insert staff invite notification:", notificationError);
    }

    // 5. Send email via Resend
    await sendEmail({
        type: "STAFF_INVITE",
        email: profile.email || userEmail,
        data: {
            orgName: orgName || "Organization",
            orgLogo: orgLogo || null,
            role: role === "admin" ? "Administrator" : role === "mod" ? "Moderator" : "Co-Host",
            permissions: permissions,
            invitedBy: inviterName || "An organizer",
        },
    });

    // 6. Audit log
    await logAuditEvent({
        organizationId,
        actorId: assignedBy,
        action: "staff.invite",
        targetType: "staff",
        targetId: staffId,
        details: {
            invitedEmail: userEmail,
            role,
            permissions,
            tournamentIds: tournamentIds || [],
        },
    });
};

/** Update role & permissions for an existing staff record */
export const updateOrganizationStaff = async ({
    staffId,
    role,
    permissions,
    organizationId,
    actorId,
}: {
    staffId: string;
    role: string;
    permissions: StaffPermission[];
    organizationId: string;
    actorId: string;
}) => {
    const { error } = await supabase
        .from("organization_staff")
        .update({
            role,
            permissions,
            updated_at: new Date().toISOString(),
        })
        .eq("id", staffId);
    if (error) throw error;

    await logAuditEvent({
        organizationId,
        actorId,
        action: "staff.update_permissions",
        targetType: "staff",
        targetId: staffId,
        details: { role, permissions },
    });
};

/** Remove a staff member from the organization */
export const removeOrganizationStaff = async ({
    staffId,
    organizationId,
    actorId,
    staffEmail,
}: {
    staffId: string;
    organizationId: string;
    actorId: string;
    staffEmail?: string;
}) => {
    const { error } = await supabase
        .from("organization_staff")
        .delete()
        .eq("id", staffId);
    if (error) throw error;

    await logAuditEvent({
        organizationId,
        actorId,
        action: "staff.remove",
        targetType: "staff",
        targetId: staffId,
        details: { removedEmail: staffEmail || "unknown" },
    });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Invite Response
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Fetch all pending invites for a user (across all orgs) */
export const fetchPendingOrgStaffInvites = async (
    userId: string
): Promise<OrganizationStaffInvite[]> => {
    const { data, error } = await supabase
        .from("organization_staff")
        .select(
            `
      *,
      organization:organization_id (
        id,
        name,
        slug,
        logo_url
      ),
      assigner_profile:assigned_by (
        full_name,
        username,
        email
      )
    `
        )
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as OrganizationStaffInvite[];
};

/** Fetch all active staff assignments for a user */
export const fetchUserOrgStaffAssignments = async (
    userId: string
): Promise<OrganizationStaffInvite[]> => {
    const { data, error } = await supabase
        .from("organization_staff")
        .select(
            `
      *,
      organization:organization_id(
        id,
        name,
        slug,
        logo_url,
        owner_id
      ),
      assigner_profile:assigned_by(
        full_name,
        username,
        email
      )
    `
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data || []) as OrganizationStaffInvite[];
};

/** Accept or decline an organization staff invite */
export const respondToOrgStaffInvite = async ({
    inviteId,
    accept,
    userId,
}: {
    inviteId: string;
    accept: boolean;
    userId: string;
}) => {
    // Get the invite to find org details for audit
    const { data: invite } = await supabase
        .from("organization_staff")
        .select("organization_id")
        .eq("id", inviteId)
        .single();

    const now = new Date().toISOString();
    const updateData = {
        status: accept ? "active" : "declined",
        accepted_at: accept ? now : null,
        responded_at: now,
    };
    const { error } = await supabase
        .from("organization_staff")
        .update(updateData)
        .eq("id", inviteId)
        .eq("status", "pending");
    if (error) throw error;

    if (invite) {
        await logAuditEvent({
            organizationId: invite.organization_id,
            actorId: userId,
            action: accept ? "staff.accept" : "staff.decline",
            targetType: "staff",
            targetId: inviteId,
            details: {},
        });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tournament Assignments
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Bulk assign a staff member to multiple tournaments */
export const assignStaffToTournaments = async ({
    orgStaffId,
    tournamentIds,
    assignedBy,
    organizationId,
}: {
    orgStaffId: string;
    tournamentIds: string[];
    assignedBy: string;
    organizationId: string;
}) => {
    if (tournamentIds.length === 0) return;

    const payloads = tournamentIds.map((tid) => ({
        organization_staff_id: orgStaffId,
        tournament_id: tid,
        assigned_by: assignedBy,
    }));

    const { error } = await supabase
        .from("staff_tournament_assignments")
        .upsert(payloads, { onConflict: "organization_staff_id,tournament_id" });
    if (error) throw error;

    await logAuditEvent({
        organizationId,
        actorId: assignedBy,
        action: "staff.assign_tournament",
        targetType: "staff",
        targetId: orgStaffId,
        details: { tournamentIds },
    });
};

/** Remove a staff member from a tournament */
export const removeStaffFromTournament = async ({
    assignmentId,
    organizationId,
    actorId,
    tournamentId,
    orgStaffId,
}: {
    assignmentId: string;
    organizationId: string;
    actorId: string;
    tournamentId?: string;
    orgStaffId?: string;
}) => {
    const { error } = await supabase
        .from("staff_tournament_assignments")
        .delete()
        .eq("id", assignmentId);
    if (error) throw error;

    await logAuditEvent({
        organizationId,
        actorId,
        action: "staff.unassign_tournament",
        targetType: "staff",
        targetId: orgStaffId || assignmentId,
        details: { tournamentId: tournamentId || "unknown" },
    });
};

/** Fetch all staff assigned to a specific tournament */
export const fetchTournamentAssignedStaff = async (
    tournamentId: string
): Promise<TournamentAssignment[]> => {
    const { data, error } = await supabase
        .from("staff_tournament_assignments")
        .select(`
            *,
            organization_staff:organization_staff_id(
                id, user_id, role, permissions, status,
                profiles:user_id(full_name, username, email, avatar_url)
            )
        `)
        .eq("tournament_id", tournamentId);

    if (error) throw error;
    return (data || []) as TournamentAssignment[];
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Permission Helper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check if a user has staff access to a tournament via the organization.
 * Admin role = access to ALL tournaments. Mod role = needs explicit assignment.
 */
export const getOrgStaffPermissionsForTournament = async (
    userId: string,
    tournamentOrganizationId: string | null,
    tournamentId?: string
): Promise<StaffPermission[]> => {
    if (!tournamentOrganizationId) return [];

    // Get org staff record
    const { data: staffRecord, error } = await supabase
        .from("organization_staff")
        .select("id, role, permissions")
        .eq("organization_id", tournamentOrganizationId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

    if (error) {
        console.error("[getOrgStaffPermissionsForTournament] Error:", error);
        return [];
    }

    if (!staffRecord) return [];

    // Admins get access to everything
    if (staffRecord.role === "admin") {
        return (staffRecord.permissions || []) as StaffPermission[];
    }

    // Non-admins need a specific tournament assignment
    if (!tournamentId) return [];

    const { data: assignment } = await supabase
        .from("staff_tournament_assignments")
        .select("id")
        .eq("organization_staff_id", staffRecord.id)
        .eq("tournament_id", tournamentId)
        .maybeSingle();

    if (assignment) {
        return (staffRecord.permissions || []) as StaffPermission[];
    }

    return [];
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Audit Logging
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Log an audit event */
export const logAuditEvent = async ({
    organizationId,
    actorId,
    action,
    targetType,
    targetId,
    details,
}: {
    organizationId: string;
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
}) => {
    try {
        await supabase.from("staff_audit_log").insert({
            organization_id: organizationId,
            actor_id: actorId,
            action,
            target_type: targetType || null,
            target_id: targetId || null,
            details: details || {},
        });
    } catch (e) {
        // Audit logging should never block operations
        console.error("[logAuditEvent] Failed:", e);
    }
};

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
    let query = supabase
        .from("staff_audit_log")
        .select(
            `
            *,
            actor:actor_id(
                full_name,
                username,
                avatar_url
            )
        `,
            { count: "exact" }
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (actionFilter) {
        query = query.ilike("action", `%${actionFilter}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return {
        logs: (data || []) as AuditLogEntry[],
        total: count || 0,
    };
};

/** Fetch org's tournaments for assignment dropdown */
export const fetchOrgTournaments = async (
    organizationId: string
): Promise<{ id: string; name: string; status: string }[]> => {
    const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as { id: string; name: string; status: string }[];
};
