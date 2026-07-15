import React from 'react';
import { parseAuditLogDetails } from '@/utils/auditLogDetails';

interface AuditLogDetailsPanelProps {
  details: unknown;
  actionType?: string;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-sm text-zinc-200 whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}

export function AuditLogDetailsPanel({ details, actionType }: AuditLogDetailsPanelProps) {
  const parsed = parseAuditLogDetails(details);
  const isSuspendAction = actionType?.toLowerCase() === 'suspend';

  const primaryRows = [
    ...(parsed.reason ? [{ label: isSuspendAction ? 'Restriction Reason' : 'Reason', value: parsed.reason }] : []),
    ...(parsed.suspensionType ? [{ label: 'Suspension Type', value: parsed.suspensionType }] : []),
    ...(parsed.suspendedUntil ? [{ label: 'Suspended Until', value: new Date(parsed.suspendedUntil).toLocaleString() }] : []),
    ...(parsed.resolution ? [{ label: 'Resolution', value: parsed.resolution }] : []),
    ...(parsed.oldRole || parsed.newRole
      ? [{
          label: 'Role Change',
          value: `${parsed.oldRole ?? '—'} → ${parsed.newRole ?? '—'}`,
        }]
      : []),
    ...(parsed.status ? [{ label: 'Status', value: parsed.status }] : []),
    ...(parsed.severity ? [{ label: 'Severity', value: parsed.severity }] : []),
  ];

  const secondaryRows = [
    ...(parsed.targetName ? [{ label: 'Target Name', value: parsed.targetName }] : []),
    ...(parsed.userAgent ? [{ label: 'User Agent', value: parsed.userAgent }] : []),
    ...parsed.extraFields,
  ];

  if (primaryRows.length === 0 && secondaryRows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Details</p>
        <pre className="text-sm text-zinc-300 overflow-auto max-h-48 whitespace-pre-wrap break-words font-mono">
          {JSON.stringify(parsed.raw, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {primaryRows.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Summary</p>
          <div className="grid gap-3">
            {primaryRows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      )}

      {secondaryRows.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Additional Context</p>
          <div className="grid gap-3 md:grid-cols-2">
            {secondaryRows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      )}

      <details className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
        <summary className="cursor-pointer text-xs uppercase tracking-wider text-zinc-500">
          Raw payload
        </summary>
        <pre className="mt-3 text-xs text-zinc-400 overflow-auto max-h-40 whitespace-pre-wrap break-words font-mono">
          {JSON.stringify(parsed.raw, null, 2)}
        </pre>
      </details>
    </div>
  );
}
