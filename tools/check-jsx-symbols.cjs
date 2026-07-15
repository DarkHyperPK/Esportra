#!/usr/bin/env node
/**
 * Fail when a .tsx file uses PascalCase JSX tags without importing or declaring them.
 * Prevents runtime ReferenceError crashes (e.g. Button is not defined).
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const SKIP_JSX_TAGS = new Set(["React", "Fragment", "Suspense", "StrictMode", "Profiler"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", "dist"].includes(entry.name)) {
        walk(full, files);
      }
    } else if (/\.tsx$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function relPath(file) {
  return file.replace(/\\/g, "/").replace(`${ROOT.replace(/\\/g, "/")}/`, "");
}

function stripComments(source) {
  // Require non-word char before /* so accept="image/*" is not stripped
  let stripped = source.replace(/(^|[^\w])\/\*[\s\S]*?\*\//gm, "$1");
  stripped = stripped.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  stripped = stripped.replace(/^\s*\/\/.*$/gm, "");
  return stripped;
}

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
  const declarations = new Set([
    ...[...source.matchAll(/(?:const|function|class)\s+([A-Z][A-Za-z0-9_]*)\b/g)].map((match) => match[1]),
    ...[...source.matchAll(/(?:const|let|var)\s+([a-zA-Z_$][A-Za-z0-9_$]*)\b/g)].map((match) => match[1]),
    ...[...source.matchAll(/(?:const|let|var)\s+\[\s*([a-zA-Z_$][A-Za-z0-9_$]*)/g)].map((match) => match[1]),
  ]);

  // Param aliases: ({ icon: Icon }) or map(({ Icon, href }) =>
  for (const match of source.matchAll(/\bicon:\s*([A-Z][A-Za-z0-9_]*)\b/g)) {
    declarations.add(match[1]);
  }
  for (const match of source.matchAll(/\(\{\s*([A-Z][A-Za-z0-9_]*)/g)) {
    declarations.add(match[1]);
  }

  return declarations;
}

function findMissingJsxSymbols(source, knownSymbols) {
  const jsxTags = [...source.matchAll(/(^|[\s(>{[])\<([A-Z][A-Za-z0-9_]*)(?=[\s/>])/gm)].map(
    (match) => match[2],
  );
  return [...new Set(jsxTags.filter((tag) => !knownSymbols.has(tag) && !SKIP_JSX_TAGS.has(tag)))];
}

function findMissingRuntimeSymbols(source, knownSymbols) {
  const missing = [];

  if (/<AnimatePresence[\s/>]/.test(source) && !knownSymbols.has("AnimatePresence")) {
    missing.push("AnimatePresence");
  }

  if (/\bmotion\./.test(source) && !knownSymbols.has("motion")) {
    missing.push("motion");
  }

  if (/<Navigate[\s/>]/.test(source) && !knownSymbols.has("Navigate")) {
    missing.push("Navigate");
  }

  return missing;
}

const failures = [];

for (const file of walk(SRC)) {
  const rel = relPath(file);
  const raw = fs.readFileSync(file, "utf8");
  const source = stripComments(raw);
  const imports = collectImports(source);
  const declarations = collectDeclarations(source);
  const knownSymbols = new Set([...imports, ...declarations]);

  const missing = [
    ...findMissingJsxSymbols(source, knownSymbols),
    ...findMissingRuntimeSymbols(source, knownSymbols),
  ];

  if (missing.length > 0) {
    failures.push({ file: rel, missing: [...new Set(missing)] });
  }
}

if (failures.length > 0) {
  console.error("Missing JSX/runtime symbols found:");
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.missing.join(", ")}`);
  }
  process.exit(1);
}

console.log("JSX symbol audit passed.");
