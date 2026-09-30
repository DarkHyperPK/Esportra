import type { Proposal } from '@/schemas/proposal';

export interface ReadinessIssue {
  /** Editor section that fixes it. */
  sectionId: string;
  message: string;
}

function common(doc: Proposal): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  if (!doc.sender.email.trim()) issues.push({ sectionId: 'sender', message: 'Add a contact email.' });
  for (const partner of doc.partners) {
    if (partner.name.trim() && !partner.logoUrl.trim()) {
      issues.push({ sectionId: 'partners', message: `${partner.name} has no logo yet, so its name is set in type.` });
    }
  }
  return issues;
}

function tournament(doc: Extract<Proposal, { kind: 'tournament' }>): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  if (!doc.event.startDate.trim()) issues.push({ sectionId: 'event', message: 'Add the event’s start date.' });
  for (const tier of doc.tiers) {
    if (tier.price <= 0) issues.push({ sectionId: 'tiers', message: `${tier.name || 'A package'} has no price.` });
  }
  for (const row of doc.zoneRows) {
    if (row.cells.length !== doc.tiers.length) {
      issues.push({
        sectionId: 'placements',
        message: `${row.zone || 'A placement'} has ${row.cells.length} cells for ${doc.tiers.length} packages.`,
      });
    }
  }
  return issues;
}

/** Things worth fixing before a proposal goes to a brand. Nothing here blocks saving or printing. */
export function checkReadiness(doc: Proposal): ReadinessIssue[] {
  return [...common(doc), ...(doc.kind === 'tournament' ? tournament(doc) : [])];
}
