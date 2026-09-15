import { describe, expect, it } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listJourneys, findJourney, slugFromPath, isPlaceholderBody } from "../../src/lib/journeys.js";
import { JourneyMissingError } from "../../src/lib/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE = resolve(__dirname, "..", "fixtures", "snapshot");

describe("slugFromPath", () => {
  it("strips .md extension and directories", () => {
    expect(slugFromPath("/a/b/day-1.md")).toBe("day-1");
    expect(slugFromPath("day-1.md")).toBe("day-1");
  });
});

describe("listJourneys", () => {
  it("returns the fixture day-1 entry", () => {
    const entries = listJourneys(FIXTURE);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.slug).toBe("day-1");
    expect(entries[0]?.parsed.data["type"]).toBe("journey-step");
  });
});

describe("findJourney", () => {
  it("returns the matching journey", () => {
    const entry = findJourney(FIXTURE, "day-1");
    expect(entry.slug).toBe("day-1");
  });

  it("throws JourneyMissingError when slug not in snapshot", () => {
    expect(() => findJourney(FIXTURE, "year-1")).toThrow(JourneyMissingError);
  });
});

describe("isPlaceholderBody", () => {
  it("returns true for empty/short content", () => {
    expect(isPlaceholderBody("")).toBe(true);
    expect(isPlaceholderBody("short")).toBe(true);
  });

  it("returns true when 'content coming soon' present", () => {
    expect(isPlaceholderBody("Body content coming soon — TBD by next review cycle.")).toBe(true);
  });

  it("returns true when '[content in progress]' present", () => {
    expect(isPlaceholderBody("Some intro. [content in progress] — more later soon.")).toBe(true);
  });

  it("returns false for substantive content", () => {
    const body = `
Step 1. Install Claude Code.
Step 2. Start your first session.
Step 3. Learn the control keys (Esc Esc).
Step 4. Create your CLAUDE.md.
Step 5. Discover skills and plugins.
Step 6. Decide where to go next.
`;
    expect(isPlaceholderBody(body)).toBe(false);
  });
});
