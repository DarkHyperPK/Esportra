#!/usr/bin/env node
/**
 * Reads PUBG MAPS/ and writes src/data/pubg-map-manifest.json.
 * Copies images to public/games/pubg/maps/{slug}.webp
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const mapsDir = path.join(repoRoot, 'PUBG MAPS');
const outputPath = path.join(repoRoot, 'src/data/pubg-map-manifest.json');
const publicMapsDir = path.join(repoRoot, 'public/games/pubg/maps');

const OVERRIDES = {
  MIRAMAR: { displayName: 'Miramar', slug: 'miramar' },
  Erangel: { displayName: 'Erangel', slug: 'erangel' },
  sanhok: { displayName: 'Sanhok', slug: 'sanhok' },
  karakin: { displayName: 'Karakin', slug: 'karakin' },
  paramo: { displayName: 'Paramo', slug: 'paramo' },
  taego: { displayName: 'Taego', slug: 'taego' },
  deston: { displayName: 'Deston', slug: 'deston' },
  vikendi: { displayName: 'Vikendi', slug: 'vikendi' },
  rondo: { displayName: 'Rondo', slug: 'rondo' },
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
  console.error(`PUBG MAPS folder not found: ${mapsDir}`);
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

fs.mkdirSync(publicMapsDir, { recursive: true });

const maps = imageFiles.map((filename) => {
  const entry = resolveMapEntry(filename);
  const ext = path.extname(filename).toLowerCase();
  const destName = `${entry.slug}${ext}`;
  const destPath = path.join(publicMapsDir, destName);
  fs.copyFileSync(path.join(mapsDir, filename), destPath);
  return {
    ...entry,
    publicPath: `/games/pubg/maps/${destName}`,
  };
});

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceDirectory: 'PUBG MAPS',
  mapCount: maps.length,
  maps,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Wrote ${maps.length} maps to ${path.relative(repoRoot, outputPath)}`);
console.log(`Copied assets to ${path.relative(repoRoot, publicMapsDir)}`);
