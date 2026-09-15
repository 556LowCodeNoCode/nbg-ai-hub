import { describe, it, expect } from "vitest";
import { Volume, createFsFromVolume } from "memfs";
import matter from "gray-matter";
import YAML from "yaml";
import { writeNewsItem } from "../src/write.js";
import type { EmittedItem } from "../src/types.js";

// Parse frontmatter via the same `yaml` engine the production code uses for
// serialization. Gray-matter's default js-yaml engine auto-converts YAML 1.1
// date strings (e.g. `2026-05-18`) into JS Date objects, which would break
// round-trip parity with the producer (yaml.stringify writes dates as plain
// ISO date strings). Using the `yaml` package here preserves strings as-is.
const matterOpts = {
  engines: {
    yaml: { parse: (s: string) => YAML.parse(s) as object },
  },
};

type FsLike = typeof import("node:fs/promises");

function memFs(tree: Record<string, string> = {}): FsLike {
  const vol = Volume.fromJSON(tree);
  const fs = createFsFromVolume(vol).promises as unknown as FsLike;
  return fs;
}

function makeEmitted(overrides: Partial<EmittedItem> = {}): EmittedItem {
  const base: EmittedItem = {
    item: {
      feedName: "Anthropic news",
      guid: "g1",
      link: "https://example.com/x",
      title: "Claude 4 launches",
      publishedAt: new Date("2026-05-18T09:00:00Z"),
      rawContent: "Body",
    },
    triage: {
      relevant: true,
      audience: "beginner",
      topics: ["setup", "workflow"],
      summary: "First sentence. Second sentence.",
      editor_confidence: "high",
    },
    runDateUtc: "2026-05-18",
    fingerprint: "abcd1234abcd1234",
    slug: "claude-4-launches",
    filename: "2026-05-18-claude-4-launches.md",
  };
  return { ...base, ...overrides };
}

const EXPECTED_KEYS = [
  "type",
  "title",
  "audience",
  "topics",
  "editor_confidence",
  "internal",
  "authored",
  "last_reviewed",
  "external_link",
  "deeper_link",
  "ai_summary",
  "source",
  "fingerprint",
];

describe("write.writeNewsItem", () => {
  it("emits files with date-slug.md name (AC12: ^\\d{4}-\\d{2}-\\d{2}-[a-z0-9-]+\\.md$)", async () => {
    const fs = memFs();
    const target = await writeNewsItem(makeEmitted(), "/news", "incoming", fs);
    expect(target).toBe("/news/incoming/2026-05-18-claude-4-launches.md");

    const basename = target.split("/").pop()!;
    expect(basename).toMatch(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/);
  });

  it("emits frontmatter matching shared content shape (AC11: exact 13 keys)", async () => {
    const fs = memFs();
    const target = await writeNewsItem(makeEmitted(), "/news", "incoming", fs);
    const content = await fs.readFile(target, "utf8");
    const parsed = matter(String(content), matterOpts);
    const fm = parsed.data as Record<string, unknown>;

    expect(Object.keys(fm).sort()).toEqual([...EXPECTED_KEYS].sort());
    expect(fm.type).toBe("news");
    expect(fm.internal).toBe(false);
    expect(fm.deeper_link).toBeNull();
    expect(fm.audience).toBe("beginner");
    expect(fm.topics).toEqual(["setup", "workflow"]);
    expect(fm.editor_confidence).toBe("high");
    expect(fm.authored).toBe("2026-05-18");
    expect(fm.last_reviewed).toBe("2026-05-18");
    expect(fm.external_link).toBe("https://example.com/x");
    expect(fm.source).toBe("Anthropic news");
    expect(fm.fingerprint).toBe("abcd1234abcd1234");
  });

  it("body contains two-sentence summary and source line", async () => {
    const fs = memFs();
    const target = await writeNewsItem(makeEmitted(), "/news", "incoming", fs);
    const content = String(await fs.readFile(target, "utf8"));
    expect(content).toContain("First sentence. Second sentence.");
    expect(content).toContain("> Source: [Anthropic news](https://example.com/x)");
  });

  it("creates the incoming/ folder if missing", async () => {
    const fs = memFs(); // entirely empty
    const target = await writeNewsItem(makeEmitted(), "/news", "incoming", fs);
    const stat = await fs.stat(target);
    expect(stat.isFile()).toBe(true);
  });

  it("throws if the target file already exists (slug-collision invariant)", async () => {
    const fs = memFs();
    await writeNewsItem(makeEmitted(), "/news", "incoming", fs);
    await expect(
      writeNewsItem(makeEmitted(), "/news", "incoming", fs),
    ).rejects.toThrow();
  });

  it("writes to news/published/ when destination is 'published' (variant C)", async () => {
    const fs = memFs();
    const target = await writeNewsItem(makeEmitted(), "/news", "published", fs);
    expect(target).toBe("/news/published/2026-05-18-claude-4-launches.md");
    const stat = await fs.stat(target);
    expect(stat.isFile()).toBe(true);
  });

  it("collision invariant still throws under the 'published' destination", async () => {
    const fs = memFs();
    await writeNewsItem(makeEmitted(), "/news", "published", fs);
    await expect(
      writeNewsItem(makeEmitted(), "/news", "published", fs),
    ).rejects.toThrow();
  });

  it("'incoming' and 'published' are independent paths — same slug can live in both", async () => {
    const fs = memFs();
    const inc = await writeNewsItem(makeEmitted(), "/news", "incoming", fs);
    const pub = await writeNewsItem(makeEmitted(), "/news", "published", fs);
    expect(inc).toBe("/news/incoming/2026-05-18-claude-4-launches.md");
    expect(pub).toBe("/news/published/2026-05-18-claude-4-launches.md");
  });
});
