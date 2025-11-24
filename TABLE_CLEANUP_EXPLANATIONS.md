# Database Table Cleanup - Explanations

## Tables Being Removed

### 1. **user_reviews** ✅ REMOVE
- **Purpose**: Store user reviews/ratings for tournament organizers or gaming venues
- **Status**: Not currently used, but will be needed later for review system
- **Action**: Remove now, add back when review feature is implemented

### 2. **user_activity** ✅ REMOVE
- **Purpose**: Track user activity logs (page views, actions, etc.)
- **Status**: Unused
- **Action**: Remove

### 3. **role_switch_history** ✅ REMOVE
- **Purpose**: Historical log of when users switched between roles (player → organizer, etc.)
- **Status**: Unused, doesn't affect RBAC control system
- **Action**: Remove (RBAC system works without this history)

### 4. **verification_history** ✅ KEEP
- **Purpose**: Track verification request changes (submitted → approved → rejected)
- **Status**: **IMPORTANT** - Needed for admin audit trail of who verified whom and when
- **Action**: **KEEP** - Essential for admin verification tracking

### 5. **Finance Tables** ✅ REMOVE
- **finance_settings**: Platform fee percentages, payout settings
- **wallets**: User/organizer wallet balances
- **ledger_entries**: Double-entry accounting ledger
- **refunds**: Refund tracking
- **Status**: Will be used when payment system is implemented
- **Action**: Remove now, add back when payment system is built

### 6. **webhook_events** ✅ REMOVE
- **Purpose**: Store payment provider webhooks (Stripe, PayPal) with idempotency keys
- **How it works**: When Stripe sends a payment confirmation, it's stored here to prevent duplicate processing
- **Example**: Payment webhook arrives → Check if idempotency_key exists → If not, process payment → Store webhook
- **Status**: Needed when payment system is implemented
- **Action**: Remove now, add back with payment system

### 7. **user_reports** ✅ REMOVE
- **Purpose**: Allow users to report other users for abuse/harassment
- **Status**: Unused reporting system
- **Action**: Remove

### 8. **content_moderation** ✅ REMOVE
- **Purpose**: Track moderation actions on user-generated content
- **How it works**: When admin removes/bans content, it logs what was moderated, by whom, and why
- **Example**: Admin removes inappropriate tournament description → Logged in content_moderation
- **Status**: Not currently used
- **Action**: Remove now, can add back when content moderation is needed

### 9. **system_notifications** ✅ REMOVE
- **Purpose**: Admin-created broadcast notifications to all users
- **Difference from 'notifications'**: 
  - `notifications` = User-specific notifications (e.g., "You were invited to a team")
  - `system_notifications` = Broadcast messages (e.g., "Platform maintenance Sunday")
- **Features**: Can target specific audiences (all users, organizers only, etc.), scheduled notifications
- **Status**: Not currently used
- **Action**: Remove now, can use 'notifications' table for broadcasts if needed

### 10. **admin_actions** ✅ REMOVE
- **Purpose**: Track sensitive admin operations that require approval from another admin
- **How it works**: Some actions (like deleting large tournaments) require a second admin to approve
- **Difference from audit_logs**:
  - `audit_logs` = Tracks ALL admin actions (already implemented and used)
  - `admin_actions` = Only for actions that need approval workflow
- **Status**: Not currently used, audit_logs is sufficient
- **Action**: Remove now

### 11. **system_metrics** ✅ REMOVE
- **Purpose**: Store platform analytics/metrics over time
- **How it works**: Records metrics like daily active users, tournament completion rates, revenue
- **Example**: Record daily metric "active_users" = 1250, "tournaments_completed_today" = 15
- **Status**: Not currently used
- **Action**: Remove now, can add back when analytics dashboard is needed

## Tables Being Kept (RBAC System)

### 12. **admin_permissions** ✅ KEEP
- **Purpose**: Defines what permissions exist in the system
- **Examples**: 
  - `tournament:approve` - Permission to approve tournaments
  - `user:ban` - Permission to ban users
  - `venue:verify` - Permission to verify venues
- **Status**: **ESSENTIAL** - Part of RBAC system
- **Used by**: `admin_user_has_permission()` function, permission checking

### 13. **admin_role_permissions** ✅ KEEP
- **Purpose**: Links admin roles to permissions (many-to-many relationship)
- **How it works**: 
  - Role "ops_admin" → Has permissions: `tournament:approve`, `venue:verify`, `dispute:resolve`
  - Role "moderator" → Has permissions: `user:ban`, `user:suspend`
- **Status**: **ESSENTIAL** - Part of RBAC system
- **Used by**: `admin_user_has_permission()` function, role-based access control

### 14. **admin_user_roles** ✅ KEEP
- **Purpose**: Assigns admin roles to specific users
- **How it works**: 
  - User X → Has role "ops_admin"
  - User Y → Has role "moderator"
- **Status**: **ESSENTIAL** - Part of RBAC system
- **Used by**: `AdminAccess.tsx` for role assignment, `admin_assign_role()` function

## RBAC System Flow

```
User → admin_user_roles → admin_roles → admin_role_permissions → admin_permissions
  ↓
Check: Does user have permission "tournament:approve"?
  ↓
1. Check if user has direct permission override in profiles.admin_permissions
2. Check if user's roles (via admin_user_roles) have the permission (via admin_role_permissions)
3. Return true/false
```

## Summary

**Removed**: 10 tables (user_reviews, user_activity, role_switch_history, finance tables, webhook_events, user_reports, content_moderation, system_notifications, admin_actions, system_metrics)

**Kept**: verification_history, admin_permissions, admin_role_permissions, admin_user_roles (essential for RBAC)

