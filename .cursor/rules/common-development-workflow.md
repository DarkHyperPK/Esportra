---
description: "Development workflow: plan, TDD, review, commit pipeline"
alwaysApply: true
---
# Development Workflow

> This rule extends the git workflow rule with the full feature development process that happens before git operations.

The Feature Implementation Workflow describes the development pipeline: planning, TDD, code review, and then committing to git.

## Feature Implementation Workflow

Aligned with `project-guidelines/IMPLEMENTATION_GUIDE.md` and `.cursor/skills/esportra/SKILL.md`.

1. **Plan First**
   - Read **esportra** skill + use **planner** agent
   - Phases 1–4: discovery, interaction map, edge cases, file-level plan
   - Activate `product-lens` when the "why" is unclear

2. **TDD Approach**
   - Use **tdd-guide** agent + `tdd-workflow` skill
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

3. **Code Review**
   - Use **code-reviewer** agent + `coding-standards` skill immediately after writing code
   - **database-reviewer** for SQL/RLS; **security-reviewer** for auth
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Verify**
   - `e2e-testing`, `browser-qa`, **e2e-runner** for critical flows

5. **Commit & Push**
   - `git-workflow` skill
   - Conventional commits; see git workflow rule for PR process
