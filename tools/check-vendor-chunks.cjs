const fs = require("node:fs");
const path = require("node:path");

const distAssetsDir = path.resolve(__dirname, "..", "dist", "assets");

function listFiles(prefix) {
  if (!fs.existsSync(distAssetsDir)) {
    console.error("check:chunks: dist/assets not found — run npm run build first.");
    process.exit(1);
  }

  return fs.readdirSync(distAssetsDir).filter((file) => file.startsWith(prefix));
}

function readChunk(fileName) {
  return fs.readFileSync(path.join(distAssetsDir, fileName), "utf8");
}

function collectVendorImports(source) {
  const matches = source.matchAll(/from"\.\/(vendor-[^"]+)"/g);
  return [...matches].map((match) => match[1]);
}

const errors = [];

const vendorMainJs = listFiles("vendor-main-").filter((file) => file.endsWith(".js"));
if (vendorMainJs.length > 0) {
  errors.push(`Found vendor-main JS chunk(s): ${vendorMainJs.join(", ")}`);
}

for (const chunkPrefix of ["vendor-react-"]) {
  for (const fileName of listFiles(chunkPrefix)) {
    if (!fileName.endsWith(".js")) continue;

    const imports = collectVendorImports(readChunk(fileName));
    const forbidden = imports.filter((chunk) => chunk.startsWith("vendor-main"));

    if (forbidden.length > 0) {
      errors.push(`${fileName} imports forbidden chunk(s): ${forbidden.join(", ")}`);
    }
  }
}

for (const fileName of listFiles("vendor-react-")) {
  if (!fileName.endsWith(".js")) continue;

  const imports = collectVendorImports(readChunk(fileName));
  const cyclic = imports.filter((chunk) => chunk.startsWith("vendor-"));

  if (cyclic.length > 0) {
    errors.push(`${fileName} imports other vendor chunk(s): ${cyclic.join(", ")}`);
  }
}

if (errors.length > 0) {
  console.error("check:chunks failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("check:chunks passed — vendor-react is isolated with no vendor-main hub.");
