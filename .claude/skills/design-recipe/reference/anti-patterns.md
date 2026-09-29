# Anti-patterns

Every smell here has been shipped by someone with good intentions. Each costs something specific: attention, trust or distinctiveness. Knowing *why* it fails lets you catch the variant nobody has listed yet.

## Gamer clichés - they make the scene look smaller

| Smell | Why it fails | Instead |
|---|---|---|
| RGB and neon everything; glowing edges | Colour stops meaning anything; reads as a peripherals ad | One cue light on a dark stage |
| Lightning bolts, flames, shattered glass, energy streaks | Borrowed hype | Let a real moment (a face, a score) carry the energy |
| Glitch effects, scanlines, fake CRT | Someone else's nostalgia; undermines precision | Clean hairlines and exact type |
| Fake HUD clutter: crosshairs, hex grids, meaningless data | Decoration pretending to be information | A scoreboard grid with real data, or nothing |
| Aggressive angled shapes everywhere | Kills the power of the single notch | Square by default, one cut for the hero |
| Weapons at the viewer; skulls as brand marks | Violence as decoration; excludes parents, sponsors, newcomers | The games show their art; our brand stays human |

## Template smells - they make us look like everyone

| Smell | Why it fails | Instead |
|---|---|---|
| Grid of identical cards (icon, title, two lines) | No hierarchy; nowhere to start | One hero, then supporting items at clearly smaller scale |
| Stock hero: centred headline, subline, two buttons, gradient blob | Forgettable; any product | An archetype chosen for the job, anchored off-centre |
| Uniform spacing everywhere | Nothing grouped | The doubling space ladder |
| Rounded corners + soft shadow on every box | Generic SaaS softness; fights the cut edge | Square frames; depth by luminance |
| An icon on every heading | Decoration that slows reading | Icons only where they speed recognition |
| Gradients as decoration | Mood without meaning | One light source, one falloff at most |
| Everything animates on scroll | The one real moment is lost | Stillness, then one reveal |
| Library defaults left unmodified | Looks borrowed because it is | Components dressed in our ingredients (use `src/components/ui/kit`) |
| Eyebrows, middots and mono labels on *everything* | Our own devices become template chrome when overused (see `frontend-design`'s list of generated-design tells) | Use captions where they carry information; drop them where they decorate |

## Trust killers - they cost more than they earn

| Smell | Why it fails | Instead |
|---|---|---|
| Fake urgency | Caught once, doubted forever | Real numbers, shown when they matter |
| Hidden or late fees | Money surprises feel like tricks | Fee and prize in the first view |
| Mocking the losing side | Players remember who laughed | Runners-up named with respect |
| Superlatives ("ultimate", "elite", "#1") | Unprovable claims weaken every other claim | One specific, provable fact |
| Euphemism in bad news | Reads as hiding something | Plain facts, one apology, what happens next |
| Stock photos of models "gaming" | This audience spots them instantly | Real community photography, with consent |
| Sponsors dominating the stage | The event looks bought | Partners framed quietly; event as hero |

## Process smells - how bad work gets made

- **Styling before thinking.** Picking colours before knowing moment, truth and idea.
- **Designing alone in the dark.** Guessing at requirements instead of asking (`discovery-first`).
- **Same dish for every table.** Applying one favourite direction to every occasion. Read the room (`direction-engine.md`).
- **Routes that are really one route.** Three colourways of one layout presented as choice.
- **Designing for the screenshot.** Beautiful at one size, broken at every other.
- **Adding until it feels finished.** Finished is when nothing else can be removed.
- **Inventing components.** A new pattern when the kit already has one; each new component is a new word in the language and must earn its place.
