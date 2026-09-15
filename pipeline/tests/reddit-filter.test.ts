import { describe, it, expect } from "vitest";
import {
  applyRedditEngagementFilter,
  REDDIT_MIN_SCORE,
  REDDIT_MIN_COMMENTS,
} from "../src/reddit-filter.js";
import type { FeedItem } from "../src/types.js";

function makeItem(overrides: {
  title?: string;
  score?: number;
  num_comments?: number;
  stickied?: boolean;
  noReddit?: boolean;
}): FeedItem {
  const base: FeedItem = {
    feedName: "r/ClaudeCode",
    guid: `t3_${overrides.title ?? "x"}`,
    link: "https://www.reddit.com/r/ClaudeCode/comments/x/",
    title: overrides.title ?? "post",
    publishedAt: new Date("2026-05-20T12:00:00Z"),
    rawContent: null,
  };
  if (overrides.noReddit) return base;
  base.reddit = {
    score: overrides.score ?? 100,
    num_comments: overrides.num_comments ?? 20,
    stickied: overrides.stickied ?? false,
  };
  return base;
}

describe("reddit-filter constants", () => {
  it("score threshold is 50 (DECISIONS 2026-05-21)", () => {
    expect(REDDIT_MIN_SCORE).toBe(50);
  });

  it("comments threshold is 10 (DECISIONS 2026-05-21)", () => {
    expect(REDDIT_MIN_COMMENTS).toBe(10);
  });
});

describe("reddit-filter.applyRedditEngagementFilter", () => {
  it("keeps a post that clears BOTH floors", () => {
    const { kept, dropped } = applyRedditEngagementFilter([
      makeItem({ score: 60, num_comments: 15 }),
    ]);
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it("drops stickies regardless of score", () => {
    const { kept, dropped } = applyRedditEngagementFilter([
      makeItem({ title: "sticky", score: 999, num_comments: 999, stickied: true }),
    ]);
    expect(kept).toHaveLength(0);
    expect(dropped[0]?.reason).toBe("stickied");
  });

  it("drops a post below the score floor", () => {
    const { kept, dropped } = applyRedditEngagementFilter([
      makeItem({ score: REDDIT_MIN_SCORE - 1, num_comments: 100 }),
    ]);
    expect(kept).toHaveLength(0);
    expect(dropped[0]?.reason).toBe("score_below_floor");
  });

  it("drops a post below the comments floor", () => {
    const { kept, dropped } = applyRedditEngagementFilter([
      makeItem({ score: 1000, num_comments: REDDIT_MIN_COMMENTS - 1 }),
    ]);
    expect(kept).toHaveLength(0);
    expect(dropped[0]?.reason).toBe("comments_below_floor");
  });

  it("requires BOTH floors (score-only or comments-only is not enough)", () => {
    const { kept } = applyRedditEngagementFilter([
      // Viral but shallow.
      makeItem({ title: "viral", score: 200, num_comments: 5 }),
      // Debated but unloved.
      makeItem({ title: "debated", score: 10, num_comments: 100 }),
    ]);
    expect(kept).toHaveLength(0);
  });

  it("checks stickied BEFORE score / comments (sticky reason takes priority)", () => {
    const { dropped } = applyRedditEngagementFilter([
      makeItem({ score: 1, num_comments: 1, stickied: true }),
    ]);
    expect(dropped[0]?.reason).toBe("stickied");
  });

  it("treats an item missing the reddit block as a wiring bug (missing_engagement)", () => {
    const { kept, dropped } = applyRedditEngagementFilter([
      makeItem({ noReddit: true }),
    ]);
    expect(kept).toHaveLength(0);
    expect(dropped[0]?.reason).toBe("missing_engagement");
  });

  it("treats the exact threshold as PASS (>= comparison)", () => {
    const { kept } = applyRedditEngagementFilter([
      makeItem({ score: REDDIT_MIN_SCORE, num_comments: REDDIT_MIN_COMMENTS }),
    ]);
    expect(kept).toHaveLength(1);
  });

  it("preserves input ordering of survivors", () => {
    const items = [
      makeItem({ title: "first", score: 100, num_comments: 30 }),
      makeItem({ title: "dropped", score: 5, num_comments: 5 }),
      makeItem({ title: "third", score: 80, num_comments: 20 }),
    ];
    const { kept } = applyRedditEngagementFilter(items);
    expect(kept.map((i) => i.title)).toEqual(["first", "third"]);
  });
});
