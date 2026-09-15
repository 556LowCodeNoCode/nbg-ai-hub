// site/tests/slug.test.ts
//
// Drift test: asserts that `site/src/lib/slug.ts` and `pipeline/src/slug.ts`
// produce byte-for-byte identical output for `slugify(title)` across a
// fixture table of >= 10 title/slug pairs. The two files MUST be kept in
// sync until the planned monorepo dedup; see Issues - Pending Items.md.
//
// Strategy: a single FIXTURES table holds title -> expected-slug pairs.
// Each fixture is evaluated three ways:
//   1. site slugify(title) === expected
//   2. pipeline slugify(title) === expected
//   3. site slugify(title) === pipeline slugify(title)  (drift assertion)

import { describe, it, expect } from "vitest";
import { slugify as siteSlugify, SLUG_MAX_LENGTH as SITE_CAP } from "../src/lib/slug.js";
import {
  slugify as pipelineSlugify,
  SLUG_MAX_LENGTH as PIPELINE_CAP,
} from "../../pipeline/src/slug.js";

interface SlugFixture {
  readonly title: string;
  readonly expected: string;
  readonly description: string;
}

const FIXTURES: readonly SlugFixture[] = [
  {
    title: "Anthropic ships Claude 4 with vision",
    expected: "anthropic-ships-claude-4-with-vision",
    description: "lowercases and kebab-cases a normal title",
  },
  {
    title: "Hello, World!",
    expected: "hello-world",
    description: "strips non-alphanumerics (comma + exclamation)",
  },
  {
    title: "foo___bar---baz",
    expected: "foo-bar-baz",
    description: "collapses runs of separators (underscores + dashes)",
  },
  {
    title: "!!! foo !!!",
    expected: "foo",
    description: "trims leading and trailing separators",
  },
  {
    title: "MCP & Skills: a primer",
    expected: "mcp-skills-a-primer",
    description: "ampersand + colon collapse to single dashes",
  },
  {
    title: "  whitespace   only  ",
    expected: "whitespace-only",
    description: "leading/trailing whitespace stripped, runs collapsed",
  },
  {
    title: "naïve café résumé",
    expected: "na-ve-caf-r-sum",
    description: "non-ASCII letters become separators (ASCII-only by design)",
  },
  {
    title: "100% pure CPU",
    expected: "100-pure-cpu",
    description: "percent sign treated as separator; digits preserved",
  },
  {
    title: "v1.2.3 release notes",
    expected: "v1-2-3-release-notes",
    description: "dots become separators between digits",
  },
  {
    title: "ALREADY-KEBAB-CASE",
    expected: "already-kebab-case",
    description: "uppercase kebab is lowercased verbatim",
  },
  {
    title: "x".repeat(SITE_CAP + 30),
    expected: "x".repeat(SITE_CAP),
    description: "no word boundary -> hard truncate at SLUG_MAX_LENGTH",
  },
  {
    title: "###",
    expected: "",
    description: "all separators -> empty string after trim",
  },
];

describe("slug drift parity (site vs pipeline)", () => {
  it("declares matching SLUG_MAX_LENGTH constants", () => {
    expect(SITE_CAP).toBe(PIPELINE_CAP);
  });

  it("has at least 10 fixtures", () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(10);
  });

  for (const fixture of FIXTURES) {
    describe(`fixture: ${fixture.description}`, () => {
      it("site slugify matches expected", () => {
        expect(siteSlugify(fixture.title)).toBe(fixture.expected);
      });

      it("pipeline slugify matches expected", () => {
        expect(pipelineSlugify(fixture.title)).toBe(fixture.expected);
      });

      it("site and pipeline outputs are byte-identical", () => {
        expect(siteSlugify(fixture.title)).toBe(pipelineSlugify(fixture.title));
      });
    });
  }

  describe("word-boundary truncation parity", () => {
    const longTitle =
      "a".repeat(20) + " " + "b".repeat(20) + " " + "c".repeat(40);

    it("site result within cap, no trailing dash", () => {
      const result = siteSlugify(longTitle);
      expect(result.length).toBeLessThanOrEqual(SITE_CAP);
      expect(result).not.toMatch(/-$/);
    });

    it("site and pipeline agree on truncation", () => {
      expect(siteSlugify(longTitle)).toBe(pipelineSlugify(longTitle));
    });
  });
});
