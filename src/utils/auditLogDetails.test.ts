import { describe, expect, it } from 'vitest';
import { normalizeAuditDetails, parseAuditLogDetails } from './auditLogDetails';

describe('parseAuditLogDetails', () => {
  it('extracts suspend reason from nested extra payload', () => {
    const parsed = parseAuditLogDetails({
      severity: 'high',
      extra: {
        reason: 'Spam in tournament chat',
        suspensionType: 'Permanent',
      },
    });

    expect(parsed.reason).toBe('Spam in tournament chat');
    expect(parsed.suspensionType).toBe('Permanent');
    expect(parsed.severity).toBe('high');
  });

  it('parses JSON string payloads', () => {
    const parsed = parseAuditLogDetails(
      JSON.stringify({ reason: 'Chargeback abuse', status: 'resolved' }),
    );

    expect(parsed.reason).toBe('Chargeback abuse');
    expect(parsed.status).toBe('resolved');
  });

  it('normalizes JSON string details to a record', () => {
    expect(
      normalizeAuditDetails(
        JSON.stringify({ tournament_name: 'Summer Cup', team1_score: 2 }),
      ),
    ).toEqual({ tournament_name: 'Summer Cup', team1_score: 2 });
  });
});
