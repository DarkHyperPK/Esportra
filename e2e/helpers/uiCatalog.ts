import { expect, type Page } from '@playwright/test';
import { dismissBetaModal, skipBetaModal } from './uiAuth';

export type WizardGameMode = {
  group?: string;
  variant?: string;
};

export type WizardBasics = {
  name: string;
  game: string;
  region?: string;
  mode?: WizardGameMode;
};

const WIZARD_DRAFT_KEY = 'tournament_wizard_draft';
const WIZARD_STEP_KEY = 'tournament_wizard_step';

export function futureWizardDates() {
  const start = new Date(Date.now() + 8 * 86_400_000);
  const end = new Date(start.getTime() + 2 * 86_400_000);
  const pad = (value: number) => String(value).padStart(2, '0');
  const toDate = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return {
    startDate: toDate(start),
    startTime: '18:00',
    endDate: toDate(end),
    endTime: '22:00',
  };
}

export async function prepareWizardPage(page: Page): Promise<void> {
  await skipBetaModal(page);
  await page.addInitScript(
    ([draftKey, stepKey]) => {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(stepKey);
    },
    [WIZARD_DRAFT_KEY, WIZARD_STEP_KEY],
  );
}

export async function openCreateTournamentWizard(page: Page): Promise<void> {
  await prepareWizardPage(page);
  await page.goto('/tournaments/create', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissBetaModal(page);
  await expect(page.getByRole('heading', { name: 'Create Tournament' })).toBeVisible({
    timeout: 45_000,
  });
}

export async function clickWizardNext(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Next' }).click();
}

export async function clickWizardCreate(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Create Tournament' }).click();
}

async function pickRadixOption(page: Page, trigger: ReturnType<Page['locator']>, option: string) {
  await trigger.click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

export async function fillWizardStepBasicInfo(
  page: Page,
  basics: WizardBasics,
): Promise<void> {
  const dates = futureWizardDates();

  await page.getByLabel(/Tournament Name/i).fill(basics.name);

  const gameTrigger = page.getByRole('combobox').filter({ hasText: /Select a game/i });
  await pickRadixOption(page, gameTrigger, basics.game);

  if (basics.mode?.group) {
    await page.getByRole('button', { name: new RegExp(`^${basics.mode.group}$`, 'i') }).click();
  }
  if (basics.mode?.variant) {
    await page.getByRole('button', { name: new RegExp(basics.mode.variant, 'i') }).click();
  }

  await page.locator('#startDate').fill(dates.startDate);
  await page.locator('#startTime').fill(dates.startTime);
  await page.locator('#endDate').fill(dates.endDate);
  await page.locator('#endTime').fill(dates.endTime);

  await pickRadixOption(page, page.locator('#region'), basics.region ?? 'EU');
}

export async function fillWizardStepFormatRules(
  page: Page,
  options: {
    maxTeams?: string;
    maxPlayers?: string;
    expectTeamSizeText?: RegExp | string;
  } = {},
): Promise<void> {
  if (options.expectTeamSizeText) {
    await expect(page.getByText(options.expectTeamSizeText).first()).toBeVisible();
  }

  const brMaxLabel = page.locator('label').filter({
    hasText: /Maximum Players|Maximum Duos|Maximum Trios|Maximum Squads/i,
  });
  if (await brMaxLabel.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const maxPlayers = options.maxPlayers ?? options.maxTeams ?? '40';
    const trigger = brMaxLabel.locator('..').getByRole('combobox').first();
    await pickRadixOption(page, trigger, `${maxPlayers} players`);
    return;
  }

  const maxTeams = options.maxTeams ?? '8';
  const maxTeamsTrigger = page
    .locator('label')
    .filter({ hasText: /Maximum Teams/i })
    .locator('..')
    .getByRole('combobox')
    .first();
  await pickRadixOption(page, maxTeamsTrigger, `${maxTeams} Teams`);
}

export async function fillWizardStepBranding(page: Page): Promise<void> {
  await page.locator('#prizePool').fill('Free');
  await page.locator('#entryFee').fill('Free');
  const editor = page.locator('.ProseMirror').first();
  await editor.click();
  await editor.fill(
    'Automated GUI catalog test — this tournament validates game mode selection and backend catalog enforcement.',
  );
}

export async function advanceWizardThroughSettings(page: Page): Promise<void> {
  await fillWizardStepBranding(page);
  await clickWizardNext(page);
  await expect(page.getByRole('heading', { name: 'Registration Settings' })).toBeVisible();
  await clickWizardNext(page);
  await expect(page.getByRole('heading', { name: /Match Settings|Tournament Settings/i })).toBeVisible({
    timeout: 15_000,
  }).catch(async () => {
    await expect(page.getByText(/Settings/i).first()).toBeVisible();
  });
  await clickWizardNext(page);
  await expect(page.getByRole('heading', { name: 'Review & Create' })).toBeVisible({ timeout: 15_000 }).catch(
    async () => {
      await expect(page.getByText(/Review/i).first()).toBeVisible();
    },
  );
}

export async function completeBracketTournamentWizard(
  page: Page,
  basics: WizardBasics,
  formatOptions?: { maxTeams?: string; expectTeamSizeText?: RegExp | string },
): Promise<string> {
  await openCreateTournamentWizard(page);
  await fillWizardStepBasicInfo(page, basics);
  await clickWizardNext(page);
  await fillWizardStepFormatRules(page, formatOptions);
  await clickWizardNext(page);
  await advanceWizardThroughSettings(page);
  await clickWizardCreate(page);
  await page.waitForURL(/\/organizer\/tournament\//, { timeout: 60_000 });
  return page.url();
}

export async function openTournamentRegistration(page: Page, slug: string): Promise<void> {
  await skipBetaModal(page);
  await page.goto(`/tournaments/${slug}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissBetaModal(page);
  await page.getByRole('button', { name: /INITIATE REGISTRATION/i }).click();
  await expect(page.getByRole('heading', { name: /INITIATE_REGISTRATION|MODIFY_REGISTRATION/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByText(
      /Select Your Team|Not Eligible|Create a team first|Register as an individual|Register Team|Register Solo/i,
    ).first(),
  ).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Loading your teams...')).toBeHidden({ timeout: 45_000 });
}

export function getRegistrationDialog(page: Page) {
  return page.getByRole('dialog', { name: /INITIATE_REGISTRATION|MODIFY_REGISTRATION/i });
}

export function getRegistrationTeamCard(page: Page, teamName: string) {
  const dialog = getRegistrationDialog(page);
  return dialog
    .getByText(teamName, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"border") and contains(@class,"rounded-lg")][1]');
}

export async function openTeamsPage(page: Page): Promise<void> {
  await skipBetaModal(page);
  await page.goto('/player/teams', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissBetaModal(page);
  await expect(page.getByRole('heading', { name: /Teams|My Team|Rosters/i }).first()).toBeVisible({
    timeout: 45_000,
  }).catch(async () => {
    await expect(page.getByText(/Active Rosters/i)).toBeVisible({ timeout: 45_000 });
  });
}
