import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Volume, createFsFromVolume } from "memfs";
import { loadConfig, ConfigSchemaError } from "../src/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES = path.join(__dirname, "fixtures");
const REPO_CONFIG = path.resolve(__dirname, "..", "..", "config", "rss-sources.json");

type FsLike = typeof import("node:fs/promises");

function memFs(tree: Record<string, string>): FsLike {
  const vol = Volume.fromJSON(tree);
  const fs = createFsFromVolume(vol).promises as unknown as FsLike;
  return fs;
}

describe("config.loadConfig", () => {
  it("loads sources from config/rss-sources.json (real seed)", async () => {
    const sources = await loadConfig(REPO_CONFIG);
    expect(sources).toHaveLength(5);
    for (const s of sources) {
      expect(typeof s.name).toBe("string");
      expect(typeof s.url).toBe("string");
      expect(typeof s.enabled).toBe("boolean");
      expect(typeof s.auto_promote_eligible).toBe("boolean");
      expect(["rss", "reddit-json"]).toContain(s.type);
    }
  });

  it("real seed encodes the unconditional auto-promote policy (every enabled feed is eligible)", async () => {
    const sources = await loadConfig(REPO_CONFIG);
    const eligible = new Map(sources.map((s) => [s.name, s.auto_promote_eligible]));
    expect(eligible.get("r/ClaudeAI")).toBe(true);
    expect(eligible.get("r/ClaudeCode")).toBe(true);
    expect(eligible.get("Hacker News frontpage")).toBe(true);
    expect(eligible.get("Wired AI")).toBe(true);
    expect(eligible.get("The Verge")).toBe(true);
  });

  it("real seed assigns a valid type discriminator to every feed", async () => {
    // DECISIONS 2026-05-21 added the `type` field; Reddit feeds were briefly
    // wired to `reddit-json` then reverted to `rss` when Reddit's app-creation
    // captcha blocked the OAuth path. The OAuth code stays in the repo ready
    // to reactivate via config flip. This test asserts only the contract
    // (every feed has a valid type), not the current routing.
    const sources = await loadConfig(REPO_CONFIG);
    const VALID = new Set(["rss", "reddit-json"]);
    for (const s of sources) {
      expect(VALID.has(s.type)).toBe(true);
    }
  });

  it("loads the valid fixture file with both enabled and disabled entries", async () => {
    const sources = await loadConfig(path.join(FIXTURES, "rss-sources.valid.json"));
    expect(sources).toHaveLength(2);
    expect(sources[0]?.enabled).toBe(true);
    expect(sources[1]?.enabled).toBe(false);
    expect(sources[0]?.auto_promote_eligible).toBe(true);
    expect(sources[1]?.auto_promote_eligible).toBe(false);
  });

  it("supports adding entries by editing only the JSON (memfs simulation)", async () => {
    const fs = memFs({
      "/cfg/rss-sources.json": JSON.stringify([
        { name: "A", url: "https://a.example.com", type: "rss", enabled: true, auto_promote_eligible: true },
        { name: "B", url: "https://b.example.com", type: "rss", enabled: true, auto_promote_eligible: false },
        { name: "C", url: "https://c.example.com", type: "rss", enabled: false, auto_promote_eligible: false },
        { name: "D", url: "https://d.example.com", type: "rss", enabled: true, auto_promote_eligible: true },
        { name: "E", url: "https://e.example.com", type: "rss", enabled: true, auto_promote_eligible: false },
        { name: "F", url: "https://f.example.com", type: "reddit-json", enabled: true, auto_promote_eligible: true },
      ]),
    });
    const sources = await loadConfig("/cfg/rss-sources.json", fs);
    expect(sources).toHaveLength(6);
  });

  it("throws ConfigSchemaError on missing file", async () => {
    await expect(loadConfig("/does/not/exist.json")).rejects.toBeInstanceOf(
      ConfigSchemaError,
    );
  });

  it("throws ConfigSchemaError on invalid JSON", async () => {
    const fs = memFs({ "/cfg/x.json": "not json {" });
    await expect(loadConfig("/cfg/x.json", fs)).rejects.toBeInstanceOf(
      ConfigSchemaError,
    );
  });

  it("throws ConfigSchemaError when root is not an array", async () => {
    const fs = memFs({ "/cfg/x.json": JSON.stringify({}) });
    await expect(loadConfig("/cfg/x.json", fs)).rejects.toBeInstanceOf(
      ConfigSchemaError,
    );
  });

  it("throws on a fixture entry missing required fields", async () => {
    await expect(
      loadConfig(path.join(FIXTURES, "rss-sources.invalid.json")),
    ).rejects.toBeInstanceOf(ConfigSchemaError);
  });

  it("throws when url is not http(s)", async () => {
    const fs = memFs({
      "/cfg/x.json": JSON.stringify([
        { name: "X", url: "ftp://example.com", type: "rss", enabled: true, auto_promote_eligible: false },
      ]),
    });
    await expect(loadConfig("/cfg/x.json", fs)).rejects.toBeInstanceOf(
      ConfigSchemaError,
    );
  });

  it("throws when enabled is not boolean", async () => {
    const fs = memFs({
      "/cfg/x.json": JSON.stringify([
        { name: "X", url: "https://example.com", type: "rss", enabled: "yes", auto_promote_eligible: false },
      ]),
    });
    await expect(loadConfig("/cfg/x.json", fs)).rejects.toBeInstanceOf(
      ConfigSchemaError,
    );
  });

  it("throws ConfigSchemaError when auto_promote_eligible is missing (no fallback per project rule)", async () => {
    const fs = memFs({
      "/cfg/x.json": JSON.stringify([
        { name: "X", url: "https://example.com", type: "rss", enabled: true },
      ]),
    });
    await expect(loadConfig("/cfg/x.json", fs)).rejects.toBeInstanceOf(
      ConfigSchemaError,
    );
  });

  it("throws when auto_promote_eligible is not boolean", async () => {
    const fs = memFs({
      "/cfg/x.json": JSON.stringify([
        { name: "X", url: "https://example.com", type: "rss", enabled: true, auto_promote_eligible: "yes" },
      ]),
    });
    await expect(loadConfig("/cfg/x.json", fs)).rejects.toBeInstanceOf(
      ConfigSchemaError,
    );
  });

  it("throws ConfigSchemaError when type is missing (DECISIONS 2026-05-21, no fallback)", async () => {
    const fs = memFs({
      "/cfg/x.json": JSON.stringify([
        { name: "X", url: "https://example.com", enabled: true, auto_promote_eligible: false },
      ]),
    });
    await expect(loadConfig("/cfg/x.json", fs)).rejects.toBeInstanceOf(
      ConfigSchemaError,
    );
  });

  it("throws ConfigSchemaError when type is an unknown value", async () => {
    const fs = memFs({
      "/cfg/x.json": JSON.stringify([
        { name: "X", url: "https://example.com", type: "yaml", enabled: true, auto_promote_eligible: false },
      ]),
    });
    await expect(loadConfig("/cfg/x.json", fs)).rejects.toBeInstanceOf(
      ConfigSchemaError,
    );
  });
});
