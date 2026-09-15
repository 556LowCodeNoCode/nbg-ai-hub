import { describe, it, expect } from "vitest";
import { slugify, resolveSlugCollision, SLUG_MAX_LENGTH } from "../src/slug.js";

describe("slug.slugify", () => {
  it("lowercases and kebab-cases a normal title", () => {
    expect(slugify("Anthropic ships Claude 4 with vision")).toBe(
      "anthropic-ships-claude-4-with-vision",
    );
  });

  it("strips non-alphanumerics", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("collapses runs of separators", () => {
    expect(slugify("foo___bar---baz")).toBe("foo-bar-baz");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("!!! foo !!!")).toBe("foo");
  });

  it("truncates at SLUG_MAX_LENGTH on a word boundary", () => {
    const longTitle = "a".repeat(20) + " " + "b".repeat(20) + " " + "c".repeat(40);
    const result = slugify(longTitle);
    expect(result.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    // No trailing dash.
    expect(result).not.toMatch(/-$/);
  });

  it("truncates within the cap when no word boundary", () => {
    const longTitle = "x".repeat(SLUG_MAX_LENGTH + 30);
    const result = slugify(longTitle);
    expect(result.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
  });
});

describe("slug.resolveSlugCollision", () => {
  it("returns the base slug if not taken", () => {
    expect(resolveSlugCollision("hello-world", new Set())).toBe("hello-world");
  });

  it("appends -2 on first collision", () => {
    const taken = new Set(["hello-world"]);
    expect(resolveSlugCollision("hello-world", taken)).toBe("hello-world-2");
  });

  it("appends -3 on second collision", () => {
    const taken = new Set(["hello-world", "hello-world-2"]);
    expect(resolveSlugCollision("hello-world", taken)).toBe("hello-world-3");
  });

  it("keeps incrementing for further collisions", () => {
    const taken = new Set(["foo", "foo-2", "foo-3", "foo-4"]);
    expect(resolveSlugCollision("foo", taken)).toBe("foo-5");
  });

  it("does not mutate the input set", () => {
    const taken = new Set(["foo"]);
    resolveSlugCollision("foo", taken);
    expect(taken.has("foo-2")).toBe(false);
  });
});
