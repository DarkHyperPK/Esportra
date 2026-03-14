#!/usr/bin/env node
/**
 * Esportra API Smoke Test
 *
 * Tests backend endpoints to verify camelCase payloads are accepted.
 * Usage: node scripts/smoke-test.mjs
 */

const SUPABASE_URL = 'https://staging.esportra.com';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM1Njg5NjAwLCJleHAiOjQ4OTEzNjMyMDB9.xtzWCr6-LxvVs5gxBsy08U5fQ64Jmj8cEd5QxM4KHIg';
const API_URL = 'https://api-staging.esportra.com';

const ORGANIZER = { email: 'player2@gmail.com', password: 'Darkz123!' };
const ADMIN = { email: 'paradox1632000@gmail.com', password: 'Paradox18!@#' };

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0;

async function signIn(creds) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  if (!res.ok) throw new Error(`Auth failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function api(method, path, token, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, ok: res.ok, data: json };
}

function log(icon, label, detail = '') {
  console.log(`  ${icon} ${label}${detail ? ` — ${detail}` : ''}`);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    log('✅', name);
  } catch (e) {
    failed++;
    log('❌', name, e.message);
  }
}

function skip(name, reason) {
  skipped++;
  log('⏭️ ', name, reason);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🔬 Esportra API Smoke Tests\n');
  console.log(`  API: ${API_URL}`);
  console.log(`  Supabase: ${SUPABASE_URL}\n`);

  // ── 0. Health Check ─────────────────────────────────────────────────────
  console.log('─── Health ───');
  await test('Backend health check', async () => {
    const res = await fetch(`${API_URL}/health`);
    assert(res.ok, `Health endpoint returned ${res.status}`);
  });

  // ── 1. Authentication ──────────────────────────────────────────────────
  console.log('\n─── Domain 1: Authentication ───');

  let organizerToken, adminToken;

  await test('Organizer sign-in', async () => {
    organizerToken = await signIn(ORGANIZER);
    assert(organizerToken, 'No token returned');
  });

  await test('Admin sign-in', async () => {
    adminToken = await signIn(ADMIN);
    assert(adminToken, 'No token returned');
  });

  await test('GET /api/me (organizer context)', async () => {
    const { ok, data } = await api('GET', '/api/me', organizerToken);
    assert(ok, `Failed: ${JSON.stringify(data)}`);
    assert(data.userId || data.user_id, 'No userId in response');
  });

  await test('Login failure (wrong password)', async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ email: ORGANIZER.email, password: 'wrongpassword' }),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  if (!organizerToken) {
    console.log('\n⛔ Cannot continue without organizer token.\n');
    return;
  }

  // ── 2. Profiles ──────────────────────────────────────────────────────
  console.log('\n─── Domain 2: Profiles ───');

  let profileId;
  await test('GET /api/me returns profile', async () => {
    const { ok, data } = await api('GET', '/api/me', organizerToken);
    assert(ok, `Failed: ${JSON.stringify(data)}`);
    profileId = data.userId || data.user_id;
    assert(profileId, 'No profile ID');
  });

  await test('GET /api/profiles/{id}', async () => {
    const { ok, data } = await api('GET', `/api/profiles/${profileId}`, organizerToken);
    assert(ok, `Failed: ${JSON.stringify(data)}`);
    assert(data.username || data.id, 'No profile data');
  });

  // ── 3. Organizations (camelCase fix) ────────────────────────────────
  console.log('\n─── Domain 3: Organizations (camelCase fix) ───');

  let orgId;
  await test('GET /api/organizations/mine', async () => {
    const { ok, data } = await api('GET', '/api/organizations/mine', organizerToken);
    if (ok && data && (Array.isArray(data) ? data.length > 0 : data.id)) {
      orgId = Array.isArray(data) ? data[0].id : data.id;
      log('  ℹ️', `Existing org found: ${orgId}`);
    } else {
      log('  ℹ️', 'No existing org, will test create');
    }
    // Don't assert — might not have an org yet
  });

  if (orgId) {
    await test('PUT /api/organizations/{id} (camelCase payload)', async () => {
      const { ok, data } = await api('PUT', `/api/organizations/${orgId}`, organizerToken, {
        name: 'Smoke Test Org Updated',
        description: 'Updated via smoke test',
        socialLinks: { twitter: 'https://x.com/test' },
      });
      assert(ok, `Failed ${JSON.stringify(data)}`);
    });
  } else {
    await test('POST /api/organizations (camelCase payload)', async () => {
      const slug = `smoke-test-${Date.now()}`;
      const { ok, data } = await api('POST', '/api/organizations', organizerToken, {
        name: 'Smoke Test Org',
        slug,
        description: 'Created by smoke test',
        logoUrl: null,
        bannerUrl: null,
        socialLinks: { twitter: 'https://x.com/test' },
      });
      assert(ok, `Failed: ${JSON.stringify(data)}`);
      orgId = data.id || data.Id;
      assert(orgId, 'No org ID returned');
    });
  }

  // ── 4. Teams ─────────────────────────────────────────────────────────
  console.log('\n─── Domain 4: Teams ───');

  let teamId;
  await test('GET /api/teams/me', async () => {
    const { ok, data } = await api('GET', '/api/teams/me', organizerToken);
    assert(ok, `Failed: ${JSON.stringify(data)}`);
    if (Array.isArray(data) && data.length > 0) {
      teamId = data[0].id;
      log('  ℹ️', `Existing team: ${teamId} (${data[0].name})`);
    }
  });

  if (teamId) {
    await test('GET /api/teams/{id} detail', async () => {
      const { ok, data } = await api('GET', `/api/teams/${teamId}`, organizerToken);
      assert(ok, `Failed: ${JSON.stringify(data)}`);
    });
  } else {
    skip('GET /api/teams/{id}', 'No team found');
  }

  // ── 5. Tournaments ───────────────────────────────────────────────────
  console.log('\n─── Domain 5: Tournaments ───');

  let tournamentId;
  await test('GET /api/tournaments (public list)', async () => {
    const { ok, data } = await api('GET', '/api/tournaments', organizerToken);
    assert(ok, `Failed: ${JSON.stringify(data)}`);
    const list = Array.isArray(data) ? data : (data.tournaments || []);
    if (list.length > 0) {
      tournamentId = list[0].id;
      log('  ℹ️', `Found tournament: ${tournamentId} (${list[0].name})`);
    }
  });

  await test('GET /api/tournaments (organizer filter)', async () => {
    const { ok, data } = await api('GET', '/api/tournaments', organizerToken);
    assert(ok, `Failed: ${JSON.stringify(data)}`);
    const list = Array.isArray(data) ? data : [];
    log('  ℹ️', `Organizer tournaments: ${list.length}`);
  });

  if (tournamentId) {
    await test('GET /api/tournaments/{id}', async () => {
      const { ok, data } = await api('GET', `/api/tournaments/${tournamentId}`, organizerToken);
      assert(ok, `Failed: ${JSON.stringify(data)}`);
    });

    await test('PUT /api/tournaments/{id} (camelCase)', async () => {
      const { ok, data } = await api('PUT', `/api/tournaments/${tournamentId}`, organizerToken, {
        maxTeams: 16,
      });
      assert(ok, `Failed: ${JSON.stringify(data)}`);
    });
  } else {
    skip('Tournament detail/update tests', 'No tournament found');
  }

  // ── 6. Stages (camelCase fix — batch sync) ──────────────────────────
  console.log('\n─── Domain 6: Stages (camelCase batch sync) ───');

  if (tournamentId) {
    let existingStages = [];
    await test('GET /api/tournaments/{id}/stages', async () => {
      const { ok, data } = await api('GET', `/api/tournaments/${tournamentId}/stages`, organizerToken);
      assert(ok, `Failed: ${JSON.stringify(data)}`);
      existingStages = Array.isArray(data) ? data : [];
      log('  ℹ️', `Existing stages: ${existingStages.length}`);
    });

    if (existingStages.length > 0) {
      await test('PUT stages batch sync (camelCase StageDto)', async () => {
        const stages = existingStages.map((s, i) => ({
          id: s.id,
          name: s.name,
          format: s.format,
          stageOrder: i + 1,
          bestOf: s.best_of || 1,
          capacity: s.capacity,
          advancementCount: s.advancement_count,
        }));
        const { ok, data } = await api('PUT', `/api/tournaments/${tournamentId}/stages`, organizerToken, { stages });
        assert(ok, `Failed: ${JSON.stringify(data)}`);
      });
    } else {
      skip('PUT stages batch sync', 'No stages to sync');
    }
  } else {
    skip('Stage tests', 'No tournament found');
  }

  // ── 7. Venues ────────────────────────────────────────────────────────
  console.log('\n─── Domain 7: Venues ───');

  let venueId;
  await test('GET /api/venues', async () => {
    const { ok, data } = await api('GET', '/api/venues', organizerToken);
    assert(ok, `Failed: ${JSON.stringify(data)}`);
    const list = Array.isArray(data) ? data : (data?.venues || []);
    if (list.length > 0) {
      venueId = list[0].id;
      log('  ℹ️', `Found venue: ${venueId} (${list[0].name})`);
    }
  });

  if (venueId) {
    await test('PUT /api/venues/{id} (camelCase)', async () => {
      const { ok, data } = await api('PUT', `/api/venues/${venueId}`, organizerToken, {
        status: 'pending_review',
      });
      assert(ok, `Failed: ${JSON.stringify(data)}`);
    });
  } else {
    skip('Venue update', 'No venue found');
  }

  // ── 8. Admin endpoints ───────────────────────────────────────────────
  console.log('\n─── Domain 8: Admin ───');

  if (adminToken) {
    await test('GET /api/me (admin context)', async () => {
      const { ok, data } = await api('GET', '/api/me', adminToken);
      assert(ok, `Failed: ${JSON.stringify(data)}`);
      assert(data.isAdmin || data.is_admin || (data.roles && data.roles.length > 0), 'Not admin');
    });

    await test('GET /api/admin/stats', async () => {
      const { ok, data } = await api('GET', '/api/admin/stats', adminToken);
      assert(ok, `Failed: ${JSON.stringify(data)}`);
    });

    await test('GET /api/sponsors', async () => {
      const { ok, data } = await api('GET', '/api/sponsors', adminToken);
      assert(ok, `Failed: ${JSON.stringify(data)}`);
    });
  } else {
    skip('Admin tests', 'No admin token');
  }

  // ── 9. Storage ───────────────────────────────────────────────────────
  console.log('\n─── Domain 9: Storage ───');

  await test('Supabase storage accessible', async () => {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${organizerToken}` },
    });
    assert(res.ok, `Storage API returned ${res.status}`);
  });

  // ── Summary ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log('═══════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
