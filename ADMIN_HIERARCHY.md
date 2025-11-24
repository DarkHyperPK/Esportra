# Admin System Hierarchy & Permissions

## Overview
This document outlines the complete hierarchical structure of the admin system, including all admin roles, their permissions, limitations, and responsibilities.

---

## Hierarchy Structure

```
┌─────────────────────────────────────────────────────────┐
│                    SUPER ADMIN                           │
│  • All permissions unlocked                              │
│  • Can manage all admins and roles                       │
│  • Cannot be assigned roles (system-level only)          │
│  • Has access to all features across all roles           │
└─────────────────────────────────────────────────────────┘
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  OPS ADMIN   │    │ FINANCE ADMIN│    │  MODERATOR   │
│              │    │              │    │              │
│ Tier 1       │    │ Tier 2       │    │ Tier 2       │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │SUPPORT ADMIN │
                    │              │
                    │ Tier 3       │
                    └──────────────┘
```

---

## Role Definitions

### 🟡 **SUPER ADMIN** (Tier 0 - Highest Authority)

**Status**: System-level, cannot be assigned via UI  
**Creation**: Database-level only  
**Can be revoked**: No (system protection)

#### Permissions:
- ✅ **ALL PERMISSIONS** - Has access to every feature in the system
- ✅ **Admin Management** - Can assign/revoke any admin role
- ✅ **User Management** - Full control over all users
- ✅ **Tournament Management** - Full control
- ✅ **Venue Management** - Full control
- ✅ **Financial Operations** - Full access
- ✅ **System Settings** - Can modify any system setting
- ✅ **Audit Logs** - Full access
- ✅ **Role Assignment** - Can assign any role to any user
- ✅ **Cross-Role Access** - Automatically has organizer, venue_owner, and casual user perks

#### Limitations:
- ❌ Cannot be assigned additional roles (redundant)
- ❌ Cannot be revoked (system protection)
- ❌ Cannot be suspended/banned by other admins

#### Responsibilities:
- System administration and oversight
- Admin role management
- Critical system decisions
- Emergency access and recovery

---

### 🔵 **OPS ADMIN** (Tier 1 - Operations)

**Status**: Assignable admin role  
**Can be revoked**: Yes (by Super Admin only)  
**Hierarchy**: Reports to Super Admin

#### Permissions:
- ✅ **Tournament Management**
  - View, create, edit, approve, reject tournaments
  - Feature/unfeature tournaments
  - Delete tournaments
- ✅ **Venue Management**
  - View, create, edit venues
  - Approve and verify venues
  - Delete venues
- ✅ **Verification System**
  - View verification requests
  - Approve/reject verification requests
- ✅ **Team Management**
  - View, edit, delete teams
- ✅ **User Management**
  - View user profiles
  - Edit user information
- ✅ **Audit Logs**
  - View audit logs
- ✅ **System Settings**
  - View system settings

#### Limitations:
- ❌ Cannot assign/revoke admin roles
- ❌ Cannot manage other admins
- ❌ Cannot access financial operations (payouts, transactions)
- ❌ Cannot ban users (can only edit)
- ❌ Cannot modify system settings (view only)
- ❌ No access to organizer/venue_owner user features

#### Responsibilities:
- Tournament moderation and approval
- Venue verification
- Content moderation
- User support (non-financial)

---

### 💰 **FINANCE ADMIN** (Tier 2 - Financial Operations)

**Status**: Assignable admin role  
**Can be revoked**: Yes (by Super Admin only)  
**Hierarchy**: Reports to Super Admin

#### Permissions:
- ✅ **User Management**
  - View user profiles
  - Edit user information
- ✅ **Tournament Management**
  - View tournaments (read-only)
- ✅ **Venue Management**
  - View venues (read-only)
- ✅ **Audit Logs**
  - View audit logs
- ✅ **System Settings**
  - View system settings

#### Limitations:
- ❌ Cannot assign/revoke admin roles
- ❌ Cannot manage other admins
- ❌ Cannot approve/reject tournaments
- ❌ Cannot verify venues
- ❌ Cannot delete any content
- ❌ Cannot ban or suspend users
- ❌ Cannot modify system settings (view only)
- ❌ No access to organizer/venue_owner user features
- ❌ Limited to financial data viewing only

#### Responsibilities:
- Financial data review
- Transaction monitoring
- Payout oversight (when implemented)
- Financial reporting

---

### 🛡️ **MODERATOR** (Tier 2 - Community Safety)

**Status**: Assignable admin role  
**Can be revoked**: Yes (by Super Admin only)  
**Hierarchy**: Reports to Super Admin

#### Permissions:
- ✅ **User Management**
  - View user profiles
  - Edit user information
  - **Suspend users** (limited ban)
- ✅ **Tournament Management**
  - View tournaments
  - Edit tournaments
- ✅ **Team Management**
  - View teams
  - Edit teams
- ✅ **Audit Logs**
  - View audit logs

#### Limitations:
- ❌ Cannot assign/revoke admin roles
- ❌ Cannot manage other admins
- ❌ Cannot approve/reject tournaments
- ❌ Cannot verify venues
- ❌ Cannot delete tournaments or venues
- ❌ Cannot ban users (can only suspend)
- ❌ Cannot access system settings
- ❌ No access to organizer/venue_owner user features

#### Responsibilities:
- Community moderation
- User behavior enforcement
- Content policy compliance
- Dispute resolution (limited)

---

### 🎧 **SUPPORT ADMIN** (Tier 3 - User Support)

**Status**: Assignable admin role  
**Can be revoked**: Yes (by Super Admin only)  
**Hierarchy**: Reports to Super Admin

#### Permissions:
- ✅ **User Management**
  - View user profiles
  - Edit user information
- ✅ **Verification System**
  - View verification requests
  - Approve/reject verification requests
- ✅ **Tournament Management**
  - View tournaments (read-only)
- ✅ **Venue Management**
  - View venues (read-only)
- ✅ **Team Management**
  - View teams (read-only)
- ✅ **Audit Logs**
  - View audit logs

#### Limitations:
- ❌ Cannot assign/revoke admin roles
- ❌ Cannot manage other admins
- ❌ Cannot approve/reject tournaments
- ❌ Cannot verify venues
- ❌ Cannot delete any content
- ❌ Cannot ban or suspend users
- ❌ Cannot access system settings
- ❌ No access to organizer/venue_owner user features
- ❌ Limited to support and verification tasks

#### Responsibilities:
- User support and queries
- Verification request processing
- Basic user assistance
- Ticket resolution

---

## Permission Matrix

| Permission | Super Admin | Ops Admin | Finance Admin | Moderator | Support Admin |
|------------|-------------|-----------|---------------|-----------|---------------|
| **Admin Management** |
| `admin:assign_roles` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `admin:manage_admins` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **User Management** |
| `user:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user:edit` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user:suspend` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `user:ban` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tournament Management** |
| `tournament:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tournament:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `tournament:edit` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `tournament:approve` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `tournament:feature` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `tournament:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Venue Management** |
| `venue:view` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `venue:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `venue:edit` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `venue:approve` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `venue:verify` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `venue:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Verification** |
| `verification:view` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `verification:approve` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `verification:reject` | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Team Management** |
| `team:view` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `team:edit` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `team:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **System** |
| `settings:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `settings:update` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `audit:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dispute:resolve` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Role Assignment Rules

### Who Can Assign Roles:
- ✅ **Super Admin** - Can assign any role (admin or user roles)
- ❌ **All Other Admins** - Cannot assign roles

### Who Can Revoke Roles:
- ✅ **Super Admin** - Can revoke any role
- ❌ **All Other Admins** - Cannot revoke roles

### Assignment Restrictions:
1. **Super Admin Role**:
   - ❌ Cannot be assigned via UI (database-only)
   - ❌ Cannot be revoked via UI (database-only)
   - ❌ Cannot be assigned to existing super admins

2. **Admin Roles**:
   - ✅ Can be assigned to regular users
   - ❌ Cannot be assigned to super admins (redundant)
   - ✅ Can be revoked by super admin

3. **User Roles** (organizer, venue_owner, casual):
   - ✅ Can be assigned to any user
   - ✅ Can be assigned to admins (for cross-role access)
   - ✅ Can be revoked by super admin

---

## Access Control Flow

```
User Action Request
    ↓
Check: Is user Super Admin?
    ├─ YES → Allow (all permissions)
    └─ NO  → Check user's admin roles
              ↓
        Check role permissions
              ↓
        Check specific permission
              ↓
        Allow or Deny
```

---

## Best Practices

1. **Principle of Least Privilege**: Assign only the minimum permissions needed
2. **Role Separation**: Keep financial and operational roles separate
3. **Audit Trail**: All admin actions are logged
4. **Regular Review**: Periodically review admin role assignments
5. **Super Admin Protection**: Limit super admin accounts to essential personnel only

---

## Notes

- Super Admin automatically has access to organizer, venue_owner, and casual user features
- Other admins remain in "casual" role context for non-admin tasks
- All admin actions are logged in audit_logs table
- Role assignments can be viewed in admin_user_roles table
- Permissions are checked in real-time via AdminContext

