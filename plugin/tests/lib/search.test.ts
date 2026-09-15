import { describe, expect, it } from "vitest";
import { search, type SearchableItem } from "../../src/lib/search.js";
import type { BaseFrontmatter } from "../../src/lib/frontmatter.js";

function fm(title: string, topics: string[], audience: "beginner" | "advanced" | "both" = "both"): BaseFrontmatter {
  return {
    type: "tip",
    title,
    audience,
    topics,
    internal: false,
    authored: "2026-05-15",
    last_reviewed: "2026-05-19",
    external_link: null,
    deeper_link: null,
    ai_summary: "",
  };
}

const WEIGHTS = { title: 5, topics: 3, body: 1 };
const SNIPPET = 200;

describe("search ranking", () => {
  const items: SearchableItem[] = [
    {
      sourcePath: "/x/title-match.md",
      pillar: "tip",
      data: fm("MCP integration tips", ["protocol"]),
      content: "no body match here",
    },
    {
      sourcePath: "/x/topic-match.md",
      pillar: "tip",
      data: fm("Hello world", ["mcp", "tools"]),
      content: "irrelevant",
    },
    {
      sourcePath: "/x/body-match.md",
      pillar: "tip",
      data: fm("Hello world", ["unrelated"]),
      content: "this body mentions mcp twice. mcp again.",
    },
    {
      sourcePath: "/x/no-match.md",
      pillar: "tip",
      data: fm("Nothing relevant", ["other"]),
      content: "completely off-topic content",
    },
  ];

  it("scores title × 5, topics × 3, body × 1", () => {
    const hits = search("mcp", items, WEIGHTS, SNIPPET);
    expect(hits).toHaveLength(3);
    expect(hits[0]?.sourcePath).toBe("/x/title-match.md");
    expect(hits[0]?.score).toBe(5);
    expect(hits[1]?.sourcePath).toBe("/x/topic-match.md");
    expect(hits[1]?.score).toBe(3);
    expect(hits[2]?.sourcePath).toBe("/x/body-match.md");
    expect(hits[2]?.score).toBe(2);
  });

  it("excludes items with zero score", () => {
    const hits = search("nonexistent", items, WEIGHTS, SNIPPET);
    expect(hits).toEqual([]);
  });

  it("is case-insensitive", () => {
    const a = search("MCP", items, WEIGHTS, SNIPPET);
    const b = search("mcp", items, WEIGHTS, SNIPPET);
    expect(a.map((h) => h.sourcePath)).toEqual(b.map((h) => h.sourcePath));
  });

  it("returns [] for empty query", () => {
    expect(search("", items, WEIGHTS, SNIPPET)).toEqual([]);
    expect(search("   ", items, WEIGHTS, SNIPPET)).toEqual([]);
  });

  it("snippet contains the query term when body matches", () => {
    const hits = search("mcp", items, WEIGHTS, SNIPPET);
    const bodyHit = hits.find((h) => h.sourcePath === "/x/body-match.md");
    expect(bodyHit?.snippet.toLowerCase()).toContain("mcp");
  });

  it("snippet length stays within configured length (plus ellipsis padding)", () => {
    const longContent = "x".repeat(500) + " mcp " + "y".repeat(500);
    const hits = search(
      "mcp",
      [
        {
          sourcePath: "/x/long.md",
          pillar: "tip",
          data: fm("long", ["x"]),
          content: longContent,
        },
      ],
      WEIGHTS,
      200,
    );
    expect(hits[0]?.snippet.length).toBeLessThanOrEqual(210);
  });

  it("ties broken by sourcePath ascending", () => {
    const tied: SearchableItem[] = [
      { sourcePath: "/b.md", pillar: "tip", data: fm("foo", []), content: "" },
      { sourcePath: "/a.md", pillar: "tip", data: fm("foo", []), content: "" },
    ];
    const hits = search("foo", tied, WEIGHTS, SNIPPET);
    expect(hits[0]?.sourcePath).toBe("/a.md");
    expect(hits[1]?.sourcePath).toBe("/b.md");
  });
});
