import { test, expect } from '@playwright/test';
import { signInWithPassword } from './helpers/auth';
import { ApiClient } from './helpers/api';
import {
  setupBrRoundFixture,
  setupMinimalBracketFixture,
  getStageCompletionStatus,
  getTournamentStages,
  publishRoundResultsDirect,
  setTournamentOngoing,
  syncBrStagesTwoStage,
} from './helpers/brSetup';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import { loginViaUi } from './helpers/uiAuth';
import {
  assertDerivedStageProgressVisible,
  assertNoLegacyStageStatusBadges,
  assertNoManualStageStatusControls,
  openOrganizerStagesTab,
  openPublicStagesTab,
} from './helpers/uiStages';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

async function createOrganizerClient() {
  if (!env) throw new Error('Missing e2e env');
  const session = await signInWithPassword(
    env.supabaseUrl,
    env.supabaseAnonKey,
    env.organizerEmail,
    env.organizerPassword,
  );
  return new ApiClient(env.apiUrl, session.access_token);
}

test.describe('Stage status simplification — full coverage', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('deprecated PATCH /api/stages/{id}/status returns 410 Gone', async () => {
    const organizer = await createOrganizerClient();
    const playerSession = await signInWithPassword(
      env!.supabaseUrl,
      env!.supabaseAnonKey,
      env!.players[0].email,
      env!.players[0].password,
    );
    const playerClient = new ApiClient(env!.apiUrl, playerSession.access_token);
    const fixture = await setupBrRoundFixture(organizer, [playerClient], { activateRound: false });

    const body = await organizer.expectFailure(
      'PATCH',
      `/api/stages/${fixture.stageId}/status`,
      410,
      { status: 'completed' },
    );
    expect(body.toLowerCase()).toContain('deprecated');
  });

  test('BR completion-status lifecycle: setup → in_progress → ready_to_advance', async () => {
    const organizer = await createOrganizerClient();
    const playerSession = await signInWithPassword(
      env!.supabaseUrl,
      env!.supabaseAnonKey,
      env!.players[0].email,
      env!.players[0].password,
    );
    const playerClient = new ApiClient(env!.apiUrl, playerSession.access_token);

    const fixture = await setupBrRoundFixture(organizer, [playerClient], { activateRound: false });

    const initial = await getStageCompletionStatus(organizer, fixture.stageId);
    expect(initial.progressLabel).toBeTruthy();
    expect(initial.isComplete).toBe(false);
    expect(['setup', 'in_progress']).toContain(initial.progressLabel);

    await setTournamentOngoing(organizer, fixture.tournamentId);
    await organizer.patch(`/api/br/rounds/${fixture.roundId}`, {
      status: 'active',
      lobbyCode: fixture.lobbyCode,
    });

    const live = await getStageCompletionStatus(organizer, fixture.stageId);
    expect(live.progressLabel).toBe('in_progress');
    expect(live.isComplete).toBe(false);

    await publishRoundResultsDirect(organizer, fixture.stageId, fixture.groupId, fixture.roundId);

    await expect.poll(
      async () => (await getStageCompletionStatus(organizer, fixture.stageId)).isComplete,
      { timeout: 30_000 },
    ).toBe(true);

    const complete = await getStageCompletionStatus(organizer, fixture.stageId);
    expect(complete.progressLabel).toBe('ready_to_advance');
    expect(complete.alreadyAdvanced).toBe(false);
  });

  test('GET /api/tournaments/{id}/stages returns progress_label for each stage', async () => {
    const organizer = await createOrganizerClient();
    const playerSession = await signInWithPassword(
      env!.supabaseUrl,
      env!.supabaseAnonKey,
      env!.players[0].email,
      env!.players[0].password,
    );
    const playerClient = new ApiClient(env!.apiUrl, playerSession.access_token);
    const fixture = await setupBrRoundFixture(organizer, [playerClient], { activateRound: false });

    const stages = await getTournamentStages(organizer, fixture.tournamentId);
    expect(stages.length).toBeGreaterThan(0);
    for (const stage of stages) {
      const label = stage.progress_label ?? stage.progressLabel;
      expect(label).toBeTruthy();
      expect(['setup', 'in_progress', 'ready_to_advance', 'advanced']).toContain(label);
    }
  });

  test('rejects round schedule outside tournament window', async () => {
    const organizer = await createOrganizerClient();
    const playerSession = await signInWithPassword(
      env!.supabaseUrl,
      env!.supabaseAnonKey,
      env!.players[0].email,
      env!.players[0].password,
    );
    const playerClient = new ApiClient(env!.apiUrl, playerSession.access_token);

    const farFuture = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const fixture = await setupBrRoundFixture(organizer, [playerClient], {
      activateRound: false,
      endDate: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const body = await organizer.expectFailure(
      'POST',
      `/api/stages/${fixture.stageId}/br/groups/${fixture.groupId}/rounds`,
      400,
      { scheduledAt: farFuture, lobbyCode: 'SCHED-TEST' },
    );
    expect(body.toLowerCase()).toContain('tournament window');
  });

  test('rejects starting round when tournament is not ongoing', async () => {
    const organizer = await createOrganizerClient();
    const playerSession = await signInWithPassword(
      env!.supabaseUrl,
      env!.supabaseAnonKey,
      env!.players[0].email,
      env!.players[0].password,
    );
    const playerClient = new ApiClient(env!.apiUrl, playerSession.access_token);
    const fixture = await setupBrRoundFixture(organizer, [playerClient], { activateRound: false });

    const body = await organizer.expectFailure(
      'PATCH',
      `/api/br/rounds/${fixture.roundId}`,
      400,
      { status: 'active', lobbyCode: fixture.lobbyCode },
    );
    expect(body.toLowerCase()).toContain('ongoing');
  });

  test('allows starting round when tournament is ongoing and within window', async () => {
    const organizer = await createOrganizerClient();
    const playerSession = await signInWithPassword(
      env!.supabaseUrl,
      env!.supabaseAnonKey,
      env!.players[0].email,
      env!.players[0].password,
    );
    const playerClient = new ApiClient(env!.apiUrl, playerSession.access_token);
    const fixture = await setupBrRoundFixture(organizer, [playerClient], { activateRound: false });

    await setTournamentOngoing(organizer, fixture.tournamentId);
    const round = await organizer.patch<{ status: string }>(`/api/br/rounds/${fixture.roundId}`, {
      status: 'active',
      lobbyCode: fixture.lobbyCode,
    });
    expect(round.status).toBe('active');
  });

  test('BR advance works after round complete without manual stage status PATCH', async () => {
    const organizer = await createOrganizerClient();
    const player1Session = await signInWithPassword(
      env!.supabaseUrl,
      env!.supabaseAnonKey,
      env!.players[0].email,
      env!.players[0].password,
    );
    const player2Session = await signInWithPassword(
      env!.supabaseUrl,
      env!.supabaseAnonKey,
      env!.players[1].email,
      env!.players[1].password,
    );
    const player1 = new ApiClient(env!.apiUrl, player1Session.access_token);
    const player2 = new ApiClient(env!.apiUrl, player2Session.access_token);

    const fixture = await setupBrRoundFixture(organizer, [player1, player2], { activateRound: false });
    const { qualifierStageId } = await syncBrStagesTwoStage(
      organizer,
      fixture.tournamentId,
      fixture.stageId,
    );

    await setTournamentOngoing(organizer, fixture.tournamentId);
    await organizer.patch(`/api/br/rounds/${fixture.roundId}`, {
      status: 'active',
      lobbyCode: fixture.lobbyCode,
    });

    await publishRoundResultsDirect(
      organizer,
      qualifierStageId,
      fixture.groupId,
      fixture.roundId,
    );

    await expect.poll(
      async () => (await getStageCompletionStatus(organizer, qualifierStageId)).isComplete,
      { timeout: 30_000 },
    ).toBe(true);

    const advanceResult = await organizer.post<{ advanced?: number }>(
      `/api/stages/${qualifierStageId}/br/advance?preview=false`,
      {},
    );
    expect(advanceResult.advanced).toBeGreaterThan(0);

    const afterAdvance = await getStageCompletionStatus(organizer, qualifierStageId);
    expect(afterAdvance.alreadyAdvanced).toBe(true);
    expect(afterAdvance.progressLabel).toBe('advanced');
  });

  test('organizer Stages tab — derived progress chips, no manual status controls', async ({ page }) => {
    const organizer = await createOrganizerClient();
    const playerSession = await signInWithPassword(
      env!.supabaseUrl,
      env!.supabaseAnonKey,
      env!.players[0].email,
      env!.players[0].password,
    );
    const playerClient = new ApiClient(env!.apiUrl, playerSession.access_token);
    const fixture = await setupBrRoundFixture(organizer, [playerClient], { activateRound: false });

    await loginViaUi(page, env!.organizerEmail, env!.organizerPassword);
    await openOrganizerStagesTab(page, fixture.slug);
    await assertNoManualStageStatusControls(page);
    await assertDerivedStageProgressVisible(page);
    await assertNoLegacyStageStatusBadges(page);
  });

  test('public Stages tab — progress_label chips, no legacy status badges', async ({ page }) => {
    const organizer = await createOrganizerClient();
    const fixture = await setupMinimalBracketFixture(organizer);

    await openPublicStagesTab(page, fixture.slug);
    await assertDerivedStageProgressVisible(page);
    await assertNoLegacyStageStatusBadges(page);
  });
});
