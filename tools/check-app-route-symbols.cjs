const fs = require("node:fs");
const path = require("node:path");

const criticalFiles = [
  { label: "App.tsx", path: path.resolve(__dirname, "..", "src", "App.tsx") },
  { label: "HeroSection.tsx", path: path.resolve(__dirname, "..", "src", "components", "HeroSection.tsx") },
  { label: "Navbar.tsx", path: path.resolve(__dirname, "..", "src", "components", "Navbar.tsx") },
  { label: "TransitionLayout.tsx", path: path.resolve(__dirname, "..", "src", "components", "TransitionLayout.tsx") },
  { label: "PageTransition.tsx", path: path.resolve(__dirname, "..", "src", "components", "PageTransition.tsx") },
  { label: "CreateTournament.tsx", path: path.resolve(__dirname, "..", "src", "pages", "tournaments", "Create.tsx") },
  { label: "TournamentDetails.tsx", path: path.resolve(__dirname, "..", "src", "pages", "tournaments", "Details.tsx") },
  { label: "BracketVisualization.tsx", path: path.resolve(__dirname, "..", "src", "pages", "tournaments", "brackets", "BracketVisualization.tsx") },
  { label: "MatchCard.tsx", path: path.resolve(__dirname, "..", "src", "pages", "tournaments", "brackets", "MatchCard.tsx") },
];

const guardedRuntimeIdentifiers = ["requestedMode", "searchParams", "Navigate"];

function collectImports(source) {
  const imports = new Set();

  for (const match of source.matchAll(/^import\s+([\s\S]+?)\s+from\s+['"][^'"]+['"]/gm)) {
    const clause = match[1].trim();

    if (clause.includes("{")) {
      const defaultPart = clause.split("{")[0].replace(/,/g, "").trim();
      if (defaultPart && /^[A-Za-z_$]/.test(defaultPart)) {
        imports.add(defaultPart);
      }

      const namedPart = clause.match(/\{([^}]+)\}/);
      if (namedPart) {
        for (const rawName of namedPart[1].split(",")) {
          const token = rawName.trim();
          if (!token) continue;
          const aliasMatch = token.match(/^([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)$/i);
          const importedName = aliasMatch ? aliasMatch[2] : token;
          imports.add(importedName);
        }
      }
      continue;
    }

    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(clause)) {
      imports.add(clause);
    }
  }

  return imports;
}

function collectDeclarations(source) {
  return new Set([
    ...[...source.matchAll(/(?:const|function|class)\s+([A-Z][A-Za-z0-9_]*)\b/g)].map((match) => match[1]),
    ...[...source.matchAll(/(?:const|let|var)\s+([a-zA-Z_$][A-Za-z0-9_$]*)\b/g)].map((match) => match[1]),
    ...[...source.matchAll(/(?:const|let|var)\s+\[\s*([a-zA-Z_$][A-Za-z0-9_$]*)/g)].map((match) => match[1]),
  ]);
}

function findMissingJsxSymbols(source, knownSymbols) {
  const jsxTags = [...source.matchAll(/(^|[\s(>{[])\<([A-Z][A-Za-z0-9_]*)(?=[\s/>])/gm)].map((match) => match[2]);
  return [...new Set(jsxTags.filter((tag) => !knownSymbols.has(tag)))];
}

function findMissingRuntimeSymbols(source, knownSymbols) {
  const missing = [];

  if (/\bAnimatePresence\b/.test(source) && !knownSymbols.has("AnimatePresence")) {
    missing.push("AnimatePresence");
  }

  if (/\bmotion\./.test(source) && !knownSymbols.has("motion")) {
    missing.push("motion");
  }

  for (const identifier of guardedRuntimeIdentifiers) {
    const usage = new RegExp(`\\b${identifier}\\b`).test(source);
    if (usage && !knownSymbols.has(identifier)) {
      missing.push(identifier);
    }
  }

  return missing;
}

const failures = [];

for (const file of criticalFiles) {
  const source = fs.readFileSync(file.path, "utf8");
  const imports = collectImports(source);
  const declarations = collectDeclarations(source);
  const knownSymbols = new Set([...imports, ...declarations, "React"]);

  const missing = [
    ...findMissingJsxSymbols(source, knownSymbols),
    ...findMissingRuntimeSymbols(source, knownSymbols),
  ];

  if (missing.length > 0) {
    failures.push({ file: file.label, missing: [...new Set(missing)] });
  }
}

if (failures.length > 0) {
  console.error("Missing critical runtime/component symbols found:");
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.missing.join(", ")}`);
  }
  process.exit(1);
}

console.log("Critical route/runtime symbol audit passed.");
