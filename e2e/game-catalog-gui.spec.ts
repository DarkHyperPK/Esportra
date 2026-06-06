import { test, expect } from '@playwright/test';
import { createOrganizerClient, createPlayerClients } from './helpers/e2eClients';
import { createCatalogTournament } from './helpers/catalogSetup';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { loginOrganizerViaUi, loginViaUi } from './helpers/uiAuth';
import { expectToast } from './helpers/assertToast';
import {
  buildSkirmish2v2Roster,
  buildUnderstaffedValorantRoster,
  createDedicatedCaptainTeam,
  ensureCaptainTeam,
  getUserId,
  waitForCaptainTeamInApi,
} from './helpers/teamCatalogSetup';
import {
  completeBracketTournamentWizard,
  fillWizardStepBasicInfo,
  fillWizardStepFormatRules,
  openCreateTournamentWizard,
  openTeamsPage,
  openTournamentRegistration,
  getRegistrationTeamCard,
  getRegistrationDialog,
  clickWizardNext,
  advanceWizardThroughSettings,
  clickWizardCreate,
  fillWizardStepBranding,
} from './helpers/uiCatalog';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

test.describe('@staging-only Game catalog — GUI flows', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('tournament wizard lists frontend catalog games and excludes CS2 from picker', async ({ page }) => {
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openCreateTournamentWizard(page);

    await page.getByRole('combobox').filter({ hasText: /Select a game/i }).click();
    await expect(page.getByRole('option', { name: 'Valorant' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Fortnite' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Counter-Strike 2' })).toHaveCount(0);
  });

  test('organizer completes wizard for Valorant 5v5 bracket tournament', async ({ page }) => {
    const stamp = Date.now();
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);

    const url = await completeBracketTournamentWizard(page, {
      name: `E2E GUI Valorant 5v5 ${stamp}`,
      game: 'Valorant',
      region: 'EU',
    }, {
      maxTeams: '8',
      expectTeamSizeText: /requires 5 players per team/i,
    });

    expect(url).toMatch(/\/organizer\/tournament\//);
    await expect(page.getByText('Valorant').first()).toBeVisible();
    await expect(page.getByText(/5v5|5 players/i).first()).toBeVisible();
  });

  test('organizer selects Valorant Skirmish 1v1 in wizard and creates solo tournament', async ({ page }) => {
    const stamp = Date.now();
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openCreateTournamentWizard(page);

    await fillWizardStepBasicInfo(page, {
      name: `E2E GUI Skirmish 1v1 ${stamp}`,
      game: 'Valorant',
      region: 'EU',
      mode: { group: 'Skirmish', variant: '1v1' },
    });
    await clickWizardNext(page);
    await fillWizardStepFormatRules(page, {
      maxTeams: '16',
      expectTeamSizeText: /registers participants individually|requires 1/i,
    });
    await clickWizardNext(page);
    await advanceWizardThroughSettings(page);
    await clickWizardCreate(page);

    await page.waitForURL(/\/organizer\/tournament\//, { timeout: 60_000 });
    await expect(page.getByText(/Skirmish|1v1|Individual/i).first()).toBeVisible();
  });

  test('organizer creates Fortnite battle royale tournament through wizard', async ({ page }) => {
    const stamp = Date.now();
    await loginOrganizerViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openCreateTournamentWizard(page);

    await fillWizardStepBasicInfo(page, {
      name: `E2E GUI Fortnite BR ${stamp}`,
      game: 'Fortnite',
      region: 'NA East',
    });
    await expect(page.getByText(/Points-Based Tournament/i)).toBeVisible();

    await clickWizardNext(page);
    await fillWizardStepFormatRules(page, {
      maxPlayers: '40',
      expectTeamSizeText: /Solo|Individual|1 player/i,
    });
    await clickWizardNext(page);
    await advanceWizardThroughSettings(page);
    await clickWizardCreate(page);

    await page.waitForURL(/\/organizer\/tournament\//, { timeout: 60_000 });
    await expect(page.getByText('Fortnite').first()).toBeVisible();
  });

  test('player registers solo through tournament page for solo catalog mode', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const stamp = Date.now();
    const tournament = await createCatalogTournament(organizer, {
      name: `E2E GUI Solo Reg ${stamp}`,
      game: 'Fortnite',
      gameMode: 'solo',
      teamSize: 1,
      tournamentType: 'battle_royale',
      status: 'open',
      isPublic: true,
      settings: { brConfig: { scoringPreset: 'fortnite', totalRounds: 2, lobbySize: 8 } },
    });

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openTournamentRegistration(page, tournament.slug ?? tournament.id);
    await expect(page.getByText(/Register as an individual player/i)).toBeVisible();
    await page.getByRole('button', { name: /Register Solo/i }).click();
    await expectToast(page, /Registered|Registration/i);
  });

  test('captain sees ineligible team when no matching roster exists for 5v5 Valorant', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const [captainClient] = await createPlayerClients(env!, 1);
    const stamp = Date.now();

    const team = await createDedicatedCaptainTeam(captainClient, stamp, 'Ineligible Gate');

    const tournament = await createCatalogTournament(organizer, {
      name: `E2E GUI Team Gate ${stamp}`,
      game: 'Valorant',
      gameMode: '5v5',
      teamSize: 5,
      tournamentType: 'single_elimination',
      status: 'open',
      isPublic: true,
    });

    await waitForCaptainTeamInApi(captainClient, team.name);

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openTournamentRegistration(page, tournament.slug ?? tournament.id);

    const dialog = getRegistrationDialog(page);
    await expect(page.getByText(/Select Your Team/i)).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText(team.name, { exact: true })).toBeVisible({ timeout: 30_000 });
    const teamCard = getRegistrationTeamCard(page, team.name);
    await teamCard.scrollIntoViewIfNeeded();
    await expect(teamCard.getByText(/Not Eligible/i)).toBeVisible({ timeout: 45_000 });
    await expect(
      teamCard.getByText(
        /doesn't include this game|Create a roster for this game first|No matching roster found|Need at least \d+ members/i,
      ),
    ).toBeVisible({ timeout: 45_000 });
  });

  test('captain with understaffed 5v5 roster sees eligibility error in registration UI', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const [captainClient] = await createPlayerClients(env!, 1);
    const captainId = await getUserId(env!, env!.players[0].email, env!.players[0].password!);
    const stamp = Date.now();

    await buildUnderstaffedValorantRoster(captainClient, captainId, stamp);
    const teamName = `E2E Understaffed ${stamp}`;

    const tournament = await createCatalogTournament(organizer, {
      name: `E2E GUI Understaffed ${stamp}`,
      game: 'Valorant',
      gameMode: '5v5',
      teamSize: 5,
      tournamentType: 'single_elimination',
      status: 'open',
      isPublic: true,
    });

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openTournamentRegistration(page, tournament.slug ?? tournament.id);

    const dialog = getRegistrationDialog(page);
    await expect(page.getByText(/Select Your Team/i)).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText(teamName, { exact: true })).toBeVisible({ timeout: 30_000 });
    const teamCard = getRegistrationTeamCard(page, teamName);
    await teamCard.scrollIntoViewIfNeeded();
    await expect(teamCard.getByText(/Not Eligible/i)).toBeVisible({ timeout: 30_000 });
    await expect(
      teamCard.getByText(/Roster needs at least 5 members|needs at least 5 members/i),
    ).toBeVisible();
  });

  test('captain registers 2v2 Valorant team through GUI when roster matches catalog mode', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const [captainClient] = await createPlayerClients(env!, 1);
    const captainId = await getUserId(env!, env!.players[0].email, env!.players[0].password!);
    const player2Id = await getUserId(env!, env!.players[1].email, env!.players[1].password!);
    const stamp = Date.now();

    await buildSkirmish2v2Roster(captainClient, captainId, player2Id, stamp);

    const tournament = await createCatalogTournament(organizer, {
      name: `E2E GUI 2v2 Reg ${stamp}`,
      game: 'Valorant',
      gameMode: 'skirmish_2v2',
      teamSize: 2,
      tournamentType: 'single_elimination',
      status: 'open',
      isPublic: true,
    });

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openTournamentRegistration(page, tournament.slug ?? tournament.id);

    await expect(page.getByText(/Eligible/i).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Register Team/i }).click();
    await expectToast(page, /Registered|Registration/i);
  });

  test('captain creates roster through Teams page GUI', async ({ page }) => {
    const [captainClient] = await createPlayerClients(env!, 1);
    const captainId = await getUserId(env!, env!.players[0].email, env!.players[0].password!);
    const stamp = Date.now();
    const team = await ensureCaptainTeam(captainClient, stamp, captainId);
    const existing = await captainClient.get<Array<{ id: string; game?: string }>>(`/api/teams/${team.id}/rosters`);
    for (const roster of existing ?? []) {
      if ((roster.game ?? '').toLowerCase() === 'fortnite') {
        await captainClient.request('DELETE', `/api/teams/${team.id}/rosters/${roster.id}`);
      }
    }

    await loginViaUi(page, env!.players[0].email, env!.players[0].password);
    await openTeamsPage(page);

    await page.getByRole('button', { name: /CREATE ROSTER/i }).click();
    await expect(page.getByRole('heading', { name: /Create Roster/i })).toBeVisible();

    const rosterName = `E2E GUI Roster ${stamp}`;
    await page.getByPlaceholder(/VALORANT MAIN/i).fill(rosterName);
    await page.getByRole('combobox').filter({ hasText: /Select competitive game/i }).click();
    await page.getByRole('option', { name: 'Fortnite' }).click();
    await page.getByRole('button', { name: /CREATE ROSTER/i }).click();

    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 20_000 });
    await expect(
      page.locator('div.font-heading').filter({ hasText: new RegExp(`^${rosterName}$`) }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
