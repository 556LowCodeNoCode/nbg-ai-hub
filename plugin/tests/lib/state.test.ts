import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  resolveStatePath,
  readState,
  writeState,
  updateAudience,
  updateLastJourney,
} from "../../src/lib/state.js";
import { StateInvalidError } from "../../src/lib/errors.js";

describe("resolveStatePath", () => {
  let originalData: string | undefined;
  let originalXdg: string | undefined;

  beforeEach(() => {
    originalData = process.env["CLAUDE_PLUGIN_DATA"];
    originalXdg = process.env["XDG_DATA_HOME"];
    delete process.env["CLAUDE_PLUGIN_DATA"];
    delete process.env["XDG_DATA_HOME"];
  });

  afterEach(() => {
    if (originalData !== undefined) process.env["CLAUDE_PLUGIN_DATA"] = originalData;
    if (originalXdg !== undefined) process.env["XDG_DATA_HOME"] = originalXdg;
  });

  it("returns CLAUDE_PLUGIN_DATA/state.json when env is set", () => {
    process.env["CLAUDE_PLUGIN_DATA"] = "/tmp/fake-claude-data";
    expect(resolveStatePath()).toBe("/tmp/fake-claude-data/state.json");
  });

  it("falls back to XDG path when CLAUDE_PLUGIN_DATA unset", () => {
    process.env["XDG_DATA_HOME"] = "/tmp/fake-xdg";
    expect(resolveStatePath()).toBe(
      "/tmp/fake-xdg/claude-code/plugins/nbg-ai-hub/state.json",
    );
  });

  it("uses ~/.local/share when neither env var is set", () => {
    const p = resolveStatePath();
    expect(p.endsWith("/claude-code/plugins/nbg-ai-hub/state.json")).toBe(true);
  });
});

describe("readState / writeState round-trip", () => {
  function withTmp<T>(fn: (path: string) => T): T {
    const dir = mkdtempSync(join(tmpdir(), "hub-state-"));
    const p = join(dir, "state.json");
    try {
      return fn(p);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("returns default state when file does not exist", () => {
    withTmp((p) => {
      const s = readState(p);
      expect(s.audience).toBe("both");
      expect(s.lastJourney).toBeNull();
    });
  });

  it("round-trips an explicit state", () => {
    withTmp((p) => {
      writeState({ audience: "beginner", lastJourney: "day-1" }, p);
      const s = readState(p);
      expect(s).toEqual({ audience: "beginner", lastJourney: "day-1" });
    });
  });

  it("writes atomically via .tmp rename", () => {
    withTmp((p) => {
      writeState({ audience: "advanced", lastJourney: null }, p);
      expect(existsSync(p)).toBe(true);
      expect(existsSync(`${p}.tmp`)).toBe(false);
    });
  });

  it("creates parent directory when missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "hub-state-deep-"));
    const p = join(dir, "nested", "deeper", "state.json");
    try {
      writeState({ audience: "both", lastJourney: null }, p);
      expect(existsSync(p)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws StateInvalidError on malformed JSON", () => {
    withTmp((p) => {
      writeFileSync(p, "not-json", "utf-8");
      expect(() => readState(p)).toThrow(StateInvalidError);
    });
  });

  it("throws StateInvalidError on bad audience value", () => {
    withTmp((p) => {
      writeFileSync(p, JSON.stringify({ audience: "expert", lastJourney: null }), "utf-8");
      expect(() => readState(p)).toThrow(StateInvalidError);
    });
  });

  it("throws StateInvalidError on wrong-type lastJourney", () => {
    withTmp((p) => {
      writeFileSync(p, JSON.stringify({ audience: "both", lastJourney: 42 }), "utf-8");
      expect(() => readState(p)).toThrow(StateInvalidError);
    });
  });
});

describe("updateAudience / updateLastJourney", () => {
  function withTmp<T>(fn: (path: string) => T): T {
    const dir = mkdtempSync(join(tmpdir(), "hub-state-upd-"));
    const p = join(dir, "state.json");
    try {
      return fn(p);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("updateAudience preserves lastJourney", () => {
    withTmp((p) => {
      writeState({ audience: "both", lastJourney: "week-1" }, p);
      const next = updateAudience("advanced", p);
      expect(next).toEqual({ audience: "advanced", lastJourney: "week-1" });
      expect(JSON.parse(readFileSync(p, "utf-8"))).toEqual({
        audience: "advanced",
        lastJourney: "week-1",
      });
    });
  });

  it("updateLastJourney preserves audience", () => {
    withTmp((p) => {
      writeState({ audience: "beginner", lastJourney: null }, p);
      const next = updateLastJourney("day-1", p);
      expect(next).toEqual({ audience: "beginner", lastJourney: "day-1" });
    });
  });

  it("updateLastJourney(null) clears the journey", () => {
    withTmp((p) => {
      writeState({ audience: "advanced", lastJourney: "day-1" }, p);
      const next = updateLastJourney(null, p);
      expect(next.lastJourney).toBeNull();
    });
  });
});
