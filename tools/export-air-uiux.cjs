// Export the complete current broadcast renderer reference with synthetic fixtures.
// This renders real components; it does not claim live backend, OBS or game QA.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const airRoot = path.resolve(root, '../Esportra-Air');
const artifacts = path.join(airRoot, 'design/implemented');
const desktopFixture = require(path.join(airRoot, 'tools/uiux-desktop-fixture.cjs'));
const id = '5e182c34-49f8-40d3-bf6c-88b576c20c45';
const tournamentId = '8a874bf4-ee36-4e05-ac65-d553c620ab94', tournamentOrgId = '6bafe2cd-911f-4f96-b55a-e19636ee7677', tournamentShowId = 'f55b45be-c24e-40f7-ba2a-14e8a2aacabc';
const show = {
  id, orgId: id, title: 'Invitational · Championship desk', status: 'scheduled',
  tournamentId: id, tournamentName: 'Esportra Invitational', scheduledAt: null,
  startedAt: null, endedAt: null, createdAt: '2026-10-13T10:00:00Z',
  nodeCount: 1, matchSlotCount: 1, matchSlotsWithCode: 1, talentCount: 0,
  sponsorCount: 0, crewCount: 2, lastSyncedAt: null,
  matchSlots: [{ id, matchId: id, matchCode: 'FINAL', displayOrder: 0,
    teamA: 'Team North', teamB: 'Team South', matchTitle: 'Team North vs Team South', matchStatus: 'scheduled', scheduledAt: '2026-10-14T16:00:00Z', bestOf: 3 }],
};
const segments = [
  { id, show_id: id, type: 'pre_show', title: 'Stand by · opening', duration_seconds: 60, status: 'pending', display_order: 0, config: { notes: 'Check microphones before the first take.', overlay:'starting-soon', matchId:id } },
  { id: 'cf507ae4-9468-4f40-96aa-5a5ff01459c5', show_id: id, type: 'match', title: 'Final · map one', duration_seconds: 180, status: 'pending', display_order: 1, config: { notes: '', overlay:'ingame', matchId:id } },
];
const seriesFlows = [1, 3].map(bestOf => {
  const item = (title, type, overlay, trigger, mapNumber = null) => ({ title, type, overlay, plan: { trigger, mode: 'manual', holdMode: 'manual', holdSeconds: 5, graphics: [overlay], transition: { mode: 'current' }, mapNumber } });
  const items = [item('Opening', 'pre_show', 'starting-soon', 'match_room_opened'), item('Match Introduction', 'pre_show', 'match-intro', 'check_in_complete'), item('Map picks & bans', 'custom', 'map-veto', 'veto_step')];
  for (let map = 1; map <= bestOf; map++) { items.push(item(`Map ${map} · Agent selection`, 'custom', 'agent-select', 'agent_select', map), item(`Map ${map}`, 'match', 'ingame', 'round_live', map), item(`Map ${map} · Results`, 'post_show', 'map-result', 'map_end', map)); if (map < bestOf) items.push(item(`Break before map ${map + 1}`, 'break', 'brb', 'manual')); }
  items.push(item('Series Results', 'post_show', 'series', 'series_decided'), item('Talent desk', 'pre_show', 'casters', 'manual'), item('Closing', 'post_show', 'ending', 'manual'));
  return { id: `bo${bestOf}`, name: `Best of ${bestOf}`, bestOf, items };
});
async function main() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'air-web-product-'));
  fs.mkdirSync(artifacts, { recursive: true });
  const requests = [], talents = [], errors = [];
  const shows = [show,{...show,id:tournamentShowId,orgId:tournamentOrgId,tournamentId,tournamentName:'Spring Invitational',tournamentSlug:'spring-invitational',title:'Spring Invitational desk'}];
  const duplicateId = '7197a7d3-90fc-41af-859f-45a7c00173c0';
  let nodeRevoked = false, screenshotCount = 0;
  const records = [];
  let browser;
  const entry = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { MemoryRouter, Routes, Route, useSearchParams, useLocation } from 'react-router-dom';
    import AirWorkspace from '${root.replace(/\\/g, '/')}/src/pages/air/AirWorkspacePage';
    import AirAdmin from '${root.replace(/\\/g, '/')}/src/pages/admin/AirAdminPage';
    import Home from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastHomePage';
    import Crew from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastCrewWorkspacePage';
    import Setup from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastGetStartedPage';
    import ShowSetup from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastSetupPage';
    import Shows from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastShowsPage';
    import Nodes from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastNodeMonitorPage';
    import Activity from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastActivityPage';
    import Detail from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastShowDetailPage';
    import ManageCrew from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastCrewPage';
    import Invitations from '${root.replace(/\\/g, "/")}/src/pages/broadcast/BroadcastInvitationsPage';
    import Join from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastCrewJoinPage';
    import Sponsors from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastSponsorsPage';
    import Report from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastPostShowReportPage';
    import Proof from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastSponsorProofPage';
    import Chapters from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastVodChaptersPage';
    import Desktop from '${airRoot.replace(/\\/g, '/')}/src/renderer/App.jsx';
    import { BroadcastPanel } from '${root.replace(/\\/g, '/')}/src/components/organizer/tournament-manage/panels/BroadcastPanel';
    import { TournamentDashboardNav } from '${root.replace(/\\/g, '/')}/src/components/organizer/tournament-manage/TournamentDashboardNav';
    import { buildDashboardNav, listVisibleSections, resolveActiveSection } from '${root.replace(/\\/g, '/')}/src/services/tournamentDashboard/dashboardNav';
    import { CommandShell, CommandPageGrid, CommandRail, DashboardPanelProvider } from '${root.replace(/\\/g, '/')}/src/components/management/CommandSurface';
    function TournamentFixture() {
      const [params, setParams] = useSearchParams();
      const groups = buildDashboardNav({ slug:'spring-invitational',isBR:false,isPaid:false,canActAsOwner:true,canManageTeams:true,canAssistDisputes:true,canSendAnnouncements:true,canEditBracket:true,canManageStaff:true,disputeBadgeCount:0 });
      const active = resolveActiveSection(params.get('tab'),listVisibleSections(groups));
      return <CommandShell><CommandPageGrid><div className='grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]'><CommandRail><TournamentDashboardNav groups={groups} activeTab={active} onTabChange={tab=>setParams({tab})} completionSummary={{panels:{}}} isDraft={false}/></CommandRail><div><DashboardPanelProvider>{active==='broadcast'?<BroadcastPanel tournamentId='${tournamentId}' tournamentName='Spring Invitational'/>:<h1 className='text-white'>Tournament overview</h1>}</DashboardPanelProvider></div></div></CommandPageGrid></CommandShell>;
    }
    function RouteReporter(){const route=useLocation();React.useEffect(()=>{window.airRenderedRoute=route.pathname+route.search;},[route]);return null;}
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[location.pathname + location.search + location.hash]}><RouteReporter/><Routes>
      <Route path='/broadcast' element={<Home />} />
      <Route path='/broadcast/home' element={<Home />} />
      <Route path='/air' element={<AirWorkspace />} />
      <Route path='/admin/air' element={<AirAdmin />} />
      <Route path='/desktop' element={<Desktop />} />
      <Route path='/broadcast/get-started' element={<Setup />} />
      <Route path='/broadcast/shows' element={<Shows />} />
      <Route path='/broadcast/shows/:showId/nodes' element={<Nodes />} />
      <Route path='/broadcast/shows/:showId/activity' element={<Activity />} />
      <Route path='/broadcast/shows/:showId/setup' element={<ShowSetup />} />
      <Route path='/broadcast/shows/:showId' element={<Detail />} />
      <Route path='/broadcast/shows/:showId/crew' element={<ManageCrew />} />
      <Route path='/broadcast/join' element={<Join />} />
      <Route path='/broadcast/shows/:showId/sponsors' element={<Sponsors />} />
      <Route path='/broadcast/shows/:showId/report' element={<Report />} />
      <Route path='/broadcast/shows/:showId/sponsor-proof' element={<Proof />} />
      <Route path='/broadcast/shows/:showId/vod-chapters' element={<Chapters />} />
      <Route path='/organizer/tournament/:slug' element={<TournamentFixture />} />
      <Route path='/broadcast/crew/shows/:showId' element={<Crew />} />
      <Route path='/broadcast/crew/shows' element={<Crew />} />
      <Route path='/broadcast/invitations' element={<Invitations />} />
    </Routes></MemoryRouter></QueryClientProvider>);
  `;
  const stubs = {
    '@/hooks/useAuth': `export const useAuth = () => ({user:{id:'${id}'}});`,
    '@/hooks/useMyOrganizationId': `export const useMyOrganizationId = () => '${id}';`,
    '@/lib/apiClient': `
      export class ApiError extends Error { constructor(status, message) { super(message); this.status=status; } }
      async function request(method, route, body) {
        const response = await fetch(route, { method, headers: {'Content-Type':'application/json','X-Air-Scenario':new URLSearchParams(location.search).get('scenario')||''}, body: body === undefined ? undefined : JSON.stringify(body) });
        if (!response.ok) { const failure = await response.json(); throw new ApiError(response.status, failure.error || 'Synthetic fixture rejected '+method+' '+route); }
        return response.json();
      }
      export const apiClient = { get: p=>request('GET',p), post:(p,b)=>request('POST',p,b), put:(p,b)=>request('PUT',p,b), patch:(p,b)=>request('PATCH',p,b), delete:p=>request('DELETE',p) };
      export const getApiErrorMessage = (_error, fallback) => fallback;
    `,
    '@/lib/supabase': `
      const rows = ${JSON.stringify(segments)};
      function query() { const q = { select:()=>q, eq:()=>q, order:()=>q, limit:async()=>({data:rows,error:null}) }; return q; }
      export const supabase = { from:()=>query() };
    `,
    '@/hooks/useSignalR': `const callbacks = {};const conn={on:(name,cb)=>callbacks[name]=cb,off:name=>delete callbacks[name]}; window.airFixtureConflict=()=>callbacks.ResultConflict?.({correctionId:'${id}',sessionId:'${id}',mapNumber:1,submittedA:13,submittedB:9,gepA:13,gepB:7});export const useSignalR=()=>({getConnection:()=>conn});`,
    '@/lib/signalrClient': `export const HubPaths={Broadcast:'/hubs/broadcast'};`,
  };
  const built = await esbuild.build({
    stdin: { contents: entry, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, outfile:path.join(temporary,'fixture.js'), platform: 'browser', jsx: 'automatic',
    tsconfig: path.join(root, 'tsconfig.json'),
    alias: { 'react': path.join(root,'node_modules/react'), 'react-dom': path.join(root,'node_modules/react-dom') },
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': JSON.stringify({VITE_SUPABASE_URL:'http://127.0.0.1',VITE_API_URL:'http://127.0.0.1',DEV:false}) },
    plugins: [{ name: 'isolated-fixtures', setup(build) {
      build.onResolve({ filter: /^@\// }, args => stubs[args.path] ? { path: args.path, namespace: 'fixture' } : undefined);
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: stubs[args.path], loader: 'js' }));
    } }],
  });
  const cssFiles = fs.readdirSync(path.join(root, 'dist/assets')).filter(name => name.endsWith('.css'));
  assert.ok(cssFiles.length, 'Build web app before this smoke check');
  const generatedCss = built.outputFiles.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n');
  const webCss = generatedCss + cssFiles.map(name => fs.readFileSync(path.join(root, 'dist/assets', name), 'utf8')).join('\n');
  const airCss = ['app','air','product','workspace','workspace-flows','workspace-editor','workspace-production'].map(name=>fs.readFileSync(path.join(airRoot,`src/renderer/styles/${name}.css`),'utf8')).join('\n');
  const fonts = '@font-face{font-family:Poppins;src:url(/fonts/Poppins-Medium.ttf);font-weight:400 500}@font-face{font-family:Poppins;src:url(/fonts/Poppins-SemiBold.ttf);font-weight:600}@font-face{font-family:Poppins;src:url(/fonts/Poppins-Bold.ttf);font-weight:700}@font-face{font-family:Poppins;src:url(/fonts/Poppins-Black.ttf);font-weight:800 900}@font-face{font-family:"JetBrains Mono";src:url(/fonts/JetBrainsMono.ttf);font-weight:100 900}@font-face{font-family:Inter;src:url(/fonts/inter-latin-400-normal.woff2);font-weight:400}';
  const server = http.createServer(async (req, res) => {
    const route = new URL(req.url, 'http://localhost').pathname;
    if (/^\/assets\/brand\/esportra-(mark|wordmark)\.png$/.test(route)) { res.setHeader('Content-Type','image/png'); return res.end(fs.readFileSync(path.join(airRoot,route.slice(1)))); }
    if (route.startsWith('/hud-preview/')) {
      const previewRoot = path.resolve(airRoot, 'esportra-valorant-hud');
      const file = path.resolve(previewRoot, '.' + decodeURIComponent(route.replace('/hud-preview', '')));
      if (!file.startsWith(previewRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      let content = fs.readFileSync(file);
      if (file.endsWith('.html')) content = content.toString().replace('<head>', '<head><script>const previewQuery=new URLSearchParams(location.search);previewQuery.set("preview","1");history.replaceState(null,"",location.pathname+"?"+previewQuery);</script>');
      return res.end(content);
    }
    if(route.startsWith('/air-hud/')) { const previewRoot=path.resolve(root,'public/air-hud'); const file=path.resolve(root,'public','.'+decodeURIComponent(route)); if(!file.startsWith(previewRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();} res.setHeader('Content-Type', file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream'); return res.end(fs.readFileSync(file)); }
    if (route === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(built.outputFiles[0].contents); }
    if (route === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); return res.end(fonts + webCss); }
    if (route === '/air.css') { res.setHeader('Content-Type', 'text/css'); return res.end(fonts + airCss); }
    if (route.startsWith('/fonts/')) { const filename=path.basename(route); const font=path.join(artifacts,'assets/fonts',filename); if(fs.existsSync(font))return res.end(fs.readFileSync(font)); res.statusCode=404;return res.end(); }
    if (!route.startsWith('/api/')) {
      if (/\.(woff2?|png|svg|jpg)$/.test(route)) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', 'text/html');
      return res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+(route==='/desktop'?'/air.css':'/fixture.css')+'"></head><body style="background:#09090b"><div id="root"></div><script>'+desktopFixture(show,id)+'</script><script src="/fixture.js"></script></body></html>');
    }
    let body = ''; for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, route, query: new URL(req.url, 'http://localhost').search, body: body ? JSON.parse(body) : null });
    res.setHeader('Content-Type', 'application/json');
    const scenario = req.headers['x-air-scenario'] || '';
    const send = data => res.end(JSON.stringify(data));
    const node = { id, name: 'Production desk', lastSeenAt: new Date().toISOString(), isActive: true, runtimeSeenAt: new Date().toISOString(), runtimeStatus: JSON.stringify({mode:'production',hudOnline:true,obsConnected:false,feedState:'stale',automationPaused:true,timeoutPaused:false,hudClientsConnected:true,appVersion:'0.1.0',outputs:[{id,name:'Main HUD',connectionCount:2,lastFrameAt:new Date(Date.now()-1000).toISOString()}]}) };
    const crewShow = { id, title: show.title, status: show.status, role: 'observer' };
    if(scenario==='error' && req.method==='GET'){res.statusCode=503;return send({error:'Fixture unavailable'});}
    if(route==='/api/air/session')return send({userId:id,account:{status:'active',trialEndsAt:'2026-10-29T12:00:00Z',validUntil:'2026-10-29T12:00:00Z'},workspaces:[{id,name:'Independent production'}]});
    if(route===`/api/air/workspaces/${id}/projects`)return send([{id,workspaceId:id,title:'Weekend invitational',revision:3,updatedAt:'2026-10-15T12:00:00Z'}]);
    if(route==='/api/admin/air/')return send({counts:{customers:18,workspaces:24,activeDevices:29,onlineDevices:4,expiredAccess:3},offlineSigningConfigured:true,paymentsEnabled:false});
    if(route.startsWith('/api/admin/air/')){const section=route.split('/').at(-1),records={customers:[{userId:id,status:'active',planId:id,plan:'14-day trial',trialEndsAt:'2026-10-29T12:00:00Z',validUntil:'2026-10-29T12:00:00Z',licenseCode:'SAMPLE-AIR-TRIAL'}],workspaces:[{id,name:'Weekend production',ownerId:id,projects:2,createdAt:'2026-10-15T12:00:00Z'}],plans:[{id,name:'14-day trial',productionLimit:null,captureLimit:null,enabled:true}],devices:[{id,name:'Production desk',userId:id,mode:'production',status:'active',lastSeenAt:new Date().toISOString(),health:JSON.stringify({obsConnected:true,feedState:'live',productionActive:true})}],activity:[{id:1,actorId:id,action:'access_updated',subjectId:id,reason:'Manual trial extension',createdAt:'2026-10-15T12:00:00Z'}],releases:[{id,version:'0.2.0',channel:'preview',downloadUrl:'https://esportra.gg/downloads/air',notes:'Sample release information',published:false}]};return send({items:records[section]||[],page:1,hasMore:false});}
    if (route === '/api/broadcast/home') return send({ shows: scenario==='empty'?[]:[show], nodes: scenario==='empty'?[]:[node], crewCount: 2, alerts: [] });
    if (route === '/api/broadcast/nodes') return send(nodeRevoked || scenario==='empty' ? [] : [node]);
    if (route === `/api/broadcast/nodes/${id}` && req.method === 'DELETE') { nodeRevoked = true; return send({ success: true }); }
    if (route === `/api/organizations/${id}/tournaments`) return send([{ id, name: show.tournamentName, slug: 'invitational', game: 'valorant' }]);
    if (route === `/api/organizations/${tournamentOrgId}/tournaments`) return send([{id:tournamentId,name:'Spring Invitational',slug:'spring-invitational',game:'valorant'}]);
    if (route === '/api/broadcast/shows' && req.method==='GET') return send(scenario==='empty'?[]:shows.filter(s=>s.orgId===id));
    if (route === '/api/broadcast/shows' && req.method==='POST') return send({showId:id});
    if (route === `/api/tournaments/${tournamentId}/broadcast`) return send({ tournament: { id:tournamentId,name:'Spring Invitational',slug:'spring-invitational',game:'valorant',organizationId:scenario==='unassigned'?null:tournamentOrgId },canManage:!['blocked','unassigned'].includes(scenario),access:scenario==='blocked'?'organization_owner_required':scenario==='unassigned'?'organization_required':'ready',organizations:scenario==='unassigned'?[{id:tournamentOrgId,name:'Esportra Production'}]:[],shows:shows.filter(s=>s.tournamentId===tournamentId).map(s=>({id:s.id,title:s.title,status:s.status,scheduledAt:s.scheduledAt,lastSyncedAt:s.lastSyncedAt,matchCount:1})) });
    if (route === `/api/tournaments/${tournamentId}/broadcast/shows`) { const draft={...show,id:tournamentShowId,title:JSON.parse(body).title,status:'draft',orgId:tournamentOrgId,tournamentId,tournamentName:'Spring Invitational',tournamentSlug:'spring-invitational',scheduledAt:null,lastSyncedAt:null};shows.push(draft);return send({showId:tournamentShowId,orgId:tournamentOrgId,tournamentId}); }
    if (route === '/api/broadcast/rundown/templates') return send(seriesFlows);
    if (route.endsWith('/enrollment')) return send(req.method === 'PUT' ? { added: 1, atCapacity: false, revision: 1 } : { enabled: false, stageIds: [], revision: 0, checkedAt: null, atCapacity: false, stages: [{ id, name: 'Playoffs' }, { id: tournamentId, name: 'Grand Final' }] });
    if (route.endsWith('/appearance')) { const value = body ? JSON.parse(body) : {}; return send(req.method === 'PUT' ? { ...value, revision: (value.revision || 0) + 1 } : { pack: 'esportra', bannerTheme: 'broadcast', teamColors: true, eventBug: true, sponsorRotation: true, sponsorSeconds: 8, matches: {}, revision: 0 }); }
    if (route.endsWith('/rundown/templates') && req.method === 'POST') return send({ count: 17, alreadyImported: false });
    if (route.endsWith('/plan') && req.method === 'PUT') return send({ success: true });
    if (route.endsWith('/configuration')) {
      const current=shows.find(s=>route===`/api/broadcast/shows/${s.id}/configuration`);
      if(current) return send({showId:current.id,title:current.title,eventLabel:current.tournamentName,game:'valorant',matches:[{matchId:id,matchCode:'FINAL',bestOf:3,teams:[{name:'Team North'},{name:'Team South'}],veto:[{action:'pick',map:'Haven',team:1,pickedByTeam:1,side:'DEF'}]}],rundown:segments.map(s=>({id:s.id,title:s.title,type:s.type}))});
    }
    if (route === `/api/broadcast/shows/${id}/duplicate`) { shows.push({ ...show, id: duplicateId, title: show.title + ' (copy)', status: 'draft', scheduledAt: null, lastSyncedAt: null }); return send({ showId: duplicateId }); }
    if (route === `/api/broadcast/shows/${duplicateId}` && req.method === 'DELETE') { shows.splice(shows.findIndex(s => s.id === duplicateId), 1); return send({ success: true }); }
    if (route.endsWith('/publication')) return send({ version: scenario==='empty'?0:3, publishedAt: scenario==='empty'?null:new Date().toISOString(), rundown:[{id,title:'Opening'}], nodes:scenario==='empty'?[]:[{id,name:'Production desk',seenAt:new Date().toISOString(),plan:JSON.stringify({showId:id,version:2,pendingVersion:3})}] });
    if (route === `/api/broadcast/shows/${id}/timeline`) return send({since:new Date(Date.now()-3600000).toISOString(),until:new Date().toISOString(),truncated:false,items:scenario==='empty'?[]:[{id,eventType:'SegmentTake',at:new Date(Date.now()-1800000).toISOString(),nodeName:'Production desk',nodeId:id,actorKind:'operator',cause:'manual',segmentName:'Opening'},{id:duplicateId,eventType:'ProductionAction',at:new Date(Date.now()-1200000).toISOString(),nodeName:'Production desk',nodeId:id,actorKind:'operator',action:'hold',cause:'manual'},{id:'timeline-auto',eventType:'SegmentTake',at:new Date(Date.now()-600000).toISOString(),nodeName:'Production desk',nodeId:id,actorKind:'automation',cause:'hold_expired',segmentName:'Map'},{id:'timeline-incident',eventType:'ProductionIncident',at:new Date(Date.now()-120000).toISOString(),nodeName:'Observer PC',nodeId:duplicateId,actorKind:'system',kind:'stale_feed',status:'opened',cause:'missing_events'}]});
    if (route === `/api/broadcast/shows/${id}/activity`) {
      const older = new URL(req.url, 'http://localhost').searchParams.has('beforeId');
      return send({ items: older ? [{ id: duplicateId, eventType: 'SegmentArm', source: 'node', createdAt: '2026-10-14T12:00:00Z', nodeName: node.name }] : [
        { id, eventType: 'SegmentTake', source: 'node', createdAt: '2026-10-14T12:02:00Z', nodeName: node.name },
        { id: 'cf507ae4-9468-4f40-96aa-5a5ff01459c5', eventType: 'Hold', source: 'node', createdAt: '2026-10-14T12:01:00Z', nodeName: node.name },
      ], nextCursor: older ? null : { beforeAt: '2026-10-14T12:01:00Z', beforeId: id } });
    }
    if (route === '/api/broadcast/nodes/codes') return send({ code: 'TEST061A', expiresAt: new Date(Date.now() + (scenario==='expired'?-1000:300000)).toISOString() });
    if (route === '/api/broadcast/crew/invites/accept') { if(scenario==='expired'){res.statusCode=410;return send({error:'expired'});}return send({showId:id,role:'observer'}); }
    if (route === '/api/broadcast/crew/invitations') return send(scenario==='empty'?[]:[{id,showId:id,showTitle:show.title,role:'observer',expiresAt:'2026-10-17T10:00:00Z'}]);
    if (route.includes('/api/broadcast/crew/invitations/') && route.endsWith('/accept')) return send({showId:id,role:'observer'});
    if (route === '/api/broadcast/crew/shows') return send([crewShow]);
    if (route === `/api/broadcast/crew/shows/${id}`) return send({ show: crewShow, matches: [{ code: 'FINAL' }], rundown: segments.map(s => ({id:s.id,title:s.title,type:s.type,status:s.status,durationSeconds:s.duration_seconds})) });
    if (route.endsWith('/crew')) return send({ crew: [{id,userId:id,role:'observer',displayName:'Demo observer',joinedAt:'2026-10-13T10:00:00Z',isActive:true}], pendingInvites: [{id,role:'observer',expiresAt:'2026-10-17T10:00:00Z',createdAt:'2026-10-14T10:00:00Z'}] });
    if (route.endsWith('/crew/invites')) return send({inviteId:id,token:'fixture-invite-only',expiresAt:'2026-10-17T10:00:00Z',emailStatus:scenario==='email-failed'?'failed':body&&JSON.parse(body).email?'submitted':'not_requested',recipientBound:!!(body&&JSON.parse(body).email)});
    const sponsor={id,showId:id,name:'Demo sponsor',logoUrl:null,displaySlot:'lower_third',displayOrder:0,isActive:true};
    if (route.endsWith('/sponsors')) return send(scenario==='empty'?[]:[sponsor]);
    if (route.endsWith('/result-proposals')) return send({ canReview: scenario !== 'result-viewer', proposals: ['result-review', 'result-viewer', 'result-stale'].includes(scenario) ? [{ id, matchId: id, mapNumber: 1, teamAScore: 13, teamBScore: 7, reason: 'Operator checked the final map scoreboard.', status: 'pending', teamAName: 'Team North', teamBName: 'Team South', matchStatus: 'in_progress', currentTeamAScore: 9, currentTeamBScore: 13, createdAt: '2026-10-15T10:00:00Z', reviewedAt: null }] : [] });
    if (route.includes('/result-proposals/') && route.endsWith('/review')) { if (scenario === 'result-stale') { res.statusCode = 409; return send({ error: 'The official map score changed. Reload and review its latest value.' }); } return send({ ok: true, status: JSON.parse(body).decision === 'apply' ? 'applied' : 'rejected' }); }
    if (route.includes('/sponsors/') && req.method==='PATCH') return send({success:true});
    const chapters=[{segmentId:id,segmentName:'Opening',segmentType:'pre_show',offsetSeconds:0,durationSeconds:180,incomplete:false},{segmentId:duplicateId,segmentName:'Final · map one',segmentType:'match',offsetSeconds:180,durationSeconds:1600,incomplete:false}];
    const proof={sponsorId:id,name:'Demo sponsor',totalOnAirSeconds:180,placementCount:3,bySlotType:{lower_third:{totalSeconds:180,count:3}},hasIncomplete:false,incompleteCount:0};
    if(route.endsWith('/sponsor-proof'))return send({showId:id,showTitle:show.title,generatedAt:'2026-10-14T14:00:00Z',sponsors:scenario==='empty'?[]:[proof]});
    if(route.endsWith('/vod-chapters'))return send({showId:id,chapters:scenario==='empty'?[]:chapters});
    if(route.endsWith('/report')){if(scenario==='live'){res.statusCode=409;return send({error:'not ended'});}return send({show:{id,title:show.title,scheduledAt:null,startedAt:'2026-10-14T12:00:00Z',endedAt:'2026-10-14T13:00:00Z',durationSeconds:3600},matches:[{matchId:id,matchCode:'FINAL',displayOrder:0,status:'done',maps:[{mapNumber:1,teamAScore:13,teamBScore:7,source:'gep'}]}],crew:[{userId:id,displayName:'Demo observer',role:'observer'}],sponsors:[proof],chapters,corrections:{count:1},players:[]});}
    if (route.endsWith('/available-matches')) return send(['empty','no-eligible'].includes(scenario)?[]:[{id:duplicateId,teamA:'Aurora',teamB:'Falcons',status:'pending',scheduledAt:'2026-10-15T14:00:00Z',tournamentName:'Esportra Invitational'},{id:tournamentId,teamA:'Played team',teamB:'Finished team',status:'completed'}]);
    if (route.endsWith('/screens/import')) return send({count:JSON.parse(body).screens.length});
    if (route==='/api/sponsors/active') return send([{id,name:'Esportra demo partner',logo_url:'/air-hud/core/brand/mark-224.png',is_active:true}]);
    if (route.endsWith('/talent')) {
      if (req.method === 'POST') talents.push({ id, ...JSON.parse(body) });
      return send(req.method === 'POST' ? { id } : talents);
    }
    if (route.endsWith('/push-config')) { show.lastSyncedAt = new Date().toISOString(); return send({ success: true }); }
    const requestedShow = shows.find(s => route === `/api/broadcast/shows/${s.id}`);
    if (requestedShow) { if (req.method === 'PATCH') Object.assign(requestedShow, JSON.parse(body)); return send({...requestedShow, ...(scenario==='no-eligible'?{matchSlots:requestedShow.matchSlots.map(slot=>({...slot,matchStatus:'completed'}))}:{}),status:scenario==='live'?'live':scenario==='ended'?'ended':requestedShow.status}); }
    res.statusCode = 404; return send({ error: 'No synthetic fixture for this endpoint' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 950 }, reducedMotion: 'reduce', timezoneId: 'Asia/Karachi' });
    page.setDefaultTimeout(10000);
    await page.route(/^https?:\/\/(?!127\.0\.0\.1:)/,route=>route.abort());
    page.on('pageerror', error => errors.push(error.message));
    const capture = async (name, title, component, notes = '') => {
      await page.mouse.move(0,0);
      await page.waitForTimeout(200);
      await page.evaluate(()=>document.fonts.ready);
      const group = name[0];
      const relative = 'screens/' + group + '/' + name + '.png';
      fs.mkdirSync(path.dirname(path.join(artifacts,relative)),{recursive:true});
      await page.screenshot({path:path.join(artifacts,relative),fullPage:true});
      screenshotCount++;
      records.push({id:name,group,title,component,route:await page.evaluate(()=>window.airRenderedRoute||location.pathname+location.search),
        surface:new URL(page.url()).pathname==='/desktop'?'desktop renderer':page.viewportSize().width<600?'phone web':'web',
        file:relative,viewport:page.viewportSize(),notes,verification:'real component / synthetic data and IPC',liveServices:false,
        horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});
      assert.deepEqual(errors,[],name+': renderer errors');
    };
    const go=async(route,scenario='')=>{
      // Hash-only navigation would keep the invitation component mounted;
      // each exported state must start with a fresh document and effect lifecycle.
      await page.goto('about:blank');
      await page.goto(base+route+(scenario?(route.includes('?')?'&':'?')+'scenario='+scenario:''));
      try { await page.waitForFunction(()=>document.getElementById('root')?.innerText.length>30); }
      catch { throw new Error(route+': '+(errors.join('; ')||'No rendered content')); }
      await page.waitForTimeout(400);
    };
    const desk=async(screen)=>{
      await go('/desktop?screen='+screen);
      if(['readiness','no-show','pending','stop','offline'].includes(screen)){await page.getByRole('button',{name:'Connections',exact:true}).click();await page.getByRole('button',{name:'Review broadcast setup',exact:true}).click();}
      if(screen.startsWith('producer'))await page.getByRole('button',{name:'OBS controls',exact:true}).click();
      if(screen.startsWith('template'))await page.getByRole('button',{name:'Broadcast screens',exact:true}).last().click();
    };
    const take=async(group,name,component)=>capture(group,name,component);

    await go('/organizer/tournament/spring-invitational?tab=broadcast');
    await take('A01-tournament-entry','Tournament dashboard · Broadcast','BroadcastPanel');
    await go('/organizer/tournament/spring-invitational?tab=broadcast','unassigned');
    await take('A02-organization-required','Link an owned organization','BroadcastPanel');
    await go('/organizer/tournament/spring-invitational?tab=broadcast','blocked');
    await take('A03-owner-required','Organization-owner access required','BroadcastPanel');
    await go('/broadcast/shows');
    await take('B01-shows','Organization show ledger','BroadcastShowsPage');
    await go('/broadcast/shows','empty');
    await take('B02-empty-shows','No shows yet','BroadcastShowsPage');
    await go('/broadcast/home');
    await take('B04-broadcast-home','Broadcast home on desktop','BroadcastHomePage');
    await go('/broadcast/home','empty');
    await take('B05-home-empty','First broadcast home','BroadcastHomePage');
    await go('/broadcast/home','error');
    await take('B06-home-error','Broadcast home load failure','BroadcastHomePage');
    await go('/broadcast/get-started');
    await take('C01-get-started','Create or select a show','BroadcastGetStartedPage');
    await go('/broadcast/shows');
    await page.getByRole('button',{name:/New show|Create show/i}).first().click();
    await take('C02-create-show','Create show form','BroadcastShowsPage');
    await go('/broadcast/get-started?showId='+id+'&step=0');
    await page.getByRole('button',{name:'Show settings',exact:true}).click();
    await take('D01-show-settings','Identity, tournament and planned start','ShowSettingsDialog');
    await page.getByRole('button',{name:'Close',exact:true}).first().click();
    for(let step=0;step<8;step++){
      await go('/broadcast/get-started?showId='+id+'&step='+step);
      await take('E0'+(step+1)+'-preparation', ['Connect desktop app','Choose a match','Preview the HUD','Choose broadcast screens','Add sponsors','Assign talent','Assign crew','Review broadcast setup'][step], 'ShowPreparation / PreparationStepContent');
    }
    await go('/broadcast/get-started?showId='+id+'&step=1');
    assert.equal(await page.getByRole('button',{name:/Played team/}).count(),0,'Played matches stay hidden');
    await take('E13-eligible-matches','Unplayed match choices with teams, time and status','SetupMatchPicker');
    await page.getByText('Follow bracket stages', { exact: true }).click();
    await page.getByLabel('Automatically include upcoming matches', { exact: true }).check();
    await page.getByLabel('Playoffs', { exact: true }).check();
    await take('E21-follow-stages','Optional stage following includes future eligible matches without taking Program or creating tournament data','FollowBracketSettings');
    await go('/broadcast/get-started?showId='+id+'&step=2');
    const hud=page.frameLocator('iframe');
    await hud.locator('.preview-label').getByText('DEMO PREVIEW · SAMPLE DATA',{exact:true}).waitFor();
    assert.ok(await hud.locator('body').textContent().then(text=>text.includes('Team North')),'Preview has selected teams');
    await take('E14-hud-demo','Selected teams with clearly labelled sample HUD data','HudSetupPreview');
    await page.getByRole('checkbox',{name:'Demo preview'}).uncheck();
    await hud.getByText('LAYOUT PREVIEW · NO LIVE DATA',{exact:true}).waitFor();
    assert.ok(await hud.locator('body').evaluate(()=>window.HUD.preview && !window.HUD.live && window.HUD.match===null && window.HUD.state.map.name==='' && window.HUD.state.players.flat().every(player=>player.credits===0 && !player.weapon)), 'Demo-off preview is clean and isolated');
    await take('E15-hud-layout','HUD layout with demo data disabled','HudSetupPreview');
    await page.getByText('HUD appearance & sponsor rotation', { exact: true }).click();
    await page.getByRole('button', { name: 'Save appearance', exact: true }).waitFor();
    await page.getByLabel('Banner theme', { exact: true }).selectOption('compact');
    await page.getByLabel('Team North · Broadcast display name', { exact: true }).fill('North broadcast');
    await page.getByLabel('Stinger transition for new screens', { exact: true }).fill('Esportra Stinger');
    await page.getByLabel('Rotate active sponsor logos', { exact: true }).uncheck();
    await hud.locator('body').evaluate(() => { if (window.HUD.state.layout.bannerTheme !== 'compact') throw new Error('Preview theme did not update'); });
    await take('E20-hud-appearance','Saved match display names, team colors, theme, event bug and sponsor rotation preview','HudAppearanceSetup / HudAppearanceFields');
    await page.getByRole('button', { name: 'Save appearance', exact: true }).click();
    await page.getByText('Appearance saved. Send match to Air.', { exact: true }).waitFor();
    await go('/broadcast/get-started?showId='+id+'&step=4');
    await page.getByText('Sponsor logo rotation', { exact: true }).click();
    await page.getByRole('button', { name: 'Save sponsor rotation', exact: true }).waitFor();
    await page.getByLabel('Seconds per sponsor', { exact: true }).fill('12');
    await take('E22-sponsor-rotation','Optional sponsor setup includes logo rotation and an explicit separation from manual sponsor reads','SponsorRotationSettings');
    await go('/broadcast/get-started?showId='+id+'&step=3');
    await page.getByRole('button',{name:'Preview Match Introduction',exact:true}).click();
    await page.frameLocator('iframe').getByText('DEMO PREVIEW · SAMPLE DATA',{exact:true}).waitFor();
    await take('E16-preview-screen','Preview an individual match introduction before adding it','SetupScreenLibrary');
    await go('/broadcast/get-started?showId='+id+'&step=4');
    await page.getByRole('button',{name:'Add a new sponsor',exact:true}).click();
    await take('I04-sponsor-upload','Optional sponsor name and validated logo upload','SetupSponsors');
    await go('/broadcast/get-started?showId='+id+'&step=6');
    await take('J05-inline-crew','Crew responsibilities inside broadcast setup','SetupCrew');
    await go('/broadcast/get-started?showId='+id+'&step=1','no-eligible');
    await page.getByText(/No eligible matches. Publish the bracket/).waitFor();
    await take('E17-no-eligible-matches','No eligible unplayed matches with recovery guidance','SetupMatchPicker');
    await go('/broadcast/shows/'+tournamentShowId+'/setup');
    await take('E11-tournament-setup','Tournament-linked guided setup and return link','BroadcastSetupPage');
    await go('/broadcast/get-started?showId='+id+'&step=7');
    await page.getByRole('button',{name:'Send match to Air',exact:true}).click();
    await page.getByText(/Match setup sent. Open Air/).waitFor();
    await take('E12-config-sent','Configuration sent with desktop verification notice','ShowPreparation');
    await go('/broadcast/home');
    await page.getByRole('button',{name:'Pair desktop node',exact:true}).click();
    await take('F01-pair-dialog','Generate a temporary pairing code','PairNodeDialog');
    await page.getByRole('button',{name:'Generate code',exact:true}).click();
    await page.getByText('TEST 061A',{exact:true}).waitFor();
    await take('F02-pair-code','Pairing code and countdown','PairNodeDialog');
    await go('/broadcast/home','expired');
    await page.getByRole('button',{name:'Pair desktop node',exact:true}).click();
    await page.getByRole('button',{name:'Generate code',exact:true}).click();
    await page.getByText('Code expired',{exact:true}).waitFor();
    await take('F03-pair-expired','Expired code recovery','PairNodeDialog');
    await go('/broadcast/shows/'+id+'/nodes');
    await take('G01-node-directory','Registered nodes and heartbeat','BroadcastNodeMonitorPage');
    await page.getByRole('button',{name:'Revoke node access',exact:true}).click();
    await take('G02-revoke-node','Confirm node access revocation','NodeCard');
    await go('/broadcast/shows/'+id+'/nodes','empty');
    await take('G03-no-nodes','No paired nodes','BroadcastNodeMonitorPage');
    await go('/broadcast/get-started?showId='+id+'&step=5');
    await take('H01-talent','On-air talent roster and add form','TalentRoster');
    await go('/broadcast/shows/'+id+'/sponsors');
    await take('I01-sponsors','Show sponsor directory','BroadcastSponsorsPage');
    await page.getByRole('button',{name:/Add sponsor/i}).first().click();
    await take('I02-add-sponsor','Sponsor settings form','BroadcastSponsorsPage');
    await go('/broadcast/shows/'+id+'/sponsors');
    await page.getByRole('button',{name:'Edit Demo sponsor',exact:true}).click();
    await take('I03-edit-sponsor','Edit sponsor placement and identity','BroadcastSponsorsPage');
    await go('/broadcast/shows/'+id+'/crew');
    await take('J01-crew','Crew roles and pending invites','BroadcastCrewPage');
    await page.getByRole('button',{name:/Generate invite/i}).click();
    await page.getByRole('dialog').waitFor();
    await take('J02-invite-link','Single-use role invitation','BroadcastCrewPage');
    await go('/broadcast/shows/'+id+'/crew');
    await page.getByLabel('Email (optional)').fill('crew@example.com');
    await page.getByRole('button',{name:'Send invitation',exact:true}).click();
    await page.getByText(/Email submitted\./).waitFor();
    await take('J05-email-invite','Email submission and account-bound crew link','BroadcastCrewPage');
    await go('/broadcast/shows/'+id+'/crew','email-failed');
    await page.getByLabel('Email (optional)').fill('crew@example.com');
    await page.getByRole('button',{name:'Send invitation',exact:true}).click();
    await page.getByText(/The email could not be submitted/).waitFor();
    await take('J06-email-fallback','Email failure preserves the targeted invitation','BroadcastCrewPage');

    await go('/broadcast/shows/'+id+'/crew');
    await page.getByRole('button',{name:'Revoke',exact:true}).click();
    await take('J03-revoke-invite','Confirm invite revocation','BroadcastCrewPage');
    await go('/broadcast/shows/'+id+'/crew');
    await page.getByRole('button',{name:/Remove Demo observer from crew/}).click();
    await take('J04-remove-crew','Confirm crew removal','BroadcastCrewPage');
    await go('/broadcast/join');
    await take('K01-join-missing','Missing invitation token','BroadcastCrewJoinPage');
    await go('/broadcast/join#token=fixture-invite-only');
    await take('K02-join-ready','Accept a crew invitation','BroadcastCrewJoinPage');
    await page.getByRole('button',{name:/Accept/i}).click();
    await page.getByText("You're in",{exact:true}).waitFor();
    await take('K03-join-accepted','Invitation accepted','BroadcastCrewJoinPage');
    await go('/broadcast/join?scenario=expired#token=fixture-invite-only');
    await page.getByRole('button',{name:/Accept/i}).click();
    await page.getByRole('alert').waitFor();
    await take('K04-join-expired','Expired or used invitation','BroadcastCrewJoinPage');
    await go('/broadcast/invitations');
    await take('L04-invitation-inbox','Private account-bound crew invitation inbox','BroadcastInvitationsPage');
    await page.getByRole('button',{name:'Accept invitation',exact:true}).click();
    await page.getByRole('heading',{name:show.title,level:1,exact:true}).waitFor();
    await take('L05-invitation-accepted','Accepted invitation opens assigned crew workspace','BroadcastCrewWorkspacePage');
    await go('/broadcast/invitations','empty');
    await take('L06-invitations-empty','No pending crew invitations','BroadcastInvitationsPage');
    await go('/broadcast/crew/shows');
    await take('L01-crew-shows','Assigned crew show list','BroadcastCrewWorkspacePage');
    await go('/broadcast/crew/shows/'+id);
    await take('L02-crew-brief','Observer role brief, match codes and plan','BroadcastCrewWorkspacePage');
    await go('/broadcast/shows/'+id);
    await take('M01-rundown','Show workspace and rundown','BroadcastShowDetailPage');
    await page.getByRole('button', { name: 'Edit Stand by · opening', exact: true }).click();
    await page.getByLabel('Screen name', { exact: true }).waitFor();
    await take('M02-segment-expanded','Expanded rundown segment','RundownRow');
    await page.getByText(/Cue & take settings/).click();
    await page.getByLabel('Item cue').selectOption('round_live');
    await page.getByLabel('Item take mode').selectOption('automatic');
    await page.getByLabel('Item hold policy').selectOption('window');
    await take('M04-cue-take-settings','Typed item cue, screen, scene, transition and Hold settings','RundownPlanEditor');
    await go('/broadcast/shows/'+id);
    await page.getByRole('button',{name:'Mark show live',exact:true}).click();
    await take('N01-mark-live','Confirm platform live status','BroadcastShowDetailPage');
    await go('/broadcast/shows/'+id,'live');
    await page.getByRole('button',{name:'End show',exact:true}).click();
    await take('N02-end-show','Confirm platform show end','BroadcastShowDetailPage');
    await go('/broadcast/shows/'+id+'/report','ended');
    await take('O01-report','Post-show recorded report','BroadcastPostShowReportPage');
    await go('/broadcast/shows/'+id+'/report','live');
    await take('O02-report-not-ended','Report waits for show end','BroadcastPostShowReportPage');
    await go('/broadcast/shows/'+id+'/sponsor-proof','ended');
    await take('P01-sponsor-proof','Recorded sponsor time and proof export','BroadcastSponsorProofPage');
    await go('/broadcast/shows/'+id+'/sponsor-proof','empty');
    await take('P02-proof-empty','No sponsor impressions yet','BroadcastSponsorProofPage');
    await go('/broadcast/shows/'+id+'/vod-chapters','ended');
    await take('Q01-vod-chapters','VOD chapters and YouTube copy','BroadcastVodChaptersPage');
    await go('/broadcast/shows/'+id+'/vod-chapters','empty');
    await take('Q02-vod-empty','No recorded chapters','BroadcastVodChaptersPage');
    await go('/broadcast/shows/'+id+'/activity');
    await take('R01-activity','Recorded production activity','BroadcastActivityPage');
    await take('R04-one-hour-timeline','One-hour acknowledged timeline and cross-node incidents','ProductionHistory');
    await page.getByRole('button',{name:'Load older records',exact:true}).click();
    await take('R02-activity-older','Activity pagination','BroadcastActivityPage');
    await go('/broadcast/shows/'+id+'/activity','error');
    await take('R03-activity-error','Recorded activity load failure','BroadcastActivityPage');
    await desk('mode');
    await take('S01-machine-role','Production or observer machine role','ModeScreen');
    await page.getByRole('button',{name:'Use capture-only mode',exact:true}).click();
    await take('S02-restart-role','Restart required after role selection','ModeScreen');
    await page.getByRole('button',{name:'Change selection',exact:true}).click();
    await page.getByRole('button',{name:'Use production mode',exact:true}).waitFor();
    await take('S03-change-role-selection','Change role selection before restarting','ModeScreen');
    await desk('capture');
    await page.getByRole('button',{name:'PC role',exact:true}).click();
    await page.getByRole('heading',{name:'How will you use this PC?',exact:true}).waitFor();
    await take('S04-capture-role-settings','Capture PC can return to role selection','ModeScreen');
    await page.getByRole('button',{name:'Back to workspace',exact:true}).click();
    await page.getByRole('button',{name:'Start capture',exact:true}).waitFor();
    await desk('pair');
    await take('T01-desktop-pair','Desktop pairing form','PairScreen');
    await desk('pair-revoked');
    await take('T04-revoked','Pairing revoked · capture stopped and automation paused','PairScreen');
    await desk('pair');
    await desk('pair-error');
    await page.getByLabel('Pairing code',{exact:true}).fill('ABCD1234');
    await page.getByRole('button',{name:/^Pair/}).click();
    await page.getByRole('alert').waitFor();
    await take('T02-pair-error','Invalid or expired pairing code','PairScreen');
    await desk('pair');
    await page.getByLabel('Pairing code',{exact:true}).fill('ABCD1234');
    await page.getByRole('button',{name:/^Pair/}).click();
    await page.getByText('Paired to Esportra. Loading your node…',{exact:true}).waitFor();
    await take('T03-pair-success','Pairing accepted and loading node','PairScreen');
    await desk('readiness');
    await take('U01-readiness','Production desk readiness','ProductionReadiness');
    await desk('no-show');
    await take('U02-no-show','Awaiting a show configuration','ProductionReadiness');
    await desk('pending');
    await take('U03-pending-plan','Waiting plan and explicit apply','ProductionReadiness');
    await desk('stop');
    await page.getByRole('button',{name:'Stop broadcast',exact:true}).click();
    await take('U04-stop-rundown','Stop local rundown confirmation','ProductionReadiness');
    await desk('producer');
    await take('V01-obs-disconnected','Producer console before OBS connection','ProducerScreen');
    for(const state of ['armed','holding','live','paused']){
      await desk('producer-'+state);
      await take('V0'+(['armed','holding','live','paused'].indexOf(state)+2)+'-'+state,'Producer · '+state,'ProducerScreen');
    }
    await desk('template');
    await page.getByLabel('Screen name',{exact:true}).fill('Welcome to the final');
    await page.getByLabel('Game video or camera',{exact:true}).selectOption('Observer video');
    await take('V06-scenes-prepared','Customize broadcast before sending to OBS','TemplateSetup, TemplatePreview');
    await page.getByRole('button',{name:'Save draft',exact:true}).click();
    await page.getByText('Draft saved in Air. OBS has not been changed.',{exact:true}).waitFor();
    await take('V36-template-draft','Draft saved without changing OBS','TemplateSetup');
    await page.getByRole('button',{name:'Send to OBS',exact:true}).click();
    await page.getByText(/Screens sent to OBS. Open OBS controls/).waitFor();
    await take('V37-template-sent','Screens sent; next action opens live controls','TemplateSetup');
    await desk('template-disconnected');
    await take('V38-template-disconnected','Customize first; connect OBS to send','TemplateSetup');
    await desk('template-stale');
    await page.getByRole('button',{name:'Send to OBS',exact:true}).click();
    await page.getByRole('alert').waitFor();
    await take('V39-template-stale','Match changed; reload before sending','TemplateSetup');
    await desk('producer-setup');
    await page.getByText('Broadcast collection & source slots',{exact:true}).click();
    await page.getByRole('button',{name:'Create broadcast collection',exact:true}).click();
    await take('V19-collection-confirm','Air-owned collection preparation confirmation','SceneSlots');
    await page.getByRole('dialog').getByRole('button',{name:'Create collection',exact:true}).click();
    await page.getByText('Broadcast collection and source slots ready.',{exact:true}).waitFor();
    await take('V20-source-slots','Game and camera slots detect existing OBS inputs','SceneSlots');
    await page.getByText('Broadcast collection & source slots',{exact:true}).click();
    await page.getByText('Scene mappings',{exact:true}).click();
    await page.getByRole('button',{name:'Refresh scenes from OBS',exact:true}).click();
    await page.getByLabel('Transition for Opening desk',{exact:true}).waitFor();
    await take('V10-scene-mappings','Existing OBS scenes and per-item transitions','SceneMappings');
    await page.getByText('Automatic graphic timings',{exact:true}).click();
    await page.getByText('Round recap (seconds)',{exact:true}).waitFor();
    await take('V11-graphic-timings','Local automatic graphics durations','GraphicsDurations');
    await page.getByText('Pause & timeout behavior',{exact:true}).click();
    await page.getByRole('button',{name:'Save pause behavior',exact:true}).waitFor();
    await take('V27-pause-policy','Delayed pause/timeout panels and optional existing OBS scene','PauseRulesSettings');
    await page.getByRole('button',{name:'Ctrl+Shift+U: Show update',exact:true}).click();
    await page.getByLabel('Update text').fill('Match starts in two minutes');
    await take('V14-toast-form','Inline HUD update form','GraphicForms');
    await page.getByRole('button',{name:'Close form',exact:true}).click();
    await page.getByRole('button',{name:'Ctrl+Shift+L: Show poll',exact:true}).click();
    await page.getByLabel('Poll question').fill('Who takes the final?');
    await page.getByLabel('Option 1',{exact:true}).fill('North');await page.getByLabel('Option 2',{exact:true}).fill('South');
    await take('V15-poll-form','Inline poll options and result percentages','GraphicForms');
    await page.getByRole('button',{name:'Close form',exact:true}).click();
    await page.getByRole('button',{name:'Ctrl+Shift+B: Sponsor read',exact:true}).click();
    await take('V16-sponsor-read','Assigned sponsor read and queued proof','GraphicForms');
    await page.getByRole('button',{name:'Close form',exact:true}).click();
    await page.getByRole('button',{name:'Settings & help',exact:true}).click();
    await page.getByRole('button',{name:'Practice with sample data',exact:true}).click();
    await take('V17-rehearsal-empty','Load a sample rehearsal','RehearsalScreen');
    await page.getByRole('button',{name:'Load sample match',exact:true}).click();
    await take('V18-rehearsal-loaded','Packaged rehearsal controls and OBS opt-in','RehearsalScreen');
    await desk('producer-setup');
    await page.getByRole('button',{name:'Open one-hour activity',exact:true}).click();
    await page.getByRole('heading',{name:'The last hour of production.',exact:true}).waitFor();
    await take('V21-one-hour-timeline','Desktop confirmed takes, holds and incidents','ProductionTimeline');
    await desk('producer-held'); await take('V22-operator-held','Operator Hold waits for Take or Skip','ProducerScreen');
    await desk('producer-plan-waiting'); await take('V23-plan-version-waiting','Upcoming rundown version and change review','ProducerScreen, RundownRevision');
    await desk('producer-setup');
    await page.getByRole('button',{name:'Fix on-air data',exact:true}).click();
    await page.getByRole('heading',{name:'Fix on-air match data.',exact:true}).waitFor();
    await page.getByRole('button',{name:'On-air score',exact:true}).click();
    await page.getByLabel('On-air fix reason').fill('Score source needs a temporary correction');
    await take('V24-on-air-score-fix','On-air score override and next-round expiry','DisplayFixScreen');
    await page.getByRole('button',{name:'Apply on-air fix',exact:true}).click();
    await take('V25-active-override-undo','Active override, clear and Undo','ActiveDisplayFixes');
    await page.getByRole('button',{name:'Observed player',exact:true}).click();
    await take('V26-observed-player-fix','Player focus from the received roster','DisplayFixScreen');
    await page.getByRole('button', { name: 'Series wins', exact: true }).click();
    await page.getByLabel('Team 1 series wins').fill('2'); await page.getByLabel('Team 2 series wins').fill('1');
    await page.getByLabel('On-air fix reason').fill('Demo series presentation');
    await take('V28-series-fix', 'Local series wins with feed locks and Undo', 'DisplayFixScreen');
    await page.getByRole('button', { name: 'Player display name', exact: true }).click();
    await page.getByLabel('Player broadcast display name').fill('Sample broadcast player');
    await page.getByLabel('On-air fix reason').fill('Demo Riot name presentation');
    await take('V29-player-name-fix', 'Received player identity to broadcast display name', 'DisplayFixScreen');

    await desk('producer-setup');
    for (const [screen, record, name] of [['producer-feed','V12-game-data','Reported game data and combined log'],['producer-feed-stale','V13-stale-feed','Stale game feed and retained values'],['producer-timeout','V14-team-timeout','Team timeout distinct from technical pause'],['producer-replay-off','V15-replay-inactive','Replay disabled until OBS buffer is active']]) {
      await desk(screen); await take(record,name,'ProducerScreen / LiveDataStrip');
    }
    await desk('producer-armed');
    await page.getByRole('button',{name:'Keyboard shortcuts',exact:true}).click();
    await take('V07-shortcuts','Editable production shortcuts with action descriptions','ShortcutSettings');
    await page.getByRole('button',{name:'Change Show next screen on air shortcut',exact:true}).click();
    await page.keyboard.press('F1');
    await page.getByRole('alert').waitFor();
    await take('V08-shortcut-conflict','Conflicting shortcut rejected before saving','ShortcutSettings');
    await page.keyboard.press('Control+Shift+T');
    await page.getByRole('button',{name:'Save shortcuts',exact:true}).click();
    await page.getByText('Shortcuts saved on this workstation.',{exact:true}).waitFor();
    await take('V09-shortcut-saved','Custom shortcut saved on the production workstation','ShortcutSettings');
    await page.getByRole('button',{name:'Reset all shortcuts',exact:true}).click();
    await page.getByText('Default shortcuts restored.',{exact:true}).waitFor();
    await take('V10-shortcuts-reset','Default production shortcuts restored','ShortcutSettings');
    await desk('capture');
    await take('W01-observer','Observer capture utility · waiting for production','CaptureScreen');
    await page.getByRole('button',{name:'Start capture',exact:true}).click();
    await take('W02-capture-consent','Capture privacy consent','CaptureControls');
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByLabel('Capture from').selectOption('player');
    await page.getByRole('button',{name:'Start capture',exact:true}).click();
    await take('W05-player-consent','Player-PC GEP capture consent and identity guidance','CaptureControls');
    await desk('capture-active');
    await take('W03-capture-active','Capture process active · fixture packet rate','CaptureScreen');
    await desk('capture-connected');
    await take('W04-relay-connected','LAN consumer connected','CaptureScreen');
    await desk('readiness');
    await page.getByRole('button',{name:'Settings & help',exact:true}).click();
    await page.getByRole('button',{name:'Advanced browser sources',exact:true}).click();
    await take('X01-outputs-empty','First browser source','SourceOutputs');
    await page.getByRole('button',{name:'+ Add output',exact:true}).click();
    await take('X02-output-form','Add existing HUD overlay output','SourceOutputs');
    await desk('outputs-list');
    await page.getByRole('button',{name:'Settings & help',exact:true}).click();
    await page.getByRole('button',{name:'Advanced browser sources',exact:true}).click();
    await take('X03-output-list','Local HTTP browser source inventory','SourceOutputs');
    await page.getByRole('button',{name:/^LAN /}).click();
    await take('X04-output-lan','LAN browser source address','SourceOutputs');
    await page.getByRole('button',{name:'Remove',exact:true}).click();
    await take('X05-remove-output','Remove browser output confirmation','SourceOutputs');
    await desk('readiness');
    await page.getByText('Fix on-air match data',{exact:true}).click();
    await page.getByRole('button',{name:'Fix map score',exact:true}).click();
    await page.getByLabel('Team A',{exact:true}).fill('13');
    await page.getByLabel('Team B',{exact:true}).fill('7');
    await page.getByLabel('Reason',{exact:true}).fill('Demo operator correction');
    await page.getByRole('button',{name:'Review correction',exact:true}).scrollIntoViewIfNeeded();
    await take('Y01-score-form','Review a local map correction','ScoreCorrection');
    await page.getByRole('button',{name:'Review correction',exact:true}).click();
    await take('Y02-score-confirm','Confirm local HUD correction','ScoreCorrection');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByLabel('Apply to', { exact: true }).selectOption('air_and_bracket');
    await take('Y03-result-scope', 'Air plus official result review, with explicit authorization boundary', 'ScoreCorrection');
    await go('/broadcast/shows/'+id, 'result-review');
    await page.getByRole('button', { name: 'Review result', exact: true }).scrollIntoViewIfNeeded();
    await take('Y04-official-proposal', 'Current official score beside the pending Air proposal', 'BroadcastResultReview');
    await page.getByRole('button', { name: 'Review result', exact: true }).click();
    await page.getByRole('button', { name: 'Apply official result', exact: true }).scrollIntoViewIfNeeded();
    await take('Y05-official-confirm', 'Explicit confirmation before applying the tournament result', 'BroadcastResultReview');
    await go('/broadcast/shows/'+id, 'result-stale');
    await page.getByRole('button', { name: 'Review result', exact: true }).click();
    await page.getByRole('button', { name: 'Apply official result', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'official map score changed' }).waitFor();
    await take('Y06-stale-official-result', 'Changed official result blocks the stale approval', 'BroadcastResultReview');
    await go('/broadcast/crew/shows/'+id, 'result-viewer');
    await page.getByText(/Viewing only/).scrollIntoViewIfNeeded();
    await take('Y07-result-viewer', 'Assigned crew can inspect proposals without result permission', 'BroadcastResultReview');
    for(const [screen,pageName,label] of [['workspace-matches','Matches','Match-day match list'],['workspace-players','Teams & players','Original identities and HUD nicknames'],['workspace-live','Live match','Live game telemetry'],['workspace-live-stale','Live match','Stale live feed recovery'],['workspace-empty','Matches','No prepared matches']]){await desk(screen);await page.getByRole('button',{name:pageName,exact:true}).click();await take('U'+(30+records.filter(row=>row.id.startsWith('U3')).length)+'-'+screen,label,'MatchDayPages / LiveMatchPage');}
    await desk('workspace-live');await page.getByRole('button',{name:'Live match',exact:true}).click();await page.getByRole('tab',{name:'Incoming packets',exact:true}).click();await page.getByRole('button',{name:'Pause display',exact:true}).click();await take('U40-packets','Local packets · display paused while capture continues','LiveMatchPage');
    await page.getByRole('button',{name:'Connections',exact:true}).click();await take('U41-connections','OBS and observer connection forms','ConnectionsPage');await page.getByLabel('Observer address',{exact:true}).fill('192.168.1.24');await page.getByLabel('Observer connection key',{exact:true}).fill('masked-sample-connection-key');await take('U42-observer','Add observer with separate address, port and masked key','ConnectionsPage');
    await page.getByRole('button',{name:'Settings & help',exact:true}).click();await take('U43-walkthrough','First-broadcast walkthrough and appearance settings','HelpPage / Walkthrough');await page.getByRole('tab',{name:'Light',exact:true}).click();await page.getByRole('button',{name:'Matches',exact:true}).click();await take('U44-matches-light','Match-day workspace in light appearance','MatchesPage / WorkspaceShell');
    for(const screen of ['projects-signin','projects-list','projects-offline','projects-conflict']){await desk(screen);await page.getByRole('button',{name:'Matches',exact:true}).click();await page.getByRole('button',{name:'Create a match',exact:true}).click();if(screen==='projects-conflict')await page.getByRole('button',{name:'Open project',exact:true}).click();await take('U'+(45+['projects-signin','projects-list','projects-offline','projects-conflict'].indexOf(screen))+'-'+screen,'Independent broadcast · '+screen,'ProjectsPage');}
    await desk('workspace-home');await take('U56-broadcast-setup','Broadcast setup: four steps with the next action','BroadcastHome / WorkspaceShell');
    await desk('template');await page.getByRole('button',{name:'Add screen',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:/^Match HUD/}).waitFor();await take('U50-screen-library','Add individual screens with preview','ScreenLibrary');await page.getByRole('dialog').getByRole('tab',{name:'Templates',exact:true}).click();await take('U51-template-library','Preview a ready-made broadcast screen set','ScreenLibrary');await page.getByRole('button',{name:'Close library',exact:true}).click();await page.locator('.workspace-sidebar').getByRole('button',{name:'HUD controls',exact:true}).click();await page.getByRole('heading',{name:'HUD controls',exact:true}).waitFor();await take('U52-hud-layers','HUD layers, banner appearance and read-only draft preview','HudControlsPage');for(const [key,label] of [['53','Screen content'],['54','Live graphics'],['55','Match data']]){await page.getByRole('tab',{name:label,exact:true}).click();await take('U'+key+'-hud-controls',label+' in the HUD control panel','HudControlsPage');}
    await desk('template');await page.getByRole('button',{name:'Bracket graphics',exact:true}).click();await take('V39-bracket-settings','Published bracket stage, section and pagination controls','BracketPage');
    await go('/air');await page.getByRole('heading',{name:'Your matches. Ready for air.',exact:true}).waitFor();await take('B10-independent-web','Account-owned independent projects on web','AirWorkspacePage');
    await go('/admin/air');await page.getByRole('heading',{name:'Broadcast operations.',exact:true}).waitFor();await take('P10-air-customers','Dedicated Air super-admin customers and licenses','AirAdminPage');for(const [index,label] of ['Workspaces','Plans','Devices','Audit history','Releases'].entries()){await page.getByRole('button',{name:label,exact:true}).click();await take('P'+(11+index)+'-air-'+label.toLowerCase().replaceAll(' ','-'),'Air admin · '+label,'AirAdminPage / AirAdminTable');}await page.getByRole('button',{name:'Add release',exact:true}).click();await take('P16-air-release-editor','Manual release information editor','AirAdminForm');await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Customers & licenses',exact:true}).click();await page.getByRole('button',{name:'Manage access',exact:true}).click();await take('P17-air-access-grant','Manual access grant, extension and device allowances','AirAdminForm / AirGrantFields');
    await desk('offline');
    await take('Z01-offline','Platform disconnected · local systems and queued records','ProductionReadiness');
    await page.setViewportSize({width:390,height:844});
    for(const [name,route,title] of [
      ['A04-tournament-phone','/organizer/tournament/spring-invitational?tab=broadcast','Tournament Broadcast on a phone'],
      ['B03-home-phone','/broadcast/home','Broadcast home on a phone'],
      ['E10-preparation-phone','/broadcast/get-started?showId='+id+'&step=3','Preparation step selector on a phone'],
      ['M03-rundown-phone','/broadcast/shows/'+id,'Rundown on a phone'],
      ['O03-report-phone','/broadcast/shows/'+id+'/report','Post-show report on a phone'],
    ]){await go(route);await take(name,title,'Current web page at phone viewport');}
    assert.deepEqual(errors,[]);
    const report={date:'2026-10-16',screenshots:screenshotCount,groups:[...new Set(records.map(r=>r.group))].sort(),liveServices:false,records};
    assert.equal(report.groups.length,26,'Every A–Z journey group must have an actual screen');
    fs.writeFileSync(path.join(artifacts,'manifest.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({screenshots:screenshotCount,groups:report.groups.length,rendererErrors:errors,overflowScreens:records.filter(r=>r.horizontalOverflow).map(r=>r.id),liveServices:false}));
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.equal(path.dirname(temporary), os.tmpdir());
    assert.ok(path.basename(temporary).startsWith('air-web-product-'));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
