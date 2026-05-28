import { test, expect } from '@playwright/test';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { loginViaUi } from './helpers/uiAuth';
import { createOrganizerClient, createPlayerClients } from './helpers/e2eClients';
import {
  createBRGroups,
  createBrTournament,
  createRound,
  getBRGroups,
  getBRGroupTeams,
  getStageCompletionStatus,
  getTournamentStages,
  publishRoundResultsDirect,
  seedGroups,
  setTournamentOngoing,
  syncBrStagesTwoStage,
  updateRound,
} from './helpers/brSetup';
import { openOrganizerStages } from './helpers/uiBR';
import { expectFriendlyText, expectNoTechnicalCopy } from './helpers/assertCopy';
import { expectToast } from './helpers/assertToast';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

test.describe('BR organizer stages', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('single-lobby stage appears with derived progress and group setup UI', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await createBrTournament(organizer, players);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerStages(page, fixture.slug);

    await expect(page.getByText('Main Event')).toBeVisible();
    await expect(page.getByText(/Setup|In Progress/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Lobbies & Seeding/i }).first().click();
    await expect(page.getByText(/Main Lobby Ready|Lobbies Ready/i)).toBeVisible();
    await expect(page.getByText(/Seed Participants/i)).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('two-stage qualifier to finals structure exposes advancement UI', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await createBrTournament(organizer, players, { autoSeed: true });
    await syncBrStagesTwoStage(organizer, fixture.tournamentId, fixture.stageId);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerStages(page, fixture.slug);

    await expect(page.getByText('Qualifiers').first()).toBeVisible();
    await expect(page.getByText('Finals').first()).toBeVisible();
    await expect(page.getByText(/advance/i).first()).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('random and snake seeding assign all accepted participants', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await createBrTournament(organizer, players, { autoSeed: false });

    const random = await seedGroups(organizer, fixture.stageId, 'random');
    expect(random.assigned).toBeGreaterThanOrEqual(2);

    await createBRGroups(organizer, fixture.stageId, { groupCount: 2, lobbySize: 2, force: true });
    const snake = await seedGroups(organizer, fixture.stageId, 'snake');
    expect(snake.assigned).toBeGreaterThanOrEqual(2);

    const groups = await getBRGroups(organizer, fixture.stageId);
    expect(groups.length).toBe(2);
    const rosterCounts = await Promise.all(
      groups.map(async (group) => (await getBRGroupTeams(organizer, fixture.stageId, group.id)).length),
    );
    expect(rosterCounts.reduce((sum, count) => sum + count, 0)).toBeGreaterThanOrEqual(2);
  });

  test('stage edit, reorder, delete, and reset persist through the stages API', async () => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await createBrTournament(organizer, players);
    const { qualifierStageId, finalsStageId } = await syncBrStagesTwoStage(
      organizer,
      fixture.tournamentId,
      fixture.stageId,
    );

    await organizer.put(`/api/tournaments/${fixture.tournamentId}/stages`, {
      stages: [
        {
          id: qualifierStageId,
          name: 'Opening Heat',
          format: 'battle_royale',
          stageOrder: 2,
          bestOf: 1,
          capacity: 2,
          advancementCount: 1,
        },
        {
          id: finalsStageId,
          name: 'Grand Finals',
          format: 'battle_royale',
          stageOrder: 1,
          bestOf: 1,
          capacity: null,
          advancementCount: null,
        },
      ],
    });

    let stages = await getTournamentStages(organizer, fixture.tournamentId);
    expect(stages.find((stage) => stage.id === qualifierStageId)?.name).toBe('Opening Heat');
    expect(stages.find((stage) => stage.id === finalsStageId)?.name).toBe('Grand Finals');

    await organizer.post(`/api/tournaments/${fixture.tournamentId}/stages/delete`, {
      deleteIds: [finalsStageId],
    });
    stages = await getTournamentStages(organizer, fixture.tournamentId);
    expect(stages.some((stage) => stage.id === finalsStageId)).toBe(false);

    await organizer.post(`/api/tournaments/${fixture.tournamentId}/stages/delete`, {
      deleteIds: stages.map((stage) => stage.id),
    });
    stages = await getTournamentStages(organizer, fixture.tournamentId);
    expect(stages).toHaveLength(0);
  });

  test('reseeding is blocked after a round exists with a friendly message', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await createBrTournament(organizer, players);
    await createRound(organizer, fixture.stageId, (await getBRGroups(organizer, fixture.stageId))[0].id);

    const body = await organizer.expectFailureText(
      'POST',
      `/api/stages/${fixture.stageId}/br/groups/assign`,
      409,
      { method: 'random' },
    );
    expect(body).toContain('already has rounds');
    expectFriendlyText(body);

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerStages(page, fixture.slug);
    await page.getByRole('button', { name: /Lobbies & Seeding/i }).first().click();
    await expect(page.getByText(/Roster locked|already has rounds/i)).toBeVisible();
    await expectNoTechnicalCopy(page);
  });

  test('advance teams from organizer stage UI after completion', async ({ page }) => {
    const organizer = await createOrganizerClient(env!);
    const players = await createPlayerClients(env!, 2);
    const fixture = await createBrTournament(organizer, players, { activateRound: false });
    const { qualifierStageId } = await syncBrStagesTwoStage(organizer, fixture.tournamentId, fixture.stageId);

    await setTournamentOngoing(organizer, fixture.tournamentId);
    await updateRound(organizer, fixture.roundId, { status: 'active', lobbyCode: fixture.lobbyCode });
    await publishRoundResultsDirect(organizer, qualifierStageId, fixture.groupId, fixture.roundId);

    await expect.poll(
      async () => (await getStageCompletionStatus(organizer, qualifierStageId)).progressLabel,
      { timeout: 30_000 },
    ).toBe('ready_to_advance');

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerStages(page, fixture.slug);
    await page.getByRole('button', { name: /Advancement/i }).first().click();
    await page.getByRole('button', { name: /Advance .*Players|Advance .*Teams|Advance/i }).last().click();
    await expectToast(page, /advanced/i);

    await expect.poll(
      async () => (await getStageCompletionStatus(organizer, qualifierStageId)).progressLabel,
      { timeout: 30_000 },
    ).toBe('advanced');
  });
});
