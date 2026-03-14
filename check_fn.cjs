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

  // Get function signature for finalize_match_locked
  const r = await c.query(`
    SELECT p.proname, pg_get_function_arguments(p.oid) as args, 
           pg_get_function_result(p.oid) as result,
           prosrc
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'finalize_match_locked'
  `);
  if (r.rows.length > 0) {
    console.log('=== finalize_match_locked ===');
    console.log('Args:', r.rows[0].args);
    console.log('Returns:', r.rows[0].result);
    console.log('Source:\n', r.rows[0].prosrc);
  } else {
    console.log('Function not found');
  }

  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
