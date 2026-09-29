import { Loader2 } from 'lucide-react';
import { CommandActionBar, CommandButton } from '@/components/management/CommandSurface';

interface PanelSaveBarProps {
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  /** Resets the form to what's saved. Shown only while there are changes. */
  onDiscard?: () => void;
  saveLabel?: string;
}

/** Sticky footer for configuration panels: where you stand, then Save. */
export function PanelSaveBar({ isDirty, saving, onSave, onDiscard, saveLabel = 'Save changes' }: PanelSaveBarProps) {
  return (
    <CommandActionBar>
      <p className="flex items-center gap-2 text-xs text-zinc-500" aria-live="polite">
        <span aria-hidden className={isDirty ? 'h-1.5 w-1.5 rounded-full bg-amber-400' : 'h-1.5 w-1.5 rounded-full bg-zinc-600'} />
        {isDirty ? 'Unsaved changes' : 'Everything is saved'}
      </p>
      <div className="flex items-center gap-2">
        {isDirty && onDiscard && (
          <CommandButton variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
            Discard
          </CommandButton>
        )}
        <CommandButton variant="primary" size="sm" slide onClick={onSave} disabled={!isDirty || saving} className="min-w-[140px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Saving" /> : saveLabel}
        </CommandButton>
      </div>
    </CommandActionBar>
  );
}
