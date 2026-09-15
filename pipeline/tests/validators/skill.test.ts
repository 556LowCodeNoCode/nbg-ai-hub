import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateSkillFile } from "../../src/validators/skill.js";
import {
  loadMaintainers,
  ConfigNotFoundError,
} from "../../src/validators/config.js";
import type { MaintainersConfig } from "../../src/validators/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, "fixtures");

const TEST_CONFIG: MaintainersConfig = {
  schema_version: 1,
  team_aliases: ["@nbg-ai-team"],
};

/**
 * Build a Response-like object that the validator only inspects via `.status`.
 */
function mockResponse(status: number): Response {
  return { status } as unknown as Response;
}

/**
 * The fixture files reference https://github.com/anthropics/claude-code as an
 * external_link. Stub `fetch` to avoid hitting the network and to control the
 * HEAD outcome per test.
 */
function stubFetch(status: number): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => mockResponse(status));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("validateSkillFile — happy path (AC16)", () => {
  beforeEach(() => stubFetch(200));
  afterEach(() => vi.unstubAllGlobals());

  it("returns ok:true for a fully-valid fixture", async () => {
    const filePath = path.join("skills", "valid-skill.md");
    const content = await readFile(
      path.join(FIXTURES, "valid-skill.md"),
      "utf8",
    );
    const result = await validateSkillFile(filePath, content, TEST_CONFIG);
    expect(result).toEqual({ ok: true });
  });
});

describe("validateSkillFile — missing install_command (AC17)", () => {
  beforeEach(() => stubFetch(200));
  afterEach(() => vi.unstubAllGlobals());

  it("flags missing install_command field", async () => {
    const filePath = path.join("skills", "missing-install-command.md");
    const content = await readFile(
      path.join(FIXTURES, "missing-install-command.md"),
      "utf8",
    );
    const result = await validateSkillFile(filePath, content, TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const installIssues = result.issues.filter(
        (i) => i.field === "install_command",
      );
      expect(installIssues.length).toBeGreaterThan(0);
      expect(installIssues[0]?.rule).toBe("required");
    }
  });
});

describe("validateSkillFile — bad category (AC18)", () => {
  beforeEach(() => stubFetch(200));
  afterEach(() => vi.unstubAllGlobals());

  it("flags a category value not in the enum", async () => {
    const filePath = path.join("skills", "bad-category.md");
    const content = await readFile(
      path.join(FIXTURES, "bad-category.md"),
      "utf8",
    );
    const result = await validateSkillFile(filePath, content, TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const catIssues = result.issues.filter((i) => i.field === "category");
      expect(catIssues.length).toBe(1);
      expect(catIssues[0]?.rule).toBe("enum");
    }
  });
});

describe("validateSkillFile — bad install_command prefix (AC19)", () => {
  beforeEach(() => stubFetch(200));
  afterEach(() => vi.unstubAllGlobals());

  it("flags install_command that does not start with an allowed prefix", async () => {
    const filePath = path.join("skills", "bad-install-command.md");
    const content = await readFile(
      path.join(FIXTURES, "bad-install-command.md"),
      "utf8",
    );
    const result = await validateSkillFile(filePath, content, TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const installIssues = result.issues.filter(
        (i) => i.field === "install_command",
      );
      expect(installIssues.length).toBe(1);
      expect(installIssues[0]?.rule).toBe("prefix");
    }
  });
});

describe("validateSkillFile — rate-limited external_link (AC20)", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stubFetch(429);
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    stderrSpy.mockRestore();
  });

  it("returns ok:true and warns to stderr when external_link returns 429", async () => {
    const filePath = path.join("skills", "valid-skill.md");
    const content = await readFile(
      path.join(FIXTURES, "valid-skill.md"),
      "utf8",
    );
    const result = await validateSkillFile(filePath, content, TEST_CONFIG);
    expect(result).toEqual({ ok: true });
    expect(stderrSpy).toHaveBeenCalled();
    const warned = stderrSpy.mock.calls
      .map((c) => String(c[0]))
      .join("\n");
    expect(warned).toMatch(/rate-limited/);
    expect(warned).toMatch(/429/);
  });
});

describe("validateSkillFile — bad external_link HEAD (4xx)", () => {
  beforeEach(() => stubFetch(404));
  afterEach(() => vi.unstubAllGlobals());

  it("flags a 4xx (non-429) HEAD response", async () => {
    const filePath = path.join("skills", "valid-skill.md");
    const content = await readFile(
      path.join(FIXTURES, "valid-skill.md"),
      "utf8",
    );
    const result = await validateSkillFile(filePath, content, TEST_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const linkIssues = result.issues.filter(
        (i) => i.field === "external_link",
      );
      expect(linkIssues.length).toBe(1);
      expect(linkIssues[0]?.rule).toBe("url-reachable");
    }
  });
});

describe("loadMaintainers — missing file", () => {
  it("throws ConfigNotFoundError when the file does not exist", async () => {
    await expect(
      loadMaintainers("/nonexistent/path/maintainers.json"),
    ).rejects.toBeInstanceOf(ConfigNotFoundError);
  });
});

describe("validateSkillFile — maintainer identity", () => {
  beforeEach(() => stubFetch(200));
  afterEach(() => vi.unstubAllGlobals());

  it("accepts a team alias from maintainers config", async () => {
    const base = await readFile(
      path.join(FIXTURES, "valid-skill.md"),
      "utf8",
    );
    const swapped = base.replace(
      'maintainer: "@chomovazuzana"',
      'maintainer: "@nbg-ai-team"',
    );
    const result = await validateSkillFile(
      path.join("skills", "valid-skill.md"),
      swapped,
      TEST_CONFIG,
    );
    expect(result).toEqual({ ok: true });
  });

  it("accepts a GitHub handle matching the @name regex", async () => {
    const base = await readFile(
      path.join(FIXTURES, "valid-skill.md"),
      "utf8",
    );
    // Already @chomovazuzana — happy path covered, but assert explicitly here.
    const result = await validateSkillFile(
      path.join("skills", "valid-skill.md"),
      base,
      TEST_CONFIG,
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects a maintainer that is neither a handle nor a known alias", async () => {
    const base = await readFile(
      path.join(FIXTURES, "valid-skill.md"),
      "utf8",
    );
    const broken = base.replace(
      'maintainer: "@chomovazuzana"',
      'maintainer: "not-a-handle"',
    );
    const result = await validateSkillFile(
      path.join("skills", "valid-skill.md"),
      broken,
      TEST_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const mIssues = result.issues.filter((i) => i.field === "maintainer");
      expect(mIssues.length).toBe(1);
      expect(mIssues[0]?.rule).toBe("identity");
    }
  });
});

describe("validateSkillFile — file path must match skill_id", () => {
  beforeEach(() => stubFetch(200));
  afterEach(() => vi.unstubAllGlobals());

  it("flags a mismatch between filename and skill_id", async () => {
    const content = await readFile(
      path.join(FIXTURES, "valid-skill.md"),
      "utf8",
    );
    // skill_id is 'valid-skill' but we pass it under 'skills/foo.md'.
    const result = await validateSkillFile(
      path.join("skills", "foo.md"),
      content,
      TEST_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const pathIssues = result.issues.filter(
        (i) => i.field === "skill_id" && i.rule === "path-match",
      );
      expect(pathIssues.length).toBe(1);
    }
  });
});
