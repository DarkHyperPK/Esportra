/**
 * Bracket Advancement Simulation & Test Suite
 * ============================================
 * Tests all 4 bracket formats end-to-end via the staging API:
 *   1. Single Elimination (8 teams)
 *   2. Double Elimination (8 teams)
 *   3. Swiss (8 teams, 3 rounds)
 *   4. Round Robin (6 teams)
 *
 * Also tests DB-level functions directly:
 *   - proc_internal_advance_match
 *   - undo_match_advancement (inline SQL version)
 *
 * Usage:
 *   node scripts/bracket-simulation.cjs
 *   node scripts/bracket-simulation.cjs --format=single_elimination
 *   node scripts/bracket-simulation.cjs --db-only
 *   node scripts/bracket-simulation.cjs --api-only
 */

const https = require('https');
const { Client } = require('pg');

// ── Config ──────────────────────────────────────────────────────────────
const API_BASE = 'https://api-staging.esportra.com';
const SUPABASE_URL = 'https://staging.esportra.com';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM1Njg5NjAwLCJleHAiOjQ4OTEzNjMyMDB9.xtzWCr6-LxvVs5gxBsy08U5fQ64Jmj8cEd5QxM4KHIg';
const ORGANIZER_EMAIL = 'player2@gmail.com';
const ORGANIZER_PASSWORD = 'Darkz123!';
const DB_CONFIG = { host: 'localhost', port: 54324, database: 'postgres', user: 'postgres', password: 'fzVN346E0Os7K14LidhTu0WcCv6jXdjn' };

// ── Helpers ─────────────────────────────────────────────────────────────
let passCount = 0, failCount = 0, skipCount = 0;

function pass(msg) { passCount++; console.log(`  \u2705 ${msg}`); }
function fail(msg) { failCount++; console.error(`  \u274c ${msg}`); }
function skip(msg) { skipCount++; console.log(`  \u23ed\ufe0f  ${msg}`); }
function heading(msg) { console.log(`\n${'='.repeat(60)}\n  ${msg}\n${'='.repeat(60)}`); }
function section(msg) { console.log(`\n-- ${msg} ${'--'.repeat(Math.max(1, 25 - Math.floor(msg.length / 2)))}`); }

function httpRequest(url, opts = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: opts.method || 'GET',
            headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, json: () => { try { return JSON.parse(data); } catch { return null; } } }));
        });
        req.on('error', reject);
        if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
        req.end();
    });
}

async function getToken() {
    const res = await httpRequest(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: ANON_KEY },
        body: { email: ORGANIZER_EMAIL, password: ORGANIZER_PASSWORD },
    });
    const data = res.json();
    if (!data?.access_token) throw new Error('Auth failed: ' + res.body.substring(0, 200));
    return data.access_token;
}

async function api(method, path, body, token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await httpRequest(`${API_BASE}${path}`, { method, headers, body });
    return { status: res.status, data: res.json(), raw: res.body };
}

async function createTournament(db, name, slug, format) {
    const orgId = (await db.query("SELECT id FROM organizations LIMIT 1")).rows[0]?.id;
    const userId = (await db.query("SELECT id FROM profiles WHERE email=$1", [ORGANIZER_EMAIL])).rows[0]?.id;
    const tournamentId = (await db.query(
        `INSERT INTO tournaments (id, name, slug, game, organization_id, organizer_id, status, format, team_size, max_teams, start_date, end_date, registration_deadline)
         VALUES (gen_random_uuid(), $1, $2 || '-' || substr(gen_random_uuid()::text, 1, 8),
                 'Valorant', $3, $4, 'open', $5, 5, 32, NOW(), NOW() + interval '7 days', NOW() + interval '1 day')
         RETURNING id`, [name, slug, orgId, userId, format]
    )).rows[0].id;
    return { tournamentId, userId, orgId };
}

async function createStage(db, tournamentId, format) {
    return (await db.query(
        `INSERT INTO tournament_stages (id, tournament_id, name, format, stage_order, status)
         VALUES (gen_random_uuid(), $1, 'Main Stage', $2, 1, 'active') RETURNING id`, [tournamentId, format]
    )).rows[0].id;
}

async function createTeams(db, userId, prefix, count) {
    const teams = [];
    for (let i = 1; i <= count; i++) {
        const team = (await db.query(
            `INSERT INTO teams (id, name, tag, game, owner_id) VALUES (gen_random_uuid(), $1, $2, 'Valorant', $3) RETURNING id, name`,
            [`SIM-${prefix}-Team${i}`, `${prefix}${i}`, userId]
        )).rows[0];
        teams.push({ Id: team.id, Name: team.name });
    }
    return teams;
}

async function cleanup(db, tournamentId, versionId, teamIds) {
    section('Cleanup');
    try {
        if (versionId) {
            await db.query("DELETE FROM brkt_match_events WHERE match_id IN (SELECT id FROM brkt_matches WHERE version_id=$1)", [versionId]);
            await db.query("DELETE FROM brkt_match_games WHERE match_id IN (SELECT id FROM brkt_matches WHERE version_id=$1)", [versionId]);
            await db.query("DELETE FROM tournament_match_results WHERE match_id IN (SELECT id FROM brkt_matches WHERE version_id=$1)", [versionId]);
            await db.query("DELETE FROM brkt_layout WHERE version_id=$1", [versionId]);
            await db.query("DELETE FROM brkt_advancements WHERE version_id=$1", [versionId]);
            await db.query("DELETE FROM brkt_matches WHERE version_id=$1", [versionId]);
            await db.query("DELETE FROM brkt_versions WHERE id=$1", [versionId]);
        }
        if (tournamentId) {
            await db.query("DELETE FROM tournament_stages WHERE tournament_id=$1", [tournamentId]);
            await db.query("DELETE FROM tournaments WHERE id=$1", [tournamentId]);
        }
        if (teamIds) {
            for (const id of teamIds) await db.query("DELETE FROM teams WHERE id=$1", [id]);
        }
        pass('Test data cleaned up');
    } catch (e) {
        fail(`Cleanup error: ${e.message}`);
    }
}

// ── Test: Single Elimination ────────────────────────────────────────────
async function testSingleElimination(token, db) {
    heading('SINGLE ELIMINATION (8 teams)');

    const { tournamentId, userId } = await createTournament(db, 'SIM: Single Elim', 'sim-se', 'single_elimination');
    const stageId = await createStage(db, tournamentId, 'single_elimination');
    const teams = await createTeams(db, userId, 'SE', 8);

    section('Generate bracket');
    const gen = await api('POST', '/api/brackets/generate', {
        TournamentId: tournamentId, StageId: stageId, Format: 'single_elimination',
        Teams: teams, BestOf: 1, BracketSize: 8,
    }, token);

    if (gen.status !== 200) { fail(`Generation failed: ${gen.status} ${gen.raw.substring(0, 200)}`); return; }
    pass(`Generated: ${gen.data.nodeCount} matches, ${gen.data.edgeCount} edges`);
    const versionId = gen.data.versionId;

    // Verify structure
    const matchCount = +(await db.query("SELECT COUNT(*) as c FROM brkt_matches WHERE version_id=$1", [versionId])).rows[0].c;
    matchCount === 7 ? pass(`Match count: ${matchCount} (expected 7)`) : fail(`Match count: ${matchCount} (expected 7)`);

    const advCount = +(await db.query("SELECT COUNT(*) as c FROM brkt_advancements WHERE version_id=$1", [versionId])).rows[0].c;
    advCount === 6 ? pass(`Advancement edges: ${advCount} (expected 6)`) : fail(`Advancement edges: ${advCount} (expected 6)`);

    // Play all rounds
    for (let round = 0; round < 3; round++) {
        const roundNames = ['Quarterfinals', 'Semifinals', 'Final'];
        section(`Round ${round + 1} (${roundNames[round]})`);

        const matches = (await db.query(
            "SELECT id, team1_id, team2_id FROM brkt_matches WHERE version_id=$1 AND round_index=$2 ORDER BY match_number",
            [versionId, round]
        )).rows;

        for (const match of matches) {
            if (!match.team1_id || !match.team2_id) { fail(`R${round} missing teams`); continue; }
            const res = await api('POST', `/api/matches/${match.id}/save-score`, {
                Team1Score: 13, Team2Score: 7, Team1Id: match.team1_id, Team2Id: match.team2_id,
            }, token);
            res.status === 200 ? pass(`Match ${match.id.substring(0, 8)}: scored`) : fail(`save-score: ${res.status} ${res.raw.substring(0, 200)}`);
        }

        // Verify next round has teams (except after final)
        if (round < 2) {
            const nextMatches = (await db.query(
                "SELECT id, team1_id, team2_id FROM brkt_matches WHERE version_id=$1 AND round_index=$2",
                [versionId, round + 1]
            )).rows;
            const allSet = nextMatches.every(m => m.team1_id && m.team2_id);
            allSet ? pass(`${roundNames[round + 1]} teams populated`) : fail(`${roundNames[round + 1]} teams NOT populated`);
        }
    }

    // All completed?
    const pending = +(await db.query("SELECT COUNT(*) as c FROM brkt_matches WHERE version_id=$1 AND status!='completed'", [versionId])).rows[0].c;
    pending === 0 ? pass('All 7 matches completed') : fail(`${pending} still pending`);

    // Test RESET
    section('Test match reset + undo advancement');
    const finalMatch = (await db.query("SELECT id FROM brkt_matches WHERE version_id=$1 AND round_index=2", [versionId])).rows[0];
    const resetRes = await api('POST', `/api/matches/${finalMatch.id}/reset`, null, token);
    resetRes.status === 200 ? pass('Final reset OK') : fail(`Reset: ${resetRes.status} ${resetRes.raw.substring(0, 200)}`);

    const afterReset = (await db.query("SELECT winner_id, status FROM brkt_matches WHERE id=$1", [finalMatch.id])).rows[0];
    (afterReset.status === 'pending' && !afterReset.winner_id) ? pass('Match state reset correctly') : fail(`State: ${JSON.stringify(afterReset)}`);

    await cleanup(db, tournamentId, versionId, teams.map(t => t.Id));
}

// ── Test: Double Elimination ────────────────────────────────────────────
async function testDoubleElimination(token, db) {
    heading('DOUBLE ELIMINATION (8 teams)');

    const { tournamentId, userId } = await createTournament(db, 'SIM: Double Elim', 'sim-de', 'double_elimination');
    const stageId = await createStage(db, tournamentId, 'double_elimination');
    const teams = await createTeams(db, userId, 'DE', 8);

    section('Generate bracket');
    const gen = await api('POST', '/api/brackets/generate', {
        TournamentId: tournamentId, StageId: stageId, Format: 'double_elimination',
        Teams: teams, BestOf: 1, BracketSize: 8,
    }, token);

    if (gen.status !== 200) { fail(`Generation failed: ${gen.status} ${gen.raw.substring(0, 200)}`); return; }
    pass(`Generated: ${gen.data.nodeCount} matches, ${gen.data.edgeCount} edges`);
    const versionId = gen.data.versionId;

    // Verify structure
    const stats = (await db.query(
        "SELECT bracket_type, COUNT(*) as c FROM brkt_matches WHERE version_id=$1 GROUP BY bracket_type ORDER BY bracket_type",
        [versionId]
    )).rows;
    console.log(`  Structure: ${stats.map(s => `${s.bracket_type}=${s.c}`).join(', ')}`);
    stats.length >= 2 ? pass('Has winners + losers brackets') : fail('Missing bracket types');

    // Auto-play all matches iteratively
    section('Auto-playing all matches');
    let totalPlayed = 0;
    let iterations = 25;
    while (iterations-- > 0) {
        const pending = (await db.query(`
            SELECT id, team1_id, team2_id, bracket_type, round_index, match_number
            FROM brkt_matches WHERE version_id=$1 AND status='pending'
            AND team1_id IS NOT NULL AND team2_id IS NOT NULL
            ORDER BY
                CASE bracket_type WHEN 'winners' THEN 0 WHEN 'losers' THEN 1 ELSE 2 END,
                round_index, match_number
        `, [versionId])).rows;

        if (pending.length === 0) break;

        for (const match of pending) {
            const res = await api('POST', `/api/matches/${match.id}/save-score`, {
                Team1Score: 13, Team2Score: 8, Team1Id: match.team1_id, Team2Id: match.team2_id,
            }, token);
            if (res.status === 200) {
                totalPlayed++;
                console.log(`  > ${match.bracket_type} R${match.round_index} M${match.match_number}: Team1 wins`);
            } else {
                fail(`${match.bracket_type} R${match.round_index} M${match.match_number}: ${res.status}`);
            }
        }
    }

    const remaining = +(await db.query("SELECT COUNT(*) as c FROM brkt_matches WHERE version_id=$1 AND status!='completed'", [versionId])).rows[0].c;
    console.log(`  Total played: ${totalPlayed}, remaining: ${remaining}`);
    remaining === 0 ? pass(`All matches completed (${totalPlayed} total)`) : fail(`${remaining} matches still pending`);

    // Check losers got teams at some point
    const lbCompleted = +(await db.query(
        "SELECT COUNT(*) as c FROM brkt_matches WHERE version_id=$1 AND bracket_type='losers' AND status='completed'", [versionId]
    )).rows[0].c;
    lbCompleted > 0 ? pass(`Losers bracket: ${lbCompleted} matches completed`) : fail('No losers bracket matches completed');

    await cleanup(db, tournamentId, versionId, teams.map(t => t.Id));
}

// ── Test: Swiss ─────────────────────────────────────────────────────────
async function testSwiss(token, db) {
    heading('SWISS (8 teams, 3 rounds)');

    const { tournamentId, userId } = await createTournament(db, 'SIM: Swiss', 'sim-sw', 'swiss');
    const stageId = await createStage(db, tournamentId, 'swiss');
    const teams = await createTeams(db, userId, 'SW', 8);

    section('Generate Round 1');
    const gen = await api('POST', '/api/brackets/generate', {
        TournamentId: tournamentId, StageId: stageId, Format: 'swiss',
        Teams: teams, BestOf: 1, SwissRounds: 3,
    }, token);

    if (gen.status !== 200) { fail(`Generation failed: ${gen.status} ${gen.raw.substring(0, 200)}`); return; }
    pass(`Round 1 generated: ${gen.data.nodeCount} matches`);
    const versionId = gen.data.versionId;

    // Swiss R1: 4 matches for 8 teams
    const r1Matches = (await db.query(
        "SELECT id, team1_id, team2_id, match_number FROM brkt_matches WHERE version_id=$1 AND round_index=0 ORDER BY match_number",
        [versionId]
    )).rows;
    r1Matches.length === 4 ? pass(`Round 1: ${r1Matches.length} matches`) : fail(`Round 1: ${r1Matches.length} (expected 4)`);

    // Play R1 — alternate winners
    section('Playing Round 1');
    for (let i = 0; i < r1Matches.length; i++) {
        const m = r1Matches[i];
        const t1Wins = i % 2 === 0;
        const res = await api('POST', `/api/matches/${m.id}/save-score`, {
            Team1Score: t1Wins ? 13 : 7, Team2Score: t1Wins ? 7 : 13,
            Team1Id: m.team1_id, Team2Id: m.team2_id,
        }, token);
        res.status === 200 ? pass(`R1 M${m.match_number}: ${t1Wins ? 'Team1' : 'Team2'} wins`) : fail(`${res.status}`);
    }

    // Generate Swiss R2
    section('Generate Round 2 (Swiss pairing)');
    const r2Gen = await api('POST', '/api/swiss/next-round', {
        StageId: stageId, VersionId: versionId, CurrentRound: 0,
    }, token);

    if (r2Gen.status === 200) {
        pass('Round 2 generated');
        const r2Matches = (await db.query(
            "SELECT id, team1_id, team2_id FROM brkt_matches WHERE version_id=$1 AND round_index=1 ORDER BY match_number",
            [versionId]
        )).rows;

        // Check no rematches
        const r1Pairs = new Set(r1Matches.map(m => [m.team1_id, m.team2_id].sort().join('-')));
        const hasRematch = r2Matches.some(m => r1Pairs.has([m.team1_id, m.team2_id].sort().join('-')));
        !hasRematch ? pass('No rematches in Round 2') : fail('Rematch detected');

        section('Playing Round 2');
        for (const m of r2Matches) {
            if (!m.team1_id || !m.team2_id) { skip('Missing team'); continue; }
            await api('POST', `/api/matches/${m.id}/save-score`, {
                Team1Score: 13, Team2Score: 9, Team1Id: m.team1_id, Team2Id: m.team2_id,
            }, token);
        }
        pass('Round 2 played');
    } else {
        fail(`Swiss R2: ${r2Gen.status} ${r2Gen.raw.substring(0, 200)}`);
    }

    await cleanup(db, tournamentId, versionId, teams.map(t => t.Id));
}

// ── Test: Round Robin ───────────────────────────────────────────────────
async function testRoundRobin(token, db) {
    heading('ROUND ROBIN (6 teams)');

    const { tournamentId, userId } = await createTournament(db, 'SIM: Round Robin', 'sim-rr', 'round_robin');
    const stageId = await createStage(db, tournamentId, 'round_robin');
    const teams = await createTeams(db, userId, 'RR', 6);

    section('Generate bracket');
    const gen = await api('POST', '/api/brackets/generate', {
        TournamentId: tournamentId, StageId: stageId, Format: 'round_robin',
        Teams: teams, BestOf: 1,
    }, token);

    if (gen.status !== 200) { fail(`Generation failed: ${gen.status} ${gen.raw.substring(0, 200)}`); return; }
    pass(`Generated: ${gen.data.nodeCount} matches`);
    const versionId = gen.data.versionId;

    // 6 teams RR = C(6,2) = 15 matches
    const matchCount = +(await db.query("SELECT COUNT(*) as c FROM brkt_matches WHERE version_id=$1", [versionId])).rows[0].c;
    matchCount === 15 ? pass(`Match count: ${matchCount} (expected 15)`) : fail(`Match count: ${matchCount} (expected 15)`);

    // Each team plays 5 times
    const teamGames = (await db.query(`
        SELECT t.id, COUNT(*) as games FROM (
            SELECT team1_id as id FROM brkt_matches WHERE version_id=$1
            UNION ALL SELECT team2_id FROM brkt_matches WHERE version_id=$1
        ) t GROUP BY t.id
    `, [versionId])).rows;
    const allPlay5 = teamGames.every(t => +t.games === 5);
    allPlay5 ? pass('Each team plays exactly 5 games') : fail(`Uneven: ${teamGames.map(t => t.games).join(',')}`);

    // Play all
    section('Playing all matches');
    const allMatches = (await db.query(
        "SELECT id, team1_id, team2_id FROM brkt_matches WHERE version_id=$1 ORDER BY round_index, match_number",
        [versionId]
    )).rows;

    let played = 0;
    for (const m of allMatches) {
        if (!m.team1_id || !m.team2_id) { skip('BYE'); continue; }
        const res = await api('POST', `/api/matches/${m.id}/save-score`, {
            Team1Score: 13, Team2Score: Math.floor(Math.random() * 12),
            Team1Id: m.team1_id, Team2Id: m.team2_id,
        }, token);
        if (res.status === 200) played++;
        else fail(`save-score: ${res.status}`);
    }
    pass(`Played ${played}/${allMatches.length}`);

    const remaining = +(await db.query("SELECT COUNT(*) as c FROM brkt_matches WHERE version_id=$1 AND status!='completed'", [versionId])).rows[0].c;
    remaining === 0 ? pass('All matches completed') : fail(`${remaining} pending`);

    await cleanup(db, tournamentId, versionId, teams.map(t => t.Id));
}

// ── DB Unit Tests ───────────────────────────────────────────────────────
async function testDbFunctions(db) {
    heading('DATABASE FUNCTION TESTS');

    const orgId = (await db.query("SELECT id FROM organizations LIMIT 1")).rows[0]?.id;
    const userId = (await db.query("SELECT id FROM profiles LIMIT 1")).rows[0]?.id;

    const dbTournamentId = (await db.query(
        `INSERT INTO tournaments (id, name, slug, game, organization_id, organizer_id, status, format, team_size, max_teams, start_date, end_date, registration_deadline)
         VALUES (gen_random_uuid(), 'DB-Unit-Test', 'db-unit-' || substr(gen_random_uuid()::text, 1, 8),
                 'Valorant', $1, $2, 'open', 'single_elimination', 5, 8, NOW(), NOW() + interval '7 days', NOW() + interval '1 day') RETURNING id`, [orgId, userId]
    )).rows[0].id;

    const versionId = (await db.query(
        "INSERT INTO brkt_versions (id, tournament_id, version_number, stage_id, status) VALUES (gen_random_uuid(), $1, 1, NULL, 'active') RETURNING id",
        [dbTournamentId]
    )).rows[0].id;

    const teamAId = (await db.query("INSERT INTO teams (id, name, tag, game, owner_id) VALUES (gen_random_uuid(), 'DB-A', 'DBA', 'Valorant', $1) RETURNING id", [userId])).rows[0].id;
    const teamBId = (await db.query("INSERT INTO teams (id, name, tag, game, owner_id) VALUES (gen_random_uuid(), 'DB-B', 'DBB', 'Valorant', $1) RETURNING id", [userId])).rows[0].id;
    const teamCId = (await db.query("INSERT INTO teams (id, name, tag, game, owner_id) VALUES (gen_random_uuid(), 'DB-C', 'DBC', 'Valorant', $1) RETURNING id", [userId])).rows[0].id;
    const teamDId = (await db.query("INSERT INTO teams (id, name, tag, game, owner_id) VALUES (gen_random_uuid(), 'DB-D', 'DBD', 'Valorant', $1) RETURNING id", [userId])).rows[0].id;

    // M1(A vs B) --winner--> M3 slot 1
    // M2(C vs D) --winner--> M3 slot 2
    const m1Id = (await db.query(
        "INSERT INTO brkt_matches (id, version_id, round_index, match_number, bracket_type, team1_id, team2_id, status) VALUES (gen_random_uuid(), $1, 0, 1, 'winners', $2, $3, 'pending') RETURNING id",
        [versionId, teamAId, teamBId]
    )).rows[0].id;
    const m2Id = (await db.query(
        "INSERT INTO brkt_matches (id, version_id, round_index, match_number, bracket_type, team1_id, team2_id, status) VALUES (gen_random_uuid(), $1, 0, 2, 'winners', $2, $3, 'pending') RETURNING id",
        [versionId, teamCId, teamDId]
    )).rows[0].id;
    const m3Id = (await db.query(
        "INSERT INTO brkt_matches (id, version_id, round_index, match_number, bracket_type, status) VALUES (gen_random_uuid(), $1, 1, 1, 'winners', 'pending') RETURNING id",
        [versionId]
    )).rows[0].id;

    await db.query("INSERT INTO brkt_advancements (version_id, source_match_id, target_match_id, target_slot, type) VALUES ($1, $2, $3, 1, 'winner')", [versionId, m1Id, m3Id]);
    await db.query("INSERT INTO brkt_advancements (version_id, source_match_id, target_match_id, target_slot, type) VALUES ($1, $2, $3, 2, 'winner')", [versionId, m2Id, m3Id]);

    section('Test proc_internal_advance_match');

    // M1: TeamA beats TeamB
    await db.query("UPDATE brkt_matches SET winner_id=$1, loser_id=$2, status='completed', team1_score=13, team2_score=7 WHERE id=$3", [teamAId, teamBId, m1Id]);
    await db.query("SELECT proc_internal_advance_match($1, $2, $3)", [m1Id, teamAId, teamBId]);

    let m3 = (await db.query("SELECT team1_id, team2_id FROM brkt_matches WHERE id=$1", [m3Id])).rows[0];
    m3.team1_id === teamAId ? pass('TeamA advanced to M3 slot 1') : fail(`M3.team1=${m3.team1_id} (expected ${teamAId})`);
    !m3.team2_id ? pass('M3 slot 2 still empty') : fail(`M3.team2 should be null`);

    // M2: TeamC beats TeamD
    await db.query("UPDATE brkt_matches SET winner_id=$1, loser_id=$2, status='completed', team1_score=13, team2_score=5 WHERE id=$3", [teamCId, teamDId, m2Id]);
    await db.query("SELECT proc_internal_advance_match($1, $2, $3)", [m2Id, teamCId, teamDId]);

    m3 = (await db.query("SELECT team1_id, team2_id FROM brkt_matches WHERE id=$1", [m3Id])).rows[0];
    m3.team2_id === teamCId ? pass('TeamC advanced to M3 slot 2') : fail(`M3.team2=${m3.team2_id} (expected ${teamCId})`);

    section('Test undo advancement (inline SQL)');

    // Undo M1 advancement
    await db.query(`
        UPDATE brkt_matches target SET
            team1_id = CASE WHEN EXISTS (SELECT 1 FROM brkt_advancements a WHERE a.source_match_id=$1 AND a.target_match_id=target.id AND a.target_slot=1) THEN NULL ELSE target.team1_id END,
            team2_id = CASE WHEN EXISTS (SELECT 1 FROM brkt_advancements a WHERE a.source_match_id=$1 AND a.target_match_id=target.id AND a.target_slot=2) THEN NULL ELSE target.team2_id END,
            winner_id = NULL, loser_id = NULL, status = 'pending'
        WHERE target.id IN (SELECT target_match_id FROM brkt_advancements WHERE source_match_id=$1)
    `, [m1Id]);

    m3 = (await db.query("SELECT team1_id, team2_id, status FROM brkt_matches WHERE id=$1", [m3Id])).rows[0];
    !m3.team1_id ? pass('Undo cleared slot 1 (TeamA removed)') : fail(`Slot 1 still: ${m3.team1_id}`);
    m3.team2_id === teamCId ? pass('Undo preserved slot 2 (TeamC stays)') : fail(`Slot 2 changed: ${m3.team2_id}`);
    m3.status === 'pending' ? pass('M3 reset to pending') : fail(`M3 status: ${m3.status}`);

    // Cleanup
    await db.query("DELETE FROM brkt_advancements WHERE version_id=$1", [versionId]);
    await db.query("DELETE FROM brkt_match_events WHERE match_id IN ($1,$2,$3)", [m1Id, m2Id, m3Id]);
    await db.query("DELETE FROM brkt_matches WHERE version_id=$1", [versionId]);
    await db.query("DELETE FROM brkt_versions WHERE id=$1", [versionId]);
    await db.query("DELETE FROM tournaments WHERE id=$1", [dbTournamentId]);
    for (const id of [teamAId, teamBId, teamCId, teamDId]) await db.query("DELETE FROM teams WHERE id=$1", [id]);
    pass('DB test data cleaned up');
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    const formatFilter = args.find(a => a.startsWith('--format='))?.split('=')[1];
    const dbOnly = args.includes('--db-only');
    const apiOnly = args.includes('--api-only');

    console.log('+==========================================================+');
    console.log('|       BRACKET ADVANCEMENT SIMULATION TEST SUITE          |');
    console.log('+==========================================================+');

    const db = new Client(DB_CONFIG);
    await db.connect();
    console.log('\nConnected to staging database');

    let token;
    if (!dbOnly) {
        token = await getToken();
        console.log('Authenticated as organizer');
    }

    try {
        if (!apiOnly) await testDbFunctions(db);

        if (!dbOnly) {
            const tests = {
                single_elimination: testSingleElimination,
                double_elimination: testDoubleElimination,
                swiss: testSwiss,
                round_robin: testRoundRobin,
            };

            for (const [name, testFn] of Object.entries(tests)) {
                if (!formatFilter || name === formatFilter) {
                    await testFn(token, db);
                }
            }
        }
    } catch (e) {
        console.error('\nFATAL:', e.message, e.stack?.split('\n').slice(0, 3).join('\n'));
    }

    await db.end();

    console.log('\n+==========================================================+');
    console.log(`|  RESULTS: ${passCount} passed | ${failCount} failed | ${skipCount} skipped`);
    console.log('+==========================================================+');

    process.exit(failCount > 0 ? 1 : 0);
}

main();
