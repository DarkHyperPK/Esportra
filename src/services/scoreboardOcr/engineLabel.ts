import type { ScoreboardOcrResult } from '@/types/scoreboardOcr';
import { LOW_CONFIDENCE } from './draft';

/** "rapidocr-3.9.2/pp-ocr" → "PaddleOCR (PP-OCR) via RapidOCR · v3.9.2". Unknown formats pass through. */
export function describeOcrEngine(engineVersion: string): string {
  const match = /^rapidocr-([\w.]+)\/pp-ocr$/i.exec(engineVersion.trim());
  return match ? `PaddleOCR (PP-OCR) via RapidOCR · v${match[1]}` : engineVersion;
}

/** Rows whose agent portrait was matched with enough confidence to show its icon. */
export function countRecognisedAgents(result: ScoreboardOcrResult): number {
  return result.players.filter((p) => p.agent.value !== null && p.agent.confidence >= LOW_CONFIDENCE).length;
}
