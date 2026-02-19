/**
 * Audit Logger - Centralized utility for logging admin actions
 * Usage: await auditLog.log('suspend', 'user', userId, userName, { reason: '...' });
 */

import { supabase } from './supabase';

export type ActionType =
    | 'create' | 'update' | 'delete'
    | 'approve' | 'reject'
    | 'suspend' | 'unsuspend' | 'ban' | 'unban'
    | 'verify' | 'unverify'
    | 'resolve' | 'escalate'
    | 'login' | 'logout'
    | 'settings_update' | 'role_change';

export type TargetType = 'user' | 'tournament' | 'venue' | 'payment' | 'team' | 'match' | 'dispute' | 'system';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

interface AuditLogEntry {
    admin_id: string;
    admin_name: string;
    action_type: ActionType;
    target_type: TargetType;
    target_id: string;
    target_name: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    severity: Severity;
}

// Determine severity based on action type
function getSeverity(action: ActionType): Severity {
    switch (action) {
        case 'ban':
        case 'delete':
            return 'critical';
        case 'suspend':
        case 'reject':
        case 'escalate':
            return 'high';
        case 'approve':
        case 'verify':
        case 'resolve':
        case 'role_change':
        case 'settings_update':
            return 'medium';
        default:
            return 'low';
    }
}

class AuditLogger {
    /**
     * Log an admin action to the audit_logs table
     */
    async log(
        actionType: ActionType,
        targetType: TargetType,
        targetId: string,
        targetName: string,
        details?: Record<string, unknown>,
        severityOverride?: Severity
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'No authenticated user' };
            }

            // Get admin profile name
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', user.id)
                .single();

            const adminName = profile?.full_name || profile?.username || user.email || 'Unknown Admin';

            const entry: AuditLogEntry = {
                admin_id: user.id,
                admin_name: adminName,
                action_type: actionType,
                target_type: targetType,
                target_id: targetId,
                target_name: targetName,
                details: details || {},
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                severity: severityOverride || getSeverity(actionType),
            };

            const { error } = await supabase
                .from('audit_logs')
                .insert(entry);

            if (error) {
                console.error('Failed to write audit log:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (err) {
            console.error('Audit logging error:', err);
            return { success: false, error: String(err) };
        }
    }

    // Convenience methods for common actions
    async userSuspended(userId: string, userName: string, reason: string) {
        return this.log('suspend', 'user', userId, userName, { reason });
    }

    async userBanned(userId: string, userName: string, reason: string) {
        return this.log('ban', 'user', userId, userName, { reason });
    }

    async tournamentApproved(tournamentId: string, tournamentName: string) {
        return this.log('approve', 'tournament', tournamentId, tournamentName);
    }

    async tournamentRejected(tournamentId: string, tournamentName: string, reason: string) {
        return this.log('reject', 'tournament', tournamentId, tournamentName, { reason });
    }

    async venueVerified(venueId: string, venueName: string) {
        return this.log('verify', 'venue', venueId, venueName);
    }

    async disputeResolved(disputeId: string, matchName: string, resolution: string) {
        return this.log('resolve', 'dispute', disputeId, matchName, { resolution });
    }

    async settingsUpdated(settingName: string, changes: Record<string, unknown>) {
        return this.log('settings_update', 'system', 'settings', settingName, changes);
    }

    async roleChanged(userId: string, userName: string, oldRole: string, newRole: string) {
        return this.log('role_change', 'user', userId, userName, { oldRole, newRole });
    }
}

export const auditLog = new AuditLogger();
