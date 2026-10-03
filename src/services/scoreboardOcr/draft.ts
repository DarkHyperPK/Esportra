import {
  OCR_STAT_KEYS,
  type OcrDraft,
  type OcrDraftPlayer,
  type OcrPlayerRow,
  type OcrStatKey,
  type ScoreboardOcrParse,
  type TeamSlot,
} from '@/types/scoreboardOcr';

/** Below this the reader is unsure; the field is highlighted for the captain. */
export const LOW_CONFIDENCE = 0.6;

export const otherSlot = (slot: TeamSlot): TeamSlot => (slot === 'team1' ? 'team2' : 'team1');

function isStatKey(key: string): key is OcrStatKey {
  return (OCR_STAT_KEYS as readonly string[]).includes(key);
}

function rowTeam(row: OcrPlayerRow, allyTeam: TeamSlot): TeamSlot | null {
  if (row.side === 'ally') return allyTeam;
  if (row.side === 'enemy') return otherSlot(allyTeam);
  return null;
}

function draftPlayer(row: OcrPlayerRow, index: number, allyTeam: TeamSlot, columns: OcrStatKey[]): OcrDraftPlayer {
  const team = rowTeam(row, allyTeam);
  const stats = Object.fromEntries(columns.map((key) => [key, row.stats[key]?.value ?? null]));
  const uncertainStats = columns.filter((key) => {
    const cell = row.stats[key];
    return !cell || cell.value === null || cell.confidence < LOW_CONFIDENCE;
  });
  const teamDisagrees = row.rosterMatch != null && team != null && row.rosterMatch.team !== team;
  return {
    key: `row-${index}`,
    team,
    name: row.name.value ?? '',
    userId: row.rosterMatch?.userId ?? null,
    agentId: row.agent.value?.uuid ?? null,
    stats,
    uncertain: [
      ...uncertainStats,
      ...(row.name.confidence < LOW_CONFIDENCE || !row.rosterMatch ? (['name'] as const) : []),
      ...(!row.agent.value || row.agent.confidence < LOW_CONFIDENCE ? (['agent'] as const) : []),
      ...(team === null || row.sideConfidence < LOW_CONFIDENCE || teamDisagrees ? (['team'] as const) : []),
    ],
  };
}

/**
 * Turn the reader's output into an editable draft in bracket terms (team1/team2).
 * When the reader cannot tell whose screenshot it is, the reporter's own team is assumed to be the
 * ally (tinted) side — and the score is flagged so the captain checks it.
 */
export function draftFromParse(parse: ScoreboardOcrParse, reporterSlot: TeamSlot): OcrDraft {
  const { result } = parse;
  const allyTeam = result.allyTeam.value ?? reporterSlot;
  const columns = result.columns.filter(isStatKey);
  const ally = result.allyScore.value;
  const enemy = result.enemyScore.value;
  const scoreConfidence = Math.min(result.allyScore.confidence, result.enemyScore.confidence);
  return {
    parseId: parse.parseId,
    screenshotUrl: parse.screenshotUrl,
    mapId: parse.mapId,
    mapName: result.map.value?.name ?? null,
    mapUrl: result.map.value?.mapUrl ?? null,
    team1Score: allyTeam === 'team1' ? ally : enemy,
    team2Score: allyTeam === 'team1' ? enemy : ally,
    uncertainScore: ally === null || enemy === null || scoreConfidence < LOW_CONFIDENCE || result.allyTeam.value === null,
    columns,
    players: result.players.map((row, index) => draftPlayer(row, index, allyTeam, columns)),
    warnings: result.warnings,
  };
}

/** Immutable single-field update that also clears that field's "uncertain" highlight. */
export function updateDraftPlayer(
  draft: OcrDraft,
  key: string,
  patch: Partial<Pick<OcrDraftPlayer, 'team' | 'name' | 'agentId'>> & { stat?: [OcrStatKey, number | null] },
): OcrDraft {
  const touched = [
    ...(patch.team !== undefined ? ['team'] : []),
    ...(patch.name !== undefined ? ['name'] : []),
    ...(patch.agentId !== undefined ? ['agent'] : []),
    ...(patch.stat ? [patch.stat[0]] : []),
  ];
  return {
    ...draft,
    players: draft.players.map((player) => {
      if (player.key !== key) return player;
      const { stat, ...fields } = patch;
      return {
        ...player,
        ...fields,
        stats: stat ? { ...player.stats, [stat[0]]: stat[1] } : player.stats,
        uncertain: player.uncertain.filter((field) => !touched.includes(field)),
      };
    }),
  };
}
