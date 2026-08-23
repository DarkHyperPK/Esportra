---
description: "TypeScript patterns extending common rules"
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
alwaysApply: false
---
# TypeScript/JavaScript Patterns

> This file extends the common patterns rule with TypeScript/JavaScript specific content.

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

## Custom Hooks Pattern

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

## Repository Pattern

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```

## Match Room Realtime (Esportra)

- Page-level: `useMatchRoomRealtime({ matchId })` — single `JoinMatch` per match page.
- On `CheckInUpdated`: invalidate `match-checkins`, `match-room-state`.
- On `TimeProposalUpdated`: invalidate `match-time-proposals`, `match-room-state`.
- Child hooks (`useMatchCheckin`, `useTimeProposal`): pass `subscribeRealtime: false` when parent coordinates.

## Auth Roles on Sign-In

- Invalidate `meRolesQueryKey` after successful sign-in and on user-id change; `removeQueries` on sign-out.
- Do not gate role switcher on `isSuccess` alone — use `deriveHasApprovedLicense(meRoles)` with session hint while loading.
