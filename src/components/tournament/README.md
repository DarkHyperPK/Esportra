# Tournament Bracket System

A comprehensive tournament bracket system with automatic generation, score reporting, and verification tools.

## Features

### 🏆 Automatic Bracket Generation
- Generates tournament brackets automatically when teams register
- Supports single-elimination tournaments
- Random seeding for fair competition
- Handles odd numbers of teams with byes

### 📊 Score Reporting
- Team captains can report match scores
- Screenshot upload for proof
- Pending verification system
- Dispute handling

### ✅ Verification System
- Organizers can verify match results
- Accept or reject reported scores
- Verification notes and comments
- Automatic bracket progression

### 🎯 Real-time Updates
- Live bracket updates
- Match status tracking
- Winner advancement
- Tournament progression

## Database Schema

### Tables Created
- `tournament_matches` - Stores match information
- `match_results` - Stores reported scores and verification
- `match-screenshots` - Storage bucket for proof images

### Key Features
- Row Level Security (RLS) policies
- Automatic timestamp updates
- Foreign key constraints
- Indexes for performance

## Usage

### For Organizers
1. **Generate Bracket**: Click "Generate Bracket" after teams register
2. **Verify Results**: Review and verify reported match scores
3. **Monitor Progress**: Track tournament progression in real-time

### For Team Captains
1. **Report Scores**: Upload screenshots and report final scores
2. **View Bracket**: See current tournament standings
3. **Track Matches**: Monitor upcoming matches

## Components

### `TournamentBracket`
Main bracket visualization component with:
- Bracket generation
- Score reporting dialogs
- Verification interface
- Match status display

### `useTournamentBracket`
Custom hook providing:
- Bracket data management
- Score reporting functions
- Verification logic
- Real-time updates

## Setup Instructions

1. **Run Database Migration**:
   ```sql
   -- Execute the SQL in src/database/bracket-migration.sql
   ```

2. **Import Components**:
   ```tsx
   import TournamentBracket from '@/components/tournament/TournamentBracket';
   ```

3. **Add to Tournament Page**:
   ```tsx
   <TournamentBracket 
     tournamentId={tournament.id}
     isOrganizer={isOrganizer}
     onBracketUpdate={fetchTournamentData}
   />
   ```

## Security

- **RLS Policies**: Secure data access
- **Role-based Access**: Organizers vs participants
- **File Upload Security**: Screenshot validation
- **Input Validation**: Score and data validation

## Future Enhancements

- Double-elimination brackets
- Swiss tournament format
- Live streaming integration
- Mobile app support
- Advanced statistics
- Tournament history
