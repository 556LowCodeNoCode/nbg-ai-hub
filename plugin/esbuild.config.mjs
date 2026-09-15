import { build } from "esbuild";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const srcDir = "src";
const outDir = "dist";

const entryPoints = readdirSync(srcDir)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
  .map((f) => join(srcDir, f));

if (entryPoints.length === 0) {
  console.log("No entry-point .ts files found in src/ (lib-only modules don't get bundled).");
  process.exit(0);
}

await build({
  entryPoints,
  outdir: outDir,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  sourcemap: true,
  logLevel: "info",
  packages: "external",
});

console.log(`Built ${entryPoints.length} entry point(s) → ${outDir}/*.mjs`);
