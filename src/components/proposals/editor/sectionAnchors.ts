/** Which document page each editor section edits, so opening a section scrolls the preview there. */
const ANCHORS: Record<string, string> = {
  prospect: 'cover',
  cover: 'cover',
  badges: 'cover',
  images: 'placements',
  about: 'about',
  outlook: 'about',
  event: 'about',
  audience: 'about',
  audiences: 'about',
  tiers: 'tiers',
  placements: 'placements',
  zones: 'placements',
  partners: 'close',
  terms: 'tiers',
  sender: 'close',
};

export function anchorFor(sectionId: string): string {
  return ANCHORS[sectionId] ?? 'cover';
}

export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
