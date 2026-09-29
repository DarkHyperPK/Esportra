import { Input } from '@/components/ui/input';
import { CommandButton } from '@/components/management/CommandSurface';
import { CONTROL_CLASS } from '@/components/ui/kit';
import { utcToLocalInput, localInputToUTC } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';

export interface SchedulableMatch {
  id: string;
  match_number: number;
  scheduled_time: string | null;
  team1_name: string | null;
  team2_name: string | null;
}

interface MatchTimeListProps {
  matches: SchedulableMatch[];
  edits: Map<string, string>;
  saving: boolean;
  onEdit: (matchId: string, utcValue: string) => void;
  onSave: (matchId: string) => void;
}

/** Per-match start times for "Per match" timing: one line per fixture. */
export function MatchTimeList({ matches, edits, saving, onEdit, onSave }: MatchTimeListProps) {
  return (
    <div className="border border-white/[0.07]">
      {matches.map((m) => {
        const edited = edits.get(m.id);
        const value = edited ? utcToLocalInput(edited) : m.scheduled_time ? utcToLocalInput(m.scheduled_time) : '';
        const dirty = edits.has(m.id);
        const inputId = `match-time-${m.id}`;
        return (
          <div
            key={m.id}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b border-white/[0.05] px-4 py-3 last:border-b-0 md:grid-cols-[2.5rem_minmax(0,1fr)_15rem_auto]"
          >
            <span className="font-mono text-xs text-zinc-500">M{m.match_number}</span>
            <label htmlFor={inputId} className="min-w-0 truncate text-sm text-white">
              {m.team1_name || 'TBD'} <span className="text-zinc-600">vs</span> {m.team2_name || 'TBD'}
            </label>
            <Input
              id={inputId}
              type="datetime-local"
              value={value ? value.slice(0, 16) : ''}
              onChange={(e) => onEdit(m.id, e.target.value ? localInputToUTC(e.target.value) : '')}
              className={cn(CONTROL_CLASS, 'col-span-2 h-10 font-mono text-[13px] md:col-span-1')}
            />
            <CommandButton
              variant={dirty ? 'primary' : 'ghost'}
              size="sm"
              slide={dirty}
              disabled={saving || !dirty}
              onClick={() => onSave(m.id)}
              className="col-span-2 md:col-span-1"
            >
              {dirty ? 'Save' : m.scheduled_time ? 'Saved' : 'Set'}
            </CommandButton>
          </div>
        );
      })}
    </div>
  );
}
