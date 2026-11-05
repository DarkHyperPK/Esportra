import { countries } from '@/utils/countries';

/**
 * The areas Squad Up players pick as "where I live". Players only meet players from the same area.
 * Ordered by where most players are. Every ISO code in `@/utils/countries` belongs to exactly one area
 * (enforced by a test), so a profile country always suggests an area. The server keeps the same ids.
 */
export const COUNTRY_AREAS = [
  { id: 'south-asia', label: 'South Asia', short: 'Pakistan, India, Bangladesh…', codes: ['PK', 'IN', 'BD', 'LK', 'NP', 'AF', 'BT', 'MV'] },
  {
    id: 'middle-east', label: 'Middle East & North Africa', short: 'Gulf, Levant, Egypt, Türkiye…',
    codes: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'IQ', 'IR', 'IL', 'PS', 'SY', 'YE', 'TR', 'EG', 'MA', 'DZ', 'TN', 'LY', 'SD'],
  },
  {
    id: 'europe', label: 'Europe', short: 'UK, EU, Balkans, Caucasus…',
    codes: ['GB', 'IE', 'FR', 'DE', 'NL', 'BE', 'LU', 'ES', 'PT', 'IT', 'CH', 'AT', 'DK', 'NO', 'SE', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'RO',
      'BG', 'GR', 'CY', 'MT', 'SI', 'HR', 'BA', 'RS', 'ME', 'MK', 'AL', 'EE', 'LV', 'LT', 'BY', 'UA', 'MD', 'RU', 'GE', 'AM', 'AZ', 'AD', 'MC',
      'LI', 'SM', 'VA'],
  },
  { id: 'central-asia', label: 'Central Asia', short: 'Kazakhstan, Uzbekistan…', codes: ['KZ', 'UZ', 'KG', 'TJ', 'TM', 'MN'] },
  { id: 'east-asia', label: 'East Asia', short: 'Japan, Korea…', codes: ['JP', 'KR', 'CN', 'KP'] },
  { id: 'southeast-asia', label: 'Southeast Asia', short: 'Singapore, Philippines, Indonesia…', codes: ['SG', 'MY', 'ID', 'TH', 'VN', 'PH', 'BN', 'KH', 'LA', 'MM', 'TL'] },
  { id: 'oceania', label: 'Oceania', short: 'Australia, New Zealand…', codes: ['AU', 'NZ', 'FJ', 'PG', 'SB', 'VU', 'WS', 'TO', 'TV', 'KI', 'NR', 'MH', 'FM', 'PW'] },
  { id: 'north-america', label: 'North America', short: 'US, Canada, Mexico', codes: ['US', 'CA', 'MX'] },
  {
    id: 'latin-america', label: 'Latin America & Caribbean', short: 'Brazil, Argentina, Chile…',
    codes: ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY', 'SR', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'BZ', 'CU', 'DO', 'HT',
      'JM', 'TT', 'BB', 'BS', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC'],
  },
  {
    id: 'africa', label: 'Sub-Saharan Africa', short: 'Nigeria, Kenya, South Africa…',
    codes: ['NG', 'KE', 'ZA', 'GH', 'ET', 'TZ', 'UG', 'RW', 'SN', 'CM', 'AO', 'MZ', 'ZM', 'ZW', 'BW', 'NA', 'MG', 'MU', 'SC', 'CV', 'ST', 'GA',
      'GQ', 'CG', 'CF', 'TD', 'NE', 'ML', 'BF', 'BJ', 'TG', 'GN', 'GW', 'SL', 'LR', 'GM', 'MR', 'DJ', 'ER', 'SO', 'SS', 'BI', 'MW', 'LS', 'SZ', 'KM'],
  },
] as const;

export type AreaId = (typeof COUNTRY_AREAS)[number]['id'];
export const AREA_IDS = COUNTRY_AREAS.map((area) => area.id) as [AreaId, ...AreaId[]];

export const areaLabel = (id?: string | null) => COUNTRY_AREAS.find((area) => area.id === id)?.label ?? 'Any area';

const nameByCode = new Map(countries.map((country) => [country.code, country.name]));

export const countryName = (code: string) => nameByCode.get(code.toUpperCase()) ?? code.toUpperCase();

export function areaOf(code: string): (typeof COUNTRY_AREAS)[number] | undefined {
  const upper = code.toUpperCase();
  return COUNTRY_AREAS.find((area) => (area.codes as readonly string[]).includes(upper));
}

/** Toggles a whole area: selects every country in it, or clears them all if they were all selected. */
export function toggleArea(selected: string[], areaId: AreaId): string[] {
  const area = COUNTRY_AREAS.find((item) => item.id === areaId);
  if (!area) return selected;
  const codes = area.codes as readonly string[];
  const allIn = codes.every((code) => selected.includes(code));
  return allIn ? selected.filter((code) => !codes.includes(code)) : [...new Set([...selected, ...codes])];
}
