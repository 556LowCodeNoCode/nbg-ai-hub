import { describe, expect, it } from "vitest";
import { matchesAudience, filterByAudience, badge } from "../../src/lib/audience.js";

describe("matchesAudience", () => {
  it("user 'both' matches every item", () => {
    expect(matchesAudience("beginner", "both")).toBe(true);
    expect(matchesAudience("advanced", "both")).toBe(true);
    expect(matchesAudience("both", "both")).toBe(true);
  });

  it("item 'both' matches every user filter", () => {
    expect(matchesAudience("both", "beginner")).toBe(true);
    expect(matchesAudience("both", "advanced")).toBe(true);
  });

  it("beginner user hides advanced items", () => {
    expect(matchesAudience("advanced", "beginner")).toBe(false);
  });

  it("advanced user hides beginner items", () => {
    expect(matchesAudience("beginner", "advanced")).toBe(false);
  });
});

describe("filterByAudience", () => {
  const items = [
    { data: { audience: "beginner" as const } },
    { data: { audience: "advanced" as const } },
    { data: { audience: "both" as const } },
  ];

  it("'both' returns all 3", () => {
    expect(filterByAudience(items, "both")).toHaveLength(3);
  });

  it("'beginner' returns beginner + both (2)", () => {
    expect(filterByAudience(items, "beginner")).toHaveLength(2);
  });

  it("'advanced' returns advanced + both (2)", () => {
    expect(filterByAudience(items, "advanced")).toHaveLength(2);
  });
});

describe("badge", () => {
  it("renders plain-text uppercase tokens with no ANSI", () => {
    expect(badge("beginner")).toBe("[BEGINNER]");
    expect(badge("advanced")).toBe("[ADVANCED]");
    expect(badge("both")).toBe("[BOTH]");
  });
});
