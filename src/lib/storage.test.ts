import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('resolvePaymentReceiptUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://staging.esportra.com');
    vi.resetModules();
  });

  it('builds a public URL from bucket/path ref', async () => {
    const { resolvePaymentReceiptUrl } = await import('./storage');
    const url = resolvePaymentReceiptUrl(
      'tournaments.payment.receipts/acef4477-3613-4566-86f4-54e6609fc000/118a2fbd-4d32-42ac-a04e-41b73a852d04.jpg',
    );
    expect(url).toBe(
      'https://staging.esportra.com/storage/v1/object/public/tournaments.payment.receipts/acef4477-3613-4566-86f4-54e6609fc000/118a2fbd-4d32-42ac-a04e-41b73a852d04.jpg',
    );
  });

  it('normalizes legacy full storage URLs', async () => {
    const { resolvePaymentReceiptUrl } = await import('./storage');
    const url = resolvePaymentReceiptUrl(
      'https://staging.esportra.com/storage/v1/object/public/tournaments.payment.receipts/t1/u1.jpg',
    );
    expect(url).toBe(
      'https://staging.esportra.com/storage/v1/object/public/tournaments.payment.receipts/t1/u1.jpg',
    );
  });

  it('returns undefined for empty or invalid refs', async () => {
    const { resolvePaymentReceiptUrl } = await import('./storage');
    expect(resolvePaymentReceiptUrl(null)).toBeUndefined();
    expect(resolvePaymentReceiptUrl('')).toBeUndefined();
    expect(resolvePaymentReceiptUrl('no-slash')).toBeUndefined();
  });
});
