import { useState, type DragEvent } from 'react';
import { ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS, HINT_CLASS } from '@/components/ui/kit';

interface Props {
  disabled?: boolean;
  onFile: (file: File) => void;
}

/** Pick or drop one in-game Scoreboard screenshot. Keyboard reachable through the visually hidden input. */
export function ScoreboardOcrDropzone({ disabled = false, onFile }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !disabled) onFile(file);
  };

  return (
    <label
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-3 border border-dashed border-white/15 bg-black/30 px-5 py-6 transition-colors',
        'hover:border-white/30 focus-within:border-rose-400/60',
        dragging && 'border-rose-400/70 bg-rose-500/[0.04]',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className={EYEBROW_CLASS}>Read from screenshot</span>
      <span className="flex items-center gap-3">
        <ScanLine className="h-5 w-5 shrink-0 text-zinc-400 transition-colors group-hover:text-white" aria-hidden />
        <span className="text-[15px] font-medium text-white">Drop the post-match Scoreboard tab, or choose a file</span>
      </span>
      <span className={HINT_CLASS}>
        Full-screen PNG, JPG or WebP, up to 10 MB. We read the score, agents and stats, then you check them before your
        opponent sees anything.
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
    </label>
  );
}
