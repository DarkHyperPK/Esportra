# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-02-19

### Added
- **Automatic Country Detection**: Implemented multi-API IP-based geolocation with robust fallbacks (`api.country.is`, `geojs.io`, etc.).
- **Silent Background Assignment**: Logged-in users without a country set are now automatically assigned one silently.
- **Team Country Inheritance**: Teams now automatically inherit the country code of their owner if missing, ensuring accurate leaderboard placement.
- **Premium Image Flags**: Replaced emoji flags with high-resolution FlagCDN image flags across the entire application for a premium, cross-platform consistent look.
- **Centralized Types**: Created `src/types/venue.ts` to unify the `Venue` interface across management screens, hooks, and cards.

### Changed
- **Profile Editing**: Updated `EditProfileDialog` with clear detection states (Detecting, Success, Failure) and manual override options.
- **Leaderboards**: Updated to display high-quality visual flags next to player and team names.
- **Player Profiles**: Integrated visual flag URLs into user profile cards and headers.

### Fixed
- **TypeScript Workspace Issues**: Resolved multiple "Property missing" and "Type mismatch" errors in venue management components.
- **Duplicate Identifiers**: Fixed duplicate `address` definition in `VenueCard.tsx`.
- **Missing Roles**: Added `'player'` role to `UserRole` enum and fixed redirection logic in `redirectUtils.ts`.
- **CORS Issues**: Optimized geolocation API selection to avoid browser CORS restrictions.

## [0.3.5] - 2026-01-25

### Added
- Banner cropping and resizing tool for tournament organizers.
- Prize distribution validation for tournament creation.
- Swiss standings status badges (Qualified/Eliminated).
- Public page preview for draft tournaments.

## [0.3.4] - 2026-01-20

### Added
- Premium animated loading screen for team dashboards.
- Tournament wins count for teams.

[0.4.0]: https://github.com/DarkHyperPK/Esportra/compare/v0.3.5...v0.4.0
[0.3.5]: https://github.com/DarkHyperPK/Esportra/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/DarkHyperPK/Esportra/compare/v0.3.2...v0.3.4
