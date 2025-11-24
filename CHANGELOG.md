# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.2]: https://github.com/DarkHyperPK/Esportra/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/DarkHyperPK/Esportra/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/DarkHyperPK/Esportra/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DarkHyperPK/Esportra/releases/tag/v0.1.0

