#!/usr/bin/env node
/**
 * Ensures frontend gameCatalogSync.json matches the backend seed catalog hash/version.
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

function fail(message) {
  console.error(`verify-game-catalog-sync: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(syncPath)) {
  fail(`Missing sync manifest: ${path.relative(repoRoot, syncPath)}`);
}

const manifest = JSON.parse(fs.readFileSync(syncPath, 'utf8'));

if (!manifest.catalogVersion || !manifest.contentHash) {
  fail('gameCatalogSync.json must include catalogVersion and contentHash');
}

if (!/^[a-f0-9]{64}$/.test(manifest.contentHash)) {
  fail('contentHash must be a lowercase SHA-256 hex string');
}

if (fs.existsSync(path.join(repoRoot, 'src/data/esportsGames.json'))) {
  fail('src/data/esportsGames.json must be removed; backend API is the catalog source of truth');
}

if (fs.existsSync(path.join(repoRoot, 'src/data/gameCatalogAssets.json'))) {
  fail('src/data/gameCatalogAssets.json must be removed; logos come from backend catalog API');
}

if (fs.existsSync(backendCatalogPath)) {
  const raw = fs.readFileSync(backendCatalogPath, 'utf8');
  const backend = JSON.parse(raw);
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  if (backend.catalogVersion !== manifest.catalogVersion) {
    fail(
      `catalogVersion drift: manifest=${manifest.catalogVersion} backend=${backend.catalogVersion}. Run: npm run sync:game-catalog`,
    );
  }

  if (hash !== manifest.contentHash) {
    fail(
      `contentHash drift: manifest=${manifest.contentHash} backend=${hash}. Run: npm run sync:game-catalog`,
    );
  }

  console.log('verify-game-catalog-sync: OK (manifest matches backend seed catalog)');
} else {
  console.warn(
    `verify-game-catalog-sync: backend catalog not found at ${backendCatalogPath}; validated manifest shape only`,
  );
  console.log('verify-game-catalog-sync: OK (manifest present, backend not checked)');
}
