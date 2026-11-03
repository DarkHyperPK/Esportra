import type { Rating } from '@/schemas/scrimReport';

const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');

/** How a rating is built, for the hover text: each part with its measured value, its 0–100 score and its weight. */
export function ratingBreakdown(r: Rating): string {
  return r.parts.map((p) => `${p.label}: ${p.value == null ? 'no data' : fmt(p.value)} → ${p.score == null ? '—' : Math.round(p.score)} (${Math.round(p.weight * 100)}%)`).join('\n');
}

export const ratingChange = (v: number) => fmt(Math.abs(v));
