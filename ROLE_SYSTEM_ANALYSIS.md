# Role System Functionality Analysis

## Current Tables and Their Functions

### 1. `user_roles` Table
**Purpose**: Store base role assignments (casual, organizer, venue_owner)

**Key Operations**:
- Check if user has a role: `SELECT * FROM user_roles WHERE user_id = ? AND role = ? AND is_active = true`
- Get all active roles for user: `SELECT role FROM user_roles WHERE user_id = ? AND is_active = true`
- Assign role: `INSERT INTO user_roles (user_id, role, is_active) VALUES (...)`
- Deactivate role: `UPDATE user_roles SET is_active = false WHERE user_id = ? AND role = ?`

**Used By**:
- `RoleContext.tsx` - Role switching, role checking
- `RoleSwitcher.tsx` - Verification status checking
- `VerificationSystem.tsx` - Role assignment on approval
- `AdminManagement.tsx` - Role management
- `UserManagement.tsx` - User role display

**Key Fields**:
- `user_id` (UUID)
- `role` (TEXT: 'casual', 'organizer', 'venue_owner')
- `is_active` (BOOLEAN)
- `assigned_at` (TIMESTAMPTZ)
- `assigned_by` (UUID)

---

### 2. `verified_roles` Table
**Purpose**: Track verification status for business roles (organizer, venue_owner)

**Key Operations**:
- Check if business role is verified: `SELECT * FROM verified_roles WHERE user_id = ? AND role = ? AND status = 'approved' AND is_active = true`
- Approve verification: `INSERT/UPDATE verified_roles SET status = 'approved', verified_by = ?, verified_at = NOW()`
- Reject verification: `UPDATE verified_roles SET status = 'rejected'`

**Used By**:
- `RoleContext.tsx` - Verify before allowing role switch to organizer/venue_owner
- `RoleSwitcher.tsx` - Check verification status for UI display
- `VerificationSystem.tsx` - Update on approval/rejection
- `UserManagement.tsx` - Display verification status

**Key Fields**:
- `user_id` (UUID)
- `role` (app_role: 'organizer', 'venue_owner')
- `status` (TEXT: 'pending', 'approved', 'rejected')
- `is_active` (BOOLEAN)
- `verified_by` (UUID)
- `verified_at` (TIMESTAMPTZ)
- `verification_request_id` (UUID)
- `expires_at` (TIMESTAMPTZ, optional)

---

### 3. `admin_user_roles` Table
**Purpose**: Link users to admin role definitions

**Key Operations**:
- Get user's admin roles: `SELECT role_id FROM admin_user_roles WHERE user_id = ?`
- Assign admin role: `INSERT INTO admin_user_roles (user_id, role_id) VALUES (?, ?)`
- Revoke admin role: `DELETE FROM admin_user_roles WHERE user_id = ? AND role_id = ?`
- Check if user has admin role: Join with `admin_roles` to get role name

**Used By**:
- `AdminContext.tsx` - Load admin roles for current user
- `AdminManagement.tsx` - Assign/revoke admin roles
- `UserManagement.tsx` - Display admin roles

**Key Fields**:
- `user_id` (UUID)
- `role_id` (INT/UUID - references admin_roles.id)
- `assigned_by` (UUID)
- `assigned_at` (TIMESTAMPTZ)

---

### 4. `admin_roles` Table
**Purpose**: Define admin role types and metadata

**Key Operations**:
- Get all admin roles: `SELECT * FROM admin_roles ORDER BY name`
- Get role by name/key: `SELECT * FROM admin_roles WHERE name = ? OR key = ?`
- Used to resolve role_id to role name

**Used By**:
- `AdminContext.tsx` - Resolve role_id to role name
- `AdminManagement.tsx` - Display available roles
- `UserManagement.tsx` - Display role names

**Key Fields**:
- `id` (INT/UUID)
- `name` (TEXT: 'super_admin', 'ops_admin', etc.)
- `key` (TEXT, optional - some schemas have it)
- `description` (TEXT)

---

### 5. `admin_role_permissions` Table (Keep Separate)
**Purpose**: Link admin roles to permissions (many-to-many)

**Note**: This table should remain separate as it's part of the RBAC permission system, not role assignment.

---

### 6. `profiles` Table Fields
**Purpose**: Legacy/admin flags on user profile

**Key Fields**:
- `is_admin` (BOOLEAN) - Quick admin check
- `admin_roles` (TEXT[]) - Legacy array of admin roles
- `admin_permissions` (TEXT[]) - Direct permission overrides
- `role` (TEXT) - Legacy single role field
- `base_role` (TEXT) - Base/default role

---

## Functional Requirements

### Role Checking
1. **Check if user has base role** (casual/organizer/venue_owner)
   - Query: `user_roles` WHERE `is_active = true`
   
2. **Check if business role is verified**
   - Query: `verified_roles` WHERE `status = 'approved' AND is_active = true`
   
3. **Check if user has admin role**
   - Query: `admin_user_roles` JOIN `admin_roles` to get role name

### Role Switching
1. **Switch to casual** - Always allowed (everyone has casual)
2. **Switch to organizer/venue_owner** - Requires:
   - Role exists in `user_roles` with `is_active = true`
   - Role exists in `verified_roles` with `status = 'approved' AND is_active = true`
3. **Switch to admin** - Not allowed (admins stay on casual, get admin perks)

### Verification Flow
1. User submits verification request
2. Admin approves → Creates/updates:
   - `verified_roles`: status = 'approved', is_active = true
   - `user_roles`: is_active = true (if not exists, create it)
   - `profiles.role`: update legacy field

### Admin Role Assignment
1. Super admin assigns role → Creates:
   - `admin_user_roles`: user_id + role_id
   - Updates `profiles.is_admin = true`
   - Updates `profiles.admin_roles` array (legacy)

---

## Unified Table Design Requirements

The unified table must support:

1. ✅ **Base roles** (casual, organizer, venue_owner) with active/inactive status
2. ✅ **Business role verification** (organizer, venue_owner) with status tracking
3. ✅ **Admin roles** (super_admin, ops_admin, etc.) with assignment tracking
4. ✅ **Role assignment tracking** (who assigned, when)
5. ✅ **Verification tracking** (who verified, when, request ID)
6. ✅ **Expiration support** (optional, for time-limited roles)
7. ✅ **Metadata storage** (JSONB for flexible data)
8. ✅ **Efficient querying** (indexes for common queries)

---

## Migration Strategy

### Phase 1: Create Unified Table
- Create `user_roles_unified` with all required fields
- Migrate data from old tables
- Create indexes for performance

### Phase 2: Create Compatibility Layer
- Create views that mimic old table structures
- Create triggers to sync writes in both directions
- Ensure all existing queries continue to work

### Phase 3: Update Code (Gradual)
- Update new code to use unified table
- Keep old code working via compatibility layer
- Migrate old code when convenient

### Phase 4: Cleanup (After Full Migration)
- Drop old tables (optional)
- Remove compatibility layer (optional)

