#!/usr/bin/env node
// Build plugin/snapshot/ by mirroring the repo's content directories.
// Idempotent: deletes prior snapshot contents (preserving .gitkeep) and re-copies.

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginRoot = resolve(__dirname, "..");
const repoRoot = resolve(pluginRoot, "..");
const snapshotDir = join(pluginRoot, "snapshot");

const pillars = [
  { src: "glossary", dst: "glossary" },
  { src: "tips", dst: "tips" },
  { src: "skills", dst: "skills" },
  { src: "journeys", dst: "journeys" },
];

function cleanSnapshot() {
  if (!existsSync(snapshotDir)) {
    mkdirSync(snapshotDir, { recursive: true });
    return;
  }
  for (const entry of readdirSync(snapshotDir)) {
    if (entry === ".gitkeep") continue;
    const p = join(snapshotDir, entry);
    if (statSync(p).isDirectory()) rmSync(p, { recursive: true, force: true });
    else unlinkSync(p);
  }
}

function copyPillar(srcRel, dstRel) {
  const srcAbs = join(repoRoot, srcRel);
  const dstAbs = join(snapshotDir, dstRel);
  if (!existsSync(srcAbs)) {
    mkdirSync(dstAbs, { recursive: true });
    return 0;
  }
  mkdirSync(dirname(dstAbs), { recursive: true });
  cpSync(srcAbs, dstAbs, {
    recursive: true,
    filter: (s) => !s.endsWith(".gitkeep"),
  });
  let count = 0;
  if (existsSync(dstAbs)) {
    for (const f of readdirSync(dstAbs)) {
      if (f.endsWith(".md")) count++;
    }
  }
  return count;
}

function writeMeta() {
  let sha = "unknown";
  try {
    sha = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf-8" }).trim();
  } catch {
    // not a git repo at build time — ship "unknown"
  }
  const meta = {
    generatedAt: new Date().toISOString(),
    sourceCommit: sha,
  };
  writeFileSync(join(snapshotDir, ".snapshot-meta.json"), JSON.stringify(meta, null, 2) + "\n");
  return meta;
}

console.log(`Snapshot build → ${snapshotDir}`);
cleanSnapshot();
const counts = {};
for (const { src, dst } of pillars) {
  counts[dst] = copyPillar(src, dst);
  console.log(`  ${src} → snapshot/${dst}: ${counts[dst]} .md file(s)`);
}
const meta = writeMeta();
console.log(`Meta: ${meta.generatedAt}  ${meta.sourceCommit.slice(0, 7)}`);
console.log("Snapshot build complete.");
