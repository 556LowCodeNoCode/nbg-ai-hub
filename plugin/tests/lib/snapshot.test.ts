import { describe, expect, it } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveSnapshotPath,
  readSnapshotMeta,
  listPillarFiles,
} from "../../src/lib/snapshot.js";
import { SnapshotMissingError } from "../../src/lib/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE_SNAPSHOT = resolve(__dirname, "..", "fixtures", "snapshot");

describe("resolveSnapshotPath", () => {
  it("returns bundled path when non-empty and cache is absent", () => {
    const got = resolveSnapshotPath({ bundled: FIXTURE_SNAPSHOT });
    expect(got).toBe(FIXTURE_SNAPSHOT);
  });

  it("prefers cache when cache is non-empty and exists", () => {
    const tmp = mkdtempSync(join(tmpdir(), "hub-snap-"));
    try {
      mkdirSync(join(tmp, "glossary"), { recursive: true });
      writeFileSync(join(tmp, "glossary", "x.md"), "---\ntype: glossary\n---\n");
      const got = resolveSnapshotPath({ bundled: FIXTURE_SNAPSHOT, cache: tmp });
      expect(got).toBe(tmp);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("falls through to bundled when cache is empty", () => {
    const tmp = mkdtempSync(join(tmpdir(), "hub-snap-empty-"));
    try {
      const got = resolveSnapshotPath({ bundled: FIXTURE_SNAPSHOT, cache: tmp });
      expect(got).toBe(FIXTURE_SNAPSHOT);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("throws SnapshotMissingError when both bundled and cache absent", () => {
    expect(() =>
      resolveSnapshotPath({ bundled: "/nonexistent/bundled", cache: "/nonexistent/cache" }),
    ).toThrow(SnapshotMissingError);
  });
});

describe("readSnapshotMeta", () => {
  it("parses .snapshot-meta.json from the fixture", () => {
    const meta = readSnapshotMeta(FIXTURE_SNAPSHOT);
    expect(meta.generatedAt).toBe("2026-05-19T10:00:00Z");
    expect(meta.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("throws SnapshotMissingError when meta is absent", () => {
    expect(() => readSnapshotMeta("/nonexistent")).toThrow(SnapshotMissingError);
  });
});

describe("listPillarFiles", () => {
  it("returns absolute paths sorted for an existing pillar", () => {
    const files = listPillarFiles(FIXTURE_SNAPSHOT, "glossary");
    expect(files).toHaveLength(1);
    expect(files[0]?.endsWith("/glossary/mcp.md")).toBe(true);
  });

  it("returns [] for empty pillar directory", () => {
    const tmp = mkdtempSync(join(tmpdir(), "hub-empty-pillar-"));
    try {
      mkdirSync(join(tmp, "tips"), { recursive: true });
      expect(listPillarFiles(tmp, "tips")).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("returns [] for missing pillar directory", () => {
    const tmp = mkdtempSync(join(tmpdir(), "hub-missing-pillar-"));
    try {
      expect(listPillarFiles(tmp, "skills")).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
