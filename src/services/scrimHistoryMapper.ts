/**
 * scrimHistoryMapper.ts
 *
 * GET /api/scrims/teams/{id}/history returns both teams' names and scores per row, plus a
 * result only for team members. The UI wants each row from the viewed team's side.
 * Mapping here, once, keeps every history surface consistent.
 */

import type { ScrimHistoryEntry, ScrimHistoryPage, ScrimHistoryResult } from '@/types/competitive';

export interface RawHistoryRow {
  id?: string;
  scheduledAt?: string | null;
  gameSlug?: string | null;
  team1Id?: string;
  team1Name?: string | null;
  team2Id?: string;
  team2Name?: string | null;
  team1Score?: number | null;
  team2Score?: number | null;
  result?: string | null;
  mapName?: string | null;
  completedAt?: string | null;
}

export interface RawHistoryPage {
  items?: RawHistoryRow[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const isResult = (v: unknown): v is ScrimHistoryResult => v === 'win' || v === 'loss' || v === 'draw';

function toEntry(row: RawHistoryRow, teamId: string): ScrimHistoryEntry | null {
  if (!row.id || row.team1Score == null || row.team2Score == null) return null;
  const mine1 = row.team1Id === teamId;
  const myScore = mine1 ? row.team1Score : row.team2Score;
  const opponentScore = mine1 ? row.team2Score : row.team1Score;
  const derived: ScrimHistoryResult = myScore > opponentScore ? 'win' : myScore < opponentScore ? 'loss' : 'draw';

  return {
    sessionId: row.id,
    opponentTeamId: (mine1 ? row.team2Id : row.team1Id) ?? '',
    opponentTeamName: (mine1 ? row.team2Name : row.team1Name) ?? null,
    opponentTeamLogo: null,
    scheduledAt: row.scheduledAt ?? null,
    gameSlug: row.gameSlug ?? null,
    myScore,
    opponentScore,
    result: isResult(row.result) ? row.result : derived,
    mapName: row.mapName ?? null,
  };
}

export function toHistoryPage(raw: RawHistoryPage | undefined, teamId: string): ScrimHistoryPage {
  const rows = Array.isArray(raw?.items) ? raw.items : [];
  return {
    items: rows.flatMap((row) => toEntry(row, teamId) ?? []),
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    pageSize: raw?.pageSize ?? 20,
    // The endpoint answers 401/403 for private history, so a successful response is visible.
    isPublic: true,
  };
}
