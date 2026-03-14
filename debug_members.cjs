const { Client } = require('pg');
const c = new Client({host:'localhost',port:54324,database:'postgres',user:'postgres',password:'fzVN346E0Os7K14LidhTu0WcCv6jXdjn'});

async function main() {
  await c.connect();

  // Find Phoenix Rising team
  const team = await c.query(`SELECT id, name, tag, max_members FROM public.teams WHERE name ILIKE '%Phoenix%' OR tag = 'PHX' LIMIT 5`);
  console.log('Phoenix teams:', team.rows);

  if (team.rows.length > 0) {
    const tid = team.rows[0].id;
    
    // Count members
    const count = await c.query(`SELECT count(*) as c FROM public.team_members WHERE team_id = $1`, [tid]);
    console.log('Total team_members rows:', count.rows[0].c);
    
    const activeCount = await c.query(`SELECT count(*) as c FROM public.team_members WHERE team_id = $1 AND is_active = TRUE`, [tid]);
    console.log('Active team_members:', activeCount.rows[0].c);
    
    // Check for duplicates
    const dupes = await c.query(`SELECT user_id, count(*) as cnt FROM public.team_members WHERE team_id = $1 GROUP BY user_id HAVING count(*) > 1 LIMIT 5`, [tid]);
    console.log('Duplicate user entries:', dupes.rows);
  }

  // Overall stats
  const stats = await c.query(`
    SELECT t.name, t.tag, count(tm.user_id) as member_count 
    FROM public.teams t 
    LEFT JOIN public.team_members tm ON tm.team_id = t.id AND tm.is_active = TRUE
    GROUP BY t.id, t.name, t.tag 
    ORDER BY member_count DESC 
    LIMIT 10
  `);
  console.log('\nTop 10 teams by member count:');
  stats.rows.forEach(r => console.log(`  ${r.name} (${r.tag}): ${r.member_count} members`));

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
