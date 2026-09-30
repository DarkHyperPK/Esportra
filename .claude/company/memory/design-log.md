# Design log

One line per shipped surface. The Creative Lead appends after every APPROVED review and reads the last entries before choosing a direction (the sameness check in `design-recipe`). If a new piece would look the same whatever its brief, the direction was chosen by habit.

| Date | Project / piece | Surface | Direction (+ blend) | Archetype | Hero | What was new / try next |
|---|---|---|---|---|---|---|
| 2026-09-29 | Tournament dashboard redesign | Organizer dashboard shell + Overview | Command Console, Broadcast header | Pulse + scoreboard | "Needs you" queue | Nav grouped by intent (Run / Community / Configure); lifecycle track. Next: try Editorial for the recap view |
| 2026-09-29 | Create flow | Quick-create + wizard | Broadcast | Fork, then path | The first decision (game / setup path) | Shared kit (`src/components/ui/kit`); words written before layout |
| 2026-09-29 | Dashboard panels | Configure + Participants + Invitations | Command Console | Scoreboard, settings anatomy | Sticky save state | PanelSaveBar; roster visible without hover |
| 2026-09-29 | Stage setup wizard | Dialog wizard | Broadcast | Path, verdict-style review | The path from first match to final | Three-question stage form; numbered review path |
| 2026-09-29 | Design recipe boards | Brand reference boards | Broadcast (specimen) | Scoreboard grid of devices | "Every match, official." | Rendered signature moves + archetypes in real brand colours |
| 2026-09-30 | PROJ-040 C-5 | RegistrationPanel check-in ChoiceGroup | Command Console (L0) | Settings anatomy (inherited) | Two valid cards | Removed ghost options; InlineNotice neutral below ChoiceGroup. Try: same pattern for other parked features. |
| 2026-09-30 | PROJ-040 C-6 | TournamentAnnouncementPanel staff view | Command Console (L0) | Settings anatomy (inherited) | Announcement list | canActAsOwner gate; InlineNotice neutral replaces compose button for staff. No new components. |
