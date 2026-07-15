export interface ParsedAuditDetails {
  reason?: string;
  suspensionType?: string;
  suspendedUntil?: string;
  suspensionUntil?: string;
  resolution?: string;
  severity?: string;
  oldRole?: string;
  newRole?: string;
  status?: string;
  adminName?: string;
  targetName?: string;
  userAgent?: string;
  extraFields: Array<{ label: string; value: string }>;
  raw: Record<string, unknown>;
}

const LABELS: Record<string, string> = {
  reason: 'Reason',
  suspensionType: 'Suspension Type',
  suspendedUntil: 'Suspended Until',
  suspensionUntil: 'Suspended Until',
  resolution: 'Resolution',
  severity: 'Severity',
  oldRole: 'Previous Role',
  newRole: 'New Role',
  status: 'Status',
  admin_name: 'Admin',
  target_name: 'Target Name',
  user_agent: 'User Agent',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Normalize audit log details from API (jsonb may arrive as a JSON string). */
export function normalizeAuditDetails(details: unknown): Record<string, unknown> {
  if (!details) return {};
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details) as unknown;
      return asRecord(parsed) ?? {};
    } catch {
      return {};
    }
  }
  return asRecord(details) ?? {};
}

function readString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

export function parseAuditLogDetails(details: unknown): ParsedAuditDetails {
  const root = normalizeAuditDetails(details);

  const extra = asRecord(root.extra) ?? {};
  const merged = { ...root, ...extra };
  delete merged.extra;

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = readString(merged[key]);
      if (value) return value;
    }
    return undefined;
  };

  const knownKeys = new Set([
    'reason',
    'suspensionType',
    'suspendedUntil',
    'suspensionUntil',
    'resolution',
    'severity',
    'oldRole',
    'newRole',
    'status',
    'admin_name',
    'target_name',
    'user_agent',
    'extra',
  ]);

  const extraFields = Object.entries(merged)
    .filter(([key, value]) => !knownKeys.has(key) && value != null && value !== '')
    .map(([key, value]) => ({
      label: LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }));

  return {
    reason: pick('reason'),
    suspensionType: pick('suspensionType', 'suspension_type'),
    suspendedUntil: pick('suspendedUntil', 'suspensionUntil', 'suspension_until'),
    resolution: pick('resolution'),
    severity: pick('severity'),
    oldRole: pick('oldRole', 'old_role'),
    newRole: pick('newRole', 'new_role'),
    status: pick('status'),
    adminName: pick('admin_name', 'adminName'),
    targetName: pick('target_name', 'targetName'),
    userAgent: pick('user_agent', 'userAgent'),
    extraFields,
    raw: merged,
  };
}
