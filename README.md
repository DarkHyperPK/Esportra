# Esportra - Esports Tournament Platform

A comprehensive esports tournament management platform built with React, TypeScript, and Supabase.

## 🚀 Features

### For Players
- **Team Management**: Create teams, manage rosters for multiple games
- **Tournament Registration**: Register teams for tournaments
- **Roster System**: Multi-game roster support (max 3 rosters per team)
- **Team Invitations**: Invite members via email with notification system
- **Match Results**: Upload match results with screenshots
- **Live Matches**: View party codes for live tournament matches
- **Dispute System**: Raise disputes with evidence upload

### For Organizers
- **Tournament Creation**: Create and manage tournaments
- **Bracket Generation**: Automatic bracket generation with scheduling
- **Match Management**: Edit matches, set schedules, manage live matches
- **Ban Management**: Ban teams/players from tournaments
- **Dispute Resolution**: Review and resolve player disputes
- **Team Overview**: View all registered teams and their members
- **Live Match Control**: Set party codes for live matches

### For Admins
- **User Management**: Complete user administration system
- **System Settings**: Platform-wide configuration
- **Role Management**: Manage user roles and permissions


## 📚 Key Features Documentation

### Roster System
Teams can create multiple rosters (max 3) for different games. Each roster is game-specific and can have different members. See `ROSTER_ORGANIZATION_MODEL.md` for details.

### Tournament Registration
Teams register specific rosters for tournaments. The system validates:
- Roster exists for tournament game
- Roster has required number of members
- Team captain eligibility

### Bracket System
- Automatic bracket generation from registrations
- Supports 8, 16, 24, 32 team brackets
- Match scheduling and live match management
- Real-time synchronization via Supabase Realtime

### Authentication & Roles
- Multi-role system: Player, Organizer, Admin
- Role-based access control (RBAC)
- Secure authentication via Supabase Auth


