import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://staging.esportra.com';
const SUPABASE_ANON_KEY =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTczNTY4OTYwMCwiZXhwIjo0OTI5MjEzMzAwLCJyb2xlIjoiYW5vbiJ9.hf-OwAS-7NHhqN-AkMOYCN4JCXATMsPY-zmP5B-lN0A';
const STORAGE_KEY = 'sb-staging-auth-token';

async function supabaseSignIn(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase sign-in failed (${res.status}): ${text}`);
  }
  return res.json();
}

export default async function globalSetup(_config: FullConfig) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_EMAIL and E2E_PASSWORD environment variables must be set to run e2e tests.\n' +
        'Example: E2E_EMAIL=player2@gmail.com E2E_PASSWORD=yourpassword npx playwright test',
    );
  }

  const session = await supabaseSignIn(email, password);

  // Supabase auth-js v2 stores the full session object under STORAGE_KEY
  const storageValue = JSON.stringify({
    access_token: session.access_token,
    token_type: session.token_type ?? 'bearer',
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the app so the origin is set, then inject auth into localStorage
  await page.goto('http://localhost:3000');
  await page.evaluate(
    ({
      key,
      value,
      announcementKey,
      betaKey,
    }: {
      key: string;
      value: string;
      announcementKey: string;
      betaKey: string;
    }) => {
      localStorage.setItem(key, value);
      // Dismiss modals that block test interactions
      localStorage.setItem(announcementKey, '1');
      localStorage.setItem(betaKey, 'true');
    },
    {
      key: STORAGE_KEY,
      value: storageValue,
      announcementKey: 'esportra_seen_feature_avatars_v1',
      betaKey: 'beta-notice-permanent-dismiss',
    },
  );

  const authDir = path.join(process.cwd(), 'e2e', '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  await context.storageState({ path: path.join(authDir, 'user.json') });

  await browser.close();
}
