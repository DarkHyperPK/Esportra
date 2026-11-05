import { COUNTRY_AREAS, type AreaId } from '@/lib/countryAreas';

interface AreaPickerProps {
  value?: AreaId;
  onChange: (area: AreaId) => void;
}

/** "Where do you live?" One tap. You meet players who picked the same area. */
export function AreaPicker({ value, onChange }: AreaPickerProps) {
  return (
    <div className="su-areas" role="radiogroup" aria-label="Where you live">
      {COUNTRY_AREAS.map((area) => (
        <button key={area.id} type="button" role="radio" aria-checked={value === area.id} onClick={() => onChange(area.id)}>
          <strong>{area.label}</strong>
          <span>{area.short}</span>
        </button>
      ))}
    </div>
  );
}
