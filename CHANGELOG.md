# Changelog

## [0.3.2] - 2026-01-23

### Fixed
- **Role Switcher UI**: Fixed an issue where the "Switch Role" dialog would close immediately because it was nested inside the dropdown menu. Lifted state to `UserMenu` to persist the dialog.
- **Bracket Layout**: Fixed public bracket page layout by removing restrictive `max-w-7xl` container constraints, allowing full-width viewing as requested.
- **Header Cleanup**: Removed redundant "Valorant Split 3" header card from the bracket view to maximize screen real estate for the bracket itself.

### Added
- **Stage Filtering**: Added a new Stage Selector in the bracket sidebar (e.g., Groups vs Playoffs). Users can now switch between tournament stages seamlessly without leaving the view.
- **Fullscreen Mode**: Added a dedicated "Fullscreen" button directly within the bracket toolbar, replacing the previous header button.
- **UI Polish**: Updated sidebar buttons to use "Poppins" font, added premium "Esports" styling (gradients, glows) to stage selectors, and improved active state visibility.

## [0.3.1] - 2026-01-23

### Added
- **Undo Round Functionality**: Implemented `SwissGenerator.deleteRound` and a corresponding UI button in `SwissView.tsx`. Organizers can now roll back the latest round if generation issues occur.
- **Max Round Limit**: Added a strict logic check `Math.ceil(Math.log2(totalTeams))` to prevent generating rounds beyond the mathematical limit for Swiss tournaments (e.g., capped at 5 rounds for 32 teams).
- **Match Score Validation**: improved `MatchCard` inputs to respect `Best Of` settings (e.g., verifying limits for BO1/BO3).

### Fixed
- **Critical Pairing Bug**: Fixed an issue where `SwissGenerator` failed to fetch `group_id` when rebuilding pools for Round 2+, causing cross-group pairings and "vanishing" matches in the UI.
- **"Vanishing Team" Bug**: Fixed a logic flaw in the pairing algorithm ("floater" handling). Previously, if multiple teams were left over without valid opponents (due to strict rematch constraints), they were dropped. Now, the system forces them to pair up to ensure every team has a match or BYE.
- **Schema Errors**: Removed references to non-existent `x` and `y` columns in the `brkt_matches` insert logic, fixing database write errors during generation.
- **UI Feedback**: `SwissView` now clearly displays "Round X of Y" and disables the generation button when the stage is complete.

### Changed
- **Bracket Visualization**: Added logging to `BracketVisualization` and `SwissView` to better track refresh events and data syncing.
