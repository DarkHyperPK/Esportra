import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Fails when React renders `{0 && ...}` orphan text nodes outside grid cells. */
export async function assertNoOrphanLeaderboardZeros(section: Locator): Promise<void> {
  const orphanZeros = await section.evaluate((root) => {
    const isInsideGrid = (node: Node): boolean => {
      let current = node.parentElement;
      while (current && current !== root) {
        if (current.classList.contains('grid')) return true;
        current = current.parentElement;
      }
      return false;
    };

    let count = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent?.trim() === '0' && !isInsideGrid(node)) {
        count += 1;
      }
      node = walker.nextNode();
    }
    return count;
  });

  expect(orphanZeros).toBe(0);
}

export async function openOrganizerGamesTab(page: Page, slug: string): Promise<Locator> {
  await page.goto(`/organizer/tournament/${slug}?tab=games`);
  await expect(page.getByText(/— Leaderboard/i)).toBeVisible({ timeout: 45_000 });
  return page.getByText(/— Leaderboard/i).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first();
}
