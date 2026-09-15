// site/tests/build-pin-index.test.ts
//
// Verifies the build-pin-index generator:
//   1. Emits one JSON file per content type, with the correct
//      `schema_version` and `type` literal.
//   2. Counts items correctly from a scaffolded fixture tree.
//   3. Throws an explicit Error naming the offending file when a required
//      frontmatter field (`audience`) is missing — i.e. honours the
//      no-fallback rule from the global CLAUDE.md.
//
// Each test gets its own mkdtempSync() temp dir so they cannot interfere.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildPinIndex } from "../scripts/build-pin-index.js";

function makeTempRepo(): string {
  return mkdtempSync(join(tmpdir(), "pin-index-test-"));
}

/** Write a markdown file with the given frontmatter object. */
function writeMd(
  path: string,
  frontmatter: Record<string, unknown>,
  body = "body\n",
): void {
  const lines: string[] = ["---"];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) {
        lines.push(`  - ${item}`);
      }
    } else {
      lines.push(`${k}: ${String(v)}`);
    }
  }
  lines.push("---", "", body);
  writeFileSync(path, lines.join("\n"), "utf8");
}

describe("buildPinIndex — happy path", () => {
  let repoRoot: string;
  let outDir: string;

  beforeAll(async () => {
    repoRoot = makeTempRepo();
    outDir = join(repoRoot, "out");

    // 2 glossary terms, 1 tip — total 3 files, 2 content types populated.
    // News source removed 2026-06-08 alongside the news pillar decommission.
    mkdirSync(join(repoRoot, "skills"), { recursive: true });
    mkdirSync(join(repoRoot, "tips"), { recursive: true });
    mkdirSync(join(repoRoot, "glossary"), { recursive: true });
    mkdirSync(join(repoRoot, "journeys"), { recursive: true });

    writeMd(join(repoRoot, "glossary", "alpha.md"), {
      title: "Alpha",
      audience: "both",
      topics: ["glossary"],
    });
    writeMd(join(repoRoot, "glossary", "beta.md"), {
      title: "Beta",
      audience: "advanced",
      topics: ["glossary", "internals"],
    });

    writeMd(join(repoRoot, "tips", "shortcut.md"), {
      title: "Shortcut tip",
      audience: "beginner",
      topics: ["tips"],
    });

    // skills/ and journeys/ left empty on purpose.

    await buildPinIndex(repoRoot, outDir);
  });

  afterAll(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  const expected: ReadonlyArray<{ file: string; type: string; count: number }> = [
    { file: "skill-index.json", type: "skill", count: 0 },
    { file: "tip-index.json", type: "tip", count: 1 },
    { file: "use-case-index.json", type: "use-case", count: 0 },
    { file: "glossary-index.json", type: "glossary", count: 2 },
    { file: "journey-step-index.json", type: "journey-step", count: 0 },
  ];

  for (const exp of expected) {
    it(`emits ${exp.file} with type='${exp.type}' and ${exp.count} item(s)`, () => {
      const abs = join(outDir, exp.file);
      expect(existsSync(abs)).toBe(true);
      const parsed = JSON.parse(readFileSync(abs, "utf8")) as {
        schema_version: number;
        type: string;
        items: unknown[];
      };
      expect(parsed.schema_version).toBe(1);
      expect(parsed.type).toBe(exp.type);
      expect(parsed.items).toHaveLength(exp.count);
    });
  }

  it("preserves the bare filename as slug for all content", () => {
    const glossary = JSON.parse(
      readFileSync(join(outDir, "glossary-index.json"), "utf8"),
    ) as { items: ReadonlyArray<{ slug: string }> };
    const slugs = glossary.items.map((i) => i.slug).sort();
    expect(slugs).toEqual(["alpha", "beta"]);
  });
});

describe("buildPinIndex — no-fallback enforcement", () => {
  it("throws an Error naming the file when 'audience' is missing", async () => {
    const repoRoot = makeTempRepo();
    const outDir = join(repoRoot, "out");
    try {
      mkdirSync(join(repoRoot, "glossary"), { recursive: true });
      // Deliberately omit 'audience'.
      writeMd(join(repoRoot, "glossary", "broken.md"), {
        title: "Broken term",
        topics: ["glossary"],
      });

      await expect(buildPinIndex(repoRoot, outDir)).rejects.toThrowError(
        /broken\.md/,
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
