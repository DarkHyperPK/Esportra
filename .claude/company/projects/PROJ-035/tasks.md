# PROJ-035 — Task Graph

**Status:** IN_PROGRESS
**Started:** 2026-09-28
**CTO:** Orchestrating

## Task Graph

### Phase 1 — Backend + Types (parallel)
| Task | Description | Status | Agent | Depends On |
|------|-------------|--------|-------|------------|
| TASK-BE-01 | Backend: Add serverRegion to UpdateTournamentRequest | DISPATCHED | Backend Engineer | — |
| TASK-FE-01 | Frontend types: Extend DashboardTournament interface | DISPATCHED | Frontend Engineer | — |

### Phase 2 — Quick fixes + Nav cleanup (parallel, after FE-01)
| Task | Description | Status | Agent | Depends On |
|------|-------------|--------|-------|------------|
| TASK-FE-02 | Wizard cleanup: Remove dead fields | DISPATCHED | Frontend Engineer | FE-01 |
| TASK-FE-03 | Wizard bug fix: autoRemoveUnchecked in UPDATE | DISPATCHED | Frontend Engineer | FE-01 |
| TASK-FE-09 | Nav + Router cleanup (delete MapVetoPanel) | DISPATCHED | Frontend Engineer | — |

### Phase 3 — Panel work (sequential due to shared patterns)
| Task | Description | Status | Agent | Depends On |
|------|-------------|--------|-------|------------|
| TASK-FE-04 | BasicInfoPanel: Remove regDeadline, add rules/region | PENDING | Frontend Engineer | FE-01 |
| TASK-FE-05 | BrandingPanel: Add streamUrl | PENDING | Frontend Engineer | FE-01 |
| TASK-FE-06 | RegistrationPanel: Full check-in consolidation | PENDING | Frontend Engineer | FE-01 |
| TASK-FE-07 | AdvancedSettingsPanel: Remove check-in, add map pool | PENDING | Frontend Engineer | FE-01, FE-09 |
| TASK-FE-08 | PrizePayoutsPanel: Distribution editor + payment | PENDING | Frontend Engineer | FE-01 |

### Phase 4 — Review
| Task | Description | Status | Agent | Depends On |
|------|-------------|--------|-------|------------|
| TASK-FE-10 | Creative Lead review | PENDING | Creative Lead | FE-06, FE-07, FE-08 |

### Phase 5 — QA
| Task | Description | Status | Agent | Depends On |
|------|-------------|--------|-------|------------|
| QA | Full QA pass + code review | PENDING | QA Lead | FE-10 |

## Dispatch Log
- 2026-09-28: Phase 1+2 dispatched (BE-01, FE-01, FE-02, FE-03, FE-09)
