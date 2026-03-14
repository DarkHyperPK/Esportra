const { Client } = require('pg');

const STAGING = 'postgresql://postgres:fzVN346E0Os7K14LidhTu0WcCv6jXdjn@localhost:54324/postgres';

async function main() {
  const c = new Client({ connectionString: STAGING });
  await c.connect();

  // Get column info for key tables
  const tables = [
    'teams', 'team_members', 'team_rosters', 'team_roster_members',
    'tournaments', 'tournament_stages', 'tournament_participants',
    'tournament_bans', 'tournament_map_pools', 'tournament_match_results',
    'tournament_announcements', 'tournament_disputes', 'tournament_staff',
    'stage_participants', 'profiles', 'team_invitations',
    'brkt_versions', 'brkt_matches', 'brkt_advancements', 'brkt_layout',
    'brkt_match_events', 'brkt_match_games',
    'match_map_vetos', 'match_map_veto_actions',
    'match_completed_events', 'match_disputes', 'match_result_reports',
    'notifications', 'user_roles'
  ];

  for (const table of tables) {
    const cols = await c.query(`
      SELECT column_name, data_type, is_nullable, column_default, 
             udt_name, character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);

    // Get FK constraints
    const fks = await c.query(`
      SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
    `, [table]);

    console.log(`\n=== ${table} ===`);
    for (const col of cols.rows) {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      const fk = fks.rows.find(f => f.column_name === col.column_name);
      const fkStr = fk ? ` → FK(${fk.foreign_table}.${fk.foreign_column})` : '';
      console.log(`  ${col.column_name}: ${col.udt_name}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${nullable}${def}${fkStr}`);
    }
  }

  await c.end();
}
main().catch(console.error);
