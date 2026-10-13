// Real broadcast components with synthetic local API/DB fixtures.
// This verifies browser interactions and layout, not live service integration.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const artifacts = path.resolve(root, '../Esportra-Air/docs/audits/product-smoke');
const id = '5e182c34-49f8-40d3-bf6c-88b576c20c45';
const tournamentId = '8a874bf4-ee36-4e05-ac65-d553c620ab94', tournamentOrgId = '6bafe2cd-911f-4f96-b55a-e19636ee7677', tournamentShowId = 'f55b45be-c24e-40f7-ba2a-14e8a2aacabc';
const show = {
  id, orgId: id, title: 'Invitational · Championship desk', status: 'scheduled',
  tournamentId: id, tournamentName: 'Esportra Invitational', scheduledAt: null,
  startedAt: null, endedAt: null, createdAt: '2026-10-13T10:00:00Z',
  nodeCount: 1, matchSlotCount: 1, matchSlotsWithCode: 1, talentCount: 0,
  sponsorCount: 0, crewCount: 2, lastSyncedAt: null,
  matchSlots: [{ id, matchId: id, matchCode: 'FINAL', displayOrder: 0,
    teamA: 'Team North', teamB: 'Team South', bestOf: 3 }],
};
const segments = [
  { id, show_id: id, type: 'holding', title: 'Stand by · opening', duration_seconds: 60, status: 'pending', display_order: 0, config: { notes: '' } },
  { id: 'cf507ae4-9468-4f40-96aa-5a5ff01459c5', show_id: id, type: 'casters', title: 'Desk introduction', duration_seconds: 180, status: 'pending', display_order: 1, config: { notes: '' } },
];
async function main() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'air-web-product-'));
  fs.mkdirSync(artifacts, { recursive: true });
  const requests = [], talents = [], errors = [];
  const shows = [show];
  const duplicateId = '7197a7d3-90fc-41af-859f-45a7c00173c0';
  let nodeRevoked = false, screenshotCount = 0;
  let browser;
  const entry = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
    import Home from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastHomePage';
    import Crew from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastCrewWorkspacePage';
    import Setup from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastGetStartedPage';
    import ShowSetup from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastSetupPage';
    import Shows from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastShowsPage';
    import Nodes from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastNodeMonitorPage';
    import Activity from '${root.replace(/\\/g, '/')}/src/pages/broadcast/BroadcastActivityPage';
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
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[location.pathname + location.search]}><Routes>
      <Route path='/broadcast' element={<Home />} />
      <Route path='/broadcast/get-started' element={<Setup />} />
      <Route path='/broadcast/shows' element={<Shows />} />
      <Route path='/broadcast/shows/:showId/nodes' element={<Nodes />} />
      <Route path='/broadcast/shows/:showId/activity' element={<Activity />} />
      <Route path='/broadcast/shows/:showId/setup' element={<ShowSetup />} />
      <Route path='/organizer/tournament/:slug' element={<TournamentFixture />} />
      <Route path='/broadcast/crew/shows/:showId' element={<Crew />} />
      <Route path='/broadcast/crew/shows' element={<Crew />} />
    </Routes></MemoryRouter></QueryClientProvider>);
  `;
  const stubs = {
    '@/hooks/useMyOrganizationId': `export const useMyOrganizationId = () => '${id}';`,
    '@/lib/apiClient': `
      async function request(method, route, body) {
        const response = await fetch(route, { method, headers: {'Content-Type':'application/json'}, body: body === undefined ? undefined : JSON.stringify(body) });
        if (!response.ok) throw new Error('Synthetic fixture rejected request');
        return response.json();
      }
      export const apiClient = { get: p=>request('GET',p), post:(p,b)=>request('POST',p,b), patch:(p,b)=>request('PATCH',p,b), delete:p=>request('DELETE',p) };
      export const getApiErrorMessage = (_error, fallback) => fallback;
    `,
    '@/lib/supabase': `
      const rows = ${JSON.stringify(segments)};
      function query() { const q = { select:()=>q, eq:()=>q, order:()=>q, limit:async()=>({data:rows,error:null}) }; return q; }
      export const supabase = { from:()=>query() };
    `,
  };
  const built = await esbuild.build({
    stdin: { contents: entry, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    tsconfig: path.join(root, 'tsconfig.json'),
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'isolated-fixtures', setup(build) {
      build.onResolve({ filter: /^@\// }, args => stubs[args.path] ? { path: args.path, namespace: 'fixture' } : undefined);
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: stubs[args.path], loader: 'js' }));
    } }],
  });
  const cssFiles = fs.readdirSync(path.join(root, 'dist/assets')).filter(name => name.endsWith('.css'));
  assert.ok(cssFiles.length, 'Build web app before this smoke check');
  const css = cssFiles.map(name => fs.readFileSync(path.join(root, 'dist/assets', name), 'utf8')).join('\n');
  const server = http.createServer(async (req, res) => {
    const route = new URL(req.url, 'http://localhost').pathname;
    if (route === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(built.outputFiles[0].contents); }
    if (route === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css); }
    if (!route.startsWith('/api/')) {
      if (/\.(woff2?|png|svg|jpg)$/.test(route)) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', 'text/html');
      return res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body style="background:#09090b"><div id="root"></div><script src="/fixture.js"></script></body></html>');
    }
    let body = ''; for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, route, query: new URL(req.url, 'http://localhost').search, body: body ? JSON.parse(body) : null });
    res.setHeader('Content-Type', 'application/json');
    const send = data => res.end(JSON.stringify(data));
    const node = { id, name: 'Production desk', lastSeenAt: new Date().toISOString(), isActive: true };
    const crewShow = { id, title: show.title, status: show.status, role: 'observer' };
    if (route === '/api/broadcast/home') return send({ shows: [show], nodes: [node], crewCount: 2, alerts: [] });
    if (route === '/api/broadcast/nodes') return send(nodeRevoked ? [] : [node]);
    if (route === `/api/broadcast/nodes/${id}` && req.method === 'DELETE') { nodeRevoked = true; return send({ success: true }); }
    if (route === `/api/organizations/${id}/tournaments`) return send([{ id, name: show.tournamentName, slug: 'invitational', game: 'valorant' }]);
    if (route === '/api/broadcast/shows') return send(shows);
    if (route === `/api/tournaments/${tournamentId}/broadcast`) return send({ tournament: { id:tournamentId,name:'Spring Invitational',slug:'spring-invitational',game:'valorant',organizationId:tournamentOrgId },canManage:true,access:'ready',organizations:[],shows:shows.filter(s=>s.tournamentId===tournamentId).map(s=>({id:s.id,title:s.title,status:s.status,scheduledAt:s.scheduledAt,lastSyncedAt:s.lastSyncedAt,matchCount:1})) });
    if (route === `/api/tournaments/${tournamentId}/broadcast/shows`) { const draft={...show,id:tournamentShowId,title:JSON.parse(body).title,status:'draft',orgId:tournamentOrgId,tournamentId,tournamentName:'Spring Invitational',tournamentSlug:'spring-invitational',scheduledAt:null,lastSyncedAt:null};shows.push(draft);return send({showId:tournamentShowId,orgId:tournamentOrgId,tournamentId}); }
    if (route.endsWith('/configuration')) {
      const current=shows.find(s=>route===`/api/broadcast/shows/${s.id}/configuration`);
      if(current) return send({showId:current.id,title:current.title,eventLabel:current.tournamentName,game:'valorant',matches:[{matchId:id,matchCode:'FINAL',bestOf:3,teams:[{name:'Team North'},{name:'Team South'}],veto:[{action:'pick',map:'Haven',team:1,pickedByTeam:1,side:'DEF'}]}],rundown:segments.map(s=>({id:s.id,title:s.title,type:s.type}))});
    }
    if (route === `/api/broadcast/shows/${id}/duplicate`) { shows.push({ ...show, id: duplicateId, title: show.title + ' (copy)', status: 'draft', scheduledAt: null, lastSyncedAt: null }); return send({ showId: duplicateId }); }
    if (route === `/api/broadcast/shows/${duplicateId}` && req.method === 'DELETE') { shows.splice(shows.findIndex(s => s.id === duplicateId), 1); return send({ success: true }); }
    if (route === `/api/broadcast/shows/${id}/activity`) {
      const older = new URL(req.url, 'http://localhost').searchParams.has('beforeId');
      return send({ items: older ? [{ id: duplicateId, eventType: 'SegmentArm', source: 'node', createdAt: '2026-10-14T12:00:00Z', nodeName: node.name }] : [
        { id, eventType: 'SegmentTake', source: 'node', createdAt: '2026-10-14T12:02:00Z', nodeName: node.name },
        { id: 'cf507ae4-9468-4f40-96aa-5a5ff01459c5', eventType: 'Hold', source: 'node', createdAt: '2026-10-14T12:01:00Z', nodeName: node.name },
      ], nextCursor: older ? null : { beforeAt: '2026-10-14T12:01:00Z', beforeId: id } });
    }
    if (route === '/api/broadcast/nodes/codes') return send({ code: 'TEST061A', expiresAt: new Date(Date.now() + 300000).toISOString() });
    if (route === '/api/broadcast/crew/shows') return send([crewShow]);
    if (route === `/api/broadcast/crew/shows/${id}`) return send({ show: crewShow, matches: [{ code: 'FINAL' }], rundown: segments.map(s => ({id:s.id,title:s.title,type:s.type,status:s.status,durationSeconds:s.duration_seconds})) });
    if (route.endsWith('/crew')) return send({ crew: [{ id }], pendingInvites: [] });
    if (route.endsWith('/sponsors')) return send([]);
    if (route.endsWith('/available-matches')) return send([]);
    if (route.endsWith('/talent')) {
      if (req.method === 'POST') talents.push({ id, ...JSON.parse(body) });
      return send(req.method === 'POST' ? { id } : talents);
    }
    if (route.endsWith('/push-config')) { show.lastSyncedAt = new Date().toISOString(); return send({ success: true }); }
    const requestedShow = shows.find(s => route === `/api/broadcast/shows/${s.id}`);
    if (requestedShow) { if (req.method === 'PATCH') Object.assign(requestedShow, JSON.parse(body)); return send(requestedShow); }
    res.statusCode = 404; return send({ error: 'No synthetic fixture for this endpoint' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 950 }, reducedMotion: 'reduce', timezoneId: 'Asia/Karachi' });
    page.on('pageerror', error => errors.push(error.message));
    const capture = async name => {
      // Capture the selected view after existing layout transitions settle.
      await page.mouse.move(0, 0);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(artifacts, name), fullPage: true });
      screenshotCount++;
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: horizontal overflow`);
    };
    await page.goto(`${base}/broadcast`);
    await page.getByText(show.title, { exact: true }).waitFor();
    await capture('web-home.png');
    await page.getByRole('button', { name: 'Pair desktop node', exact: true }).click();
    await page.getByRole('button', { name: /Generate code/ }).click();
    await page.getByText('TEST 061A', { exact: true }).waitFor();
    await capture('web-pairing.png');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.goto(`${base}/broadcast/get-started?showId=${id}&step=2`);
    await page.getByRole('heading', { name: 'Matches & codes', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Match 1 code').inputValue(), 'FINAL');
    await capture('web-setup-matches.png');
    await page.getByRole('button', { name: /On-air talent/ }).click();
    await page.getByRole('heading', { name: 'On-air talent', exact: true }).waitFor();
    await capture('web-setup-talent.png');
    await page.getByRole('button', { name: /Send to desktop/ }).click();
    await page.getByText('Current plan for Air', { exact: true }).waitFor();
    await page.getByText('pick: Haven', { exact: true }).waitFor();
    await capture('web-air-configuration.png');
    await page.getByRole('button', { name: 'Send configuration', exact: true }).click();
    await page.getByText('Configuration sent. Verify receipt and readiness in the desktop app.').waitFor();
    assert.ok(requests.some(r => r.method === 'POST' && r.route.endsWith('/push-config')));
    await page.goto(`${base}/broadcast/crew/shows/${id}`);
    await page.getByRole('heading', { name: 'Your job', exact: true }).waitFor();
    await capture('web-crew-workspace.png');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/broadcast/get-started?showId=${id}&step=3`);
    await page.getByRole('heading', { name: 'Desktop nodes', exact: true }).waitFor();
    const selector = page.getByRole('combobox');
    assert.equal(await selector.locator('option').count(), 9);
    await capture('web-setup-phone.png');
    await selector.selectOption('7');
    await page.getByRole('heading', { name: 'Rundown', exact: true }).waitFor();
    await capture('web-rundown-phone.png');
    await page.goto(`${base}/broadcast`);
    await page.getByText(show.title, { exact: true }).waitFor();
    await capture('web-home-phone.png');
    await page.setViewportSize({ width: 1366, height: 950 });
    await page.goto(`${base}/broadcast/shows/${id}/activity`);
    await page.getByText('Segment Take', { exact: true }).waitFor();
    await capture('web-activity.png');
    await page.getByRole('button', { name: 'Load older records', exact: true }).click();
    await page.getByText('Segment Arm', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Load older records', exact: true }).waitFor({ state: 'detached' });
    await page.goto(`${base}/broadcast/shows/${id}/nodes`);
    await page.getByRole('button', { name: 'Revoke node access', exact: true }).waitFor();
    await capture('web-node-monitor.png');
    await page.getByRole('button', { name: 'Revoke node access', exact: true }).click();
    await capture('web-node-revoke.png');
    assert.ok(!requests.some(r => r.method === 'DELETE'));
    await page.getByRole('button', { name: 'Revoke access', exact: true }).click();
    await page.getByText('No nodes paired. Generate a code and enter it in the desktop app.').waitFor();
    await page.goto(`${base}/broadcast/get-started?showId=${id}&step=0`);
    await page.getByRole('button', { name: 'Edit show identity', exact: true }).click();
    const schedule = page.getByLabel('Planned start', { exact: false });
    await schedule.fill('2026-10-20T18:00');
    await capture('web-schedule.png');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(show.scheduledAt, '2026-10-20T13:00:00.000Z');
    await page.goto(`${base}/broadcast/shows`);
    await page.getByRole('button', { name: `Duplicate ${show.title}`, exact: true }).click();
    await page.getByText(show.title + ' (copy)', { exact: true }).waitFor();
    await page.goto(`${base}/broadcast/shows`);
    await page.getByRole('button', { name: `Delete ${show.title} (copy)`, exact: true }).click();
    await page.getByRole('button', { name: 'Delete show', exact: true }).click();
    await page.getByRole('alertdialog').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: `Delete ${show.title} (copy)`, exact: true }).waitFor({ state: 'detached' });
    await capture('web-shows.png');
    await page.goto(`${base}/organizer/tournament/spring-invitational?tab=overview`);
    await page.getByRole('button', { name: 'Broadcast', exact: true }).click();
    await page.getByRole('heading', { name: 'Broadcast this tournament.', exact: true }).waitFor();
    await capture('web-tournament-broadcast.png');
    await page.getByRole('button', { name: 'Pair production desk', exact: true }).click();
    await page.getByRole('button', { name: 'Generate code', exact: true }).click();
    await page.getByText('TEST 061A', { exact: true }).waitFor();
    assert.equal(requests.filter(r=>r.route==='/api/broadcast/nodes/codes').at(-1).body.orgId,tournamentOrgId);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByLabel('Show title', { exact: true }).fill('Tournament desk');
    await page.getByRole('button', { name: 'Create show & prepare', exact: true }).click();
    await page.getByRole('link', { name: 'Back to tournament broadcast', exact: true }).waitFor();
    await capture('web-tournament-setup.png');
    assert.equal(await page.getByRole('link', { name: 'Back to tournament broadcast', exact: true }).getAttribute('href'),'/organizer/tournament/spring-invitational?tab=broadcast');
    await page.getByRole('link', { name: 'Back to tournament broadcast', exact: true }).click();
    await page.getByRole('link', { name: 'Prepare show', exact: true }).click();
    await page.getByRole('link', { name: 'Back to tournament broadcast', exact: true }).waitFor();
    await page.getByRole('button', { name: /Desktop nodes/ }).click();
    await page.getByRole('button', { name: 'Pair desktop node', exact: true }).click();
    await page.getByRole('button', { name: 'Generate code', exact: true }).click();
    await page.getByText('TEST 061A', { exact: true }).waitFor();
    assert.equal(requests.filter(r=>r.route==='/api/broadcast/nodes/codes').at(-1).body.orgId,tournamentOrgId);
    assert.deepEqual(errors, []);
    const report = { browser: 'passed', checks: ['home data', 'pairing request', 'match codes', 'nine-step navigation', 'configuration send', 'crew workspace', 'desktop and phone layout', 'no page errors', 'activity pagination', 'node revocation confirmation', 'schedule timezone', 'duplicate draft', 'delete draft acknowledgment','server configuration preview','tournament dashboard nav/panel','tournament-bound show creation','multi-organization pairing','tournament show preparation route'], screenshots: screenshotCount, liveServices: false };
    fs.writeFileSync(path.join(artifacts, 'web-smoke-result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
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
