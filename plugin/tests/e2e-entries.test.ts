// End-to-end smoke for the compiled entry scripts.
// Spawns `node dist/<command>.mjs` against the bundled snapshot in plugin/snapshot/.

import { describe, expect, it, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginRoot = resolve(__dirname, "..");
const distDir = join(pluginRoot, "dist");

function runEntry(cmd: string, args: string[] = [], extraEnv: NodeJS.ProcessEnv = {}) {
  const tmpState = mkdtempSync(join(tmpdir(), "hub-e2e-state-"));
  try {
    const result = spawnSync("node", [join(distDir, `${cmd}.mjs`), ...args], {
      encoding: "utf-8",
      cwd: pluginRoot,
      env: {
        ...process.env,
        CLAUDE_PLUGIN_DATA: tmpState,
        ...extraEnv,
      },
      timeout: 15000,
    });
    return result;
  } finally {
    rmSync(tmpState, { recursive: true, force: true });
  }
}

describe("e2e — compiled entry scripts", () => {
  beforeAll(() => {
    if (!existsSync(distDir) || !existsSync(join(distDir, "hub.mjs"))) {
      throw new Error(
        "dist/ not built. Run `npm run build` before this test, or skip e2e tests.",
      );
    }
    if (!existsSync(join(pluginRoot, "snapshot", ".snapshot-meta.json"))) {
      throw new Error(
        "snapshot/ not built. Run `npm run build:snapshot` before this test.",
      );
    }
  });

  it("hub: prints menu with the four remaining pillars", () => {
    const r = runEntry("hub");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("NbgAiHub");
    expect(r.stdout).toContain("/hub-glossary");
    expect(r.stdout).toContain("/hub-tips");
    expect(r.stdout).toContain("/hub-skills");
    expect(r.stdout).toContain("/hub-onboard");
    expect(r.stdout).toContain("/hub-open");
    expect(r.stdout).not.toContain("/hub-news");
  });

  it("hub-glossary: returns a real glossary term", () => {
    const r = runEntry("hub-glossary", ["mcp"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("MCP");
  });

  it("hub-glossary <missing>: exits with E_CONTENT_NOT_FOUND code 1", () => {
    const r = runEntry("hub-glossary", ["nonexistent-term"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("E_CONTENT_NOT_FOUND");
  });

  it("hub-search: returns ranked results for a real query", () => {
    const r = runEntry("hub-search", ["claude"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Search results");
    expect(r.stdout).toContain("score");
  });

  it("hub-search (no query): exits 2 with usage on stderr", () => {
    const r = runEntry("hub-search");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("Usage:");
  });

  it("hub-audience: persists the setting", () => {
    const r = runEntry("hub-audience", ["beginner"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("BEGINNER");
  });

  it("hub-audience: rejects invalid value with E_CONFIG_INVALID code 2", () => {
    const r = runEntry("hub-audience", ["expert"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("E_CONFIG_INVALID");
  });

  it("hub-open (skip flag): resolves the deep-link URL", () => {
    const r = runEntry("hub-open", ["glossary", "mcp"], { HUB_OPEN_SKIP: "1" });
    expect(r.stdout).toContain("/glossary#mcp");
  });

  it("hub-onboard (no slug): lists available journeys", () => {
    const r = runEntry("hub-onboard");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Available journeys");
    expect(r.stdout).toContain("day-1");
  });

  it("hub-onboard <missing>: exits with E_JOURNEY_MISSING code 1", () => {
    const r = runEntry("hub-onboard", ["year-1"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("E_JOURNEY_MISSING");
  });

  it("hub-tips: graceful empty-pillar message when no tips authored", () => {
    const r = runEntry("hub-tips");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Tips/);
  });

  it("hub-skills: graceful empty-pillar message when no skills authored", () => {
    const r = runEntry("hub-skills");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Skills/);
  });

  it("hub-install <missing>: exits with E_CONTENT_NOT_FOUND", () => {
    const r = runEntry("hub-install", ["nonexistent-skill"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("E_CONTENT_NOT_FOUND");
  });
});
