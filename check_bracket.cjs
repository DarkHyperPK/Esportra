const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: 'localhost',
    port: 54324,
    database: 'postgres',
    user: 'postgres',
    password: 'fzVN346E0Os7K14LidhTu0WcCv6jXdjn'
  });
  await c.connect();

  // 1. Check if finalize_match_locked function exists
  const r1 = await c.query(
    "SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema='public' AND routine_name LIKE '%finalize%'"
  );
  console.log('=== finalize functions ===');
  console.log(r1.rows.length ? r1.rows : 'NONE FOUND');

  // 2. Check matches for CS2 tournament — do they have team IDs?
  const r2 = await c.query(`
    SELECT m.id, m.match_number, m.round_index, m.bracket_type, m.team1_id, m.team2_id, m.status,
           t1.name as team1_name, t2.name as team2_name
    FROM brkt_matches m
    JOIN brkt_versions v ON v.id = m.version_id
    LEFT JOIN teams t1 ON t1.id = m.team1_id
    LEFT JOIN teams t2 ON t2.id = m.team2_id
    WHERE v.tournament_id = 'f15a7559-0710-40cc-9302-f7400c403c7f'
    ORDER BY m.round_index, m.match_number
    LIMIT 20
  `);
  console.log('\n=== CS2 tournament matches (first 20) ===');
  r2.rows.forEach(r => {
    console.log(`  R${r.round_index} M${r.match_number} [${r.bracket_type}] ${r.team1_name || 'NULL'} vs ${r.team2_name || 'NULL'} (${r.status})`);
  });

  // 3. Check total matches for this tournament
  const r3 = await c.query(`
    SELECT COUNT(*) as total, 
           COUNT(team1_id) as with_team1, 
           COUNT(team2_id) as with_team2
    FROM brkt_matches m
    JOIN brkt_versions v ON v.id = m.version_id
    WHERE v.tournament_id = 'f15a7559-0710-40cc-9302-f7400c403c7f'
  `);
  console.log('\n=== Match team assignment stats ===');
  console.log(r3.rows[0]);

  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
