# Question banks

Checklists for finding the unknowns in a task. Scan the bank for your discipline, tick off everything the brief, code or product already answers, and turn only the remaining decisive gaps into questions (see `SKILL.md`, Step 5). Never paste a bank at the CEO.

Each bank is ordered roughly by how often the answer changes the work.

---

## Product (CPO, product-facing work)

- Whose problem is this, specifically? Organizer, staff, captain, player, venue owner, fan, partner?
- What are they trying to get done, and what do they do today instead?
- What is the moment of use: setup at a desk, game day on a phone, after the event?
- What does success look like in behaviour (fewer disputes, faster check-in, more registrations)? How will we measure it?
- What is the smallest version that proves value? What is explicitly out of scope?
- Which existing flows does this touch, and must they keep working exactly as today?
- Are there roles or permissions that change who sees or does what?
- What happens in the edge states: zero items, thousands of items, a late change, a cancellation, a dispute?
- Is there a deadline tied to a real event (a tournament date, a partner launch)?

## Visual, brand and creative (CMO, Creative Lead, UI/UX Designer)

- Who is the audience, and where are they on the arc (anticipation, nerves, match, outcome, belonging, trouble)?
- What is the one thing they must take away in three seconds?
- Which medium and formats: product screen, landing page, social (4:5, 9:16), video, venue screen, email, print?
- Should this sit in the core Esportra look, or does the occasion call for a variation (co-brand, charity, league identity, seasonal, retro theme)? How much latitude do we have?
- Is there a hero asset available (real photography, team crests, game art), or must the piece work with type alone?
- What is fixed: partner logos, legal lines, dates, prize amounts, exact names and spellings?
- What tone should it strike: calm and official, proud and celebratory, urgent but honest, apologetic?
- What would make this a failure in the CEO's eyes? Any past piece they loved or hated, and why?
- Is there existing work this must sit beside and match?
- Are there accessibility, language (English, Urdu, Roman Urdu) or regional considerations?

## UX flow and interaction (UI/UX Designer, Frontend Engineer)

- What is the entry point, and where does the user go after success? After failure?
- Which decisions does the user make, in what order do they naturally make them?
- What must be reversible, and what is destructive (needs a confirm)?
- What are the states: empty, loading, partial, error, locked, permission-limited, success?
- Mobile first or desktop first for this surface? Which is used at the critical moment?
- Save model: explicit save, auto-save, or step-by-step wizard?
- Is realtime needed (other people's changes appearing live)?
- What should motion communicate here, if anything?

## Copy and voice (CMO, Creative Lead)

- What is the single message? What action should the words drive?
- Which words does this audience use for these things (their vocabulary, not ours)?
- Are there numbers, times or amounts that must be exact? Which time zone and currency?
- Is there bad news or a sensitive fact to communicate?
- Which languages?

## Engineering (CTO, Architect, Backend, Frontend)

- Does this extend an existing pattern or need a new one? Which pattern is canonical if there are two?
- What data is read and written, by whom, and how often? Expected volumes?
- What must be consistent immediately, and what can be eventually consistent?
- Does it need realtime (SignalR) or is polling/refetch acceptable?
- Which existing contracts (API, database, events) must not break? Are there mobile or desktop clients depending on them?
- How is it rolled out: behind a flag, to one organizer first, all at once?
- What are the failure modes and how should the user experience them?

## Data (Database Engineer)

- Is this new data, or a new shape of existing data? Is there existing data to migrate or backfill?
- Who owns each row (for RLS)? Who may read it, who may write it?
- What must be unique, what must never be null, what is derived?
- Expected row counts now and in a year? Query patterns (by tournament, by user, by time)?
- Is any of it personal or financial data with retention or deletion requirements?

## Security (CIO, Security QA)

- What new input does this accept, from whom, and what is the worst thing it could contain?
- Does it change who can see or change what? Where is that enforced (RLS, RPC, API)?
- Does it touch money, identity, files or secrets?
- Could it be abused at scale (spam invites, registration flooding, scraping)?
- What must be logged for audit?

## Operations (COO, DevOps)

- Who runs this day to day, and what do they need to do when it misbehaves?
- Does it add a manual step for staff, support or organizers?
- What are the deployment dependencies (migrations first, feature flags, config)?
- What monitoring or alert tells us it broke before users do?

## Finance (CFO)

- Does it involve money moving (entry fees, payouts, bookings)? Who carries the risk?
- Does it add running cost (storage, bandwidth, third-party APIs, notifications)?
- What is the expected return, and over what horizon?
- Are there tax, invoicing or refund implications?

## Marketing and growth (CMO)

- Which audience segment does this help us win or keep?
- Is there a story to tell at launch? Who tells it, where, when?
- Does it change our positioning or promise?
- Will partners or sponsors see it, and what do they need from it?
