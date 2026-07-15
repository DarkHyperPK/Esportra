/** Normalize pasted invite codes: trim, uppercase, collapse internal whitespace. */
export function normalizeInviteCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '');
}

export function isLikelyInviteCode(raw: string): boolean {
  const normalized = normalizeInviteCode(raw);
  return normalized.length >= 4;
}
