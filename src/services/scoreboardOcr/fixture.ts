import type { OcrPlayerRow, OcrStatKey, ScoreboardOcrFixture, ScoreboardOcrResult } from '@/types/scoreboardOcr';

const stat = (row: OcrPlayerRow, key: OcrStatKey): number | null => row.stats[key]?.value ?? null;

/**
 * Turn a reader result into the expected-values JSON used by the OCR service's real-screenshot
 * accuracy test. Download it, correct anything the reader got wrong, and commit it next to the image.
 */
export function toFixtureJson(result: ScoreboardOcrResult): ScoreboardOcrFixture {
  return {
    outcome: result.outcome.value,
    ally: result.allyScore.value,
    enemy: result.enemyScore.value,
    map: result.map.value?.name ?? null,
    rows: result.players.map((row) => ({
      side: row.side,
      name: row.name.value,
      kills: stat(row, 'kills'),
      deaths: stat(row, 'deaths'),
      assists: stat(row, 'assists'),
      firstBloods: stat(row, 'firstBloods'),
      plants: stat(row, 'plants'),
      defuses: stat(row, 'defuses'),
    })),
  };
}
