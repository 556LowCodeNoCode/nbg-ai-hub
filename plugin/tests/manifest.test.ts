import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginRoot = resolve(__dirname, "..");
const repoRoot = resolve(pluginRoot, "..");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("plugin.json (plugin/.claude-plugin/plugin.json)", () => {
  const manifest = readJson(
    resolve(pluginRoot, ".claude-plugin", "plugin.json"),
  ) as Record<string, unknown>;

  it("declares required keys", () => {
    expect(manifest.name).toBe("nbg-ai-hub");
    expect(typeof manifest.description).toBe("string");
    expect(manifest.author).toBeTypeOf("object");
  });

  it("does NOT enumerate commands (filesystem-discovered per Claude Code spec)", () => {
    expect(manifest).not.toHaveProperty("commands");
  });

  it("does NOT declare a version key (Claude Code resolves version from marketplace.json)", () => {
    expect(manifest).not.toHaveProperty("version");
  });

  it("author object has name + url", () => {
    const author = manifest.author as Record<string, unknown>;
    expect(author.name).toBe("NbgAiHub");
    expect(author.url).toBe("https://github.com/556LowCodeNoCode/NbgAiHub");
  });
});

describe("marketplace.json (repo-root .claude-plugin/marketplace.json)", () => {
  const marketplace = readJson(
    resolve(repoRoot, ".claude-plugin", "marketplace.json"),
  ) as Record<string, unknown>;

  it("declares the marketplace name and owner", () => {
    expect(marketplace.name).toBe("nbg-ai-hub-marketplace");
    expect(marketplace.owner).toBeTypeOf("object");
  });

  it("lists the nbg-ai-hub plugin with source './plugin'", () => {
    const plugins = marketplace.plugins as Array<Record<string, unknown>>;
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins).toHaveLength(1);
    expect(plugins[0]?.name).toBe("nbg-ai-hub");
    expect(plugins[0]?.source).toBe("./plugin");
    expect(typeof plugins[0]?.description).toBe("string");
  });
});

describe("config.json (plugin/config.json)", () => {
  const config = readJson(resolve(pluginRoot, "config.json")) as Record<
    string,
    unknown
  >;

  it("has all required top-level keys", () => {
    expect(config).toHaveProperty("productionUrl");
    expect(config).toHaveProperty("devUrl");
    expect(config).toHaveProperty("devMode");
    expect(config).toHaveProperty("search");
    expect(config).toHaveProperty("snapshotPath");
    expect(config).toHaveProperty("refreshCachePath");
    expect(config).toHaveProperty("repoUrl");
  });

  it("URLs are well-typed strings", () => {
    expect(typeof config.productionUrl).toBe("string");
    expect(typeof config.devUrl).toBe("string");
    expect(typeof config.repoUrl).toBe("string");
  });

  it("devMode is a boolean (false now that the site is live at the org URL)", () => {
    expect(typeof config.devMode).toBe("boolean");
    expect(config.devMode).toBe(false);
  });

  it("search weights match design H.4 (title 5 / topics 3 / body 1)", () => {
    const search = config.search as { weights: Record<string, number>; snippetLength: number };
    expect(search.weights.title).toBe(5);
    expect(search.weights.topics).toBe(3);
    expect(search.weights.body).toBe(1);
    expect(search.snippetLength).toBe(200);
  });

  it("paths are non-empty strings", () => {
    expect(typeof config.snapshotPath).toBe("string");
    expect(config.snapshotPath).toBeTruthy();
    expect(typeof config.refreshCachePath).toBe("string");
    expect(config.refreshCachePath).toBeTruthy();
  });
});
