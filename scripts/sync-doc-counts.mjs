#!/usr/bin/env node
// scripts/sync-doc-counts.mjs
//
// Single source of truth for content + test counts cited in SCOPE.md and
// CLAUDE.md. Only writes between `<!-- AUTO:<name> -->` and
// `<!-- /AUTO:<name> -->` markers — prose outside the markers stays
// human-authored.
//
// Usage:
//   node scripts/sync-doc-counts.mjs              # write: regenerate AUTO blocks
//   node scripts/sync-doc-counts.mjs --check      # lint: exit 1 if AUTO blocks would change
//   node scripts/sync-doc-counts.mjs --with-tests # also count tests by running vitest in each workspace (slower)
//
// Designed to run in CI (PRs touching content folders) and locally before commit.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const WITH_TESTS = args.includes("--with-tests");

function countMd(relPath) {
  const abs = resolve(repoRoot, relPath);
  if (!existsSync(abs)) return 0;
  return readdirSync(abs).filter((f) => f.endsWith(".md")).length;
}

function runTests(workspace) {
  const r = spawnSync("npm", ["test", "--silent"], {
    cwd: resolve(repoRoot, workspace),
    encoding: "utf-8",
    timeout: 120000,
  });
  if (r.status !== 0 && r.status !== null) {
    console.error(`[warn] tests in ${workspace} exited ${r.status}`);
  }
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const m = out.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
  if (!m) {
    console.error(`[warn] could not parse test count for ${workspace}`);
    return null;
  }
  return { passed: parseInt(m[1], 10), total: parseInt(m[2], 10) };
}

const counts = {
  glossary: countMd("glossary"),
  tips: countMd("tips"),
  skills: countMd("skills"),
  journeys: countMd("journeys"),
  usecases: countMd("usecases"),
  newsletters: countMd("newsletters"),
  news: countMd("news/published"),
};

let tests = null;
if (WITH_TESTS) {
  tests = {
    pipeline: runTests("pipeline"),
    site: runTests("site"),
    plugin: runTests("plugin"),
  };
}

function renderCountsBlock() {
  return [
    "| Pillar | Files |",
    "|---|---|",
    `| Glossary | ${counts.glossary} |`,
    `| Tips | ${counts.tips} |`,
    `| Skills | ${counts.skills} |`,
    `| Use Cases | ${counts.usecases} |`,
    `| Journeys | ${counts.journeys} |`,
    `| Newsletters | ${counts.newsletters} |`,
    `| News (published) | ${counts.news} |`,
  ].join("\n");
}

function renderTestsBlock() {
  if (!tests) return null;
  const cell = (t) => (t ? `${t.passed}/${t.total}` : "—");
  return [
    "| Workspace | Tests passing |",
    "|---|---|",
    `| pipeline/ | ${cell(tests.pipeline)} |`,
    `| site/ | ${cell(tests.site)} |`,
    `| plugin/ | ${cell(tests.plugin)} |`,
  ].join("\n");
}

function replaceAutoBlock(content, name, body) {
  const open = `<!-- AUTO:${name} -->`;
  const close = `<!-- /AUTO:${name} -->`;
  const pattern = new RegExp(`${open}[\\s\\S]*?${close}`, "m");
  if (!pattern.test(content)) {
    throw new Error(
      `AUTO:${name} block not found — add ${open} ... ${close} to the doc first.`,
    );
  }
  return content.replace(pattern, `${open}\n${body}\n${close}`);
}

function sync(relPath, blocks) {
  const abs = resolve(repoRoot, relPath);
  const before = readFileSync(abs, "utf-8");
  let after = before;
  for (const { name, body } of blocks) {
    if (body === null) continue;
    after = replaceAutoBlock(after, name, body);
  }
  return { relPath, abs, before, after, changed: before !== after };
}

const targets = [
  sync("SCOPE.md", [
    { name: "counts", body: renderCountsBlock() },
    { name: "tests", body: renderTestsBlock() },
  ]),
  sync("CLAUDE.md", [{ name: "counts", body: renderCountsBlock() }]),
];

let drift = false;
for (const t of targets) {
  if (t.changed) {
    drift = true;
    if (CHECK) {
      console.error(`DRIFT: ${t.relPath} AUTO block would be regenerated`);
    } else {
      writeFileSync(t.abs, t.after, "utf-8");
      console.log(`updated: ${t.relPath}`);
    }
  }
}

console.log("");
console.log(
  `counts: glossary=${counts.glossary} tips=${counts.tips} skills=${counts.skills} usecases=${counts.usecases} journeys=${counts.journeys} newsletters=${counts.newsletters} news=${counts.news}`,
);
if (tests) {
  const c = (t) => (t ? `${t.total}` : "?");
  console.log(
    `tests:  pipeline=${c(tests.pipeline)} site=${c(tests.site)} plugin=${c(tests.plugin)}`,
  );
}

if (CHECK && drift) {
  console.error(
    "\nRun `node scripts/sync-doc-counts.mjs` to regenerate AUTO blocks, then commit the diff.",
  );
  process.exit(1);
}

console.log(CHECK ? "✓ no drift" : drift ? "✓ synced" : "✓ already in sync");
