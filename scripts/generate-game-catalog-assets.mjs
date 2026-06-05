#!/usr/bin/env node
/**
 * Builds src/data/gameCatalogAssets.json — frontend-only overlay (logos, aliases, mode UI hints).
 * Does NOT duplicate brConfig or full catalog game definitions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const legacyPath = path.join(repoRoot, 'src/data/esportsGames.json');
const backendPath = path.resolve(
  process.env.BACKEND_CATALOG_PATH?.trim()
    || path.join(repoRoot, '../esportra-backend/src/Esportra.Api/GameCatalog/esportsGames.json'),
);
const syncPath = path.join(repoRoot, 'src/data/gameCatalogSync.json');
const outPath = path.join(repoRoot, 'src/data/gameCatalogAssets.json');

const sourcePath = fs.existsSync(legacyPath) ? legacyPath : backendPath;
if (!fs.existsSync(sourcePath)) {
  console.error(`No source catalog found (tried legacy and backend paths)`);
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const manifest = fs.existsSync(syncPath)
  ? JSON.parse(fs.readFileSync(syncPath, 'utf8'))
  : {
      catalogVersion: source.catalogVersion,
      schemaVersion: source.schemaVersion ?? 1,
    };

function pickModeOverlay(mode) {
  const overlay = { modeKey: mode.key || mode.value };
  if (mode.mapPoolFilter) overlay.mapPoolFilter = mode.mapPoolFilter;
  if (mode.features && Object.keys(mode.features).length > 0) {
    overlay.features = mode.features;
  }
  const hasExtra = overlay.mapPoolFilter || overlay.features;
  return hasExtra ? overlay : null;
}

const games = (source.games || []).map((game) => {
  const modes = game.modes?.length ? game.modes : game.formats || [];
  const modeOverlays = modes.map(pickModeOverlay).filter(Boolean);
  const entry = {
    slug: game.slug,
    name: game.name,
    logo: game.logo || '',
    aliases: game.aliases || [],
  };
  if (modeOverlays.length > 0) entry.modeOverlays = modeOverlays;
  return entry;
});

const assets = {
  catalogVersion: manifest.catalogVersion || source.catalogVersion,
  schemaVersion: manifest.schemaVersion ?? source.schemaVersion ?? 1,
  games,
};

fs.writeFileSync(outPath, `${JSON.stringify(assets, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(repoRoot, outPath)} (${games.length} games)`);
