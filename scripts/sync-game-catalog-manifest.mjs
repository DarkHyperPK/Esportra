#!/usr/bin/env node
/**
 * Updates src/data/gameCatalogSync.json from the backend authoritative catalog.
 *
 * Usage:
 *   node scripts/sync-game-catalog-manifest.mjs
 *   BACKEND_CATALOG_PATH=/path/to/esportsGames.json node scripts/sync-game-catalog-manifest.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const defaultBackendCatalog = path.resolve(
  repoRoot,
  '../esportra-backend/src/Esportra.Api/GameCatalog/esportsGames.json',
);

const backendCatalogPath = path.resolve(
  process.env.BACKEND_CATALOG_PATH?.trim() || defaultBackendCatalog,
);

const syncPath = path.join(repoRoot, 'src/data/gameCatalogSync.json');
const e2eCatalogFixturePath = path.join(repoRoot, 'e2e/fixtures/backend-catalog.json');

if (!fs.existsSync(backendCatalogPath)) {
  console.error(`Backend catalog not found: ${backendCatalogPath}`);
  console.error('Set BACKEND_CATALOG_PATH to the authoritative esportsGames.json');
  process.exit(1);
}

const raw = fs.readFileSync(backendCatalogPath, 'utf8');
const catalog = JSON.parse(raw);
const contentHash = crypto.createHash('sha256').update(raw).digest('hex');

if (!catalog.catalogVersion || typeof catalog.schemaVersion !== 'number') {
  console.error('Backend catalog must include catalogVersion and schemaVersion');
  process.exit(1);
}

const manifest = {
  catalogVersion: catalog.catalogVersion,
  schemaVersion: catalog.schemaVersion,
  contentHash,
  backendCatalogRelativePath: 'src/Esportra.Api/GameCatalog/esportsGames.json',
  updatedAt: new Date().toISOString().slice(0, 10),
};

fs.writeFileSync(syncPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
fs.writeFileSync(e2eCatalogFixturePath, raw, 'utf8');
console.log(`Updated ${path.relative(repoRoot, syncPath)}`);
console.log(`Updated ${path.relative(repoRoot, e2eCatalogFixturePath)}`);
console.log(`  catalogVersion: ${manifest.catalogVersion}`);
console.log(`  contentHash:    ${manifest.contentHash}`);
