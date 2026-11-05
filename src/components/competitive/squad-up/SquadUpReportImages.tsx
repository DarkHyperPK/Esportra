import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { MAX_REPORT_FILES } from '@/schemas/squadUpReport';
import { validateReportFiles } from '@/hooks/competitive/useSquadUpReport';

interface SquadUpReportImagesProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** Screenshot picker: click, drag and drop, or paste. Shows a preview of each image with a remove button. */
export function SquadUpReportImages({ files, onChange, disabled = false }: SquadUpReportImagesProps) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState('');
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews]);

  function add(incoming: File[]) {
    const images = incoming.filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;
    const next = [...files, ...images];
    const invalid = validateReportFiles(next);
    if (invalid) { setProblem(invalid); return; }
    setProblem('');
    onChange(next);
  }

  return (
    <div
      className="su-report-drop"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); if (!disabled) add(Array.from(event.dataTransfer.files)); }}
      onPaste={(event) => { if (!disabled) add(Array.from(event.clipboardData.files)); }}
    >
      <div className="su-report-thumbs">
        {previews.map(({ file, url }, index) => (
          <figure key={`${file.name}-${index}`} className="su-report-thumb">
            <img src={url} alt={`Screenshot ${index + 1}: ${file.name}`} />
            <button type="button" aria-label={`Remove ${file.name}`} disabled={disabled}
              onClick={() => onChange(files.filter((_, i) => i !== index))}><X size={12} aria-hidden /></button>
          </figure>
        ))}
        {files.length < MAX_REPORT_FILES && (
          <button type="button" className="su-report-add" disabled={disabled} onClick={() => input.current?.click()}>
            <ImagePlus size={18} aria-hidden /> Add screenshot
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden
        aria-label="Choose screenshots" onChange={(event) => { add(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
      <p className="su-report-hint">{files.length}/{MAX_REPORT_FILES} · PNG, JPG or WebP up to 10 MB. Drag, paste or tap to add.</p>
      {problem && <p className="su-report-error" role="alert">{problem}</p>}
    </div>
  );
}
