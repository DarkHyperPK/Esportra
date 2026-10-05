import type { OcrPlayerRow, OcrStatKey, RiotMatchPlayer, RiotMatchSummary, ScoreboardOcrResult } from '@/types/scoreboardOcr';
import { nameKey } from './verification';

/** Cells both a screenshot and Riot's record have. */
const COMPARED = ['kills', 'deaths', 'assists', 'acs', 'firstBloods'] as const satisfies readonly OcrStatKey[];
type ComparedKey = (typeof COMPARED)[number];

export interface ComparedCell {
  key: ComparedKey;
  read: number | null;
  riot: number | null;
  same: boolean;
}

export interface ComparedRow {
  readName: string;
  riotId: string | null;
  cells: ComparedCell[];
}

export interface RiotComparison {
  rows: ComparedRow[];
  /** Riot players no screenshot row was matched to. */
  unmatched: string[];
  sameCells: number;
  comparedCells: number;
}

function riotValue(player: RiotMatchPlayer, key: ComparedKey): number | null {
  return player[key] ?? null;
}

function compareRow(row: OcrPlayerRow, riot: RiotMatchPlayer | undefined, keys: ComparedKey[]): ComparedRow {
  return {
    readName: row.nameRead ?? row.name.value ?? '',
    riotId: riot ? `${riot.gameName}#${riot.tagLine}` : null,
    cells: riot
      ? keys.map((key) => {
          const read = row.stats[key]?.value ?? null;
          const value = riotValue(riot, key);
          return { key, read, riot: value, same: read !== null && read === value };
        })
      : [],
  };
}

/** The screenshot read next to Riot's record of the same game, cell by cell (staff test bench). */
export function compareWithRiot(result: ScoreboardOcrResult, match: RiotMatchSummary): RiotComparison {
  const keys = COMPARED.filter((key) => key !== 'acs' && key !== 'firstBloods' ? true : result.columns.includes(key));
  const used = new Set<string>();
  const rows = result.players.map((row) => {
    const key = nameKey(row.name.value ?? row.nameRead ?? '');
    const riot = key ? match.players.find((p) => !used.has(p.puuid) && nameKey(p.gameName) === key) : undefined;
    if (riot) used.add(riot.puuid);
    return compareRow(row, riot, keys);
  });
  const cells = rows.flatMap((r) => r.cells).filter((c) => c.riot !== null);
  return {
    rows,
    unmatched: match.players.filter((p) => !used.has(p.puuid)).map((p) => `${p.gameName}#${p.tagLine}`),
    sameCells: cells.filter((c) => c.same).length,
    comparedCells: cells.length,
  };
}
