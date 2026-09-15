#!/usr/bin/env node
// scripts/audit-glossary-candidates.mjs
//
// Phase C of the glossary-tooltips feature: scan repo content for
// jargon candidates (capitalised acronyms, backticked terms, recurring
// nouns) and produce a markdown report for HUMAN triage.
//
// HARD GUARANTEES (per docs/design/project-design.md §S.14.6):
//   - Exactly ONE filesystem write — the report at the configured --out path.
//   - That path MUST begin with `docs/reference/glossary-audit-` (asserted
//     before writing) — refusing any other location, especially anything
//     inside `glossary/`.
//   - All other filesystem access is readdirSync / readFileSync over the
//     fixed corpus dirs.
//
// Usage:
//   node scripts/audit-glossary-candidates.mjs                       # default out path
//   node scripts/audit-glossary-candidates.mjs --out <path>          # explicit out
//   node scripts/audit-glossary-candidates.mjs --date YYYY-MM-DD     # date override for testability
//
// ESM Node 22, stdlib only (no gray-matter, no glob).

import { readFileSync, readdirSync, writeFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.out = argv[++i];
    else if (a === "--date") out.date = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`unknown arg: ${a}`);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(
    "Usage: node scripts/audit-glossary-candidates.mjs [--out <path>] [--date YYYY-MM-DD]",
  );
  process.exit(0);
}

function todayUtcIso() {
  return new Date().toISOString().slice(0, 10);
}

const reportDate = args.date ?? todayUtcIso();
if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
  throw new Error(`--date must be YYYY-MM-DD, got: ${reportDate}`);
}

const defaultOut = `docs/reference/glossary-audit-${reportDate}.md`;
const outRel = args.out ?? defaultOut;
const outAbs = resolve(repoRoot, outRel);

// HARD WRITE-PATH GUARD — asserted before any write happens.
const allowedOutPrefix = resolve(repoRoot, "docs/reference/glossary-audit-");
if (!outAbs.startsWith(allowedOutPrefix)) {
  throw new Error(
    `refusing to write outside docs/reference/glossary-audit-*: got ${outAbs}`,
  );
}

// ---------------------------------------------------------------------------
// Corpus
// ---------------------------------------------------------------------------

// Per docs/design/project-design.md §S.14.6 the default corpus lists seven
// dirs. The seventh — `site/src/content/docs/` — was deleted on
// 2026-05-19 when the homepage migrated from `src/content/docs/index.mdx`
// to `src/pages/index.astro` (see Issues - Pending Items.md item #5). The
// design-spec text predates that removal. We faithfully scan the six dirs
// that exist; the strict existence check below still throws if any of
// these go missing in future.
const CORPUS_DIRS = [
  "glossary",
  "tips",
  "skills",
  "journeys",
  "news/published",
  "site/src/pages",
];

for (const d of CORPUS_DIRS) {
  const abs = resolve(repoRoot, d);
  if (!existsSync(abs)) {
    throw new Error(`audit-glossary-candidates: corpus dir missing: ${d}`);
  }
  if (!statSync(abs).isDirectory()) {
    throw new Error(`audit-glossary-candidates: corpus path not a dir: ${d}`);
  }
}

// File extensions to include per dir.
const CORPUS_EXTS_BY_DIR = {
  glossary: [".md"],
  tips: [".md"],
  skills: [".md"],
  journeys: [".md"],
  "news/published": [".md"],
  "site/src/pages": [".astro", ".md", ".mdx"],
};

function walkDir(absDir) {
  const out = [];
  const stack = [absDir];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of readdirSync(cur, { withFileTypes: true })) {
      const p = join(cur, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile()) out.push(p);
    }
  }
  return out;
}

function collectCorpusFiles() {
  const files = [];
  for (const d of CORPUS_DIRS) {
    const absDir = resolve(repoRoot, d);
    const allowedExts = CORPUS_EXTS_BY_DIR[d] ?? [".md"];
    for (const absFile of walkDir(absDir)) {
      if (allowedExts.some((ext) => absFile.endsWith(ext))) {
        files.push(absFile);
      }
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Minimal frontmatter parser (5-line YAML-ish — strings + simple arrays).
// ---------------------------------------------------------------------------

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, bodyStart: 0 };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, bodyStart: 0 };
  const block = raw.slice(3, end);
  const lines = block.split("\n");
  const data = {};
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      // simple inline array: [a, b, "c"]
      const inner = val.slice(1, -1).trim();
      data[key] = inner
        ? inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
        : [];
    } else if (val.startsWith('"') && val.endsWith('"')) {
      data[key] = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      data[key] = val.slice(1, -1);
    } else {
      data[key] = val;
    }
  }
  // bodyStart: index in raw where body begins (after closing ---\n)
  const afterEnd = raw.indexOf("\n", end + 4);
  const bodyStart = afterEnd === -1 ? raw.length : afterEnd + 1;
  return { data, bodyStart };
}

// ---------------------------------------------------------------------------
// Known glossary terms (slugs + aliases, lowercased)
// ---------------------------------------------------------------------------

function loadGlossaryVariants() {
  const variants = new Set();
  const glossaryDir = resolve(repoRoot, "glossary");
  for (const name of readdirSync(glossaryDir)) {
    if (!name.endsWith(".md")) continue;
    const slug = name.replace(/\.md$/, "");
    variants.add(slug.toLowerCase());
    // also accept slug with spaces (e.g. "claude code" matches "claude-code")
    variants.add(slug.replace(/-/g, " ").toLowerCase());
    const raw = readFileSync(join(glossaryDir, name), "utf-8");
    const { data } = parseFrontmatter(raw);
    if (data.title) variants.add(String(data.title).toLowerCase());
    if (Array.isArray(data.aliases)) {
      for (const a of data.aliases) variants.add(String(a).toLowerCase());
    }
  }
  return variants;
}

// ---------------------------------------------------------------------------
// Body extraction for non-glossary files: strip frontmatter and fenced code.
// For .astro files, also strip the leading frontmatter script (`---\n…\n---`)
// at the very top — the body text after that. (Same syntax as MD frontmatter,
// but we treat the captured content as "code" not markdown body. We still
// strip it before scanning, so we never look at component imports/types.)
// ---------------------------------------------------------------------------

function stripFencedCode(text) {
  // Remove ``` ... ``` blocks (triple-backtick fences) — they're code examples,
  // not prose. Use a non-greedy match across newlines.
  return text.replace(/```[\s\S]*?```/g, "");
}

function bodyText(absFile) {
  const raw = readFileSync(absFile, "utf-8");
  const { bodyStart } = parseFrontmatter(raw);
  let body = raw.slice(bodyStart);
  body = stripFencedCode(body);
  return body;
}

// ---------------------------------------------------------------------------
// Detectors
// ---------------------------------------------------------------------------

const STOPLIST_ACRONYM = new Set([
  "OK",
  "USA",
  "UK",
  "IT",
  "NO",
  "US",
  "AM",
  "PM",
  "UTC",
  "GMT",
  "EU",
]);

const STOPLIST_NOUNS = new Set([
  // function words
  "the","that","this","with","from","have","been","were","are","was",
  "but","not","you","your","will","would","should","could","may","might",
  "must","they","them","their","there","these","those","which","what",
  "when","where","how","why","who","whom","also","just","only","very",
  "more","most","some","any","all","into","over","under","about","than",
  "because","through","then","else","both","each","every","other","such",
  "same","like","into","onto","upon","much","many","none","once","here",
  "yet","while","still","even","ever","never","sometimes","often","always",
  "before","after","during","without","within","being","does","done","doing",
  "make","made","makes","making","take","took","takes","taking","get","got",
  "gets","getting","see","sees","saw","seen","seeing","run","runs","ran",
  "running","use","uses","used","using","want","wants","wanted","wanting",
  "need","needs","needed","needing","know","knows","knew","known","knowing",
  "think","thinks","thought","thinking","work","works","worked","working",
  // tech-noisy stopwords (from design spec §S.14.6)
  "code","file","files","new","old","different",
  // markdown/HTML noise
  "div","span","class","href","src","alt","width","height","data","html",
  "page","pages","line","lines","item","items","list","items","section",
  "sections","chapter","step","steps","note","notes","example","examples",
  "thing","things","stuff","way","ways","time","times","day","days",
  "week","weeks","month","months","year","years","case","cases","kind",
  "kinds","sort","sorts","type","types","part","parts","piece","pieces",
  "next","last","first","second","third","top","bottom","left","right",
  "open","close","start","stop","end","ends","good","great","bad","better",
  "best","worse","worst","big","small","large","short","long","high","low",
  "true","false","yes","none","one","two","three","four","five","six",
  "seven","eight","nine","ten",
  // markdown-prose connectives
  "really","truly","actually","basically","essentially","simply","clearly",
  "probably","possibly","likely","maybe","perhaps","quite","rather","fairly",
  "almost","mostly","largely","mainly","generally","usually","commonly",
  "specifically","exactly","precisely","approximately","roughly",
]);

const COMMAND_PREFIXES = [
  "$", "/", "./", "../",
  "npm ", "node ", "cd ", "git ", "gh ", "ls ", "rm ", "mv ", "cp ",
  "mkdir", "touch", "cat ", "echo ", "grep ", "find ", "sed ", "awk ",
  "curl", "wget", "ssh ", "scp ", "make ", "yarn ", "pnpm ", "pip ",
  "python", "ruby ", "go ", "cargo", "rustc", "tsc", "vitest", "jest",
  "claude", "/hub", "/plugin", "/config", "/model", "/clear", "/compact",
  "Esc", "Ctrl", "Cmd", "Shift", "Tab", "Enter",
];

function looksLikeCommand(s) {
  const t = s.trim();
  if (!t) return true;
  for (const p of COMMAND_PREFIXES) {
    if (t.startsWith(p)) return true;
  }
  // path-like
  if (/^[\w./-]+\.(md|ts|tsx|js|mjs|cjs|json|astro|mdx|yml|yaml|css|html)$/i.test(t)) return true;
  if (/^[\w./-]+\/[\w./-]+/.test(t) && /[/]/.test(t)) return true;
  return false;
}

// Result shape: Map<term, { count, samples: [{file, line}] }>
function makeRow(map, term, file, line) {
  let row = map.get(term);
  if (!row) {
    row = { count: 0, samples: [] };
    map.set(term, row);
  }
  row.count++;
  if (row.samples.length === 0) row.samples.push({ file, line });
}

function lineOfIndex(text, idx) {
  let line = 1;
  for (let i = 0; i < idx && i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) line++;
  }
  return line;
}

// We need to map indexes in the *stripped body* back to original-file line
// numbers, because that's what humans verify. Approach: scan the *original*
// raw file (post-frontmatter, but WITH fenced blocks present) and only count
// occurrences whose line is NOT inside a fenced block.

function buildFencedMask(raw) {
  // Returns a Set<lineNumber> for lines that are inside ``` … ``` (inclusive
  // of the fence markers).
  const fenced = new Set();
  const lines = raw.split("\n");
  let inside = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("```")) {
      fenced.add(i + 1);
      inside = !inside;
      continue;
    }
    if (inside) fenced.add(i + 1);
  }
  return fenced;
}

function frontmatterLineCount(raw) {
  if (!raw.startsWith("---")) return 0;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return 0;
  const upTo = raw.slice(0, end + 4);
  return upTo.split("\n").length; // approximate — lines inside frontmatter are excluded from prose
}

function detectAcronyms(corpusFiles, existingVariants) {
  const map = new Map();
  const re = /\b[A-Z]{2,5}s?\b/g;
  for (const absFile of corpusFiles) {
    const raw = readFileSync(absFile, "utf-8");
    const fenced = buildFencedMask(raw);
    const skipUntilLine = frontmatterLineCount(raw);
    const lines = raw.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (lineNo <= skipUntilLine) continue;
      if (fenced.has(lineNo)) continue;
      const line = lines[i];
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        const raw0 = m[0];
        if (STOPLIST_ACRONYM.has(raw0)) continue;
        // Strip trailing plural 's' for variant-match, but key the row by
        // the canonical singular form (e.g. "PRs" → "PR").
        const canon = raw0.replace(/s$/, "");
        if (existingVariants.has(canon.toLowerCase())) continue;
        if (existingVariants.has(raw0.toLowerCase())) continue;
        makeRow(
          map,
          canon,
          relative(repoRoot, absFile),
          lineNo,
        );
      }
    }
  }
  // Filter: count >= 3
  return new Map([...map.entries()].filter(([, v]) => v.count >= 3));
}

function detectBackticked(corpusFiles, existingVariants) {
  const map = new Map();
  // Match content inside single backticks, NOT triple-backtick fences.
  // We pre-strip fenced blocks (per-line via mask) then match inline.
  const re = /`([^`\n]+)`/g;
  for (const absFile of corpusFiles) {
    const raw = readFileSync(absFile, "utf-8");
    const fenced = buildFencedMask(raw);
    const skipUntilLine = frontmatterLineCount(raw);
    const lines = raw.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (lineNo <= skipUntilLine) continue;
      if (fenced.has(lineNo)) continue;
      const line = lines[i];
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        const inner = m[1].trim();
        if (!inner) continue;
        if (looksLikeCommand(inner)) continue;
        const key = inner.toLowerCase();
        if (existingVariants.has(key)) continue;
        makeRow(map, inner, relative(repoRoot, absFile), lineNo);
      }
    }
  }
  // Filter: count >= 3
  return new Map([...map.entries()].filter(([, v]) => v.count >= 3));
}

function detectFrequentNouns(corpusFiles, existingVariants) {
  const map = new Map();
  const re = /\b[a-z][a-z-]{3,}\b/g; // 4+ chars (token length), alphabetic + hyphen
  for (const absFile of corpusFiles) {
    const raw = readFileSync(absFile, "utf-8");
    const fenced = buildFencedMask(raw);
    const skipUntilLine = frontmatterLineCount(raw);
    const lines = raw.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (lineNo <= skipUntilLine) continue;
      if (fenced.has(lineNo)) continue;
      // Lowercase the line, then tokenize.
      const lowered = lines[i].toLowerCase();
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(lowered)) !== null) {
        const token = m[0];
        if (STOPLIST_NOUNS.has(token)) continue;
        if (existingVariants.has(token)) continue;
        makeRow(map, token, relative(repoRoot, absFile), lineNo);
      }
    }
  }
  // Filter: count >= 5
  return new Map([...map.entries()].filter(([, v]) => v.count >= 5));
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderTable(rowsMap) {
  if (rowsMap.size === 0) {
    return "_No candidates above the threshold._\n";
  }
  const rows = [...rowsMap.entries()].sort((a, b) => {
    // Sort alphabetically by term (case-insensitive).
    return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
  });
  const lines = [
    "| Term | Count | Sample (file:line) |",
    "|---|---|---|",
  ];
  for (const [term, info] of rows) {
    const sample = info.samples[0]
      ? `\`${info.samples[0].file}:${info.samples[0].line}\``
      : "—";
    // Escape pipe characters in term for table safety.
    const safeTerm = term.replace(/\|/g, "\\|");
    lines.push(`| \`${safeTerm}\` | ${info.count} | ${sample} |`);
  }
  return lines.join("\n") + "\n";
}

function renderReport({ acronyms, backticked, nouns, corpusCount, glossaryCount }) {
  const generatedAt = new Date().toISOString();
  const out = [
    "---",
    `generated: ${generatedAt}`,
    `corpus_files_scanned: ${corpusCount}`,
    `glossary_terms_known: ${glossaryCount}`,
    "---",
    "",
    `# Glossary Audit — Candidate Terms`,
    "",
    `> Generated ${reportDate} by \`scripts/audit-glossary-candidates.mjs\`. Human triage required — this report does NOT auto-add terms.`,
    "",
    "## Capitalised acronyms (≥3 occurrences, not in glossary)",
    "",
    renderTable(acronyms),
    "## Backticked terms (≥3 occurrences, not in glossary)",
    "",
    renderTable(backticked),
    "## Recurring nouns (≥5 occurrences, alphabetic, stop-words excluded)",
    "",
    renderTable(nouns),
    "*End of report.*",
    "",
  ].join("\n");
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const existingVariants = loadGlossaryVariants();
const corpusFiles = collectCorpusFiles();

const acronyms = detectAcronyms(corpusFiles, existingVariants);
const backticked = detectBackticked(corpusFiles, existingVariants);
const nouns = detectFrequentNouns(corpusFiles, existingVariants);

const markdown = renderReport({
  acronyms,
  backticked,
  nouns,
  corpusCount: corpusFiles.length,
  glossaryCount: readdirSync(resolve(repoRoot, "glossary")).filter((n) => n.endsWith(".md")).length,
});

// Final write — the ONE and ONLY write call in this script.
mkdirSync(dirname(outAbs), { recursive: true });
writeFileSync(outAbs, markdown, "utf-8");

console.log(`audit-glossary-candidates: wrote ${relative(repoRoot, outAbs)}`);
console.log(
  `  corpus files scanned: ${corpusFiles.length}`,
);
console.log(
  `  acronyms: ${acronyms.size}  backticked: ${backticked.size}  nouns: ${nouns.size}`,
);
