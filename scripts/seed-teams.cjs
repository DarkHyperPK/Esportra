/**
 * Seed 28 test teams into a tournament.
 * Usage: node scripts/seed-teams.cjs <tournament_id>
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) envVars[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const tournamentId = process.argv[2] || 'b6e50b26-4c21-4f5f-99ee-e25b9d8d6050';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEAM_NAMES = [
    'Shadow Wolves', 'Neon Vipers', 'Arctic Foxes', 'Thunder Hawks',
    'Crimson Knights', 'Phantom Raiders', 'Iron Titans', 'Storm Breakers',
    'Dark Phoenix', 'Cyber Samurai', 'Frost Giants', 'Blaze Squad',
    'Steel Serpents', 'Nova Stars', 'Venom Strike', 'Apex Predators',
    'Ghost Protocol', 'Omega Force', 'Riot Kings', 'Eclipse Gaming',
    'Fury United', 'Savage Esports', 'Zenith Pro', 'Vertex Gaming',
    'Astral Esports', 'Nebula Squad', 'Rogue Legends', 'Titan Esports'
];

async function seedTeams() {
    console.log(`Inserting 28 teams into tournament: ${tournamentId}`);

    // Get current user session to use as captain
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.error('Not authenticated. Please log in first or use a service role key.');
        console.log('Inserting with a placeholder user ID...');
    }

    const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

    const teams = TEAM_NAMES.map((name, i) => ({
        tournament_id: tournamentId,
        user_id: userId,
        participant_type: 'team',
        gamer_tag: name,
        team_name: name,
        team_captain_id: userId,
        team_members: JSON.stringify([
            { name: `${name} Player 1`, role: 'Duelist' },
            { name: `${name} Player 2`, role: 'Sentinel' },
            { name: `${name} Player 3`, role: 'Controller' },
            { name: `${name} Player 4`, role: 'Initiator' },
            { name: `${name} Player 5`, role: 'Flex' }
        ]),
        status: 'registered',
        registration_date: new Date().toISOString()
    }));

    const { data, error } = await supabase
        .from('tournament_participants')
        .insert(teams)
        .select('id, team_name');

    if (error) {
        console.error('Insert error:', error.message);
        // Try one-by-one if batch fails
        console.log('Trying individual inserts...');
        let success = 0;
        for (const team of teams) {
            const { error: singleErr } = await supabase
                .from('tournament_participants')
                .insert(team);
            if (singleErr) {
                console.error(`  Failed: ${team.team_name} - ${singleErr.message}`);
            } else {
                success++;
                console.log(`  ✓ ${team.team_name}`);
            }
        }
        console.log(`\nInserted ${success}/${teams.length} teams`);
    } else {
        console.log(`✓ Successfully inserted ${data?.length || 28} teams:`);
        data?.forEach(t => console.log(`  - ${t.team_name}`));
    }
}

seedTeams().catch(console.error);
