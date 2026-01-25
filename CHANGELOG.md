# Changelog

## [0.3.5] - 2026-01-25

### Added
- **Banner Crop & Resize**: Organizers can now crop and zoom tournament banners with a dedicated image editor dialog using `react-easy-crop`. Ensures proper 16:9 aspect ratio for all banners.
- **Prize Distribution UI**: Replaced single text input with dedicated "Winner %" and "Runner-up %" fields in the wizard. Includes validation to ensure total cannot exceed 100%.
- **Swiss Standings Status**: Live standings in Swiss view now dynamically display "Q" (Qualified) and "ELIM" (Eliminated) badges based on configured win/loss thresholds.
- **Organizer Public Access**: Added "View Public Page" button to tournament management hero and "View Public" option to tournament cards, allowing organizers to preview the public view.

### Fixed
- **Banner Removal**: Fixed issue where removing a tournament banner didn't persist to the database.
- **Rewards Display**: Fixed rewards not updating on public page after editing in wizard by adding missing `rewards` field to tournament fetch queries.
- **Auto-Redirect Removed**: Organizers can now access the public tournament page without being auto-redirected to management dashboard.

### Changed
- **Banner Styling**: Tournament header banner now displays in full color (removed grayscale) with low opacity for better visual appeal.
- **Waitlist UI Removed**: Removed "Enable Waitlist" toggle from the tournament wizard (feature placeholder removed pending full implementation).
- **Swiss Round Container**: Increased max-height of Swiss view round containers from 400px to 700px for better visibility.

## [0.3.4] - 2026-01-25

### Added
- **Premium Loading Screen**: Implemented a sophisticated, animated loading state for the Teams page/roster synchronization, replacing the generic spinner.
- **Tournament Wins Stat**: Added a "Trophies" card to the Team Dashboard stats bar to showcase tournament victories (currently awaiting backend schema update for auto-population).

### Fixed
- **Manage Roster Modal**: Fixed modal alignment by removing conflicting `relative` class, ensuring it centers correctly on screen.
- **Tab Reload Optimization**: Fixed an issue where switching tabs caused unnecessary page reloads by optimizing the `useEffect` dependency in `Teams.tsx`.

### Changed
- **Player Card Aesthetics**: 
    - Removed the "verified" checkmark indicator.
    - Updated Captain tag to be hidden by default and appear on hover with a premium "Gold/Amber" gradient and shimmer effect.

## [0.3.3] - 2026-01-23

### Documentation
- **Updated README**: Added documentation for Stage Filters, Fullscreen Bracket, and recent UI improvements.
- **Updated KNOWN_ISSUES**: Clarified limitations and versioning for the Swiss Engine.
- **Updated Roadmap**: Reflected current progress on v0.3.x features.

## [0.3.2] - 2026-01-23

### Fixed
- **Role Switcher UI**: Fixed an issue where the "Switch Role" dialog would close immediately because it was nested inside the dropdown menu. Lifted state to `UserMenu` to persist the dialog.
- **Bracket Layout**: Fixed public bracket page layout by removing restrictive `max-w-7xl` container constraints, allowing full-width viewing as requested.
- **Header Cleanup**: Removed redundant "Valorant Split 3" header card from the bracket view to maximize screen real estate for the bracket itself.

### Added
- **Stage Filtering**: Added a new Stage Selector in the bracket sidebar (e.g., Groups vs Playoffs).
- **Fullscreen Mode**: Added a dedicated "Fullscreen" button directly within the bracket toolbar.
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
