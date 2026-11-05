import { useMemo, useState } from 'react';
import { getCountryFlagUrl } from '@/utils/countries';
import { COUNTRY_AREAS, countryName, toggleArea, type AreaId } from '@/lib/countryAreas';

interface CountryPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** The player's own country; its area starts open. */
  ownCountry?: string | null;
}

/** Countries grouped by area. Pick single countries or a whole area at once, or search by name. */
export function CountryPicker({ value, onChange, ownCountry }: CountryPickerProps) {
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const areas = useMemo(() => COUNTRY_AREAS.map((area) => ({
    ...area,
    codes: (area.codes as readonly string[]).filter((code) => !search || countryName(code).toLowerCase().includes(search)),
  })).filter((area) => area.codes.length > 0), [search]);

  const toggle = (code: string) => onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);

  return (
    <div className="su-countries">
      <input className="su-input" type="search" placeholder="Search countries" aria-label="Search countries"
        value={query} onChange={(event) => setQuery(event.target.value)} />
      <p className="su-hint" aria-live="polite">{value.length === 0 ? 'Pick at least one country.' : `${value.length} selected: ${value.slice(0, 4).map(countryName).join(', ')}${value.length > 4 ? ` and ${value.length - 4} more` : ''}`}</p>
      <div className="su-countries-list">
        {areas.map((area) => {
          const codes = area.codes;
          const selected = codes.filter((code) => value.includes(code)).length;
          const open = !!search || selected > 0 || (!!ownCountry && codes.includes(ownCountry));
          return (
            <details key={area.id} open={open}>
              <summary>
                <span>{area.label}</span>
                <span className="su-hint">{selected > 0 ? `${selected} of ${codes.length}` : codes.length}</span>
              </summary>
              {!search && (
                <button type="button" className="su-area-all" onClick={() => onChange(toggleArea(value, area.id as AreaId))}>
                  {selected === codes.length ? `Clear ${area.label}` : `Select all of ${area.label}`}
                </button>
              )}
              <ul>
                {codes.map((code) => (
                  <li key={code}>
                    <label>
                      <input type="checkbox" checked={value.includes(code)} onChange={() => toggle(code)} />
                      <img src={getCountryFlagUrl(code)} alt="" loading="lazy" />
                      <span>{countryName(code)}{code === ownCountry ? ' (you)' : ''}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
