import { COUNTRY_AREAS, type AreaId } from '@/lib/countryAreas';

interface AreaPickerProps {
  value: AreaId[];
  onChange: (areas: AreaId[]) => void;
}

/** "Where do you play?" — tap one or more regions. You meet players who share any region with you. */
export function AreaPicker({ value, onChange }: AreaPickerProps) {
  function toggle(id: AreaId) {
    onChange(value.includes(id) ? value.filter((a) => a !== id) : [...value, id]);
  }

  return (
    <div className="su-areas" role="group" aria-label="Regions you play in">
      {COUNTRY_AREAS.map((area) => (
        <button key={area.id} type="button" role="checkbox" aria-checked={value.includes(area.id)} onClick={() => toggle(area.id)}>
          <strong>{area.label}</strong>
        </button>
      ))}
    </div>
  );
}
