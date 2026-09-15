import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRedditJson } from "../src/parse-reddit.js";
import { FeedParseError } from "../src/parse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, "fixtures");

async function readFixture(name: string): Promise<string> {
  return fs.readFile(path.join(FIXTURES, name), "utf8");
}

describe("parse-reddit.parseRedditJson", () => {
  it("parses a Reddit listing JSON into normalized FeedItem[]", async () => {
    const body = await readFixture("reddit-new.json");
    const items = parseRedditJson("r/ClaudeCode", body);
    // 5 t3 children; the "more" child is skipped.
    expect(items).toHaveLength(5);
    expect(items.every((i) => i.feedName === "r/ClaudeCode")).toBe(true);
  });

  it("populates the reddit engagement block on every item", async () => {
    const body = await readFixture("reddit-new.json");
    const items = parseRedditJson("r/ClaudeCode", body);
    for (const item of items) {
      expect(item.reddit).toBeDefined();
      expect(typeof item.reddit?.score).toBe("number");
      expect(typeof item.reddit?.num_comments).toBe("number");
      expect(typeof item.reddit?.stickied).toBe("boolean");
    }
  });

  it("derives full reddit.com URL from permalink", async () => {
    const body = await readFixture("reddit-new.json");
    const items = parseRedditJson("r/ClaudeCode", body);
    const solid = items.find((i) => i.title === "Solid post on both axes");
    expect(solid?.link).toBe("https://www.reddit.com/r/ClaudeCode/comments/eee/solid/");
  });

  it("uses Reddit's `name` (e.g. t3_xxx) as guid", async () => {
    const body = await readFixture("reddit-new.json");
    const items = parseRedditJson("r/ClaudeCode", body);
    expect(items[0]?.guid).toBe("t3_aaa");
  });

  it("converts created_utc to a Date", async () => {
    const body = await readFixture("reddit-new.json");
    const items = parseRedditJson("r/ClaudeCode", body);
    expect(items[0]?.publishedAt).toBeInstanceOf(Date);
    expect(items[0]?.publishedAt?.getTime()).toBe(1729840000 * 1000);
  });

  it("preserves the stickied flag (filter runs separately)", async () => {
    const body = await readFixture("reddit-new.json");
    const items = parseRedditJson("r/ClaudeCode", body);
    const sticky = items.find((i) => i.title.includes("stickied"));
    expect(sticky?.reddit?.stickied).toBe(true);
  });

  it("skips children whose kind !== 't3'", async () => {
    const body = await readFixture("reddit-new.json");
    const items = parseRedditJson("r/ClaudeCode", body);
    // The fixture has one `more` child; ensure no item has its name.
    expect(items.find((i) => i.guid === "t1_ignored")).toBeUndefined();
  });

  it("throws FeedParseError on malformed JSON", () => {
    expect(() => parseRedditJson("r/x", "not json {")).toThrow(FeedParseError);
  });

  it("throws FeedParseError when data.children is missing", () => {
    expect(() =>
      parseRedditJson("r/x", JSON.stringify({ kind: "Listing", data: {} })),
    ).toThrow(FeedParseError);
  });

  it("throws FeedParseError when the root is not an object", () => {
    expect(() => parseRedditJson("r/x", JSON.stringify(42))).toThrow(FeedParseError);
  });

  it("returns empty array when children is an empty array", () => {
    const body = JSON.stringify({ kind: "Listing", data: { children: [] } });
    expect(parseRedditJson("r/x", body)).toEqual([]);
  });

  it("propagates feedName onto every item", async () => {
    const body = await readFixture("reddit-new.json");
    const items = parseRedditJson("MyFeed", body);
    for (const item of items) {
      expect(item.feedName).toBe("MyFeed");
    }
  });
});
