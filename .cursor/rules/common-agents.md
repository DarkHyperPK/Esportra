---
description: "Agent orchestration: available agents, parallel execution, multi-perspective analysis"
alwaysApply: true
---
# Agent Orchestration

## Project context

Read `.cursor/skills/esportra/SKILL.md` first. Agents complement the 7-phase protocol in `project-guidelines/IMPLEMENTATION_GUIDE.md`.

## Available agents

Located in `D:\ECC-1.10.0\agents\` (ECC harness v1.10.0):

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code review | After writing code |
| security-reviewer | Security analysis | Before commits, RLS/auth |
| database-reviewer | Postgres/Supabase | Migrations, RLS, RPCs, queries |
| build-error-resolver | Fix build errors | When build fails |
| e2e-runner | E2E testing | Critical user flows |
| typescript-reviewer | TS/React review | Frontend refactors |
| csharp-reviewer | C# / .NET review | SignalR hub, Station Agent |
| performance-optimizer | Performance | Bottlenecks, bundle size, slow queries |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation | Updating docs |
| docs-lookup | External docs | API/library questions |
| loop-operator | Autonomous loops | Long-running agent tasks |
| harness-optimizer | Harness tuning | Config reliability/cost |

## Immediate agent usage

No user prompt needed:

1. Complex feature requests → **planner**
2. Code just written/modified → **code-reviewer**
3. Bug fix or new feature → **tdd-guide**
4. Architectural decision → **architect**
5. Migration or RLS change → **database-reviewer**
6. Auth/payments/security → **security-reviewer**
7. Slow UI/queries → **performance-optimizer**

## Parallel task execution

ALWAYS use parallel Task execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Multi-perspective analysis

For complex problems, use split role sub-agents:

- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker
