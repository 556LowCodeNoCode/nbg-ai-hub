import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeed, FeedParseError } from "../src/parse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, "fixtures");

async function readFixture(name: string): Promise<string> {
  return fs.readFile(path.join(FIXTURES, name), "utf8");
}

describe("parse.parseFeed", () => {
  it("parses RSS 2.0 fixture into normalized items", async () => {
    const xml = await readFixture("rss-2.0.xml");
    const items = parseFeed("Anthropic news", xml);
    expect(items.length).toBeGreaterThan(0);
    const first = items[0]!;
    expect(first.feedName).toBe("Anthropic news");
    expect(typeof first.title).toBe("string");
    expect(first.title.length).toBeGreaterThan(0);
    // link or guid should be set on at least one item.
    expect(first.guid || first.link).toBeTruthy();
  });

  it("parses Atom fixture into normalized items", async () => {
    const xml = await readFixture("atom.xml");
    const items = parseFeed("Claude Code releases", xml);
    expect(items.length).toBeGreaterThan(0);
    const first = items[0]!;
    expect(first.feedName).toBe("Claude Code releases");
    expect(first.title.length).toBeGreaterThan(0);
  });

  it("throws FeedParseError on malformed input", async () => {
    const xml = await readFixture("malformed.xml");
    expect(() => parseFeed("garbage", xml)).toThrow(FeedParseError);
  });

  it("propagates feedName onto every item", async () => {
    const xml = await readFixture("rss-2.0.xml");
    const items = parseFeed("MyFeed", xml);
    for (const item of items) {
      expect(item.feedName).toBe("MyFeed");
    }
  });
});
