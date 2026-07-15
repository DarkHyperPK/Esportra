const BRACKET_ID_PREFIX_RE = /^(db-|wb-|lb-|source-)/;

/** Strip visualization prefixes to get the canonical UUID used by the API. */
export function toRawMatchId(id: string | number | null | undefined): string {
  if (id == null || id === '') return '';
  return String(id).replace(BRACKET_ID_PREFIX_RE, '');
}

export function matchIdsEqual(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  if (a == null || b == null) return false;
  return toRawMatchId(a) === toRawMatchId(b);
}
