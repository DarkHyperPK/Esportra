import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { proposalSchema, type Proposal } from '@/schemas/proposal';
import { appendAtPath, moveAtPath, removeAtPath, setAtPath } from '@/services/proposals/path';
import { useProposalHistory } from './useProposalHistory';

export type SaveState = 'saved' | 'saving';

const AUTOSAVE_MS = 600;

/**
 * Edits one saved proposal. Every change is re-validated against the schema
 * before it is applied, then autosaved to the history after a short pause.
 */
export function useProposalEditor(id: string | undefined) {
  const { get, save, available } = useProposalHistory();
  const [draft, setDraft] = useState<Proposal | undefined>(() => (id ? get(id) : undefined));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty || !draft) return undefined;
    const timer = window.setTimeout(() => {
      save(draft);
      setDirty(false);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, save]);

  const apply = useCallback((next: unknown) => {
    const parsed = proposalSchema.safeParse(next);
    if (!parsed.success) {
      toast.error('Couldn’t apply that change. Check the value and try again.');
      return;
    }
    setDraft(parsed.data);
    setDirty(true);
  }, []);

  const ops = useMemo(() => ({
    set: (path: string, value: unknown) => apply(setAtPath(draft, path, value)),
    append: (path: string, item: unknown) => apply(appendAtPath(draft, path, item)),
    remove: (path: string, index: number) => apply(removeAtPath(draft, path, index)),
    move: (path: string, from: number, to: number) => apply(moveAtPath(draft, path, from, to)),
  }), [apply, draft]);

  const saveNow = useCallback(() => {
    if (!draft) return;
    save(draft);
    setDirty(false);
  }, [draft, save]);

  const saveState: SaveState = dirty ? 'saving' : 'saved';
  return { draft, ops, saveNow, saveState, storageAvailable: available };
}
