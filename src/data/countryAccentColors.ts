/**
 * Precomputed accent colors per ISO-3166 alpha-2 country code.
 * Used as fallback when no linked accounts are present (Riot → Steam → country → #7B61FF).
 * Covers the 30 most common countries by esports player population.
 */
export const countryAccentColors: Record<string, string> = {
  US: '#B22234', // USA red
  KR: '#CD2E3A', // Korea red
  CN: '#DE2910', // China red
  BR: '#009C3B', // Brazil green
  DE: '#FFCE00', // Germany gold
  FR: '#0055A4', // France blue
  GB: '#012169', // UK blue
  RU: '#0039A6', // Russia blue
  SE: '#006AA7', // Sweden blue
  DK: '#C60C30', // Denmark red
  FI: '#003580', // Finland blue
  NO: '#EF2B2D', // Norway red
  AU: '#00008B', // Australia blue
  CA: '#FF0000', // Canada red
  PL: '#DC143C', // Poland red
  TR: '#E30A17', // Turkey red
  ES: '#AA151B', // Spain red
  IT: '#009246', // Italy green
  PT: '#006600', // Portugal green
  NL: '#AE1C28', // Netherlands red
  BE: '#000000', // Belgium black (use neutral accent)
  CZ: '#D7141A', // Czech red
  HU: '#436F4D', // Hungary green
  UA: '#005BBB', // Ukraine blue
  IL: '#0038B8', // Israel blue
  SG: '#EF3340', // Singapore red
  PH: '#0038A8', // Philippines blue
  TH: '#A51931', // Thailand red
  VN: '#DA251D', // Vietnam red
  MY: '#CC0001', // Malaysia red
  ID: '#CE1126', // Indonesia red
  MX: '#006847', // Mexico green
  AR: '#74ACDF', // Argentina blue
  CL: '#D52B1E', // Chile red
  CO: '#FCD116', // Colombia yellow (use gold)
  PE: '#D91023', // Peru red
  JP: '#BC002D', // Japan red
  IN: '#FF9933', // India orange
  ZA: '#007A4D', // South Africa green
};
