/**
 * Token-aware detection of Tailwind color utilities in Button className overrides.
 * CI mirror of src/lib/buttonColorClassOverride.ts — keep both files in sync.
 */

/** Standard Tailwind text-size scale — not text colors. */
const TEXT_SIZE_SUFFIXES = new Set([
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
])

/** Typography / layout utilities that must not be treated as color overrides. */
const NON_COLOR_TEXT_SUFFIXES = new Set([
  'left',
  'center',
  'right',
  'justify',
  'start',
  'end',
  'wrap',
  'nowrap',
  'balance',
  'pretty',
  'ellipsis',
  'clip',
  'transparent',
])

const SIZE_UNIT_PATTERN =
  /^(?:\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex)|clamp\(|min\(|max\(|calc\()/i

const COLOR_LITERAL_PATTERN =
  /^(?:#[0-9a-fA-F]{3,8}|rgb|hsl|hwb|lab|lch|oklch|oklab|color\(|var\(--)/i

function stripVariantPrefixes(token) {
  const lastColon = token.lastIndexOf(':')
  if (lastColon === -1) return token
  return token.slice(lastColon + 1)
}

function isNonColorTextUtility(suffix) {
  if (TEXT_SIZE_SUFFIXES.has(suffix)) return true
  if (NON_COLOR_TEXT_SUFFIXES.has(suffix)) return true

  if (suffix.startsWith('[') && suffix.endsWith(']')) {
    const inner = suffix.slice(1, -1)
    if (COLOR_LITERAL_PATTERN.test(inner)) return false
    if (SIZE_UNIT_PATTERN.test(inner)) return true
    return false
  }

  return false
}

function tokenIsColorUtility(token) {
  const base = stripVariantPrefixes(token)

  if (base.startsWith('bg-')) return true
  if (base.startsWith('border-')) return true
  if (base.startsWith('ring-')) return true
  if (base.startsWith('from-') || base.startsWith('via-') || base.startsWith('to-')) {
    return true
  }

  if (base.startsWith('text-')) {
    const suffix = base.slice(5)
    if (!suffix) return false
    return !isNonColorTextUtility(suffix)
  }

  return false
}

function classNameHasColorUtilities(className) {
  if (!className || typeof className !== 'string') return false
  return className.split(/\s+/).filter(Boolean).some(tokenIsColorUtility)
}

module.exports = {
  classNameHasColorUtilities,
  tokenIsColorUtility,
}
