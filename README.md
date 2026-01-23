# Esportra

**Tournaments, Teams, Victory.**

Esportra is a comprehensive esports tournament management platform that enables players, teams, organizers, and venue owners to create, manage, and participate in competitive gaming tournaments.

## About

Esportra provides a complete ecosystem for esports competitions, featuring:

- **Tournament Management**: Create and manage tournaments with brackets, match scheduling, and real-time updates
- **Team Management**: Build and manage teams with roster systems and team-based registrations
- **Map Veto System**: Integrated map selection and veto system for competitive matches
- **Dispute Resolution**: Comprehensive dispute management system with evidence upload and conversation threads
- **Venue Integration**: Connect with gaming venues and organize LAN events
- **Role-Based Access**: Support for players, organizers, venue owners, and administrators

### New in v0.3.1 - Swiss Bracket Engine
- **Swiss Format**: Full Swiss tournament support with group-based pairing
- **Auto Round Limit**: Calculates max rounds based on team count (log2)
- **Undo Round**: Organizers can revert misgenerated rounds
- **Vanishing Team Fix**: Pairing algorithm ensures no team is ever dropped
- **Group Context**: Proper group preservation across all rounds

### v0.3.0 - Graph-Based Bracket Engine
- **Single & Double Elimination**: Full support with automatic winner/loser routing
- **Finals Reset**: Automatic Grand Finals Reset for Double Elimination
- **Modern UI**: Clean glassmorphism bracket visualization
- **PNG Export**: High-resolution bracket export for sharing
- **Stage Capacity**: Generate brackets based on configured stage size

## Getting Started

This is a React + TypeScript application built with Vite, using Supabase as the backend.

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

```bash
npm install
npm run dev
```

## Roadmap

**Coming in v0.4.0:**
- Round Robin format support
- Match scheduling with calendar integration
- Enhanced team statistics dashboard

## Changelog

For detailed version history and updates, see [CHANGELOG.md](./CHANGELOG.md).

Recent versions:
- **v0.3.1** - Swiss bracket engine, undo round, max round limits, pairing fixes
- **v0.3.0** - Graph-based bracket engine, modern UI, Finals Reset, PNG export
- **v0.2.4** - Map veto fixes, bracket persistence improvements
- **v0.2.3** - Dispute system improvements, bracket fixes, and map veto enhancements

## License

Private - All rights reserved

