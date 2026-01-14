# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.3.0] - 2026-01-15

### Added
- **Graph-Based Bracket Engine**: Complete rewrite of bracket system using a directed graph architecture
  - New `brkt_versions`, `brkt_matches`, and `brkt_edges` tables for flexible bracket storage
  - Support for Single Elimination and Double Elimination formats
  - Automatic winner advancement through graph edges
  - Loser bracket routing for Double Elimination
- **Finals Reset Logic**: Automatic creation of Grand Finals Reset match when Losers Bracket winner wins Grand Finals
- **Bracket Visualization**: Modern bracket UI with glassmorphism design
  - Sidebar filter for Winners/Losers/Finals rounds
  - Dynamic positioning for all bracket types
  - Real-time updates via Supabase subscriptions
- **Bracket Export**: High-resolution PNG export of entire bracket
- **Organizer Management Page**: Dedicated page for bracket management with score entry and match control
- **Public Bracket View**: Read-only bracket view for participants and spectators
- **Stage Capacity Support**: Bracket generation respects stage capacity configuration for target bracket size

### Changed
- **Bracket Generators**: Updated to accept `bracketSize` and `advancementCount` parameters
- **Tournament Fetch**: ManageBracketPage now supports both UUID and slug-based tournament lookup
- **Score Validation**: Improved validation to properly handle 0 scores in BO1 matches

### Fixed
- **Score Entry**: Fixed "Invalid scores" error when entering 1-0 results
- **Tournament Not Found**: Fixed 406 error when navigating to bracket management
- **Export Crashes**: Fixed blank exports and crashes during PNG generation

### Roadmap (Coming in v0.3.1)
- **Multi-Stage Advancement System**: Automatic team advancement between tournament stages
  - Bracket generation respects `advancement_count` (stops when N teams remain)
  - Auto-detection of stage completion
  - Team advancement to next stage with stage unlocking
- **Format Support**: Round Robin and Swiss format bracket generation

## [0.2.4] - 2025-12-27

### Fixed
- **Map Veto System**: Fixed BO format defaulting to BO1 issue - now correctly reads `bestOf` from stage configuration
- **Map Veto System**: Fixed missing `stage_id` on tournament matches - added SQL migration to populate existing records
- **Map Veto System**: Fixed 5th map not displaying in BO5 - corrected decider map detection logic to find leftover unbanned map
- **Map Veto System**: Fixed decider map side selection display in VetoSelectedMaps component
- **Bracket Generation**: Fixed match persistence to use `.upsert()` instead of `.insert()` - now updates existing matches with correct data
- **Captain Match Page**: Fixed "Active Match" section to show next upcoming match instead of last completed match
- **Submission History**: Fixed confusing "Pending" status display - changed to simple history view without status badges

### Added
- **Database Migrations**: Added `20251227_fix_existing_match_data.sql` to populate missing `stage_id` and correct `best_of` values
- **Database Migrations**: Added `20251227_fix_reset_bracket_bestof.sql` to fix bracket reset function
- **Submission History**: Added screenshot thumbnail display (h-20) with click-to-expand functionality
- **Map Veto System**: Added robust fallback logic for `bestOf` format - checks `config.bestOf` then `config.veto.best_of`
- **Debug Tools**: Re-added debug props to MapVetoToken for troubleshooting stage config issues

### Changed
- **Data Flow Standardization**: Standardized "Best Of" format storage to `stage.config.bestOf` (camelCase) as single source of truth
- **Map Veto System**: Updated MapVetoToken to explicitly fetch and derive `effectiveBestOf` from stage configuration
- **Bracket System**: Updated `persistMatches` to correctly determine `best_of` value prioritizing match > stage config > default
- **Stage Wizard**: Updated StageSetupWizard to write `bestOf` to top-level config object
- **Format Rules**: Removed duplicate write to `config.veto.best_of` in StepFormatRules (write once to `config.bestOf`)
- **Submission History**: Renamed "Upload Status" to "Submission History" for clarity
- **Submission History**: Simplified display to show only comment and screenshot without status tracking
- **Debug Overlay**: Made map veto debug overlay draggable for better UX

### Technical Improvements
- Added comprehensive logging in MapVetoToken for stage config debugging
- Improved bracket queries to support legacy `config.veto.best_of` for backward compatibility
- Enhanced match persistence logic to ensure `stage_id` is always saved with new matches
- Updated active match logic to filter by `pending` or `in_progress` status and sort by round/match number

## [0.2.3] - 2025-01-29

### Fixed
- **Bracket UI**: Fixed checkmarks appearing on all teams - now only shows on completed matches where that team won
- **Map Veto System**: Fixed 4 maps not loading (Breeze, Icebox, Split, Sunset) - updated to use `system.assets.games` bucket with fallback
- **Dispute Comments**: Fixed moderator/admin attachments not visible to users - added image display in comment history
- **Dispute Comments**: Fixed NOT NULL constraint error when uploading images without text - now uses empty string instead of null
- **Dispute Resolution**: Fixed resolution section (Resolve/Reject buttons) showing after dispute is already resolved/rejected
- **Dispute Comments**: Fixed conversation history not visible after resolution - both parties can now see full history

### Added
- **Dispute System**: Added image upload capability for users when commenting on disputes (tournament and general support)
- **Dispute System**: Added inline image viewer modal - images now open in modal instead of new tab (prevents exposing Supabase URLs)
- **Dispute System**: Added conversation history visibility for both parties even after resolution
- **Dispute System**: Added closure message for resolved/rejected disputes indicating no further comments allowed
- **Map Veto System**: Added fallback logic to check both `system.assets.games` and `system.assets.website` buckets for map images
- **Hero Section**: Added fallback logic to check both storage buckets for hero image

### Changed
- **Dispute System**: Comment input and resolution section now only visible for open/in_review disputes
- **Dispute System**: Conversation history always visible regardless of dispute status
- **Map Veto System**: Updated all map image URLs to prioritize `system.assets.games` bucket (game assets)
- **Image Display**: All dispute evidence and comment attachments now use inline modal viewer instead of opening in new tabs

## [0.2.2] - 2025-11-21

### Changed
- Bumped package version to 0.2.2 to prep for the next iteration
- Tagged the changelog ahead of upcoming features to keep release history accurate

### Added
- Release comparison links for 0.2.1 and 0.2.2 to maintain traceability

## [0.2.1] - 2025-01-XX

### Fixed
- **Map Veto UI**: Fixed BO selection screen mobile alignment - buttons now stack vertically on mobile devices
- **Map Veto UX**: Fixed scroll position reset issue - dialog now preserves scroll position after each map action (ban/pick)
- **Landing Page**: Improved hero section button styling with better text boxes, shadows, and contrast
- **Landing Page**: Adjusted hero section background transparency for better text visibility (increased overlay opacity to 65%)
- **Landing Page**: Reduced button sizes for better proportions while maintaining visibility

### Changed
- BO selection dialog now uses responsive grid layout (1 column on mobile, 3 columns on desktop)
- Hero section buttons now have gradient backgrounds, icons, and enhanced shadows
- Background overlay opacity increased from 40% to 65% for improved text readability

## [0.2.0] - 2024-11-22

### Added
- Map veto system with real-time synchronization
- Support for BO1, BO3, and BO5 map veto formats
- Team-specific veto links for captains
- Map pool selection in veto system
- Upload results functionality with support for up to 5 images
- Drag-and-drop file upload interface
- Mobile-responsive design for map veto system
- Real-time updates for tournament brackets and participants
- Map images display in veto system
- Attack/Defend side selection with icon-only badges

### Changed
- Improved map veto UI with rounded corners and thin borders
- Enhanced mobile navigation with role switcher
- Updated bracket UI with modern design and better spacing
- Improved map container styling with gradient overlays
- Optimized performance by removing unnecessary delays
- Better alignment and centering for map names and icons

### Fixed
- Fixed BO3 and BO5 map pick sequences
- Fixed auto-assignment of last map in BO3/BO5
- Fixed side selection for final maps
- Fixed transparency and overlay alignment issues
- Fixed double horizontal scrollbars in bracket view
- Fixed bracket generation logic for correct match distribution
- Fixed registration status flash on tournament details page
- Fixed overlapping text in map veto cards
- Fixed mobile view tab reload issues
- Fixed team member display in mobile participant cards

## [0.1.0] - 2024-11-21

### Added
- Initial tournament bracket system
- Tournament management for organizers
- Team registration and participation
- User authentication and role management
- Basic match result reporting

[0.3.0]: https://github.com/DarkHyperPK/Esportra/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/DarkHyperPK/Esportra/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/DarkHyperPK/Esportra/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/DarkHyperPK/Esportra/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/DarkHyperPK/Esportra/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/DarkHyperPK/Esportra/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DarkHyperPK/Esportra/releases/tag/v0.1.0

