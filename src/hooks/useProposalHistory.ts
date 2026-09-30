import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Proposal, ProposalKind } from '@/schemas/proposal';
import { createProposal } from '@/services/proposals/defaults';
import {
  PROPOSALS_STORAGE_KEY,
  buildExport,
  duplicateProposal,
  mergeImported,
  parseImport,
  parseStored,
  serializeProposals,
  sortByUpdated,
  upsertProposal,
  type ImportResult,
} from '@/services/proposals/storage';

function readStorage(): { proposals: Proposal[]; available: boolean } {
  try {
    return { proposals: parseStored(window.localStorage.getItem(PROPOSALS_STORAGE_KEY)), available: true };
  } catch {
    return { proposals: [], available: false };
  }
}

function writeStorage(proposals: Proposal[]): boolean {
  try {
    window.localStorage.setItem(PROPOSALS_STORAGE_KEY, serializeProposals(proposals));
    return true;
  } catch {
    return false;
  }
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Saved proposals live in this browser (localStorage). Every read is validated
 * with Zod; Export/Import JSON is the backup path. If storage is blocked the
 * hook keeps working in memory and reports `available: false`.
 */
export function useProposalHistory() {
  const [state, setState] = useState(readStorage);
  // Always-current list, so callbacks stay stable and never act on a stale closure.
  const latest = useRef(state.proposals);

  const commit = useCallback((next: Proposal[]) => {
    latest.current = next;
    const saved = writeStorage(next);
    setState((prev) => ({ proposals: next, available: prev.available && saved }));
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PROPOSALS_STORAGE_KEY) return;
      const fresh = readStorage();
      latest.current = fresh.proposals;
      setState(fresh);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const proposals = useMemo(() => sortByUpdated(state.proposals), [state.proposals]);

  const get = useCallback(
    (id: string) => state.proposals.find((p) => p.id === id),
    [state.proposals],
  );

  const create = useCallback((kind: ProposalKind): Proposal => {
    const doc = createProposal(kind);
    commit(upsertProposal(latest.current, doc));
    return doc;
  }, [commit]);

  const save = useCallback((doc: Proposal) => {
    const stamped = { ...doc, updatedAt: new Date().toISOString() };
    commit(upsertProposal(latest.current, stamped));
    return stamped;
  }, [commit]);

  const duplicate = useCallback((id: string): Proposal | undefined => {
    const current = latest.current;
    const source = current.find((p) => p.id === id);
    if (!source) return undefined;
    const copy = duplicateProposal(source, makeId());
    commit(upsertProposal(current, copy));
    return copy;
  }, [commit]);

  const remove = useCallback((id: string) => {
    commit(latest.current.filter((p) => p.id !== id));
  }, [commit]);

  const exportJson = useCallback(() => buildExport(state.proposals), [state.proposals]);

  const importJson = useCallback((text: string): ImportResult => {
    const result = parseImport(text);
    if (result.ok) commit(mergeImported(latest.current, result.proposals));
    return result;
  }, [commit]);

  return { proposals, available: state.available, get, create, save, duplicate, remove, exportJson, importJson };
}
