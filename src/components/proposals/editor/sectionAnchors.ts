/** Which document page each editor section edits, so opening a section scrolls the preview there. */
const ANCHORS: Record<string, string> = {
  prospect: 'cover',
  cover: 'cover',
  about: 'about',
  outlook: 'about',
  event: 'event',
  audience: 'event',
  audiences: 'audiences',
  tiers: 'tiers',
  placements: 'placements',
  zones: 'placements',
  portal: 'placements',
  partners: 'close',
  terms: 'close',
  sender: 'close',
};

export function anchorFor(sectionId: string): string {
  return ANCHORS[sectionId] ?? 'cover';
}

export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
