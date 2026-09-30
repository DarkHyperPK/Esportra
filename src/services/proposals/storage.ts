import { proposalSchema, type Proposal } from '@/schemas/proposal';

export const PROPOSALS_STORAGE_KEY = 'esportra.proposals.v1';
const EXPORT_FORMAT = 'esportra-proposals';

export interface ParsedProposals {
  proposals: Proposal[];
  skipped: number;
}

/** Validates each entry on its own so one bad record never hides the rest. */
export function parseProposalItems(items: unknown): ParsedProposals {
  if (!Array.isArray(items)) return { proposals: [], skipped: 0 };
  const proposals: Proposal[] = [];
  let skipped = 0;
  for (const item of items) {
    const result = proposalSchema.safeParse(item);
    if (result.success) proposals.push(result.data);
    else skipped += 1;
  }
  return { proposals, skipped };
}

export function parseStored(raw: string | null): Proposal[] {
  if (!raw) return [];
  try {
    return parseProposalItems(JSON.parse(raw)).proposals;
  } catch {
    return [];
  }
}

export function serializeProposals(proposals: Proposal[]): string {
  return JSON.stringify(proposals);
}

export function sortByUpdated(proposals: Proposal[]): Proposal[] {
  return [...proposals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function upsertProposal(proposals: Proposal[], doc: Proposal): Proposal[] {
  const exists = proposals.some((p) => p.id === doc.id);
  return exists ? proposals.map((p) => (p.id === doc.id ? doc : p)) : [doc, ...proposals];
}

export function buildExport(proposals: Proposal[], now = new Date()): string {
  return JSON.stringify(
    { format: EXPORT_FORMAT, version: 1, exportedAt: now.toISOString(), proposals },
    null,
    2,
  );
}

export type ImportResult =
  | { ok: true; proposals: Proposal[]; skipped: number }
  | { ok: false; reason: string };

export function parseImport(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'That file is not valid JSON.' };
  }
  const items = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null && 'proposals' in data
      ? data.proposals
      : undefined;
  if (!Array.isArray(items)) {
    return { ok: false, reason: 'No proposals found in that file.' };
  }
  const { proposals, skipped } = parseProposalItems(items);
  if (proposals.length === 0) {
    return { ok: false, reason: 'None of the proposals in that file could be read.' };
  }
  return { ok: true, proposals, skipped };
}

/** Imported items replace same-id records and are added otherwise. */
export function mergeImported(existing: Proposal[], incoming: Proposal[]): Proposal[] {
  return incoming.reduce(upsertProposal, existing);
}

export function duplicateProposal(doc: Proposal, newId: string, now = new Date()): Proposal {
  const iso = now.toISOString();
  return { ...doc, id: newId, title: `${doc.title} (copy)`, createdAt: iso, updatedAt: iso };
}
