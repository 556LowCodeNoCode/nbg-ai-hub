import { describe, it, expect } from "vitest";
import { Volume, createFsFromVolume } from "memfs";
import {
  findStalePublished,
  isStale,
  parseFileDate,
  pruneStalePublished,
  RETENTION_DAYS,
} from "../src/retention.js";

type FsLike = typeof import("node:fs/promises");

function memFs(tree: Record<string, string>): FsLike {
  const vol = Volume.fromJSON(tree);
  return createFsFromVolume(vol).promises as unknown as FsLike;
}

describe("retention.parseFileDate", () => {
  it("parses a well-formed YYYY-MM-DD prefix", () => {
    expect(parseFileDate("2026-05-19-foo.md")).toEqual(new Date(Date.UTC(2026, 4, 19)));
  });

  it("returns null for filenames without a date prefix", () => {
    expect(parseFileDate("foo.md")).toBeNull();
    expect(parseFileDate("not-a-date-foo.md")).toBeNull();
    expect(parseFileDate(".gitkeep")).toBeNull();
  });

  it("returns null for malformed date prefixes", () => {
    expect(parseFileDate("2026-5-19-foo.md")).toBeNull(); // single-digit month
    expect(parseFileDate("2026-05-19foo.md")).toBeNull();  // missing trailing dash
  });
});

describe("retention.isStale", () => {
  const today = new Date(Date.UTC(2026, 4, 19)); // 2026-05-19 UTC

  it("returns true for a file strictly older than today - retentionDays", () => {
    // 2026-05-11 is 8 days before 2026-05-19 → stale at 7-day retention
    expect(isStale("2026-05-11-foo.md", today, 7)).toBe(true);
  });

  it("returns false at the retention boundary (exactly today - retentionDays)", () => {
    // 2026-05-12 is 7 days before 2026-05-19; cutoff is < (today - 7d) so
    // 2026-05-12 (== cutoff) is NOT strictly older → keep.
    expect(isStale("2026-05-12-foo.md", today, 7)).toBe(false);
  });

  it("returns false for today's files", () => {
    expect(isStale("2026-05-19-foo.md", today, 7)).toBe(false);
  });

  it("returns false for future-dated files (defensive — should not happen)", () => {
    expect(isStale("2026-06-01-foo.md", today, 7)).toBe(false);
  });

  it("returns false for files without a parseable date prefix", () => {
    expect(isStale(".gitkeep", today, 7)).toBe(false);
    expect(isStale("handcrafted.md", today, 7)).toBe(false);
  });

  it("uses the default RETENTION_DAYS when omitted", () => {
    expect(isStale("2026-05-11-foo.md", today)).toBe(true);
    expect(isStale("2026-05-13-foo.md", today)).toBe(false);
    expect(RETENTION_DAYS).toBe(7);
  });
});

describe("retention.findStalePublished", () => {
  const today = new Date(Date.UTC(2026, 4, 19));

  it("returns only stale .md files (skips non-md, skips fresh, skips dateless)", async () => {
    const fs = memFs({
      "/news/published/.gitkeep": "",
      "/news/published/2026-05-11-old.md": "content",   // stale
      "/news/published/2026-05-12-edge.md": "content",  // at boundary, NOT stale
      "/news/published/2026-05-19-today.md": "content", // today, not stale
      "/news/published/handcrafted.md": "content",       // no date prefix
      "/news/published/2026-05-11-old.png": "image",     // not md
    });
    const stale = await findStalePublished("/news/published", today, 7, fs);
    expect(stale.sort()).toEqual(["/news/published/2026-05-11-old.md"]);
  });

  it("returns [] when the folder is missing", async () => {
    const fs = memFs({ "/other/file.md": "x" });
    const stale = await findStalePublished("/news/published", today, 7, fs);
    expect(stale).toEqual([]);
  });

  it("returns [] when the folder exists but is empty", async () => {
    const fs = memFs({ "/news/published/.gitkeep": "" });
    const stale = await findStalePublished("/news/published", today, 7, fs);
    expect(stale).toEqual([]);
  });

  it("can prune all entries when every one is past the cutoff", async () => {
    const fs = memFs({
      "/news/published/2026-04-01-a.md": "a",
      "/news/published/2026-04-15-b.md": "b",
      "/news/published/2026-05-01-c.md": "c",
    });
    const stale = await findStalePublished("/news/published", today, 7, fs);
    expect(stale).toHaveLength(3);
  });
});

describe("retention.pruneStalePublished", () => {
  it("unlinks the given paths and returns the count", async () => {
    const fs = memFs({
      "/news/published/2026-05-11-old.md": "x",
      "/news/published/2026-05-12-edge.md": "y",
    });
    const removed = await pruneStalePublished(["/news/published/2026-05-11-old.md"], fs);
    expect(removed).toBe(1);
    // edge file untouched
    const remaining = await fs.readdir("/news/published");
    expect(remaining).toEqual(["2026-05-12-edge.md"]);
  });

  it("tolerates already-deleted paths (vanished concurrently)", async () => {
    const fs = memFs({ "/news/published/.gitkeep": "" });
    const removed = await pruneStalePublished(["/news/published/never-existed.md"], fs);
    expect(removed).toBe(0);
  });

  it("returns 0 when given an empty list", async () => {
    const fs = memFs({});
    expect(await pruneStalePublished([], fs)).toBe(0);
  });
});
