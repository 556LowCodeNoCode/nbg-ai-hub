import { describe, it, expect } from "vitest";
import YAML from "yaml";
import { buildFrontmatter, serializeFrontmatter } from "../src/frontmatter.js";
import type { EmittedItem } from "../src/types.js";

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

function makeEmitted(): EmittedItem {
  return {
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
}

describe("frontmatter.buildFrontmatter", () => {
  it("emits frontmatter matching shared content shape (13 keys, type=news, internal=false)", () => {
    const fm = buildFrontmatter(makeEmitted());
    expect(Object.keys(fm).sort()).toEqual([...EXPECTED_KEYS].sort());
    expect(fm.type).toBe("news");
    expect(fm.internal).toBe(false);
    expect(fm.deeper_link).toBeNull();
  });

  it("sets last_reviewed equal to authored", () => {
    const fm = buildFrontmatter(makeEmitted());
    expect(fm.last_reviewed).toBe(fm.authored);
    expect(fm.authored).toBe("2026-05-18");
  });

  it("preserves canonical key insertion order", () => {
    const fm = buildFrontmatter(makeEmitted());
    expect(Object.keys(fm)).toEqual(EXPECTED_KEYS);
  });

  it("copies fingerprint, source, external_link, editor_confidence verbatim", () => {
    const emitted = makeEmitted();
    const fm = buildFrontmatter(emitted);
    expect(fm.fingerprint).toBe("abcd1234abcd1234");
    expect(fm.source).toBe("Anthropic news");
    expect(fm.external_link).toBe("https://example.com/x");
    expect(fm.editor_confidence).toBe("high");
  });
});

describe("frontmatter.serializeFrontmatter", () => {
  it("serializes to YAML preserving keys and values", () => {
    const fm = buildFrontmatter(makeEmitted());
    const yaml = serializeFrontmatter(fm);
    const parsed = YAML.parse(yaml) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual([...EXPECTED_KEYS].sort());
    expect(parsed.type).toBe("news");
    expect(parsed.internal).toBe(false);
    expect(parsed.deeper_link).toBeNull();
    expect(parsed.editor_confidence).toBe("high");
  });
});
