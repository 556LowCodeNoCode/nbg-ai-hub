import { describe, expect, it } from "vitest";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { loadConfig, resolveBaseUrl } from "../../src/lib/config.js";
import { ConfigMissingError, ConfigInvalidError } from "../../src/lib/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REAL_CONFIG = resolve(__dirname, "..", "..", "config.json");

describe("loadConfig (real plugin/config.json)", () => {
  it("loads all required keys with correct types", () => {
    const cfg = loadConfig(REAL_CONFIG);
    expect(typeof cfg.productionUrl).toBe("string");
    expect(typeof cfg.devUrl).toBe("string");
    expect(typeof cfg.devMode).toBe("boolean");
    expect(cfg.search.weights.title).toBe(5);
    expect(cfg.search.weights.topics).toBe(3);
    expect(cfg.search.weights.body).toBe(1);
    expect(cfg.search.snippetLength).toBe(200);
    expect(typeof cfg.snapshotPath).toBe("string");
    expect(typeof cfg.refreshCachePath).toBe("string");
    expect(typeof cfg.repoUrl).toBe("string");
  });
});

describe("loadConfig (error paths)", () => {
  function withTmpConfig<T>(contents: string, fn: (path: string) => T): T {
    const tmp = mkdtempSync(join(tmpdir(), "hub-cfg-"));
    const p = join(tmp, "config.json");
    writeFileSync(p, contents);
    try {
      return fn(p);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }

  it("throws ConfigMissingError when productionUrl missing", () => {
    const bad = JSON.stringify({
      devUrl: "http://localhost:4321",
      devMode: true,
      search: { weights: { title: 5, topics: 3, body: 1 }, snippetLength: 200 },
      snapshotPath: "./snapshot",
      refreshCachePath: "~/.cache/x",
      repoUrl: "https://example.com/x.git",
    });
    expect(() => withTmpConfig(bad, (p) => loadConfig(p))).toThrow(ConfigMissingError);
  });

  it("throws ConfigInvalidError when devMode is not boolean", () => {
    const bad = JSON.stringify({
      productionUrl: "https://example.com",
      devUrl: "http://localhost:4321",
      devMode: "yes",
      search: { weights: { title: 5, topics: 3, body: 1 }, snippetLength: 200 },
      snapshotPath: "./snapshot",
      refreshCachePath: "~/.cache/x",
      repoUrl: "https://example.com/x.git",
    });
    expect(() => withTmpConfig(bad, (p) => loadConfig(p))).toThrow(ConfigInvalidError);
  });

  it("throws ConfigInvalidError when search.weights.title is not number", () => {
    const bad = JSON.stringify({
      productionUrl: "https://example.com",
      devUrl: "http://localhost:4321",
      devMode: true,
      search: { weights: { title: "five", topics: 3, body: 1 }, snippetLength: 200 },
      snapshotPath: "./snapshot",
      refreshCachePath: "~/.cache/x",
      repoUrl: "https://example.com/x.git",
    });
    expect(() => withTmpConfig(bad, (p) => loadConfig(p))).toThrow(ConfigInvalidError);
  });

  it("throws ConfigMissingError when file is missing", () => {
    expect(() => loadConfig("/nonexistent/path/config.json")).toThrow(ConfigMissingError);
  });

  it("throws ConfigInvalidError when JSON is malformed", () => {
    expect(() => withTmpConfig("not-json", (p) => loadConfig(p))).toThrow(ConfigInvalidError);
  });
});

describe("resolveBaseUrl", () => {
  it("returns devUrl when devMode true", () => {
    const cfg = loadConfig(REAL_CONFIG);
    expect(resolveBaseUrl({ ...cfg, devMode: true })).toBe(cfg.devUrl);
  });

  it("returns productionUrl when devMode false", () => {
    const cfg = loadConfig(REAL_CONFIG);
    expect(resolveBaseUrl({ ...cfg, devMode: false })).toBe(cfg.productionUrl);
  });
});
