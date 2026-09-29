# Question craft

A good question is a piece of work. It shows the options have been thought through and lets the person who knows the answer supply it in seconds. This file teaches the craft: how to tell whether to ask at all, how to classify, how to phrase, how to package for `AskUserQuestion`, and how to write defaults.

---

## 1. Should I ask at all? (decision tree)

```
Can I find the answer in the code, docs, product, clarifications.md or decisions.md?
├─ Yes → Find it. Cite it. Do not ask.
└─ No → Would two plausible answers lead to materially different work, cost, risk or UX?
    ├─ No → Is it within my role to decide (naming, internal structure, implementation detail)?
    │   ├─ Yes → Decide, document the decision in the hand-off. Do not ask.
    │   └─ No → It's an ASSUMPTION: state it with the default; proceed.
    └─ Yes → Is there a strong, conventional, easily reversible default?
        ├─ Yes → SHAPING question: ask, proceed on the default meanwhile, flag what would change.
        └─ No → BLOCKING question: ask; do not build the dependent part until answered.
```

## 2. The anatomy of a good question

```
[BLOCKING] Should check-in reminders go by push, email or both?
- Why it matters: push needs the notification service wired for captains (+1 day); email only is ready today.
- Options:
  - A (Recommended): Push at T-30 and T-10, email at T-30 - captains are on phones at check-in time.
  - B: Email only - ships today, weaker on game day.
  - C: Push only - no email record.
- Default if unanswered: A
```

Five parts: tag, one-line question, why it matters (the consequence), 2-4 options with trade-offs and the recommendation first, and the default.

## 3. Bad → good rewrites

| # | Bad | Why it's bad | Good |
|---|---|---|---|
| 1 | "Any preferences on design?" | Unanswerable; offloads thinking | "Should this page follow our core dark look, or does the charity partner want their own palette? I'll use the core look unless you say otherwise." |
| 2 | "What colours should I use?" | Brand already answers it | (Don't ask - read `esportra-brand`.) |
| 3 | "Is performance important?" | Always yes | "Tournaments can have 512 teams. Should the participants list paginate at 50, or load all with virtual scrolling? I'll paginate at 50." |
| 4 | "Should I add tests?" | The rules already say yes | (Don't ask - `CLAUDE.md` requires them.) |
| 5 | "What should the error message say?" | Your job | Write it; ask only if it involves a policy ("Can we tell users *why* a payment was rejected, or only that it was?") |
| 6 | "Mobile or desktop?" | Too binary, no context | "Captains check in during Discord calls on phones; organizers set up on laptops. Should the check-in view be phone-first and the setup desktop-first?" |
| 7 | "Do you want notifications?" | Vague | "When a team checks in, should the organizer get a notification per team (noisy with 32 teams), a summary at close (Recommended), or none?" |
| 8 | "How should we handle edge cases?" | Not a question | "If a captain checks in and then a player leaves the roster, should the team stay checked in? I'll keep them in and flag the organizer." |
| 9 | "Can you clarify the requirements?" | Pushes all work back | List the 3 specific ambiguities with options. |
| 10 | "Should I use Zustand or Context?" | Implementation detail in your role; CLAUDE.md says server state in TanStack Query | Decide per `CLAUDE.md`; document. |
| 11 | "Is this OK?" (after building) | Too late | Ask before building, with a preview. |
| 12 | "Who is the target user?" | Often discoverable | "The objective says 'organizers'. Do you mean community/cafe organizers (small, free cups) or leagues (paid, many staff)? They need different defaults." |
| 13 | "What tone should we use?" | Brand voice exists | "This is a ban notice. Should it cite the rule section and offer an appeal link? I'll include both." |
| 14 | "Should it be fast?" | Always | "Should the live score update in real time (SignalR) or is a 30-second refresh acceptable? Realtime adds a day." |
| 15 | "Do you like option A or B?" (no context) | Forces a guess | Attach previews and the trade-off of each. |
| 16 | "What's the budget?" | Too open | "Sending SMS reminders costs ~PKR 4 per message (≈ PKR 1,300 per 32-team cup). Worth it, or push/email only?" |
| 17 | "Should admins see this?" | Missing role list | "Which staff roles can approve payments: owner only, owner + finance staff (Recommended), any staff?" |
| 18 | "Any deadline?" | Fine but incomplete | "Is this tied to the Karachi Open on 14 Nov? If so I'll cut the email digest to hit it." |
| 19 | "What about accessibility?" | Required anyway | (Don't ask - build to AA.) Ask only about specific audiences ("Do we need Urdu at launch?"). |
| 20 | "Should I refactor this?" | Scope creep in disguise | "The old wizard is 1,500 lines; touching it risks the release. Refactor now (+2 days) or only change the step we need (Recommended)?" |
| 21 | "What data do we store?" | Discoverable | Read the migrations; ask about *new* data policy ("Should we keep check-in IP addresses for dispute evidence? Default: no.") |
| 22 | "Is it a big launch?" | Vague | "Announce loudly (campaign + partners), quietly (in-product note + email to organizers), or silently? I recommend quietly: it's an improvement, not a new product." |
| 23 | "Should the design be modern?" | Meaningless | Ask about the direction with routes and previews. |
| 24 | "Anything else I should know?" | Lazy closing | Name what could still change the work: "Is anything about this fixed - partner logos, legal text, existing links?" |
| 25 | "Should we support all games?" | Too broad | "Battle-royale games score by placement, not maps. Include BR in this release, or bracket games only (Recommended)?" |
| 26 | "Should errors be logged?" | Always | (Don't ask.) |
| 27 | "What should happen on failure?" | Too open | "If the payment gateway times out after charging, should we mark 'Payment to review' for the organizer (Recommended) or auto-refund?" |
| 28 | "How many questions can I ask?" | Meta | Ask 3-5 ranked. |
| 29 | "Please confirm everything is correct" | Rubber stamp | Ask only what's uncertain; state the rest as assumptions. |
| 30 | "Should the button be rose?" | Brand answers it | (Don't ask - white primary, rose confirms.) |

## 4. Packaging for `AskUserQuestion` (main thread)

- Up to 4 questions per call; BLOCKING first.
- `header` ≤ 12 characters ("Hero", "Channels", "Roles", "Direction").
- Options: 2-4, recommended first with "(Recommended)" in the label; each `description` states the consequence.
- `multiSelect: true` only when options genuinely combine (e.g. channels).
- **Previews** for visual or copy choices: ASCII wireframes of routes, headline variants, before/after copy. A preview turns a taste question into a comparison.

Example (direction routes):

```json
{
  "question": "Which route should the organizer landing page take?",
  "header": "Direction",
  "multiSelect": false,
  "options": [
    { "label": "Cinematic hero (Recommended)", "description": "One huge line 'Run your cup like a final.' over an empty venue. Strongest first impression.",
      "preview": "CAPTION: FOR ORGANIZERS\n\nRun your cup\nlike a final.\n\n              [ HOST A CUP ]" },
    { "label": "Face-off", "description": "'Your cup' vs 'a final' side by side. Clever, but asks the viewer to decode.",
      "preview": "YOUR CUP   vs   A FINAL\nlate start      8:00 PM sharp\nDiscord fights  one dispute button" },
    { "label": "Organizer spotlight", "description": "A real organizer and their quote. Warm and credible; less punchy.",
      "preview": "[photo]\n| ORGANIZER · ARENA 9\n| \"We started on time for the first time.\"" }
  ]
}
```

## 5. Writing defaults

A default is your best bet, stated so the answerer can simply confirm. Good defaults are:
- **Conservative** where risk is high (money, security, deletion): default to the safer option.
- **Conventional** where the codebase has a pattern: default to the pattern.
- **Reversible**: prefer the option that is cheap to change later.
- **Explained in one clause**: "…because captains are on phones at check-in".

## 6. After the answer

Restate the decision in one line, record it in `clarifications.md`, and name what it changed in your plan. If an answer creates a new question, ask it in the next round - don't sit on it.
