#!/usr/bin/env node
/**
 * Reads R6 Maps/ and writes src/data/r6-map-manifest.json with
 * filename → displayName → slug mappings for Rainbow Six Siege maps.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const mapsDir = path.join(repoRoot, 'R6 Maps');
const outputPath = path.join(repoRoot, 'src/data/r6-map-manifest.json');

/** Explicit filename (without extension) → { displayName, slug } overrides */
const OVERRIDES = {
  ClubHouse: { displayName: 'Clubhouse', slug: 'clubhouse' },
  RussianCafe: { displayName: 'Kafe Dostoyevsky', slug: 'kafe-dostoyevsky' },
  Nighthaven: { displayName: 'Nighthaven Labs', slug: 'nighthaven-labs' },
  skycraper: { displayName: 'Skyscraper', slug: 'skyscraper' },
  themepark: { displayName: 'Theme Park', slug: 'theme-park' },
  emeraldplains: { displayName: 'Emerald Plains', slug: 'emerald-plains' },
  closequarters: { displayName: 'Close Quarters', slug: 'close-quarters' },
  CalypsoCasino: { displayName: 'Calypso Casino', slug: 'calypso-casino' },
  StadiumA: { displayName: 'Stadium Alpha', slug: 'stadium-alpha' },
  stadiumB: { displayName: 'Stadium Bravo', slug: 'stadium-bravo' },
};

function titleCaseFromStem(stem) {
  return stem
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function slugify(displayName) {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveMapEntry(filename) {
  const stem = path.parse(filename).name;
  const override = OVERRIDES[stem];
  const displayName = override?.displayName ?? titleCaseFromStem(stem);
  const slug = override?.slug ?? slugify(displayName);
  return { filename, displayName, slug };
}

if (!fs.existsSync(mapsDir)) {
  console.error(`R6 Maps folder not found: ${mapsDir}`);
  process.exit(1);
}

const imageFiles = fs
  .readdirSync(mapsDir)
  .filter((name) => /\.(avif|png|jpe?g|webp)$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

if (imageFiles.length === 0) {
  console.error(`No map images found in ${mapsDir}`);
  process.exit(1);
}

const maps = imageFiles.map(resolveMapEntry);
const manifest = {
  generatedAt: new Date().toISOString(),
  sourceDirectory: 'R6 Maps',
  mapCount: maps.length,
  maps,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Wrote ${maps.length} maps to ${path.relative(repoRoot, outputPath)}`);
