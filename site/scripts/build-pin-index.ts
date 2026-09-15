// site/scripts/build-pin-index.ts
//
// Build-time generator that walks the content folders and emits one
// JSON pin-index per content type into `site/public/_data/`. The output
// files are consumed at runtime by `/my-pins/`.
//
// Run via `tsx scripts/build-pin-index.ts` (chained from `npm run build`).
// Exported `buildPinIndex(repoRoot, outDir)` is used by the unit test.
//
// Per global CLAUDE.md no-fallback rule: any markdown file missing
// `title`, `audience`, or `topics` causes an explicit thrown Error naming
// the offending file. We do NOT silently default those fields.

import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

/** Logical content type literal embedded in each emitted JSON file. */
export type PinType =
  | "skill"
  | "tip"
  | "use-case"
  | "glossary"
  | "journey-step";

/** Shape of one entry inside an emitted index file. */
export interface PinIndexItem {
  readonly slug: string;
  readonly title: string;
  readonly audience: string;
  readonly topics: readonly string[];
}

/** Shape of one emitted JSON file. */
export interface PinIndexFile {
  readonly schema_version: 1;
  readonly type: PinType;
  readonly items: readonly PinIndexItem[];
}

interface SourceSpec {
  /** Type literal stamped into the output. */
  readonly type: PinType;
  /** Path relative to repo root. */
  readonly sourceDir: string;
  /** Output filename (placed inside `outDir`). */
  readonly outFile: string;
}

/**
 * The five content sources. Order is deterministic so emitted files appear
 * in a stable sequence; the actual on-disk write order has no semantic
 * meaning but consistent ordering eases debugging.
 */
const SOURCES: readonly SourceSpec[] = [
  { type: "skill",        sourceDir: "skills",   outFile: "skill-index.json" },
  { type: "tip",          sourceDir: "tips",     outFile: "tip-index.json" },
  { type: "use-case",     sourceDir: "usecases", outFile: "use-case-index.json" },
  { type: "glossary",     sourceDir: "glossary", outFile: "glossary-index.json" },
  { type: "journey-step", sourceDir: "journeys", outFile: "journey-step-index.json" },
];

/**
 * Convert one markdown file on disk into a PinIndexItem.
 *
 * Throws a descriptive Error if any required frontmatter field is missing.
 * The error message always names the file so the build log is debuggable.
 */
async function readPinFile(
  absPath: string,
  filename: string,
): Promise<PinIndexItem> {
  const raw = await readFile(absPath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;

  const title = data["title"];
  const audience = data["audience"];
  const topics = data["topics"];

  if (typeof title !== "string" || title.trim() === "") {
    throw new Error(
      `build-pin-index: missing or empty 'title' frontmatter in ${absPath}`,
    );
  }
  if (typeof audience !== "string" || audience.trim() === "") {
    throw new Error(
      `build-pin-index: missing or empty 'audience' frontmatter in ${absPath}`,
    );
  }
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error(
      `build-pin-index: missing or empty 'topics' frontmatter in ${absPath}`,
    );
  }
  // Normalise topics to strings (frontmatter parsers can return numbers,
  // bools, etc. — but our convention is string topics).
  const topicsStr: string[] = [];
  for (const t of topics) {
    if (typeof t !== "string" || t.trim() === "") {
      throw new Error(
        `build-pin-index: non-string or empty topic entry in ${absPath}`,
      );
    }
    topicsStr.push(t);
  }

  const slug = filename.replace(/\.md$/, "");

  return {
    slug,
    title,
    audience,
    topics: topicsStr,
  };
}

/**
 * Read all `*.md` files in a directory (non-recursive) and return their
 * PinIndexItems. Missing or empty directory yields an empty array.
 */
async function collectItems(
  absSourceDir: string,
): Promise<PinIndexItem[]> {
  if (!existsSync(absSourceDir)) {
    return [];
  }
  const entries = await readdir(absSourceDir, { withFileTypes: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort(); // deterministic order

  return Promise.all(
    mdFiles.map((name) => readPinFile(join(absSourceDir, name), name)),
  );
}

/**
 * Walk the five content sources rooted at `repoRoot` and write five
 * `*-index.json` files into `outDir`. Creates `outDir` if missing.
 *
 * Resolves all paths to absolute, so relative inputs work too.
 */
export async function buildPinIndex(
  repoRoot: string,
  outDir: string,
): Promise<void> {
  const absRepoRoot = resolve(repoRoot);
  const absOutDir = resolve(outDir);

  await mkdir(absOutDir, { recursive: true });

  await Promise.all(
    SOURCES.map(async (spec) => {
      const items = await collectItems(join(absRepoRoot, spec.sourceDir));
      const payload: PinIndexFile = { schema_version: 1, type: spec.type, items };
      await writeFile(
        join(absOutDir, spec.outFile),
        JSON.stringify(payload, null, 2) + "\n",
        "utf8",
      );
    }),
  );
}

/**
 * CLI entry: assumes script lives at `<repo>/site/scripts/build-pin-index.ts`
 * so `repoRoot = <script>/../..` and `outDir = <script>/../public/_data`.
 */
async function main(): Promise<void> {
  const here = fileURLToPath(import.meta.url);
  // here = .../site/scripts/build-pin-index.ts
  const siteDir = resolve(here, "..", "..");        // .../site
  const repoRoot = resolve(siteDir, "..");          // .../<repo>
  const outDir = resolve(siteDir, "public", "_data");
  await buildPinIndex(repoRoot, outDir);
}

// Run main() when this module is executed directly (tsx / node). The check
// below works for both `tsx scripts/build-pin-index.ts` and direct ESM
// imports during tests (where import.meta.url !== argv[1] equivalent).
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("build-pin-index.ts") === true ||
  process.argv[1]?.endsWith("build-pin-index.js") === true;

if (isDirectRun) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(msg);
      process.exit(1);
    });
}
