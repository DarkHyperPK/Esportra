import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { InlineNotice } from '@/components/ui/kit';
import { useDisputeEvidenceUpload } from '@/hooks/competitive/useDisputeEvidenceUpload';
import { getApiErrorMessage } from '@/lib/apiClient';
import { ROOM_FIELD, ROOM_GHOST } from './roomStyles';

interface Props {
  sessionId: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

const isHttp = (value: string) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};

/** Attach evidence to a dispute: upload screenshots, or paste a link to a clip or image. */
export function DisputeEvidenceInput({ sessionId, urls, onChange, max = 5 }: Props) {
  const upload = useDisputeEvidenceUpload(sessionId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const full = urls.length >= max;

  async function onFiles(files: FileList | null) {
    setError('');
    if (!files) return;
    let next = urls;
    for (const file of Array.from(files)) {
      if (next.length >= max) break;
      try { next = [...next, await upload.mutateAsync(file)]; onChange(next); }
      catch (err) { setError(getApiErrorMessage(err, 'Could not upload that image.')); break; }
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function addLink() {
    const value = link.trim();
    if (!value) return;
    if (!isHttp(value)) { setError('Paste a full link starting with https://'); return; }
    setError('');
    onChange([...urls, value]);
    setLink('');
  }

  return (
    <div className="space-y-3">
      {urls.length > 0 && (
        <ul className="space-y-2" aria-label="Attached evidence">
          {urls.map((url, i) => (
            <li key={url} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-2">
              <img src={url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-10 w-14 shrink-0 rounded object-cover" />
              <a href={url} target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1 truncate text-[12px] text-zinc-300 underline underline-offset-2">{url}</a>
              <button type="button" aria-label={`Remove evidence ${i + 1}`} onClick={() => onChange(urls.filter((u) => u !== url))} className="rounded p-1 text-white/45 hover:text-white">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
        <button type="button" disabled={full || upload.isPending} onClick={() => fileRef.current?.click()} className={`${ROOM_GHOST} inline-flex items-center gap-2`}>
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
          {upload.isPending ? 'Uploading…' : 'Attach screenshot'}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
          placeholder="…or paste a link to a clip or image"
          aria-label="Evidence link"
          disabled={full}
          className={ROOM_FIELD}
        />
        <button type="button" onClick={addLink} disabled={full || !link.trim()} className={ROOM_GHOST}>Add</button>
      </div>
      <p className="text-[11px] text-zinc-500">{urls.length}/{max} attached</p>
      {error && <InlineNotice tone="critical">{error}</InlineNotice>}
    </div>
  );
}
