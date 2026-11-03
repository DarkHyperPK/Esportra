/** Games scrims run in today. Every scrim surface (find, list, filters) offers only these; others stay hidden until they launch. */
export const SCRIM_GAME_SLUGS: readonly string[] = ['valorant'];

export function scrimGamesOf<T extends { slug: string }>(games: readonly T[]): T[] {
  return games.filter((g) => SCRIM_GAME_SLUGS.includes(g.slug.toLowerCase()));
}
