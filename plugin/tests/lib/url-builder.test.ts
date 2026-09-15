import { describe, expect, it } from "vitest";
import { buildHubUrl } from "../../src/lib/url-builder.js";
import { UrlBuildError } from "../../src/lib/errors.js";

const BASE = "http://localhost:4321";

describe("buildHubUrl", () => {
  it("bare → site root with trailing slash", () => {
    expect(buildHubUrl({ baseUrl: BASE })).toBe(`${BASE}/`);
  });

  it("strips trailing slash from baseUrl before joining", () => {
    expect(buildHubUrl({ baseUrl: `${BASE}/`, section: "tips" })).toBe(`${BASE}/tips/`);
  });

  it("section 'glossary' (no subsection) → /glossary/", () => {
    expect(buildHubUrl({ baseUrl: BASE, section: "glossary" })).toBe(`${BASE}/glossary/`);
  });

  it("section 'glossary' with subsection → /glossary#<term>", () => {
    expect(buildHubUrl({ baseUrl: BASE, section: "glossary", subsection: "mcp" })).toBe(
      `${BASE}/glossary#mcp`,
    );
  });

  it("section 'day-1' → /start-here/day-1/ (alias)", () => {
    expect(buildHubUrl({ baseUrl: BASE, section: "day-1" })).toBe(`${BASE}/start-here/day-1/`);
  });

  it("section 'week-1' → /start-here/week-1/ (alias)", () => {
    expect(buildHubUrl({ baseUrl: BASE, section: "week-1" })).toBe(`${BASE}/start-here/week-1/`);
  });

  it.each(["skills", "tips", "journeys"])(
    "section '%s' → /<section>/",
    (section) => {
      expect(buildHubUrl({ baseUrl: BASE, section })).toBe(`${BASE}/${section}/`);
    },
  );

  it("unknown section throws UrlBuildError", () => {
    expect(() => buildHubUrl({ baseUrl: BASE, section: "unknown-section" })).toThrow(UrlBuildError);
  });

  it("UrlBuildError mentions the bad section name", () => {
    try {
      buildHubUrl({ baseUrl: BASE, section: "foo" });
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UrlBuildError);
      expect((err as UrlBuildError).message).toContain("foo");
    }
  });
});
