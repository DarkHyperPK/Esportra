import igdbManifest from '@/data/igdb-manifest.json';
import { findCatalogGame } from '@/utils/gameCatalogLookup';

export const PLACEHOLDER_LOGO = '/placeholder.svg';

type IgdbManifestEntry = {
  slug: string;
  name: string;
  cover?: string;
  coverUrl?: string | null;
};

const bundledIgdbBySlug = new Map(
  (igdbManifest as IgdbManifestEntry[]).map((entry) => [entry.slug.toLowerCase(), entry]),
);
const bundledIgdbByName = new Map(
  (igdbManifest as IgdbManifestEntry[]).map((entry) => [entry.name.trim().toLowerCase(), entry]),
);

/** Catalog slug → IGDB manifest slug when they differ. */
const IGDB_SLUG_ALIASES: Record<string, string> = {
  'rainbow-six-siege': 'r6',
};

/** Seed JSON logo filenames that do not follow `{slug}-logo.png`. */
const SEED_LOGO_OVERRIDES: Record<string, string> = {
  'rainbow-six-siege': '/games/r6s-logo.png',
};

function toPublicPath(path?: string | null): string | null {
  if (!path?.trim()) return null;
  const trimmed = path.trim();
  return trimmed.startsWith('/') || trimmed.startsWith('http') ? trimmed : `/${trimmed}`;
}

function resolveIgdbEntry(gameName: string) {
  const catalogGame = findCatalogGame(gameName);
  if (catalogGame) {
    const aliasSlug = IGDB_SLUG_ALIASES[catalogGame.slug.toLowerCase()];
    if (aliasSlug) {
      const byAlias = bundledIgdbBySlug.get(aliasSlug);
      if (byAlias) return byAlias;
    }
    const bySlug = bundledIgdbBySlug.get(catalogGame.slug.toLowerCase());
    if (bySlug) return bySlug;
  }
  return bundledIgdbByName.get(gameName.trim().toLowerCase());
}

function addCandidate(candidates: string[], url?: string | null) {
  const normalized = toPublicPath(url);
  if (normalized && !candidates.includes(normalized)) {
    candidates.push(normalized);
  }
}

/**
 * Ordered logo URL candidates for a game.
 * Fallback order: catalog logo → seed/static paths → IGDB local cover → IGDB coverUrl → placeholder.
 */
export function getGameLogoCandidates(gameName: string, catalogLogo?: string | null): string[] {
  const candidates: string[] = [];
  const game = findCatalogGame(gameName);

  addCandidate(candidates, catalogLogo);
  addCandidate(candidates, game?.logo);

  const igdbEntry = resolveIgdbEntry(gameName);
  const catalogSlug = game?.slug?.toLowerCase();
  const igdbSlug = igdbEntry?.slug?.toLowerCase();
  const slug = catalogSlug ?? igdbSlug;

  if (slug) {
    if (catalogSlug && SEED_LOGO_OVERRIDES[catalogSlug]) {
      addCandidate(candidates, SEED_LOGO_OVERRIDES[catalogSlug]);
    } else if (slug === 'r6') {
      addCandidate(candidates, '/games/r6s-logo.png');
    } else {
      addCandidate(candidates, `/games/${slug}-logo.png`);
    }

    const manifestSlug = catalogSlug ? (IGDB_SLUG_ALIASES[catalogSlug] ?? catalogSlug) : slug;
    addCandidate(candidates, `/games/igdb/${manifestSlug}/cover.jpg`);
  }

  if (igdbEntry?.cover) {
    addCandidate(candidates, igdbEntry.cover);
  }
  addCandidate(candidates, igdbEntry?.coverUrl);

  addCandidate(candidates, PLACEHOLDER_LOGO);
  return candidates;
}

/** Primary resolved logo URL for synchronous UI surfaces (wizard, lists, cards). */
export function resolveGameLogoUrl(gameName: string, catalogLogo?: string | null): string {
  return getGameLogoCandidates(gameName, catalogLogo)[0] ?? PLACEHOLDER_LOGO;
}

/** Next fallback when an image fails to load. */
export function resolveNextGameLogoFallback(
  currentSrc: string,
  gameName: string,
  catalogLogo?: string | null,
): string {
  const candidates = getGameLogoCandidates(gameName, catalogLogo);
  const currentIndex = candidates.indexOf(currentSrc);
  if (currentIndex >= 0 && currentIndex < candidates.length - 1) {
    return candidates[currentIndex + 1];
  }
  return PLACEHOLDER_LOGO;
}
