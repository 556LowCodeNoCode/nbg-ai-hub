import { describe, it, expect } from "vitest";
import { computeFingerprint, FINGERPRINT_HEX_LENGTH } from "../src/fingerprint.js";

describe("fingerprint.computeFingerprint", () => {
  it("returns a 16-char hex string", () => {
    const fp = computeFingerprint({
      feedName: "Anthropic news",
      guid: "abc",
      link: null,
      title: "Whatever",
    });
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
    expect(fp).toHaveLength(FINGERPRINT_HEX_LENGTH);
  });

  it("is deterministic across calls", () => {
    const args = {
      feedName: "Anthropic news",
      guid: "abc",
      link: null,
      title: "Whatever",
    };
    expect(computeFingerprint(args)).toBe(computeFingerprint(args));
  });

  it("uses guid when present, falling back to link", () => {
    const withGuid = computeFingerprint({
      feedName: "F",
      guid: "g",
      link: "https://example.com",
      title: "T",
    });
    const withoutGuid = computeFingerprint({
      feedName: "F",
      guid: null,
      link: "https://example.com",
      title: "T",
    });
    expect(withGuid).not.toBe(withoutGuid);
  });

  it("falls back from guid to link to title", () => {
    const fromTitle = computeFingerprint({
      feedName: "F",
      guid: null,
      link: null,
      title: "Hello",
    });
    const fromLinkSameTitle = computeFingerprint({
      feedName: "F",
      guid: null,
      link: "https://example.com",
      title: "Hello",
    });
    // Link wins over title when both are present.
    expect(fromTitle).not.toBe(fromLinkSameTitle);
  });

  it("differs across feed names even with the same id", () => {
    const a = computeFingerprint({ feedName: "A", guid: "x", link: null, title: "T" });
    const b = computeFingerprint({ feedName: "B", guid: "x", link: null, title: "T" });
    expect(a).not.toBe(b);
  });
});
