import { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/kit';
import {
  useMyShortlists,
  useAddToShortlist,
  useRemoveFromShortlist,
  useScoutingNote,
  useUpsertScoutingNote,
  useDeleteScoutingNote,
} from '@/hooks/competitive/useScouting';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ScoutingShortlist } from '@/types/competitive';

interface Props {
  subjectUserId: string;
  gameSlug?: string;
}

// --- Sub-components ---

function ShortlistMembership({
  shortlist,
  entryId,
}: {
  shortlist: ScoutingShortlist;
  entryId: string;
}) {
  const remove = useRemoveFromShortlist(shortlist.id);
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-[13px] text-white/80 truncate">{shortlist.name}</span>
      <Button
        size="sm"
        variant="ghost"
        disabled={remove.isPending}
        onClick={() => remove.mutate(entryId)}
        aria-label={`Remove from ${shortlist.name}`}
        className="h-6 px-2 rounded-none text-white/30 hover:text-rose-400 hover:bg-white/[0.04] shrink-0"
      >
        <Trash2 className="h-3 w-3" aria-hidden />
      </Button>
    </li>
  );
}

function NoteEditor({
  subjectUserId,
  gameSlug,
}: {
  subjectUserId: string;
  gameSlug?: string;
}) {
  const noteQuery = useScoutingNote(subjectUserId);
  const upsert = useUpsertScoutingNote(subjectUserId);
  const del = useDeleteScoutingNote(subjectUserId);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);

  const existing = noteQuery.data;

  function startEdit() {
    setDraft(existing?.content ?? '');
    setEditing(true);
  }

  function handleSave() {
    if (!draft.trim()) return;
    upsert.mutate(
      { content: draft.trim(), gameSlug },
      { onSuccess: () => setEditing(false) },
    );
  }

  if (noteQuery.isLoading) {
    return <div className="h-6 w-32 bg-white/[0.04] animate-pulse" />;
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          aria-label="Scouting note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.08] text-white/90 text-[13px] px-3 py-2 resize-none focus:outline-none focus:border-white/20"
        />
        {upsert.isError && (
          <InlineNotice tone="critical">
            {getApiErrorMessage(upsert.error) ?? 'Could not save note.'}
          </InlineNotice>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={upsert.isPending || !draft.trim()}
            onClick={handleSave}
            className="h-8 rounded-none bg-rose-500 hover:bg-rose-600 text-white text-[12px] border-0"
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            className="h-8 rounded-none text-white/50 hover:text-white/90 hover:bg-white/[0.04] text-[12px]"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {existing ? (
        <p className="text-[13px] text-white/70 leading-relaxed">{existing.content}</p>
      ) : (
        <p className="text-[12px] text-white/30 italic">No note yet.</p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={startEdit}
          className="h-7 rounded-none text-white/50 hover:text-white/90 hover:bg-white/[0.04] text-[12px] px-2"
        >
          {existing ? 'Edit note' : 'Add note'}
        </Button>
        {existing && (
          <Button
            size="sm"
            variant="ghost"
            disabled={del.isPending}
            onClick={() => del.mutate()}
            aria-label="Delete scouting note"
            className="h-7 rounded-none text-white/30 hover:text-rose-400 hover:bg-white/[0.04] px-2"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Main panel ---

function AddToShortlistRow({
  shortlists,
  subjectUserId,
}: {
  shortlists: ScoutingShortlist[];
  subjectUserId: string;
}) {
  const [selectedId, setSelectedId] = useState('');
  const add = useAddToShortlist(selectedId);

  function handleAdd() {
    if (!selectedId) return;
    add.mutate({ playerUserId: subjectUserId });
    setSelectedId('');
  }

  if (shortlists.length === 0) return null;

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <select
          aria-label="Select shortlist to add player to"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] text-white/70 text-[12px] pl-3 pr-8 h-8 focus:outline-none focus:border-white/20"
        >
          <option value="" className="bg-[#0A0A0A]">
            Add to shortlist…
          </option>
          {shortlists.map((sl) => (
            <option key={sl.id} value={sl.id} className="bg-[#0A0A0A]">
              {sl.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30"
          aria-hidden
        />
      </div>
      <Button
        size="sm"
        disabled={!selectedId || add.isPending}
        onClick={handleAdd}
        aria-label="Add player to selected shortlist"
        className="h-8 w-8 rounded-none bg-rose-500 hover:bg-rose-600 text-white border-0 p-0 shrink-0"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

export function ShortlistPanel({ subjectUserId, gameSlug }: Props) {
  const { data: shortlists = [], isLoading } = useMyShortlists();

  if (isLoading) {
    return <div className="h-20 bg-white/[0.04] animate-pulse" />;
  }

  const containingLists = shortlists.filter((sl) =>
    sl.entries?.some((e) => e.playerUserId === subjectUserId),
  );

  return (
    <div className="space-y-4 border border-white/[0.06] bg-[#0A0A0A] p-4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">
        Shortlists
      </p>

      {containingLists.length > 0 ? (
        <ul className="space-y-1" aria-label="Player is on these shortlists">
          {containingLists.map((sl) => {
            const entry = sl.entries?.find((e) => e.playerUserId === subjectUserId);
            if (!entry) return null;
            return (
              <ShortlistMembership key={sl.id} shortlist={sl} entryId={entry.id} />
            );
          })}
        </ul>
      ) : (
        <p className="text-[12px] text-white/30">Not on any shortlist yet.</p>
      )}

      <AddToShortlistRow shortlists={shortlists} subjectUserId={subjectUserId} />

      <div className="pt-2 border-t border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono mb-2">
          Scout Note
        </p>
        <NoteEditor subjectUserId={subjectUserId} gameSlug={gameSlug} />
      </div>
    </div>
  );
}
