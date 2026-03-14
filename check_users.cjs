const { Client } = require('pg');
const STAGING = 'postgresql://postgres:fzVN346E0Os7K14LidhTu0WcCv6jXdjn@localhost:54324/postgres';

async function main() {
  const c = new Client({ connectionString: STAGING });
  await c.connect();

  // Check existing auth users
  const users = await c.query("SELECT id, email FROM auth.users ORDER BY created_at LIMIT 5");
  console.log('Auth users (first 5):', users.rows);

  // Check existing profiles  
  const profiles = await c.query("SELECT id, username, email, role FROM public.profiles ORDER BY created_at LIMIT 5");
  console.log('Profiles (first 5):', profiles.rows);

  // Check if there's a trigger that auto-creates profiles
  const triggers = await c.query("SELECT trigger_name, event_object_table, action_statement FROM information_schema.triggers WHERE trigger_schema = 'auth' OR event_object_table = 'users'");
  console.log('Auth triggers:', triggers.rows);

  // Check the handle_new_user function
  const funcs = await c.query("SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%new_user%' OR proname LIKE '%handle%user%'");
  console.log('User handler functions:');
  for (const f of funcs.rows) {
    console.log(`  ${f.proname}:`);
    console.log(`    ${f.prosrc.slice(0, 500)}`);
  }

  // Check organizer org
  const orgs = await c.query("SELECT id, name, owner_id FROM public.organizations");
  console.log('Organizations:', orgs.rows);

  await c.end();
}
main().catch(console.error);
