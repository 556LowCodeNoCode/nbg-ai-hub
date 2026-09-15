import { describe, expect, it } from "vitest";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import {
  parseMarkdownFile,
  isBaseFrontmatter,
  isSkillFrontmatter,
} from "../../src/lib/frontmatter.js";
import { FrontmatterInvalidError } from "../../src/lib/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE = resolve(__dirname, "..", "fixtures", "snapshot");
const REPO_GLOSSARY = resolve(__dirname, "..", "..", "..", "glossary");

describe("parseMarkdownFile (real project glossary)", () => {
  it("parses every glossary file in /glossary/", () => {
    const files = readdirSync(REPO_GLOSSARY).filter((f) => f.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      const parsed = parseMarkdownFile(join(REPO_GLOSSARY, f));
      expect(parsed.data["title"]).toBeTypeOf("string");
      expect(parsed.data["type"]).toBe("glossary");
      isBaseFrontmatter(parsed.data, "glossary", parsed.sourcePath);
    }
  });

  it("dates round-trip as strings (no YAML 1.1 auto-conversion to Date)", () => {
    const files = readdirSync(REPO_GLOSSARY).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      const parsed = parseMarkdownFile(join(REPO_GLOSSARY, f));
      expect(typeof parsed.data["authored"]).toBe("string");
      expect(typeof parsed.data["last_reviewed"]).toBe("string");
    }
  });
});

describe("isBaseFrontmatter", () => {
  it("accepts the fixture tip with all 10 keys", () => {
    const parsed = parseMarkdownFile(join(FIXTURE, "tips", "keep-it-simple.md"));
    expect(isBaseFrontmatter(parsed.data, "tip", parsed.sourcePath)).toBe(true);
  });

  it("rejects when title missing", () => {
    expect(() => isBaseFrontmatter({} as Record<string, unknown>, "tip")).toThrow(
      FrontmatterInvalidError,
    );
  });

  it("rejects when audience is wrong value", () => {
    expect(() =>
      isBaseFrontmatter(
        {
          type: "tip",
          title: "x",
          audience: "expert",
          topics: [],
          internal: false,
          authored: "2026-05-15",
          last_reviewed: "2026-05-19",
          external_link: null,
          deeper_link: null,
          ai_summary: "x",
        } as Record<string, unknown>,
        "tip",
      ),
    ).toThrow(FrontmatterInvalidError);
  });

  it("rejects when authored is not YYYY-MM-DD", () => {
    expect(() =>
      isBaseFrontmatter(
        {
          type: "tip",
          title: "x",
          audience: "both",
          topics: [],
          internal: false,
          authored: "May 15 2026",
          last_reviewed: "2026-05-19",
          external_link: null,
          deeper_link: null,
          ai_summary: "x",
        } as Record<string, unknown>,
        "tip",
      ),
    ).toThrow(FrontmatterInvalidError);
  });
});

describe("isSkillFrontmatter", () => {
  it("accepts the fixture skill with all 17 keys", () => {
    const parsed = parseMarkdownFile(join(FIXTURE, "skills", "example-skill.md"));
    expect(isSkillFrontmatter(parsed.data, parsed.sourcePath)).toBe(true);
  });

  it("rejects bad install_command prefix", () => {
    expect(() =>
      isSkillFrontmatter({
        type: "skill",
        title: "x",
        audience: "both",
        topics: [],
        internal: false,
        authored: "2026-05-15",
        last_reviewed: "2026-05-19",
        external_link: null,
        deeper_link: null,
        ai_summary: "x",
        install_command: "npm install foo",
        skill_id: "x",
        origin: "external",
        category: "workflow",
        status: "active",
        maintainer: "x",
      } as Record<string, unknown>),
    ).toThrow(FrontmatterInvalidError);
  });

  it("rejects bad skill_id pattern (uppercase letters)", () => {
    expect(() =>
      isSkillFrontmatter({
        type: "skill",
        title: "x",
        audience: "both",
        topics: [],
        internal: false,
        authored: "2026-05-15",
        last_reviewed: "2026-05-19",
        external_link: null,
        deeper_link: null,
        ai_summary: "x",
        install_command: "/plugin install foo",
        skill_id: "BadCase",
        origin: "external",
        category: "workflow",
        status: "active",
        maintainer: "x",
      } as Record<string, unknown>),
    ).toThrow(FrontmatterInvalidError);
  });

  it("accepts optional requires array when present", () => {
    expect(
      isSkillFrontmatter({
        type: "skill",
        title: "x",
        audience: "both",
        topics: [],
        internal: false,
        authored: "2026-05-15",
        last_reviewed: "2026-05-19",
        external_link: null,
        deeper_link: null,
        ai_summary: "x",
        install_command: "/plugin install foo",
        skill_id: "valid",
        origin: "external",
        category: "workflow",
        status: "active",
        maintainer: "x",
        requires: ["node>=22"],
      } as Record<string, unknown>),
    ).toBe(true);
  });
});
