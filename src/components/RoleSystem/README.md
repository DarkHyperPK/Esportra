# Role-Based System

A comprehensive role-based system that allows users to switch between "Player" and "Organizer" roles, similar to Fiverr's buyer/seller system.

## Features

### 🎮 Player Role
- **Create Teams**: Form and manage esports teams
- **Join Tournaments**: Register teams for tournaments
- **Report Scores**: Submit match results with screenshots
- **Team Management**: Invite members, transfer captaincy
- **Tournament Participation**: Compete in tournaments

### 🏆 Organizer Role
- **Create Tournaments**: Set up and manage tournaments
- **Bracket Management**: Generate and manage tournament brackets
- **Verify Results**: Review and approve match scores
- **Tournament Administration**: Manage participants and events
- **Event Oversight**: Monitor tournament progress

## Database Schema

### Tables Created
- `user_roles` - Stores user role assignments
- `role_switch_history` - Tracks role changes

### Key Features
- **One Active Role**: Users can only have one active role at a time
- **Role History**: Complete audit trail of role changes
- **Database Constraints**: Enforces role-based permissions
- **RLS Policies**: Secure role-based access control

## Components

### `RoleContext`
Provides role management functionality:
- Current role state
- Role switching logic
- Permission checks
- Role validation

### `RoleSwitcher`
UI component for role switching:
- Visual role indicators
- Role switching dialog
- Permission explanations
- Role history tracking

## Usage

### For Players
```tsx
const { canCreateTeams, canReportScores } = useRole();

if (canCreateTeams) {
  // Show team creation options
}

if (canReportScores) {
  // Show score reporting features
}
```

### For Organizers
```tsx
const { canCreateTournaments, canVerifyResults } = useRole();

if (canCreateTournaments) {
  // Show tournament creation options
}

if (canVerifyResults) {
  // Show verification features
}
```

## Setup Instructions

1. **Run Database Migration**:
   ```sql
   -- Execute the SQL in src/database/role-system-migration.sql
   ```

2. **Add RoleProvider to App**:
   ```tsx
   import { RoleProvider } from '@/contexts/RoleContext';
   
   <AuthProvider>
     <RoleProvider>
       {/* Your app */}
     </RoleProvider>
   </AuthProvider>
   ```

3. **Use Role Hook**:
   ```tsx
   import { useRole } from '@/contexts/RoleContext';
   
   const { currentRole, switchRole, canCreateTeams } = useRole();
   ```

## Permission Matrix

| Feature | Player | Organizer |
|---------|--------|-----------|
| Create Teams | ✅ | ❌ |
| Join Tournaments | ✅ | ❌ |
| Report Scores | ✅ | ❌ |
| Create Tournaments | ❌ | ✅ |
| Manage Brackets | ❌ | ✅ |
| Verify Results | ❌ | ✅ |
| View Tournaments | ✅ | ✅ |
| View Teams | ✅ | ✅ |

## Role Switching

### When to Switch Roles
- **To Player**: When you want to compete in tournaments
- **To Organizer**: When you want to create and manage tournaments

### Role Switching Process
1. Click "Switch Role" in user menu
2. Select desired role
3. Add optional reason
4. Confirm role change
5. Access new features immediately

## Security

- **Database Constraints**: Enforce role-based permissions
- **RLS Policies**: Secure data access by role
- **Frontend Validation**: UI restrictions based on role
- **Audit Trail**: Complete role change history

## Benefits

- ✅ **Clear Separation**: No confusion between roles
- ✅ **Flexible**: Users can switch roles as needed
- ✅ **Secure**: Role-based access control
- ✅ **Auditable**: Complete role change history
- ✅ **Scalable**: Easy to add new roles
- ✅ **User-Friendly**: Intuitive role switching

## Future Enhancements

- **Admin Role**: Super admin capabilities
- **Venue Owner Role**: Venue management features
- **Role Permissions**: Granular permission system
- **Role Templates**: Predefined role configurations
- **Bulk Role Management**: Admin role assignment tools
