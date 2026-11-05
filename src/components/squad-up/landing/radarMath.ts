/** Stable 0..1 numbers from an id, so each player keeps the same spot on the scope. */
function seeded(id: string, salt: number): number {
  let hash = salt * 2654435761;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 2246822519) >>> 0;
  return (hash % 1000) / 1000;
}

/** Where a blip sits, as percentages of the scope (kept clear of the centre, where the deck is). */
export function blipPosition(id: string): { left: number; top: number } {
  const angle = seeded(id, 1) * Math.PI * 2;
  const radius = 34 + seeded(id, 2) * 13;
  return { left: 50 + Math.cos(angle) * radius, top: 50 + Math.sin(angle) * radius };
}
