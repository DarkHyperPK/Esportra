import { useState } from 'react';
import { Plus, Trash2, X, Bookmark } from 'lucide-react';
import { PageIntro, InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { motion, useReducedMotion } from 'framer-motion';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { useAuth } from '@/hooks/useAuth';
import {
  useMyShortlists,
  useShortlistDetail,
  useCreateShortlist,
  useDeleteShortlist,
  useRemoveFromShortlist,
} from '@/hooks/competitive/useScouting';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ScoutingShortlist, ShortlistEntry } from '@/types/competitive';

// --- Inline create form ---

function CreateShortlistForm({ onCancel }: { onCancel: () => void }) {
  const create = useCreateShortlist();
  const [name, setName] = useState('');
  const [game, setGame] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), gameSlug: game || undefined, description: description || undefined },
      { onSuccess: onCancel },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-white/[0.08] p-4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">
        New Shortlist
      </p>
      <input
        aria-label="Shortlist name"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full bg-white/[0.04] border border-white/[0.08] text-white/90 text-[13px] px-3 h-9 focus:outline-none focus:border-white/20"
      />
      <input
        aria-label="Game slug (optional)"
        placeholder="Game (e.g. valorant)"
        value={game}
        onChange={(e) => setGame(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/[0.08] text-white/90 text-[13px] px-3 h-9 focus:outline-none focus:border-white/20"
      />
      <input
        aria-label="Description (optional)"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/[0.08] text-white/90 text-[13px] px-3 h-9 focus:outline-none focus:border-white/20"
      />
      {create.isError && (
        <InlineNotice
          tone="critical"
          message={getApiErrorMessage(create.error) ?? 'Could not create shortlist.'}
        />
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={create.isPending || !name.trim()}
          className="h-8 rounded-none bg-rose-500 hover:bg-rose-600 text-white text-[12px] border-0"
        >
          Create
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-8 rounded-none text-white/50 hover:text-white/90 hover:bg-white/[0.04] text-[12px]"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// --- Entry row ---

function EntryRow({
  entry,
  shortlistId,
}: {
  entry: ShortlistEntry;
  shortlistId: string;
}) {
  const remove = useRemoveFromShortlist(shortlistId);
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="py-3 pr-4 text-[13px] text-white/80 font-mono">
        {entry.playerUserId}
      </td>
      <td className="py-3 pr-4 text-[13px] text-white/50">
        {entry.note ?? <span className="text-white/20 italic">—</span>}
      </td>
      <td className="py-3 text-right">
        <Button
          size="sm"
          variant="ghost"
          disabled={remove.isPending}
          onClick={() => remove.mutate(entry.id)}
          aria-label="Remove player from shortlist"
          className="h-7 px-2 rounded-none text-white/30 hover:text-rose-400 hover:bg-white/[0.04]"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </td>
    </tr>
  );
}

// --- Detail panel ---

function ShortlistDetail({ shortlist }: { shortlist: ScoutingShortlist }) {
  const detail = useShortlistDetail(shortlist.id);
  const entries = detail.data?.entries ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[16px] text-white/90 font-medium truncate">{shortlist.name}</p>
          {shortlist.gameSlug && (
            <StatusPill tone="neutral" label={shortlist.gameSlug.toUpperCase()} />
          )}
          {shortlist.description && (
            <p className="text-[13px] text-white/40 mt-1">{shortlist.description}</p>
          )}
        </div>
      </div>

      {detail.isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-white/[0.04]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-[14px] text-white/40">No players on this shortlist yet.</p>
      ) : (
        <table className="w-full" aria-label="Shortlist entries">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="pb-2 text-left text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">
                Player ID
              </th>
              <th className="pb-2 text-left text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">
                Note
              </th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} shortlistId={shortlist.id} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// --- Page ---

export default function ScoutingWorkspacePage() {
  const { profile } = useAuth();
  const { data: shortlists = [], isLoading, isError } = useMyShortlists();
  const [selectedId, setSelectedId] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const deleteShortlist = useDeleteShortlist(selectedId);
  const reduced = useReducedMotion() ?? false;

  if (!profile) {
    return (
      <CompetitivePageShell>
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-[14px] text-white/50">Sign in to use scouting.</p>
        </div>
      </CompetitivePageShell>
    );
  }

  const selected = shortlists.find((sl) => sl.id === selectedId) ?? null;

  function handleDelete() {
    if (!selectedId) return;
    deleteShortlist.mutate(undefined, {
      onSuccess: () => setSelectedId(''),
    });
  }

  return (
    <CompetitivePageShell>
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <PageIntro eyebrow="SCOUTING" title="Workspace" />
      </div>

      {isError && (
        <div className="px-4 lg:px-8 pb-4">
          <InlineNotice tone="critical" message="Could not load shortlists." />
        </div>
      )}

      <div className="px-4 lg:px-8 pb-12 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Left: shortlist list — with workspace divider on desktop */}
        <div className="space-y-3 lg:border-r lg:border-white/[0.06] lg:pr-6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-mono">
              My Shortlists
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCreate((v) => !v)}
              aria-label="New shortlist"
              className="h-7 px-2 rounded-none text-white/50 hover:text-white/90 hover:bg-white/[0.04]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>

          {showCreate && (
            <CreateShortlistForm onCancel={() => setShowCreate(false)} />
          )}

          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-white/[0.04]" />
              ))}
            </div>
          ) : shortlists.length === 0 && !showCreate ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <Bookmark className="h-8 w-8 text-white/25" />
              <p className="text-[15px] font-medium text-white/55">You have no shortlists yet</p>
              <p className="text-[13px] text-white/35 max-w-[200px]">
                Create a shortlist to start tracking players.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 text-[13px] font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors [box-shadow:0_0_12px_0_rgba(255,45,85,0.35)]"
              >
                Create shortlist
              </button>
            </div>
          ) : (
            <motion.ul
              aria-label="Shortlists"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {shortlists.map((sl) => {
                const entryCount = sl.entries?.length ?? 0;
                const isActive = sl.id === selectedId;
                return (
                  <li key={sl.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(sl.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 border-b border-white/[0.04] transition-colors ${
                        isActive
                          ? 'bg-white/[0.07] text-white/90'
                          : 'text-white/60 hover:bg-white/[0.04] hover:text-white/80'
                      }`}
                    >
                      <span className="text-[13px] truncate">{sl.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {sl.gameSlug && (
                          <span className="text-[10px] text-white/30 font-mono uppercase">
                            {sl.gameSlug}
                          </span>
                        )}
                        <span className="text-[11px] text-white/40 tabular-nums">
                          {entryCount}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </div>

        {/* Right: detail */}
        <div className="border border-white/[0.06] p-6 min-h-[240px]">
          {!selected ? (
            <p className="text-[14px] text-white/30">
              Select a shortlist to view its players.
            </p>
          ) : (
            <div className="space-y-6">
              <ShortlistDetail shortlist={selected} />
              <div className="pt-4 border-t border-white/[0.06]">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deleteShortlist.isPending}
                  onClick={handleDelete}
                  className="h-8 rounded-none text-white/30 hover:text-rose-400 hover:bg-white/[0.04] text-[12px] gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete shortlist
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </CompetitivePageShell>
  );
}
