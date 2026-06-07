#!/usr/bin/env node
/**
 * One-time helper: uploads public/games/* logos to Supabase game-assets bucket.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-game-logos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const gamesDir = path.join(repoRoot, 'public', 'games');

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error('seed-game-logos: SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  process.exit(1);
}

const slugMap = {
  'valorant-logo.png': 'valorant',
  'cs2-logo.png': 'cs2',
  'lol-logo.png': 'lol',
  'dota2-logo.png': 'dota2',
  'fortnite-logo.png': 'fortnite',
  'apex-logo.png': 'apex',
  'pubg-logo.png': 'pubg',
  'rocket-league-logo.png': 'rocket-league',
  'tekken8-logo.png': 'tekken8',
  'eafc-logo.png': 'eafc',
};

async function upload(filePath, slug) {
  const ext = path.extname(filePath).toLowerCase();
  const storagePath = `logos/${slug}${ext}`;
  const body = fs.readFileSync(filePath);
  const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';

  const response = await fetch(`${supabaseUrl}/storage/v1/object/game-assets/${storagePath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed for ${slug}: ${response.status} ${text}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/game-assets/${storagePath}`;
}

async function main() {
  if (!fs.existsSync(gamesDir)) {
    console.error(`seed-game-logos: missing ${gamesDir}`);
    process.exit(1);
  }

  for (const [fileName, slug] of Object.entries(slugMap)) {
    const filePath = path.join(gamesDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`seed-game-logos: skip missing ${fileName}`);
      continue;
    }
    const url = await upload(filePath, slug);
    console.log(`${slug}: ${url}`);
  }

  console.log('seed-game-logos: done');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
