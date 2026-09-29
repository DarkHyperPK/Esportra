---
name: discovery-first
description: ALWAYS run first for every Esportra company agent and task (canonical; takes precedence over any same-named personal skill). The company-wide "understand first, then build" protocol. Every agent runs it before analysis, design or implementation - restate the job, separate facts from assumptions, ask the few questions whose answers change the work, confirm, and only then plan and build. Use at the start of any task, whenever a brief is thin or ambiguous, when two readings of a requirement lead to different work, and before any irreversible or expensive step.
---

<!-- esportra-canonical: company-v2 -->
# Discovery First

> Nothing good is built on a guess. Understand the job completely, ask what you cannot find out, confirm, and only then make something.

This protocol is the habit every agent in the company shares. The CEO does not want agents that sprint off in the wrong direction and come back with confident, polished, wrong work. The CEO wants agents that behave like the best senior people they have worked with: people who listen, restate, ask two sharp questions, and then deliver exactly the right thing.

Asking is not a sign of weakness or a way to offload work. A good question is itself a piece of work: it shows you have already thought through the options, and it lets the person who knows the answer supply it in five seconds instead of you guessing for five hours.

---

## The loop

Every task, at every level, runs this loop. Small tasks run it in a minute; large ones take longer at the front and save days at the back.

```
1. RECEIVE    Read the whole request and every file handed to you. Twice.
2. EXPLORE    Find out everything you can by yourself (code, docs, prior projects, the product).
3. RESTATE    Write the job in your own words: goal, audience, success, constraints.
4. SORT       Split what you know into FACTS, ASSUMPTIONS and UNKNOWNS.
5. ASK        Turn the unknowns that change the work into a few sharp questions.
6. CONFIRM    Get answers (or explicit approval of your defaults). Record them.
7. PLAN       Only now decide the approach. Say which answers shaped it.
8. BUILD      Implement against the confirmed understanding.
9. VERIFY     Check the result against the restated job, not against your memory of it.
```

Steps 1 to 6 are the **understanding phase**. Steps 7 to 9 are the **implementation phase**. You may not enter the implementation phase while a **blocking** unknown is open.

---

## Step 2 - Explore before you ask

Never ask a question you could answer yourself. Before writing a single question:

- Read the code in the affected area, the relevant `CLAUDE.md`, prior project folders in `.claude/company/projects/`, and any design or product docs.
- Look at the live product or screenshots if the task is visual.
- Check what conventions already exist (a component, a token, an endpoint pattern, a naming rule).

A question that the codebase already answers wastes the CEO's time and signals that you did not look. A question that only the CEO can answer (intent, priority, taste, business context, trade-offs) is exactly the kind you should ask.

## Step 3 - Restate

Write a short **Understanding** block. If you cannot fill it in, you do not understand the task yet.

```markdown
## Understanding
- **Goal:** what outcome the CEO wants (not the feature, the outcome)
- **For whom:** the specific people affected, and the moment they are in
- **Success looks like:** how we will know it worked
- **Scope:** in / out
- **Constraints:** deadlines, fixed elements, legal, brand, budget, tech
- **Risks if misunderstood:** what goes wrong if my reading is wrong
```

## Step 4 - Sort facts, assumptions and unknowns

| Bucket | Meaning | What you do with it |
|---|---|---|
| **Fact** | Stated by the CEO or verifiable in the code/product | Use it; cite where it came from |
| **Assumption** | Not stated, but has a sensible default you would bet on | State it with the default; proceed unless corrected |
| **Unknown** | Not stated, no safe default, and the answer changes the work | Becomes a question |

Classify every unknown:

- **BLOCKING** - two plausible answers lead to materially different work, cost, risk or user experience. You must not build until it is answered.
- **SHAPING** - the answer changes details but you have a strong default. Ask, but continue with the default in the meantime and flag what would change.
- **NICE-TO-KNOW** - does not change the work. Do not ask. Note it as an assumption if at all.

## Step 5 - Ask well

### What makes a question good

1. **Decisive.** The answer changes what gets built. "Should check-in reminders go by push, email or both?" changes the implementation. "Do you care about user experience?" does not.
2. **Specific, with options.** Offer two to four concrete options with their trade-offs, and put your recommendation first. The person answering should be able to reply with one word.
3. **Carries a default.** "I will do X unless you prefer Y." The asker does the thinking; the answerer confirms or corrects.
4. **Grounded.** Reference what you found: "The current wizard has 7 steps; the quick path has 2. Should this feature live in both, or only the wizard?"
5. **One idea per question.** Never bundle two decisions into one question.
6. **Plain language.** No internal jargon, no file paths unless they help the decision.

### How many

- **Three to five questions per round**, ranked by how much they change the work. If you have ten, you have not explored enough; convert the rest into stated assumptions.
- **At most two rounds** before building. A third round means the brief itself is broken; escalate that instead.

### When NOT to ask

- The answer is in the code, the docs, the product or a previous decision.
- There is a strong, conventional default and the choice is easily reversible.
- The question is about implementation detail that is yours to own (naming, file structure, internal patterns) - decide, and document the decision.
- You are asking to avoid responsibility for a decision that is clearly within your role.

### Question banks

`reference/question-banks.md` lists the questions that most often matter for each discipline (product, visual and brand, UX flow, copy, engineering, data, security, operations, finance, marketing). Use them as a checklist to find your unknowns, never as a questionnaire to paste.

---

## Step 6 - Confirm, and how questions travel

### If you are the main thread (you are talking to the CEO directly)

Use the `AskUserQuestion` tool:

- Up to four questions per call; each with two to four options, recommended option first and labelled "(Recommended)", each option with a one-line description of its consequence.
- Use `multiSelect` only when choices genuinely combine.
- Put previews (ASCII layouts, code snippets, copy variants) on options when comparing visual or textual alternatives.
- After answers arrive, restate the decision in one line and record it.

### If you are a subagent (dispatched by the company pipeline or another agent)

You cannot talk to the CEO directly. Instead:

1. Finish every part of your work that does not depend on the blocking answers.
2. Return with status **`NEEDS_CLARIFICATION`** and a `## Questions` block in this exact format so the orchestrator can batch them into `AskUserQuestion`:

```markdown
## Questions
### Q1 [BLOCKING] <the question, one line>
- Why it matters: <what changes depending on the answer>
- Options:
  - A (Recommended): <option> - <consequence>
  - B: <option> - <consequence>
  - C: <option> - <consequence>
- Default if unanswered: A

### Q2 [SHAPING] ...
```

3. Do not invent the answer to a BLOCKING question to keep moving. Do not bury a blocking question in the middle of a long report.

### Recording answers

Every answer is written to the project's `clarifications.md` (or the task's handoff if there is no project) as:

```markdown
| # | Question | Answer | Asked by | Date | Affects |
```

Answers are binding for the rest of the project. If later work contradicts an answer, stop and re-ask; do not silently override the CEO.

---

## Step 7 - Plan from the answers

Your plan must say which facts and answers shaped it. A plan that could have been written without the answers means the questions were not decisive, or the answers were ignored.

## Step 9 - Verify against the understanding

At the end, re-read your Understanding block and your recorded answers. For each line, point to the evidence in your output that satisfies it. Anything unmet is either fixed or reported, never glossed over.

---

## Reference library

| File | Use it for |
|---|---|
| `reference/question-craft.md` | Whether to ask at all (decision tree), anatomy of a good question, 30 bad → good rewrites, `AskUserQuestion` packaging with previews, writing defaults |
| `reference/interview-scripts.md` | Per-role scripts: what to explore first, question themes, BLOCKING vs SHAPING, filled examples |
| `reference/question-banks.md` | Discipline checklists for finding unknowns |

If this file was loaded without the `esportra-canonical: company-v2` marker at the top, a same-named personal skill shadowed it: read `.claude/skills/discovery-first/SKILL.md` from the repo instead.

## Anti-patterns

| Smell | Why it hurts | Instead |
|---|---|---|
| Building first, asking later | Rework, wasted cycles, lost trust | Understanding phase before any build |
| The questionnaire dump (15 generic questions) | Offloads thinking; CEO ignores it | 3 to 5 decisive, ranked questions with defaults |
| Asking what the code already says | Signals no exploration | Explore first |
| Silent assumptions | Wrong work that looks right | State every assumption with its default |
| Asking without options | Makes the CEO do your thinking | Options, trade-offs, a recommendation |
| Re-asking a decided question | Wastes time, erodes confidence | Read `clarifications.md` first |
| Treating a SHAPING question as blocking | Stalls work unnecessarily | Proceed on the default, flag it |
| Treating a BLOCKING question as shaping | Confident wrong work | If the answer changes the work, stop |
