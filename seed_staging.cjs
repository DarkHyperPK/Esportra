/**
 * Staging DB Seed Script
 * Creates 32 teams × 10 players, 2 tournaments (Valorant + CS2),
 * registers all teams with correct rosters.
 *
 * All 320 players are loginable via Supabase Auth.
 * Password for all: Test1234!
 */
const { Client } = require('pg');
const crypto = require('crypto');

const STAGING_DB = 'postgresql://postgres:fzVN346E0Os7K14LidhTu0WcCv6jXdjn@localhost:54324/postgres';
const SUPABASE_URL = 'https://staging.esportra.com';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzU2ODk2MDAsImV4cCI6NDg5MTM2MzIwMH0.1ZMulYbXS9hCgi3586fEkKOmLZch7wHxqiVNsMGt8f4';

const PASSWORD = 'Test1234!';
const ORGANIZER_ID = 'f675694e-95db-4e4a-b547-d024f1aa9482'; // player2@gmail.com
const ORG_ID = 'f0326ab1-78a9-430c-b3ec-4b9193870f1d';

// ── Team Names ───────────────────────────────────────────────────────────────
const TEAM_NAMES = [
  'Phoenix Rising', 'Shadow Wolves', 'Neon Vipers', 'Iron Titans',
  'Storm Breakers', 'Crimson Blade', 'Frost Giants', 'Dark Phoenix',
  'Lightning Bolts', 'Ghost Protocol', 'Cyber Ninjas', 'Omega Force',
  'Steel Legion', 'Night Hawks', 'Thunder Cats', 'Fire Serpents',
  'Arctic Foxes', 'Venom Squad', 'Solar Flares', 'Riot Shield',
  'Blaze Masters', 'Crystal Edge', 'Demon Hunters', 'Echo Chamber',
  'Fury Wings', 'Granite Wall', 'Hyper Drive', 'Inferno Core',
  'Jade Dragons', 'Karma Strike', 'Lunar Eclipse', 'Mystic Ravens'
];

const TEAM_TAGS = [
  'PHX', 'SHW', 'NVP', 'IRN', 'STM', 'CRB', 'FRG', 'DPH',
  'LTB', 'GHP', 'CNJ', 'OMG', 'STL', 'NHK', 'THC', 'FRS',
  'AFX', 'VNM', 'SLF', 'RTS', 'BLZ', 'CRE', 'DMH', 'ECH',
  'FRW', 'GRW', 'HPD', 'IFC', 'JDR', 'KRS', 'LNE', 'MYR'
];

// Player first names and last names for realistic names
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Sam', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Taylor', 'Drew', 'Kai', 'Reese', 'Dakota', 'Skyler', 'Sage', 'River',
  'Phoenix', 'Blake', 'Cameron', 'Hayden', 'Logan', 'Parker', 'Rowan', 'Finley',
  'Emerson', 'Harper', 'Mason', 'Peyton', 'Reagan', 'Spencer', 'Kendall', 'Devin',
  'Jamie', 'Jesse', 'Micah', 'Robin', 'Shay', 'Tatum', 'Val', 'Wren',
  'Ari', 'Bay', 'Cleo', 'Dax', 'Ellis', 'Flynn', 'Gray', 'Hollis',
  'Indigo', 'Jules', 'Kit', 'Lane', 'Milan', 'Nico', 'Oakley', 'Palmer'
];
const LAST_NAMES = [
  'Chen', 'Park', 'Kim', 'Lee', 'Nguyen', 'Singh', 'Patel', 'Smith',
  'Garcia', 'Martinez', 'Lopez', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'White',
  'Harris', 'Clark', 'Lewis', 'Young', 'Hall', 'Allen', 'King', 'Wright'
];

// IGN-style gamer tags
const IGN_PREFIXES = [
  'xN1ght', 'Zer0', 'Sh4dow', 'Bl4ze', 'Str1ke', 'V1per', 'Ph4ntom', 'R4ge',
  'Cyb3r', 'N0va', 'Gh0st', 'Furi0us', 'L3thal', 'Sw1ft', 'D4rk', 'St0rm',
  'R0gue', 'Ven0m', 'Bl1tz', 'Fl4sh', 'Wr4th', 'Sp3ctr', 'Puls3', 'Cru5h',
  'Sn1per', 'Dr1ft', 'Cl4sh', 'Fro5t', 'Th0rn', 'Sp4rk', 'Cr0w', 'Ax3l'
];

function uuid() {
  return crypto.randomUUID();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Supabase Admin API ───────────────────────────────────────────────────────

async function createAuthUser(email, password, metadata) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    // If user already exists, fetch them
    if (text.includes('already been registered') || text.includes('already exists')) {
      // Get user by email
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const listData = await listRes.json();
      const users = listData.users || listData;
      const existing = users.find(u => u.email === email);
      if (existing) return existing;
    }
    throw new Error(`Auth user creation failed for ${email}: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  const db = new Client({ connectionString: STAGING_DB });
  await db.connect();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  STAGING DB SEED SCRIPT');
  console.log('  32 Teams × 10 Players, 2 Tournaments');
  console.log('═══════════════════════════════════════════════════════\n');

  // ─── PHASE 1: CLEAR EXISTING TOURNAMENT DATA ──────────────────────────────
  console.log('PHASE 1: Clearing existing tournament data...');

  // Order matters for FK constraints — children first
  const clearOrder = [
    'match_map_veto_actions',
    'match_map_vetos',
    'match_completed_events',
    'match_disputes',
    'match_result_reports',
    'match_messages',
    'match_time_proposals',
    'match_checkins',
    'brkt_match_events',
    'brkt_match_games',
    'brkt_layout',
    'brkt_advancements',
    'brkt_matches',
    'brkt_versions',
    'stage_participants',
    'tournament_map_pools',
    'tournament_match_results',
    'tournament_announcements',
    'tournament_disputes',
    'tournament_bans',
    'tournament_staff',
    'tournament_participants',
    'tournament_stages',
    'tournaments',
  ];

  for (const table of clearOrder) {
    try {
      const r = await db.query(`DELETE FROM public."${table}"`);
      if (r.rowCount > 0) console.log(`  Cleared ${table}: ${r.rowCount} rows`);
    } catch (e) {
      console.log(`  Warning clearing ${table}: ${e.message}`);
    }
  }
  console.log('  ✅ Tournament data cleared\n');

  // ─── PHASE 2: CREATE 320 AUTH USERS + PROFILES ─────────────────────────────
  console.log('PHASE 2: Creating 320 player accounts...');

  const allPlayers = []; // { userId, email, username, fullName, teamIndex, playerIndex }

  for (let t = 0; t < 32; t++) {
    for (let p = 0; p < 10; p++) {
      const playerNum = t * 10 + p;
      const firstName = FIRST_NAMES[playerNum % FIRST_NAMES.length];
      const lastName = LAST_NAMES[t % LAST_NAMES.length];
      const ign = `${IGN_PREFIXES[t % IGN_PREFIXES.length]}${p + 1}`;
      const email = `e2e.team${t + 1}.player${p + 1}@esportra.test`;
      const username = `${ign}_${TEAM_TAGS[t]}`;
      const fullName = `${firstName} ${lastName}`;

      allPlayers.push({
        email,
        username,
        fullName,
        ign,
        teamIndex: t,
        playerIndex: p,
        userId: null, // filled after creation
      });
    }
  }

  // Create auth users in batches
  let created = 0;
  let existed = 0;
  for (const player of allPlayers) {
    try {
      const user = await createAuthUser(player.email, PASSWORD, {
        username: player.username,
        full_name: player.fullName,
      });
      player.userId = user.id;
      created++;

      // The trigger auto-creates a profile, but update the username to be unique
      await db.query(
        `UPDATE public.profiles SET username = $1, full_name = $2 WHERE id = $3`,
        [player.username, player.fullName, user.id]
      );
    } catch (e) {
      if (e.message.includes('already')) {
        // Find existing user
        const r = await db.query('SELECT id FROM public.profiles WHERE email = $1', [player.email]);
        if (r.rows.length) {
          player.userId = r.rows[0].id;
          existed++;
        } else {
          console.log(`  ⚠️ Could not find existing user ${player.email}: ${e.message}`);
        }
      } else {
        console.log(`  ⚠️ Error creating ${player.email}: ${e.message}`);
      }
    }

    // Progress every 32 users
    if ((created + existed) % 32 === 0) {
      process.stdout.write(`  ${created + existed}/320 users processed...\r`);
    }

    // Small delay to avoid rate limiting
    if ((created + existed) % 10 === 0) await sleep(100);
  }
  console.log(`  ✅ ${created} created, ${existed} already existed (total: ${allPlayers.filter(p => p.userId).length})\n`);

  // ─── PHASE 3: CREATE 32 TEAMS ─────────────────────────────────────────────
  console.log('PHASE 3: Creating 32 teams...');

  const teamIds = []; // teamIds[t] = uuid

  for (let t = 0; t < 32; t++) {
    const owner = allPlayers.find(p => p.teamIndex === t && p.playerIndex === 0);
    if (!owner?.userId) {
      console.log(`  ⚠️ No owner for team ${t}, skipping`);
      teamIds.push(null);
      continue;
    }

    const teamId = uuid();
    teamIds.push(teamId);

    await db.query(
      `INSERT INTO public.teams (id, name, tag, game, games, owner_id, max_members, is_public, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 10, true, true)
       ON CONFLICT DO NOTHING`,
      [teamId, TEAM_NAMES[t], TEAM_TAGS[t], 'Valorant', '{Valorant,CS2}', owner.userId]
    );

    // Owner is automatically a member with 'owner' role
    await db.query(
      `INSERT INTO public.team_members (team_id, user_id, role, is_active)
       VALUES ($1, $2, 'owner', true)
       ON CONFLICT DO NOTHING`,
      [teamId, owner.userId]
    );
  }
  console.log(`  ✅ ${teamIds.filter(Boolean).length} teams created\n`);

  // ─── PHASE 4: ADD 9 MORE MEMBERS PER TEAM ──────────────────────────────────
  console.log('PHASE 4: Adding team members (9 per team)...');

  let memberCount = 0;
  for (let t = 0; t < 32; t++) {
    if (!teamIds[t]) continue;
    for (let p = 1; p < 10; p++) {
      const player = allPlayers.find(pl => pl.teamIndex === t && pl.playerIndex === p);
      if (!player?.userId) continue;

      const role = p === 1 ? 'captain' : 'member';
      await db.query(
        `INSERT INTO public.team_members (team_id, user_id, role, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT DO NOTHING`,
        [teamIds[t], player.userId, role]
      );
      memberCount++;
    }
  }
  console.log(`  ✅ ${memberCount} team members added\n`);

  // ─── PHASE 5: CREATE ROSTERS (VAL + CS2, 5 PLAYERS EACH) ──────────────────
  console.log('PHASE 5: Creating rosters (Valorant + CS2 per team)...');

  const rosterIds = { val: [], cs2: [] }; // rosterIds.val[t] = uuid

  for (let t = 0; t < 32; t++) {
    if (!teamIds[t]) continue;

    // Valorant roster = players 0-4
    const valRosterId = uuid();
    rosterIds.val.push(valRosterId);
    await db.query(
      `INSERT INTO public.team_rosters (id, team_id, name, game, format, team_size)
       VALUES ($1, $2, $3, 'Valorant', 'squad', 5)`,
      [valRosterId, teamIds[t], `${TEAM_NAMES[t]} - Valorant`]
    );

    for (let p = 0; p < 5; p++) {
      const player = allPlayers.find(pl => pl.teamIndex === t && pl.playerIndex === p);
      if (!player?.userId) continue;
      await db.query(
        `INSERT INTO public.team_roster_members (roster_id, user_id, role, is_active, is_starter)
         VALUES ($1, $2, $3, true, true)`,
        [valRosterId, player.userId, p === 0 ? 'captain' : 'player']
      );
    }

    // CS2 roster = players 5-9
    const cs2RosterId = uuid();
    rosterIds.cs2.push(cs2RosterId);
    await db.query(
      `INSERT INTO public.team_rosters (id, team_id, name, game, format, team_size)
       VALUES ($1, $2, $3, 'CS2', 'squad', 5)`,
      [cs2RosterId, teamIds[t], `${TEAM_NAMES[t]} - CS2`]
    );

    for (let p = 5; p < 10; p++) {
      const player = allPlayers.find(pl => pl.teamIndex === t && pl.playerIndex === p);
      if (!player?.userId) continue;
      await db.query(
        `INSERT INTO public.team_roster_members (roster_id, user_id, role, is_active, is_starter)
         VALUES ($1, $2, $3, true, true)`,
        [cs2RosterId, player.userId, p === 5 ? 'captain' : 'player']
      );
    }
  }
  console.log(`  ✅ ${rosterIds.val.length} Valorant + ${rosterIds.cs2.length} CS2 rosters created\n`);

  // ─── PHASE 6: CREATE 2 TOURNAMENTS ──────────────────────────────────────────
  console.log('PHASE 6: Creating Valorant + CS2 tournaments...');

  const now = new Date();
  const startDate = new Date(now.getTime() + 3 * 86400000); // 3 days from now
  const endDate = new Date(now.getTime() + 5 * 86400000);   // 5 days from now
  const regDeadline = new Date(now.getTime() + 2 * 86400000); // 2 days from now

  const valTournamentId = uuid();
  await db.query(
    `INSERT INTO public.tournaments 
       (id, name, description, slug, game, max_teams, min_teams, team_size,
        start_date, end_date, registration_deadline, status, rules, 
        organizer_id, organization_id, is_public, is_featured, format, prize_pool)
     VALUES ($1, $2, $3, $4, $5, 32, 4, 5,
        $6, $7, $8, 'open', $9,
        $10, $11, true, true, 'single_elimination', 5000)`,
    [
      valTournamentId,
      'Esportra Valorant Championship 2026',
      'The premier Valorant tournament featuring 32 of the best teams battling for glory and a $5,000 prize pool. Single elimination, best of 3.',
      'esportra-valorant-championship-2026',
      'Valorant',
      startDate.toISOString(), endDate.toISOString(), regDeadline.toISOString(),
      'Standard Valorant competitive rules apply.\n- Best of 3 maps\n- Map veto: Ban-Ban-Pick-Pick-Ban-Ban-Decider\n- Overtime: Standard rules\n- Anti-cheat required\n- No coaching during rounds',
      ORGANIZER_ID, ORG_ID
    ]
  );

  const cs2TournamentId = uuid();
  await db.query(
    `INSERT INTO public.tournaments 
       (id, name, description, slug, game, max_teams, min_teams, team_size,
        start_date, end_date, registration_deadline, status, rules, 
        organizer_id, organization_id, is_public, is_featured, format, prize_pool)
     VALUES ($1, $2, $3, $4, $5, 32, 4, 5,
        $6, $7, $8, 'open', $9,
        $10, $11, true, true, 'single_elimination', 5000)`,
    [
      cs2TournamentId,
      'Esportra CS2 Major Qualifier 2026',
      'CS2 Major Qualifier — 32 teams compete in single elimination. Top teams advance to the main event. $5,000 prize pool.',
      'esportra-cs2-major-qualifier-2026',
      'CS2',
      startDate.toISOString(), endDate.toISOString(), regDeadline.toISOString(),
      'Standard CS2 competitive rules.\n- Best of 3 maps\n- Map veto: Ban-Ban-Pick-Pick-Ban-Ban-Decider\n- MR12 overtime\n- VAC required\n- No coaching during live rounds',
      ORGANIZER_ID, ORG_ID
    ]
  );

  console.log(`  ✅ Valorant tournament: ${valTournamentId}`);
  console.log(`  ✅ CS2 tournament: ${cs2TournamentId}\n`);

  // ─── PHASE 7: ADD STAGES ────────────────────────────────────────────────────
  console.log('PHASE 7: Adding tournament stages...');

  const valStageId = uuid();
  await db.query(
    `INSERT INTO public.tournament_stages 
       (id, tournament_id, name, format, stage_order, capacity, best_of, veto_enabled)
     VALUES ($1, $2, 'Main Bracket', 'single_elimination', 1, 32, 3, true)`,
    [valStageId, valTournamentId]
  );

  const cs2StageId = uuid();
  await db.query(
    `INSERT INTO public.tournament_stages 
       (id, tournament_id, name, format, stage_order, capacity, best_of, veto_enabled)
     VALUES ($1, $2, 'Main Bracket', 'single_elimination', 1, 32, 3, true)`,
    [cs2StageId, cs2TournamentId]
  );

  console.log(`  ✅ Stages created\n`);

  // ─── PHASE 8: REGISTER ALL 32 TEAMS ────────────────────────────────────────
  console.log('PHASE 8: Registering teams in tournaments...');

  let valRegCount = 0;
  let cs2RegCount = 0;

  for (let t = 0; t < 32; t++) {
    if (!teamIds[t]) continue;
    const captain = allPlayers.find(pl => pl.teamIndex === t && pl.playerIndex === 0);
    if (!captain?.userId) continue;

    // Get team members for the roster
    const valPlayers = allPlayers.filter(pl => pl.teamIndex === t && pl.playerIndex < 5 && pl.userId);
    const cs2Players = allPlayers.filter(pl => pl.teamIndex === t && pl.playerIndex >= 5 && pl.userId);

    // Register Valorant roster
    await db.query(
      `INSERT INTO public.tournament_participants
         (tournament_id, participant_type, user_id, team_id, team_name, team_captain_id,
          team_members, team_logo_url, status, roster_id, roster_name)
       VALUES ($1, 'team', $2, $3, $4, $5, $6, null, 'approved', $7, $8)`,
      [
        valTournamentId,
        captain.userId,
        teamIds[t],
        TEAM_NAMES[t],
        captain.userId,
        JSON.stringify(valPlayers.map(p => ({ user_id: p.userId, username: p.username, role: p.playerIndex === 0 ? 'captain' : 'player' }))),
        rosterIds.val[t],
        `${TEAM_NAMES[t]} - Valorant`
      ]
    );
    valRegCount++;

    // Register CS2 roster (captain for CS2 is player index 5)
    const cs2Captain = allPlayers.find(pl => pl.teamIndex === t && pl.playerIndex === 5);
    await db.query(
      `INSERT INTO public.tournament_participants
         (tournament_id, participant_type, user_id, team_id, team_name, team_captain_id,
          team_members, team_logo_url, status, roster_id, roster_name)
       VALUES ($1, 'team', $2, $3, $4, $5, $6, null, 'approved', $7, $8)`,
      [
        cs2TournamentId,
        cs2Captain?.userId || captain.userId,
        teamIds[t],
        TEAM_NAMES[t],
        cs2Captain?.userId || captain.userId,
        JSON.stringify(cs2Players.map(p => ({ user_id: p.userId, username: p.username, role: p.playerIndex === 5 ? 'captain' : 'player' }))),
        rosterIds.cs2[t],
        `${TEAM_NAMES[t]} - CS2`
      ]
    );
    cs2RegCount++;
  }

  console.log(`  ✅ ${valRegCount} teams registered for Valorant`);
  console.log(`  ✅ ${cs2RegCount} teams registered for CS2\n`);

  // ─── PHASE 9: ADD MAP POOLS ─────────────────────────────────────────────────
  console.log('PHASE 9: Setting up map pools...');

  // Get Valorant maps
  const valMaps = await db.query("SELECT id, map_name FROM public.game_maps WHERE game = 'Valorant'");
  for (const map of valMaps.rows) {
    await db.query(
      `INSERT INTO public.tournament_map_pools (tournament_id, map_id, game, map_name)
       VALUES ($1, $2, 'Valorant', $3) ON CONFLICT DO NOTHING`,
      [valTournamentId, map.id, map.map_name]
    );
  }

  // Get CS2 maps
  const cs2Maps = await db.query("SELECT id, map_name FROM public.game_maps WHERE game = 'Counter-Strike 2'");
  for (const map of cs2Maps.rows) {
    await db.query(
      `INSERT INTO public.tournament_map_pools (tournament_id, map_id, game, map_name)
       VALUES ($1, $2, 'Counter-Strike 2', $3) ON CONFLICT DO NOTHING`,
      [cs2TournamentId, map.id, map.map_name]
    );
  }

  console.log(`  ✅ ${valMaps.rows.length} Valorant maps, ${cs2Maps.rows.length} CS2 maps added\n`);

  // ─── VERIFICATION ──────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('  VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');

  const checks = [
    { label: 'Auth users (total)', query: 'SELECT count(*) as c FROM auth.users' },
    { label: 'Profiles (total)', query: 'SELECT count(*) as c FROM public.profiles' },
    { label: 'Teams', query: 'SELECT count(*) as c FROM public.teams' },
    { label: 'Team members', query: 'SELECT count(*) as c FROM public.team_members' },
    { label: 'Team rosters', query: 'SELECT count(*) as c FROM public.team_rosters' },
    { label: 'Roster members', query: 'SELECT count(*) as c FROM public.team_roster_members' },
    { label: 'Tournaments', query: 'SELECT count(*) as c FROM public.tournaments' },
    { label: 'Tournament stages', query: 'SELECT count(*) as c FROM public.tournament_stages' },
    { label: 'Valorant participants', query: `SELECT count(*) as c FROM public.tournament_participants WHERE tournament_id = '${valTournamentId}'` },
    { label: 'CS2 participants', query: `SELECT count(*) as c FROM public.tournament_participants WHERE tournament_id = '${cs2TournamentId}'` },
    { label: 'Tournament map pools', query: 'SELECT count(*) as c FROM public.tournament_map_pools' },
  ];

  for (const check of checks) {
    const r = await db.query(check.query);
    const emoji = parseInt(r.rows[0].c) > 0 ? '✅' : '⚠️';
    console.log(`  ${emoji} ${check.label}: ${r.rows[0].c}`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Password for ALL accounts: ${PASSWORD}`);
  console.log(`  Email pattern: e2e.team{1-32}.player{1-10}@esportra.test`);
  console.log(`  Examples:`);
  console.log(`    Team 1 Captain (Val): e2e.team1.player1@esportra.test`);
  console.log(`    Team 1 CS2 Captain:   e2e.team1.player6@esportra.test`);
  console.log(`    Team 32 last player:  e2e.team32.player10@esportra.test`);
  console.log(`\n  Organizer: player2@gmail.com / Darkz123!`);
  console.log(`  Admin:     paradox1632000@gmail.com / Paradox18!@#`);
  console.log('═══════════════════════════════════════════════════════\n');

  await db.end();
  console.log('Done!');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
