// Sample data served to the REAL Esportra app (local dev server) so its
// Find Teammates screens render. Names/handles are fictional sample data;
// agents, ranks, roles and player-card art are real Valorant catalog assets.
const A = {
  jett: 'add6443a-41bd-e414-f6ad-e58d267f4e95', raze: 'f94c3b30-42be-e959-889c-5aa313dba261',
  reyna: 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc', neon: 'bb2a4828-46eb-8cd1-e765-15848195d751',
  sova: '320b2a48-4d9b-a075-30f1-1f93a9b638fa', fade: 'dade69b4-4f5a-8528-247b-219e5a1facd6',
  skye: '6f2a04ca-43e0-be17-7f36-b3908627744d', kayo: '601dbbe7-43ce-be57-2a40-4abd24953621',
  omen: '8e253930-4c05-31dd-1b6c-968525494517', viper: '707eab51-4836-f488-046a-cda6bf494859',
  clove: '1dbf2edd-4729-0984-3115-daa5eed44993', astra: '41fb69c1-4189-7b37-f117-bcaf1e96f1bf',
  killjoy: '1e58de9c-4950-5125-93e9-a0aee9f98746', cypher: '117ed9e3-49f3-6512-3ccf-0cada7e3823b',
  sage: '569fdd95-4d10-43ab-ca70-79becc718b46', chamber: '22697a3d-45bf-8dd7-4fec-84a9e28c69d7',
  gekko: 'e370fa57-4757-3604-3648-499e1f642d3f', breach: '5f8d3a7f-467b-97f3-062c-13acf203c006',
};
const NAMES = { jett:'Jett', raze:'Raze', reyna:'Reyna', neon:'Neon', sova:'Sova', fade:'Fade', skye:'Skye', kayo:'KAY/O', omen:'Omen', viper:'Viper', clove:'Clove', astra:'Astra', killjoy:'Killjoy', cypher:'Cypher', sage:'Sage', chamber:'Chamber', gekko:'Gekko', breach:'Breach' };
const agent = (k, g, w, kd) => ({ agentId: A[k], displayName: NAMES[k], iconUrl: `https://media.valorant-api.com/agents/${A[k]}/displayicon.png`, gamesPlayed: g, wins: w, kdRatio: kd });

const TIERS = ['Iron','Bronze','Silver','Gold','Platinum','Diamond','Ascendant','Immortal'];
const rankTiers = [];
TIERS.forEach((t, ti) => [1,2,3].forEach(d => rankTiers.push({ id: `rk-${ti*3+d-1}`, gameSlug:'valorant', tierKey:`${t.toLowerCase()}_${d}`, displayName:`${t} ${d}`, sortOrder: ti*3+d-1, divisionCount:3, iconUrl:null })));
rankTiers.push({ id:'rk-24', gameSlug:'valorant', tierKey:'radiant', displayName:'Radiant', sortOrder:24, divisionCount:1, iconUrl:null });
const rankName = so => rankTiers[so].displayName;

const gameRoles = ['duelist','initiator','controller','sentinel'].map((k,i) => ({ id:`role-${k}`, gameSlug:'valorant', roleKey:k, displayName:k[0].toUpperCase()+k.slice(1), sortOrder:i, iconUrl:null }));
const regions = [
  { id:'rg-ap', gameSlug:'valorant', regionKey:'ap', displayName:'Asia Pacific', serverIds:[] },
  { id:'rg-me', gameSlug:'valorant', regionKey:'me', displayName:'Middle East', serverIds:[] },
  { id:'rg-eu', gameSlug:'valorant', regionKey:'eu', displayName:'Europe', serverIds:[] },
  { id:'rg-na', gameSlug:'valorant', regionKey:'na', displayName:'North America', serverIds:[] },
];
const regionName = k => regions.find(r => r.regionKey === k).displayName;

const now = Date.now();
const iso = h => new Date(now - h * 3600e3).toISOString();
const base = {
  status:'published', modeKey:null, preferredServers:[], mode:null, minRankSlug:null, maxRankSlug:null, regionSlug:null,
  servers:[], roles:[], publishedAt:null, closedAt:null, avatarUrl:null, avatarSeed:null, avatarStyle:null,
  profileBannerUrl:null, expiresAt:new Date(now + 3*86400e3).toISOString(), isSaved:false, viewerInterestStatus:null,
  statsSyncStatus:'complete', riotSyncedAt: iso(2), teamId:null, teamName:null, teamLogoUrl:null, teamTag:null,
  teamMemberCount:null, teamVerifiedCount:null, minRankSortOrder:null, maxRankSortOrder:null, minRankDisplayName:null,
  maxRankDisplayName:null, minRankIconUrl:null, maxRankIconUrl:null,
};
const card = id => `https://media.valorant-api.com/playercards/${id}/smallart.png`;

function player(i, o) {
  const tier = o.rank + 3;
  return { ...base, id:`p-${i}`, userId:`u-${i}`, gameSlug:'valorant', intent:'looking_for_team', createdAt: iso(i+1), updatedAt: iso(i+1),
    username:o.name, profileAvatarUrl: card(o.card), playerCardId:o.card, competitiveTier:tier, competitiveTierName: rankName(o.rank),
    winCount:o.w, lossCount:o.l, winRate: Math.round(o.w/(o.w+o.l)*100), kdRatio:o.kd, hsPct:o.hs, matchesAnalyzed:o.w+o.l,
    riotGameName:o.name, riotTagLine:o.tag, regionKey:o.region, regionDisplayName: regionName(o.region),
    preferredRoles:o.roles, preferredAgents:o.agents.map(a => A[a[0]]), popularAgents:o.agents.map(a => agent(...a)),
    languages:o.langs, description:o.desc, ...(o.extra||{}) };
}
const players = [
  player(1, { name:'Zephyr', tag:'PK1', rank:19, w:58, l:34, kd:1.34, hs:31, region:'ap', roles:['duelist'], card:'7a7d21c3-4886-f5c8-606e-858ff452e2d8', langs:['en','ur'],
    agents:[['jett',41,27,1.41],['raze',28,16,1.22],['neon',12,7,1.18]], desc:'Entry duelist, 4 years comp. Looking for a team that scrims 4 nights a week and plays every Esportra cup.' }),
  player(2, { name:'Mirage', tag:'777', rank:16, w:44, l:31, kd:1.12, hs:24, region:'ap', roles:['controller'], card:'52995983-424c-9517-2fe8-3795e092edb8', langs:['en','ur'],
    agents:[['omen',38,23,1.08],['clove',21,13,1.15],['viper',14,8,1.02]], desc:'Smokes on time, comms calm. IGL experience in two LAN qualifiers. Evenings PKT.' }),
  player(3, { name:'kaiju', tag:'RAWR', rank:21, w:71, l:40, kd:1.27, hs:28, region:'me', roles:['initiator','duelist'], card:'743d51ab-4562-e36c-59bb-6cb68e1ac43e', langs:['en','ar'],
    agents:[['sova',47,30,1.19],['fade',33,20,1.31],['skye',16,10,1.05]], desc:'Flex initiator. Recon lineups on every map in the pool. Want a serious roster for the next split.' }),
  player(4, { name:'Hollow', tag:'0001', rank:13, w:39, l:30, kd:1.05, hs:22, region:'ap', roles:['sentinel'], card:'20193915-488b-e8dc-edb8-7cbfe7a99b3c', langs:['en'],
    agents:[['killjoy',35,21,1.02],['cypher',20,12,1.09],['sage',9,5,0.94]], desc:'Anchor player. I hold sites and I review VODs. Looking for a chill but competitive five-stack.' }),
  player(5, { name:'NOVA', tag:'LHR', rank:18, w:52, l:38, kd:1.21, hs:27, region:'ap', roles:['duelist','initiator'], card:'d14c070e-4f7a-8ab1-350e-199af481d32a', langs:['en','ur'],
    agents:[['reyna',44,27,1.33],['kayo',22,13,1.11],['jett',15,8,1.15]], desc:'Aggressive second entry. Free most nights after 9. Lahore-based, happy to LAN.' }),
  player(6, { name:'saint', tag:'GG', rank:15, w:41, l:33, kd:0.98, hs:20, region:'eu', roles:['controller','sentinel'], card:'08bfe02a-4400-b046-ea1f-0e99f18269d0', langs:['en','tr'],
    agents:[['astra',29,18,0.97],['viper',24,14,1.01],['chamber',10,6,1.12]], desc:'Utility-first player. Patient, good comms, plays for the team. Open to trials.' }),
];

function team(i, o) {
  return { ...base, id:`t-${i}`, userId:`cap-${i}`, teamId:`team-${i}`, gameSlug:'valorant', intent:'looking_for_player', createdAt: iso(i+2), updatedAt: iso(i+2),
    username:o.captain, teamName:o.name, teamTag:o.tag, teamLogoUrl:null, teamCaptainPlayerCardId:o.card, teamMemberCount:o.roster.length, teamVerifiedCount:o.roster.length,
    minRankSortOrder:o.min, maxRankSortOrder:o.max, minRankDisplayName:rankName(o.min), maxRankDisplayName:rankName(o.max),
    regionKey:o.region, regionDisplayName:regionName(o.region), preferredRoles:o.roles, preferredAgents:[], popularAgents:null,
    competitiveTier:null, competitiveTierName:null, winCount:null, lossCount:null, winRate:null, kdRatio:null, matchesAnalyzed:null,
    riotGameName:null, riotTagLine:null, languages:o.langs, description:o.desc, playerCardId:null, profileAvatarUrl:null };
}
const teams = [
  team(1, { name:'Karachi Kings Esports', tag:'KKE', captain:'Rafay', min:15, max:21, region:'ap', roles:['duelist'], card:'5aaa58d8-4567-dc02-dc74-fbaa957fa7cd', langs:['en','ur'],
    roster:['Rafay','Inzi','Moaz','sh4dow'], desc:'Need a fifth: entry duelist for the winter split. Scrims Mon–Thu 9–11 PM PKT.' }),
  team(2, { name:'Nightfall Five', tag:'NF5', captain:'Areeb', min:12, max:18, region:'ap', roles:['controller','sentinel'], card:'3ab51388-48a4-5de7-488d-aea7c14f8ce4', langs:['en'],
    roster:['Areeb','Hamza','jinx','Tariq'], desc:'Building around a calm IGL. Want a smoke player who loves set plays.' }),
  team(3, { name:'Crimson Tide GG', tag:'CTG', captain:'Ayesha', min:9, max:15, region:'me', roles:['initiator'], card:'35e11e04-46d3-9e5f-c2a5-e5beb9a59e97', langs:['en','ar'],
    roster:['Ayesha','Noor','Bilal','Ziyad'], desc:'Community team playing every Esportra cup. Looking for a Sova or Fade main.' }),
  team(4, { name:'Lahore Lions', tag:'LHL', captain:'Danish', min:18, max:24, region:'ap', roles:['duelist','initiator'], card:'944e2863-4c07-c6aa-923f-c99a7f00aa58', langs:['en','ur'],
    roster:['Danish','frost','Umer'], desc:'Semi-pro roster rebuilding. Two spots open. Trials this weekend.' }),
];
const rosters = Object.fromEntries(teams.map((t, ti) => [t.id, { status:'available', members: [
  ['Rafay','Inzi','Moaz','sh4dow'], ['Areeb','Hamza','jinx','Tariq'], ['Ayesha','Noor','Bilal','Ziyad'], ['Danish','frost','Umer'],
][ti].map((n, mi) => ({ userId:`${t.id}-m${mi}`, username:n, avatarUrl: card(['743d51ab-4562-e36c-59bb-6cb68e1ac43e','52995983-424c-9517-2fe8-3795e092edb8','20193915-488b-e8dc-edb8-7cbfe7a99b3c','08bfe02a-4400-b046-ea1f-0e99f18269d0'][mi%4]), avatarSeed:null, avatarStyle:null, rosterRole: mi===0?'Captain':null, isStarter:true, competitiveTier: 3+t.minRankSortOrder+mi, competitiveTierName: rankName(Math.min(24,t.minRankSortOrder+mi)), kdRatio: 1.0+mi*0.07, winRate: 52+mi*2, matchesAnalyzed:60 })) }]));

const inbox = [
  { intent:'looking_for_team', id:'i-1', listingId:'mine-1', fromUserId:'cap-1', toUserId:'viewer', status:'expressed', message:'Saw your Jett clips. We have an open duelist slot for the winter split — trial Thursday?', createdAt: iso(1), gameSlug:'valorant', listingName:'Zephyr · Valorant', listingStatus:'published', counterpartUsername:'Karachi Kings Esports', counterpartAvatarUrl: card('5aaa58d8-4567-dc02-dc74-fbaa957fa7cd'), conversationId:null },
  { intent:'looking_for_team', id:'i-2', listingId:'mine-1', fromUserId:'cap-4', toUserId:'viewer', status:'expressed', message:'Rebuilding for next split. Your stats fit. Want to queue tonight?', createdAt: iso(3), gameSlug:'valorant', listingName:'Zephyr · Valorant', listingStatus:'published', counterpartUsername:'Lahore Lions', counterpartAvatarUrl: card('944e2863-4c07-c6aa-923f-c99a7f00aa58'), conversationId:null },
  { intent:'looking_for_team', id:'i-3', listingId:'mine-1', fromUserId:'cap-2', toUserId:'viewer', status:'accepted', message:'GG — welcome aboard.', createdAt: iso(26), gameSlug:'valorant', listingName:'Zephyr · Valorant', listingStatus:'published', counterpartUsername:'Nightfall Five', counterpartAvatarUrl: card('3ab51388-48a4-5de7-488d-aea7c14f8ce4'), conversationId:'c-1' },
];

const viewer = { id:'viewer', email:'viewer@example.test', username:'Zephyr', full_name:'Zephyr', avatar_url: card('7a7d21c3-4886-f5c8-606e-858ff452e2d8'), role:'player', date_of_birth:'2000-01-01', country_code:'PK', is_suspended:false, timezone_iana:'Asia/Karachi', created_at: iso(900) };

const myStats = { riotLinked:true, riotGameName:'Zephyr', riotTagLine:'PK1', syncStatus:'complete', syncedAt: iso(2), playerCardId:'7a7d21c3-4886-f5c8-606e-858ff452e2d8',
  competitiveTier:22, competitiveTierName:'Ascendant 2', winCount:58, lossCount:34, winRate:63, kdRatio:1.34, hsPct:31, matchesAnalyzed:92,
  popularAgents:[agent('jett',41,27,1.41), agent('raze',28,16,1.22), agent('neon',12,7,1.18), agent('reyna',8,5,1.25), agent('skye',4,2,0.91)] };

const catalog = { catalogVersion:'2026.10.1', schemaVersion:2, contentHash:'sample', games:[{
  slug:'valorant', name:'Valorant', category:'5v5 Tactical FPS', gameType:'bracket', defaultModeKey:'5v5', features:{ mapVeto:true, mapPool:true, isTeamGame:true },
  brConfig:null, logo:'/games/valorant-logo.png', icon:'/games/valorant-logo.png', cover:null, banner:null, sortOrder:1, aliases:[],
  modes:[{ modeKey:'5v5', name:'5v5', teamSize:5, participantMode:'team', allowsSubstitutes:true, maxRosterSize:7, maxSubstitutes:2 }],
  tournamentStructures:[{ structureKey:'single_elimination', name:'Single Elimination', isDefault:true }] }] };

const state = { saved: new Set(), interests: new Set(), accepted: new Set() };
function decorate(l) { return { ...l, isSaved: state.saved.has(l.id), viewerInterestStatus: state.interests.has(l.id) ? 'expressed' : null }; }

function handle(method, url) {
  const u = new URL(url); const p = u.pathname; const q = u.searchParams;
  if (p === '/api/games/catalog') return catalog;
  if (p === '/api/catalog/rank-tiers') return rankTiers;
  if (p === '/api/catalog/game-roles') return gameRoles;
  if (p === '/api/catalog/regions') return regions;
  if (p === '/api/profiles/me') return viewer;
  if (p === '/api/competitive/game-stats/me') return myStats;
  if (p === '/api/competitive/lfg/mine') return [];
  if (p === '/api/competitive/lfg/interests/mine') return q.get('direction') === 'sent' ? [] : inbox.map(i => state.accepted.has(i.id) ? { ...i, status:'accepted', conversationId:'c-'+i.id } : i);
  let am; if ((am = p.match(/^\/api\/competitive\/lfg\/interests\/([^/]+)\/accept$/))) { state.accepted.add(am[1]); return { conversationId: null }; }
  if (p === '/api/teams/my-captain-teams') return [];
  let m;
  if ((m = p.match(/^\/api\/competitive\/lfg\/([^/]+)\/roster$/))) return rosters[m[1]] || { status:'missing', members:[] };
  if ((m = p.match(/^\/api\/competitive\/lfg\/([^/]+)\/saved$/))) { method === 'DELETE' ? state.saved.delete(m[1]) : state.saved.add(m[1]); return {}; }
  if ((m = p.match(/^\/api\/competitive\/lfg\/([^/]+)\/interest$/))) { state.interests.add(m[1]); return { id:'new-int', listingId:m[1], status:'expressed' }; }
  if ((m = p.match(/^\/api\/competitive\/lfg\/([^/]+)$/))) { const l = [...players, ...teams].find(x => x.id === m[1]); return l ? decorate(l) : null; }
  if (p === '/api/competitive/lfg') {
    const intent = q.get('intent') || '';
    let rows = intent.includes('looking_for_team') ? players : teams;
    const role = q.get('preferred_roles'); if (role) rows = rows.filter(r => r.preferredRoles.includes(role));
    const min = q.get('min_rank'); if (min) rows = rows.filter(r => (r.competitiveTier != null ? r.competitiveTier - 3 : r.maxRankSortOrder) >= Number(min));
    const region = q.get('region_key'); if (region) rows = rows.filter(r => r.regionKey === region);
    const s = (q.get('q') || '').toLowerCase(); if (s) rows = rows.filter(r => `${r.username} ${r.teamName||''} ${r.description}`.toLowerCase().includes(s));
    if (q.get('saved_only') === 'true') rows = rows.filter(r => state.saved.has(r.id));
    return rows.map(decorate);
  }
  return method === 'GET' ? [] : {};
}

module.exports = { handle, viewer, state };
