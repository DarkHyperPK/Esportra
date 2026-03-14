const { Client } = require('pg');
const c = new Client({host:'localhost',port:54324,database:'postgres',user:'postgres',password:'fzVN346E0Os7K14LidhTu0WcCv6jXdjn'});

async function main() {
  await c.connect();

  // Check if organization_staff and tournament_staff tables exist
  const tables = await c.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('organization_staff', 'tournament_staff')
    ORDER BY table_name
  `);
  console.log('Staff tables:', tables.rows);

  // Check organization_staff columns
  for (const t of tables.rows) {
    const cols = await c.query(`
      SELECT column_name, data_type, udt_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position
    `, [t.table_name]);
    console.log(`\n${t.table_name} columns:`, cols.rows);
  }

  // Try the exact staff permissions query
  const tid = 'f15a7559-0710-40cc-9302-f7400c403c7f';
  const userId = '17be288b-ca10-4e32-a8a1-79e1e27e3f2d'; // admin user
  
  console.log('\nTesting staff permissions query...');
  try {
    const r = await c.query(`
      SELECT unnest(permissions) FROM organization_staff
      WHERE organization_id = (SELECT organization_id FROM tournaments WHERE id = $1)
        AND user_id = $2 AND is_active = TRUE
      UNION
      SELECT unnest(permissions) FROM tournament_staff
      WHERE tournament_id = $1 AND user_id = $2 AND is_active = TRUE
    `, [tid, userId]);
    console.log('Staff permissions result:', r.rows);
  } catch (e) {
    console.error('QUERY ERROR:', e.message);
  }

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
