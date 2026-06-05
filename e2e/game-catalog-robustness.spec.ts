import { test, expect } from '@playwright/test';
import { createOrganizerClient } from './helpers/e2eClients';
import { createPlayerClients } from './helpers/e2eClients';
import { readE2eEnv, e2eSkipReason } from './helpers/env';
import {
  allLocalAliases,
  createCatalogTournament,
  fetchCatalog,
  fetchCatalogGame,
  localCatalogGames,
  localCatalogVersion,
  localModeKeys,
  localStructureKeys,
  type CatalogGame,
  type CatalogTournamentRow,
} from './helpers/catalogSetup';

const env = readE2eEnv();
const skipReason = e2eSkipReason(env);

function modeKey(row: CatalogTournamentRow): string {
  return row.game_mode ?? row.gameMode ?? '';
}

function teamSize(row: CatalogTournamentRow): number {
  return row.team_size ?? row.teamSize ?? 0;
}

function findApiGame(catalog: CatalogGame[], slug: string): CatalogGame {
  const game = catalog.find((g) => g.slug === slug);
  if (!game) throw new Error(`Catalog missing game slug ${slug}`);
  return game;
}

test.describe('@staging-only Game catalog — backend robustness', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(() => {
    test.skip(Boolean(skipReason), skipReason ?? undefined);
  });

  test('public catalog matches backend packaged registry', async () => {
    const catalog = await fetchCatalog(env!.apiUrl);
    const localGames = localCatalogGames();

    expect(catalog.games.length).toBe(localGames.length);
    expect(catalog.catalogVersion).toBe(localCatalogVersion());
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.contentHash).toMatch(/^[a-f0-9]{64}$/);

    for (const local of localGames) {
      const api = findApiGame(catalog.games, local.slug);
      expect(api.name).toBe(local.name);
      expect(api.gameType).toBe(local.type);
      expect(api.defaultModeKey).toBe(local.defaultMode ?? local.defaultFormat);

      const apiModeKeys = api.modes.map((m) => m.modeKey).sort();
      expect(apiModeKeys).toEqual(localModeKeys(local));

      for (const mode of api.modes) {
        const localMode = (local.modes ?? local.formats ?? []).find(
          (m) => (m.key ?? m.value) === mode.modeKey,
        );
        expect(localMode, `local mode ${mode.modeKey} for ${local.slug}`).toBeTruthy();
        expect(mode.teamSize).toBe(localMode!.teamSize);
        expect(mode.participantMode).toBe(localMode!.participantMode ?? 'team');
      }

      const apiStructures = api.tournamentStructures.map((s) => s.structureKey).sort();
      expect(apiStructures).toEqual(localStructureKeys(local));

      const localFeatures = local.features as Record<string, unknown>;
      expect(Boolean(api.features.mapPool)).toBe(Boolean(localFeatures.mapPool));
      expect(Boolean(api.features.mapVeto)).toBe(Boolean(localFeatures.mapVeto));
    }
  });

  test('every slug, name, and legacy alias resolves on GET /api/games/catalog/{alias}', async () => {
    const aliases = allLocalAliases();
    expect(aliases.length).toBeGreaterThan(20);

    for (const { alias, slug } of aliases) {
      const { status, body } = await fetchCatalogGame(env!.apiUrl, alias);
      expect(status, `alias "${alias}"`).toBe(200);
      expect(body?.slug, `alias "${alias}"`).toBe(slug);
    }
  });

  test('unknown catalog alias returns 404', async () => {
    const { status, body } = await fetchCatalogGame(env!.apiUrl, 'not-a-real-game-xyz');
    expect(status).toBe(404);
    expect(body).toBeNull();
  });

  test('creates bracket tournaments for canonical and aliased games', async () => {
    const organizer = await createOrganizerClient(env!);

    const valorant = await createCatalogTournament(organizer, {
      game: 'Valorant',
      gameMode: '5v5',
      teamSize: 5,
      tournamentType: 'single_elimination',
    });
    expect(valorant.game).toBe('Valorant');
    expect(modeKey(valorant)).toBe('5v5');
    expect(teamSize(valorant)).toBe(5);
    expect(valorant.format).toBe('single_elimination');

    const byAlias = await createCatalogTournament(organizer, {
      game: 'vct',
      gameMode: '5v5',
      teamSize: 5,
      tournamentType: 'single_elimination',
    });
    expect(byAlias.game).toBe('Valorant');

    const cs2 = await createCatalogTournament(organizer, {
      game: 'Counter-Strike 2',
      gameMode: '5v5',
      teamSize: 5,
      tournamentType: 'single_elimination',
    });
    expect(cs2.game).toBe('Counter-Strike 2');

    const fifa = await createCatalogTournament(organizer, {
      game: 'fifa',
      gameMode: '1v1',
      teamSize: 1,
      tournamentType: 'single_elimination',
    });
    expect(fifa.game).toBe('EA FC');
    expect(modeKey(fifa)).toBe('1v1');
  });

  test('creates battle royale and solo-mode tournaments with normalized fields', async () => {
    const organizer = await createOrganizerClient(env!);

    const fortnite = await createCatalogTournament(organizer, {
      game: 'Fortnite',
      gameMode: 'solo',
      teamSize: 1,
      tournamentType: 'battle_royale',
      settings: { brConfig: { scoringPreset: 'fortnite', totalRounds: 2, lobbySize: 8 } },
    });
    expect(fortnite.game).toBe('Fortnite');
    expect(modeKey(fortnite)).toBe('solo');
    expect(fortnite.format).toBe('battle_royale');

    const skirmish = await createCatalogTournament(organizer, {
      game: 'Valorant',
      gameMode: 'skirmish_1v1',
      teamSize: 1,
      tournamentType: 'single_elimination',
    });
    expect(modeKey(skirmish)).toBe('skirmish_1v1');
    expect(teamSize(skirmish)).toBe(1);
  });

  test('infers mode from team size when only one mode matches', async () => {
    const organizer = await createOrganizerClient(env!);

    const inferred = await createCatalogTournament(organizer, {
      game: 'Valorant',
      teamSize: 2,
      tournamentType: 'single_elimination',
    });
    expect(modeKey(inferred)).toBe('skirmish_2v2');
    expect(teamSize(inferred)).toBe(2);
  });

  test('rejects unsupported games, modes, structures, and settings', async () => {
    const organizer = await createOrganizerClient(env!);
    const base = { gameMode: '5v5', teamSize: 5, tournamentType: 'single_elimination' as const };

    const unsupportedGame = await organizer.expectFailureText(
      'POST',
      '/api/tournaments',
      400,
      baseTournamentBody({ game: 'Overwatch 2', ...base }),
    );
    expect(unsupportedGame.toLowerCase()).toContain('unsupported game');

    const unsupportedMode = await organizer.expectFailureText(
      'POST',
      '/api/tournaments',
      400,
      baseTournamentBody({ game: 'Valorant', gameMode: '6v6', teamSize: 6, tournamentType: 'single_elimination' }),
    );
    expect(unsupportedMode.toLowerCase()).toMatch(/unsupported|does not match/);

    const teamSizeMismatch = await organizer.expectFailureText(
      'POST',
      '/api/tournaments',
      400,
      baseTournamentBody({ game: 'Valorant', gameMode: '5v5', teamSize: 3, tournamentType: 'single_elimination' }),
    );
    expect(teamSizeMismatch.toLowerCase()).toMatch(/does not match|unsupported game mode/);

    const brOnBracket = await organizer.expectFailureText(
      'POST',
      '/api/tournaments',
      400,
      baseTournamentBody({
        game: 'Valorant',
        gameMode: '5v5',
        teamSize: 5,
        format: 'battle_royale',
        tournamentType: 'single_elimination',
      }),
    );
    expect(brOnBracket.toLowerCase()).toContain('structure');

    const brSettingsOnValorant = await organizer.expectFailureText(
      'POST',
      '/api/tournaments',
      400,
      baseTournamentBody({
        game: 'Valorant',
        gameMode: '5v5',
        teamSize: 5,
        tournamentType: 'single_elimination',
        settings: { brGameCount: 3 },
      }),
    );
    expect(brSettingsOnValorant.toLowerCase()).toContain('battle royale');

    const mapPoolOnFortnite = await organizer.expectFailureText(
      'POST',
      '/api/tournaments',
      400,
      baseTournamentBody({
        game: 'Fortnite',
        gameMode: 'solo',
        teamSize: 1,
        tournamentType: 'battle_royale',
        mapPoolIds: ['00000000-0000-0000-0000-000000000001'],
      }),
    );
    expect(mapPoolOnFortnite.toLowerCase()).toContain('map pool');

    const unsupportedStage = await organizer.expectFailureText(
      'POST',
      '/api/tournaments',
      400,
      baseTournamentBody({
        game: 'Valorant',
        gameMode: '5v5',
        teamSize: 5,
        tournamentType: 'single_elimination',
        stages: [{ name: 'Finals', format: 'battle_royale', stageOrder: 1 }],
      }),
    );
    expect(unsupportedStage.toLowerCase()).toContain('structure');
  });

  test('rejects invalid catalog changes on tournament update', async () => {
    const organizer = await createOrganizerClient(env!);
    const created = await createCatalogTournament(organizer, {
      game: 'Valorant',
      gameMode: '5v5',
      teamSize: 5,
      tournamentType: 'single_elimination',
    });

    const unsupportedGame = await organizer.expectFailureText(
      'PUT',
      `/api/tournaments/${created.id}`,
      400,
      { game: 'Overwatch 2' },
    );
    expect(unsupportedGame.toLowerCase()).toContain('unsupported game');

    const brStructure = await organizer.expectFailureText(
      'PUT',
      `/api/tournaments/${created.id}`,
      400,
      { format: 'battle_royale' },
    );
    expect(brStructure.toLowerCase()).toContain('structure');
  });

  test('solo catalog mode allows solo registration and rejects team payload', async () => {
    const organizer = await createOrganizerClient(env!);
    const [player] = await createPlayerClients(env!, 1);

    const solo = await createCatalogTournament(organizer, {
      game: 'Valorant',
      gameMode: 'skirmish_1v1',
      teamSize: 1,
      tournamentType: 'single_elimination',
      status: 'open',
      isPublic: true,
    });

    const teamPayloadError = await player.expectFailureText(
      'POST',
      `/api/tournaments/${solo.id}/register`,
      400,
      { teamId: '00000000-0000-0000-0000-000000000099' },
    );
    expect(teamPayloadError.toLowerCase()).toContain('solo');

    await player.post(`/api/tournaments/${solo.id}/register`, {});
  });
});

function baseTournamentBody(overrides: Record<string, unknown>) {
  const stamp = Date.now();
  const start = new Date(Date.now() + 7_200_000).toISOString();
  return {
    name: `E2E Catalog Negative ${stamp}`,
    slug: `e2e-catalog-neg-${stamp}`,
    maxTeams: 8,
    startDate: start,
    endDate: new Date(Date.now() + 172_800_000).toISOString(),
    registrationDeadline: new Date(Date.now() + 3_600_000).toISOString(),
    status: 'draft',
    isPublic: false,
    checkInRequired: false,
    ...overrides,
  };
}
