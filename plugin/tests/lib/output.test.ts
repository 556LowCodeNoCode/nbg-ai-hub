import { describe, expect, it } from "vitest";
import {
  DIVIDER,
  renderListItem,
  renderSearchHit,
  renderSnapshotFooter,
  renderSection,
  renderEmptyPillar,
} from "../../src/lib/output.js";

describe("DIVIDER", () => {
  it("is 60 box-drawing horizontal lines", () => {
    expect(DIVIDER).toHaveLength(60);
    expect(DIVIDER).toMatch(/^─+$/);
  });
});

describe("renderListItem", () => {
  it("uses uppercase audience badge with no ANSI codes", () => {
    const s = renderListItem({
      title: "MCP",
      audience: "both",
      topics: ["protocol", "tools"],
      description: "the Model Context Protocol",
    });
    expect(s).toContain("[BOTH]");
    expect(s).not.toMatch(/\x1b\[/); // no ANSI escape
  });

  it("renders topics as comma-separated", () => {
    const s = renderListItem({
      title: "x",
      audience: "beginner",
      topics: ["a", "b", "c"],
      description: "d",
    });
    expect(s).toContain("a, b, c");
  });

  it("emits — when topics empty", () => {
    const s = renderListItem({ title: "x", audience: "beginner", topics: [], description: "d" });
    expect(s).toContain("—");
  });
});

describe("renderSearchHit", () => {
  it("renders pillar and score in metadata line", () => {
    const s = renderSearchHit({
      sourcePath: "/x.md",
      pillar: "tip",
      title: "MCP intro",
      score: 5,
      snippet: "MCP is the protocol …",
      audience: "both",
    });
    expect(s).toContain("MCP intro");
    expect(s).toContain("[BOTH]");
    expect(s).toContain("tip");
    expect(s).toContain("5");
  });
});

describe("renderSnapshotFooter", () => {
  it("truncates source commit to 7 chars", () => {
    const s = renderSnapshotFooter({
      generatedAt: "2026-05-19T10:00:00Z",
      sourceCommit: "c73c36d480f112ec6e47d50a94d203ea48979246",
    });
    expect(s).toContain("c73c36d");
    expect(s).not.toContain("c73c36d480f");
    expect(s).toContain("2026-05-19T10:00:00Z");
  });
});

describe("renderSection", () => {
  it("prepends a title + divider", () => {
    const s = renderSection("Tips", ["a", "b"]);
    expect(s.startsWith("Tips\n")).toBe(true);
    expect(s).toContain(DIVIDER);
  });

  it("emits '(no entries)' for empty lines", () => {
    expect(renderSection("Skills", [])).toContain("(no entries)");
  });
});

describe("renderEmptyPillar", () => {
  it("mentions /hub-refresh", () => {
    expect(renderEmptyPillar("skills")).toContain("/hub-refresh");
  });
});
