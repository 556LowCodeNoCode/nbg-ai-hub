import { describe, it, expect } from "vitest";
import { buildFeedMap, shouldAutoPromote } from "../src/auto-promote.js";
import type { EmittedItem, FeedSource } from "../src/types.js";

function makeFeed(overrides: Partial<FeedSource> = {}): FeedSource {
  return {
    name: "Hacker News frontpage",
    url: "https://hnrss.org/frontpage",
    enabled: true,
    auto_promote_eligible: true,
    ...overrides,
  };
}

function makeEmitted(overrides: {
  feedName?: string;
  editor_confidence?: "high" | "medium" | "low";
} = {}): EmittedItem {
  return {
    item: {
      feedName: overrides.feedName ?? "Hacker News frontpage",
      guid: "g1",
      link: "https://example.com/x",
      title: "Some news",
      publishedAt: new Date("2026-05-19T09:00:00Z"),
      rawContent: null,
    },
    triage: {
      relevant: true,
      audience: "both",
      topics: ["news"],
      summary: "S1. S2.",
      editor_confidence: overrides.editor_confidence ?? "high",
    },
    runDateUtc: "2026-05-19",
    fingerprint: "fp_abcd",
    slug: "some-news",
    filename: "2026-05-19-some-news.md",
  };
}

describe("auto-promote.shouldAutoPromote", () => {
  it("returns true for an eligible feed regardless of confidence", () => {
    const feeds = buildFeedMap([makeFeed()]);
    expect(shouldAutoPromote(makeEmitted({ editor_confidence: "high" }), feeds)).toBe(true);
    expect(shouldAutoPromote(makeEmitted({ editor_confidence: "medium" }), feeds)).toBe(true);
    expect(shouldAutoPromote(makeEmitted({ editor_confidence: "low" }), feeds)).toBe(true);
  });

  it("returns false on an INELIGIBLE feed regardless of confidence", () => {
    const feeds = buildFeedMap([makeFeed({ auto_promote_eligible: false })]);
    expect(shouldAutoPromote(makeEmitted({ editor_confidence: "high" }), feeds)).toBe(false);
    expect(shouldAutoPromote(makeEmitted({ editor_confidence: "medium" }), feeds)).toBe(false);
    expect(shouldAutoPromote(makeEmitted({ editor_confidence: "low" }), feeds)).toBe(false);
  });

  it("returns false when the feed is unknown (not in the map)", () => {
    const feeds = buildFeedMap([makeFeed({ name: "Other" })]);
    expect(shouldAutoPromote(makeEmitted(), feeds)).toBe(false);
  });

  it("returns false when the item's feed is not present in an empty map", () => {
    const feeds = buildFeedMap([]);
    expect(shouldAutoPromote(makeEmitted(), feeds)).toBe(false);
  });

  it("flagging a feed false later (operator override) blocks auto-promote", () => {
    const feeds = buildFeedMap([
      makeFeed({ name: "r/ClaudeAI", auto_promote_eligible: false }),
    ]);
    expect(
      shouldAutoPromote(makeEmitted({ feedName: "r/ClaudeAI" }), feeds),
    ).toBe(false);
  });
});

describe("auto-promote.buildFeedMap", () => {
  it("indexes feeds by name", () => {
    const feeds = buildFeedMap([
      makeFeed({ name: "A" }),
      makeFeed({ name: "B", auto_promote_eligible: false }),
    ]);
    expect(feeds.get("A")?.auto_promote_eligible).toBe(true);
    expect(feeds.get("B")?.auto_promote_eligible).toBe(false);
    expect(feeds.get("missing")).toBeUndefined();
  });

  it("returns an empty map for an empty input", () => {
    const feeds = buildFeedMap([]);
    expect(feeds.size).toBe(0);
  });
});
