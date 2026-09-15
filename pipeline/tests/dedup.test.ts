import { describe, it, expect, vi } from "vitest";
import { Volume, createFsFromVolume } from "memfs";
import {
  dedupByTitle,
  isUnseen,
  loadSeenFingerprints,
  normalizeTitle,
} from "../src/dedup.js";

type FsLike = typeof import("node:fs/promises");

function memFs(tree: Record<string, string>): FsLike {
  const vol = Volume.fromJSON(tree);
  const fs = createFsFromVolume(vol).promises as unknown as FsLike;
  return fs;
}

const FILE_WITH_FP_INCOMING = `---
type: news
title: Existing in incoming
fingerprint: aaaaaaaaaaaaaaaa
---

Body.
`;

const FILE_WITH_FP_PUBLISHED = `---
type: news
title: Existing in published
fingerprint: bbbbbbbbbbbbbbbb
---

Body.
`;

const FILE_WITHOUT_FP = `---
type: tip
title: A handcrafted tip
---

Body.
`;

describe("dedup.loadSeenFingerprints", () => {
  it("returns fingerprints from both incoming and published folders", async () => {
    const fs = memFs({
      "/news/incoming/2026-05-17-seen.md": FILE_WITH_FP_INCOMING,
      "/news/published/2026-04-01-old.md": FILE_WITH_FP_PUBLISHED,
    });
    const seen = await loadSeenFingerprints("/news", fs);
    expect(seen.has("aaaaaaaaaaaaaaaa")).toBe(true);
    expect(seen.has("bbbbbbbbbbbbbbbb")).toBe(true);
    expect(seen.size).toBe(2);
  });

  it("tolerates files without a fingerprint field", async () => {
    const fs = memFs({
      "/news/incoming/handcrafted.md": FILE_WITHOUT_FP,
      "/news/incoming/2026-05-17-seen.md": FILE_WITH_FP_INCOMING,
    });
    const seen = await loadSeenFingerprints("/news", fs);
    expect(seen.size).toBe(1);
  });

  it("handles empty incoming and published folders (returns empty set)", async () => {
    const fs = memFs({});
    const seen = await loadSeenFingerprints("/news", fs);
    expect(seen.size).toBe(0);
  });
});

describe("dedup.isUnseen (AC7 — no Azure call for seen items)", () => {
  it("returns false for a fingerprint already in the seen set", () => {
    const seen = new Set(["aaaaaaaaaaaaaaaa"]);
    expect(isUnseen("aaaaaaaaaaaaaaaa", seen)).toBe(false);
  });

  it("returns true for a fingerprint not yet in the seen set", () => {
    const seen = new Set(["aaaaaaaaaaaaaaaa"]);
    expect(isUnseen("ccccccccccccccccc", seen)).toBe(true);
  });

  it("skips items whose fingerprint exists in incoming or published BEFORE any Azure call", async () => {
    // This is the orchestrator-level shape simulated locally: callers filter
    // candidates against the seen set without consulting Azure. We model the
    // "Azure mock" as a vi.fn that should never be called when items are
    // already seen.
    const seenSet = new Set(["seen-fp-1", "seen-fp-2"]);
    const azureCall = vi.fn();

    const candidates = [
      { fingerprint: "seen-fp-1", title: "Already in incoming" },
      { fingerprint: "seen-fp-2", title: "Already in published" },
    ];

    for (const c of candidates) {
      if (isUnseen(c.fingerprint, seenSet)) {
        azureCall(c);
      }
    }
    expect(azureCall).not.toHaveBeenCalled();
  });
});

describe("dedup.normalizeTitle", () => {
  it("is case-insensitive", () => {
    expect(normalizeTitle("Hello World")).toBe(normalizeTitle("hello world"));
  });

  it("strips trailing punctuation", () => {
    expect(normalizeTitle("Fast mode now defaults to Opus 4.7.")).toBe(
      normalizeTitle("Fast mode now defaults to Opus 4.7"),
    );
  });

  it("collapses internal whitespace", () => {
    expect(normalizeTitle("foo   bar\tbaz")).toBe("foo bar baz");
  });

  it("strips leading Re: / Fwd: prefixes", () => {
    expect(normalizeTitle("Re: claude update")).toBe(normalizeTitle("claude update"));
    expect(normalizeTitle("FWD: claude update")).toBe(normalizeTitle("claude update"));
  });

  it("strips leading bracketed tags", () => {
    expect(normalizeTitle("[Update] Claude 4.7 released")).toBe(
      normalizeTitle("Claude 4.7 released"),
    );
    expect(normalizeTitle("[Discussion] Tips")).toBe(normalizeTitle("Tips"));
  });

  it("is idempotent", () => {
    const once = normalizeTitle("  Hello, World!  ");
    expect(normalizeTitle(once)).toBe(once);
  });
});

describe("dedup.dedupByTitle (cross-feed near-duplicate dropper)", () => {
  type Candidate = { item: { feedName: string; title: string } };
  const reddit = { auto_promote_eligible: false };
  const hn = { auto_promote_eligible: true };
  const feedMap = new Map<string, { auto_promote_eligible: boolean }>([
    ["r/ClaudeAI", reddit],
    ["r/ClaudeCode", reddit],
    ["Hacker News frontpage", hn],
    ["Wired AI", hn],
  ]);

  it("keeps everything when titles are all distinct", () => {
    const candidates: Candidate[] = [
      { item: { feedName: "r/ClaudeAI", title: "A" } },
      { item: { feedName: "r/ClaudeCode", title: "B" } },
      { item: { feedName: "Hacker News frontpage", title: "C" } },
    ];
    const result = dedupByTitle(candidates, feedMap);
    expect(result.kept).toHaveLength(3);
    expect(result.dropped).toHaveLength(0);
  });

  it("drops a same-title duplicate from a second feed (insertion order wins among ties)", () => {
    const candidates: Candidate[] = [
      { item: { feedName: "r/ClaudeAI", title: "Fast mode now defaults to Opus 4.7." } },
      { item: { feedName: "r/ClaudeCode", title: "Fast mode now defaults to Opus 4.7." } },
    ];
    const result = dedupByTitle(candidates, feedMap);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0]?.item.feedName).toBe("r/ClaudeAI");
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]?.dropped.item.feedName).toBe("r/ClaudeCode");
  });

  it("normalises punctuation differences when comparing titles", () => {
    const candidates: Candidate[] = [
      { item: { feedName: "r/ClaudeAI", title: "Fast mode now defaults to Opus 4.7" } },
      { item: { feedName: "r/ClaudeCode", title: "Fast mode now defaults to Opus 4.7." } },
    ];
    const result = dedupByTitle(candidates, feedMap);
    expect(result.kept).toHaveLength(1);
    expect(result.dropped).toHaveLength(1);
  });

  it("prefers the auto-promote-eligible feed when both versions tie on title", () => {
    const candidates: Candidate[] = [
      { item: { feedName: "r/ClaudeAI", title: "Claude 5 released" } },
      { item: { feedName: "Hacker News frontpage", title: "Claude 5 released" } },
    ];
    const result = dedupByTitle(candidates, feedMap);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0]?.item.feedName).toBe("Hacker News frontpage");
    expect(result.dropped[0]?.dropped.item.feedName).toBe("r/ClaudeAI");
    expect(result.dropped[0]?.survivor.item.feedName).toBe("Hacker News frontpage");
  });

  it("when eligible feed comes first, still keeps it (insertion order)", () => {
    const candidates: Candidate[] = [
      { item: { feedName: "Hacker News frontpage", title: "Claude 5 released" } },
      { item: { feedName: "r/ClaudeAI", title: "Claude 5 released" } },
    ];
    const result = dedupByTitle(candidates, feedMap);
    expect(result.kept[0]?.item.feedName).toBe("Hacker News frontpage");
    expect(result.dropped[0]?.dropped.item.feedName).toBe("r/ClaudeAI");
  });

  it("preserves input order in `kept`", () => {
    const candidates: Candidate[] = [
      { item: { feedName: "r/ClaudeAI", title: "Alpha" } },
      { item: { feedName: "r/ClaudeCode", title: "Alpha" } },           // dup of #0
      { item: { feedName: "Hacker News frontpage", title: "Bravo" } },
      { item: { feedName: "Wired AI", title: "Charlie" } },
    ];
    const result = dedupByTitle(candidates, feedMap);
    expect(result.kept.map((c) => c.item.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("treats unknown feed names as ineligible (conservative fallback)", () => {
    const candidates: Candidate[] = [
      { item: { feedName: "mystery-feed", title: "Foo" } },
      { item: { feedName: "Hacker News frontpage", title: "Foo" } },
    ];
    const result = dedupByTitle(candidates, feedMap);
    expect(result.kept[0]?.item.feedName).toBe("Hacker News frontpage");
  });

  it("handles empty input", () => {
    const result = dedupByTitle([], feedMap);
    expect(result.kept).toEqual([]);
    expect(result.dropped).toEqual([]);
  });
});
