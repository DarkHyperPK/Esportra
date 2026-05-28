import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const TECHNICAL_COPY = [
  /API\s+\d+/i,
  /Npgsql/i,
  /PostgresException/i,
  /stack trace/i,
  /at\s+\w+\s*\(/i,
  /undefined/i,
  /null reference/i,
  /sqlState/i,
  /constraint/i,
  /traceback/i,
];

export async function expectNoTechnicalCopy(scope: Page | Locator): Promise<void> {
  const text = await scope.locator('body').textContent().catch(async () => scope.textContent());
  const bodyText = text ?? '';

  for (const pattern of TECHNICAL_COPY) {
    expect(bodyText, `Visible copy should not include ${pattern}`).not.toMatch(pattern);
  }
}

export function expectFriendlyText(text: string): void {
  expect(text.trim().length).toBeGreaterThan(0);
  for (const pattern of TECHNICAL_COPY) {
    expect(text, `Message should not include ${pattern}`).not.toMatch(pattern);
  }
}
