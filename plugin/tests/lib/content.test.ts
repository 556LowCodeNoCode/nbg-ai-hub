import { describe, expect, it } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadAll,
  loadGlossary,
  loadSkills,
  loadTips,
  loadJourneys,
  filterByTopic,
} from "../../src/lib/content.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE = resolve(__dirname, "..", "fixtures", "snapshot");

describe("loadAll", () => {
  it("loads every pillar from the fixture snapshot", () => {
    const all = loadAll(FIXTURE);
    expect(all.glossary).toHaveLength(1);
    expect(all.tips).toHaveLength(1);
    expect(all.skills).toHaveLength(1);
    expect(all.journeys).toHaveLength(1);
  });

  it("each entry carries sourcePath, pillar, data, content, slug", () => {
    const all = loadAll(FIXTURE);
    const g = all.glossary[0];
    expect(g?.sourcePath.endsWith("/glossary/mcp.md")).toBe(true);
    expect(g?.pillar).toBe("glossary");
    expect(g?.slug).toBe("mcp");
    expect(g?.data.title).toBe("MCP");
    expect(g?.content).toContain("MCP stands for");
  });

  it("skills loader validates the 17-key shape", () => {
    const skills = loadSkills(FIXTURE);
    expect(skills[0]?.data.skill_id).toBe("example-skill");
    expect(skills[0]?.data.category).toBe("workflow");
    expect(skills[0]?.data.install_command.startsWith("/plugin marketplace add ")).toBe(true);
  });
});

describe("filterByTopic", () => {
  const all = loadAll(FIXTURE);

  it("returns all entries when topic is undefined", () => {
    expect(filterByTopic(all.glossary, undefined)).toHaveLength(all.glossary.length);
  });

  it("filters case-insensitively on topic substring", () => {
    const matched = filterByTopic(loadTips(FIXTURE), "PROMPT");
    expect(matched.some((t) => t.data.topics.includes("prompts"))).toBe(true);
  });

  it("returns [] when no topic matches", () => {
    expect(filterByTopic(loadGlossary(FIXTURE), "nonexistent-topic")).toEqual([]);
  });
});

describe("loadJourneys", () => {
  it("returns journey entries with slugs", () => {
    const journeys = loadJourneys(FIXTURE);
    expect(journeys[0]?.slug).toBe("day-1");
    expect(journeys[0]?.data.title).toContain("Day 1");
  });
});
