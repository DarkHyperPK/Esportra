import type { BREvidence } from '@/types/battleRoyale';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toFiniteNumber = (value: unknown): number | null => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const toEntityId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

/** Normalize API evidence rows (camelCase or snake_case) into the frontend contract. */
export function normalizeBREvidence(raw: unknown, fallbackGameNumber?: number): BREvidence | null {
  if (!isRecord(raw)) return null;

  const teamId = toEntityId(raw.teamId ?? raw.team_id ?? raw.entity_id);
  const imageUrl =
    typeof raw.imageUrl === 'string'
      ? raw.imageUrl
      : typeof raw.image_url === 'string'
        ? raw.image_url
        : typeof raw.url === 'string'
          ? raw.url
          : null;

  if (!teamId || !imageUrl) return null;

  const gameNumber =
    toFiniteNumber(raw.gameNumber ?? raw.game_number)
    ?? (fallbackGameNumber != null ? fallbackGameNumber : undefined);

  return {
    teamId,
    teamName:
      typeof raw.teamName === 'string'
        ? raw.teamName
        : typeof raw.team_name === 'string'
          ? raw.team_name
          : typeof raw.entity_name === 'string'
            ? raw.entity_name
            : 'Unknown',
    imageUrl,
    submittedAt:
      typeof raw.submittedAt === 'string'
        ? raw.submittedAt
        : typeof raw.submitted_at === 'string'
          ? raw.submitted_at
          : new Date(0).toISOString(),
    placement: toFiniteNumber(raw.placement) ?? undefined,
    kills: toFiniteNumber(raw.kills) ?? undefined,
    reviewed: raw.reviewed === true,
    gameNumber,
  };
}

export function normalizeBREvidenceList(
  rows: unknown,
  fallbackGameNumber?: number,
): BREvidence[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => normalizeBREvidence(row, fallbackGameNumber))
    .filter((entry): entry is BREvidence => entry !== null);
}

/** Stable React key for evidence cards. */
export function getBREvidenceRowKey(entry: BREvidence, fallbackGameNumber?: number): string {
  const game = entry.gameNumber ?? fallbackGameNumber ?? 'lobby';
  return `${entry.teamId}-${game}-${entry.submittedAt}-${entry.imageUrl}`;
}
