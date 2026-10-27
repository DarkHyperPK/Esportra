import { LFG_LANGUAGES } from '@/lib/lfgLanguages';

export function LfgLanguagePicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const extra = value.filter(code => !LFG_LANGUAGES.some(language => language.code === code));
  return <div className="lfg-row-actions">{[...LFG_LANGUAGES, ...extra.map(code => ({ code, label:code }))].map(language => <button type="button" className="lfg-button" key={language.code} aria-pressed={value.includes(language.code)} onClick={() => onChange(value.includes(language.code) ? value.filter(code => code !== language.code) : [...value, language.code])}>{language.label}</button>)}</div>;
}
