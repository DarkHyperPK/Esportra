import { test, expect } from '@playwright/test';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { createOrganizerClient } from './helpers/e2eClients';
import { createPublicBrowseTournament, listBrowseTournaments } from './helpers/browseSetup';
import { clearBrowseFilters, openBrowseTab, selectBrowseFormatOnline, selectBrowseRegion } from './helpers/uiBrowse';
import { expectNoTechnicalCopy } from './helpers/assertCopy';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

test.describe('@promotion Tournament browse — promotion gate', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!!skipReason, skipReason ?? undefined);
    testInfo.setTimeout(120_000);
  });

  test('API status_group isolates upcoming vs completed rows', async () => {
    const organizer = await createOrganizerClient(env!);
    const fixture = await createPublicBrowseTournament(organizer, {
      region: 'eu',
      status: 'open',
    });

    const upcomingBefore = await listBrowseTournaments(organizer, { status_group: 'upcoming' });
    expect(upcomingBefore.some((row) => row.id === fixture.id)).toBe(true);

    await organizer.put(`/api/tournaments/${fixture.id}`, { status: 'completed' });

    const upcomingAfter = await listBrowseTournaments(organizer, { status_group: 'upcoming' });
    const completedAfter = await listBrowseTournaments(organizer, { status_group: 'completed' });

    expect(upcomingAfter.some((row) => row.id === fixture.id)).toBe(false);
    expect(completedAfter.some((row) => row.id === fixture.id)).toBe(true);
  });

  test('API lists newest created tournaments first within a tab', async () => {
    const organizer = await createOrganizerClient(env!);
    const stamp = Date.now();
    const older = await createPublicBrowseTournament(organizer, {
      name: `E2E Browse Older ${stamp}`,
      slug: `e2e-browse-older-${stamp}`,
      region: 'eu',
      status: 'open',
    });
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const newer = await createPublicBrowseTournament(organizer, {
      name: `E2E Browse Newer ${stamp + 1}`,
      slug: `e2e-browse-newer-${stamp + 1}`,
      region: 'eu',
      status: 'open',
    });

    const rows = await listBrowseTournaments(organizer, { status_group: 'upcoming' });
    const olderIndex = rows.findIndex((row) => row.id === older.id);
    const newerIndex = rows.findIndex((row) => row.id === newer.id);

    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeLessThan(olderIndex);
  });

  test('published open tournament appears on Upcoming tab without filters', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const fixture = await createPublicBrowseTournament(organizer, {
      region: 'eu',
      status: 'open',
    });

    await openBrowseTab(page, 'upcoming');
    await clearBrowseFilters(page);
    await expect(page.getByText(fixture.name)).toBeVisible({ timeout: 45_000 });
    await expectNoTechnicalCopy(page);
  });

  test('completed tournament appears on Completed tab without Online or Region filters', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const fixture = await createPublicBrowseTournament(organizer, {
      region: 'eu',
      status: 'open',
    });
    await organizer.put(`/api/tournaments/${fixture.id}`, { status: 'completed' });

    await openBrowseTab(page, 'completed');
    await clearBrowseFilters(page);
    await expect(page.getByText(fixture.name)).toBeVisible({ timeout: 45_000 });
    await expectNoTechnicalCopy(page);
  });

  test('region filter matches tournaments but All Regions still lists unfiltered upcoming', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const stamp = Date.now();
    const euFixture = await createPublicBrowseTournament(organizer, {
      name: `E2E Browse EU ${stamp}`,
      slug: `e2e-browse-eu-${stamp}`,
      region: 'eu',
      status: 'open',
    });

    await openBrowseTab(page, 'upcoming');
    await clearBrowseFilters(page);
    await selectBrowseRegion(page, 'eu');
    await expect(page.getByText(euFixture.name)).toBeVisible({ timeout: 45_000 });

    await selectBrowseRegion(page, '');
    await expect(page.getByText(euFixture.name)).toBeVisible({ timeout: 45_000 });
  });

  test('Online format filter still includes online BR tournaments on Upcoming', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const fixture = await createPublicBrowseTournament(organizer, {
      region: 'na-east',
      status: 'open',
    });

    await openBrowseTab(page, 'upcoming');
    await clearBrowseFilters(page);
    await selectBrowseFormatOnline(page);
    await expect(page.getByText(fixture.name)).toBeVisible({ timeout: 45_000 });
  });
});
