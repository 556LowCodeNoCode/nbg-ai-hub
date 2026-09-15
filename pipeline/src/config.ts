// config.ts — Load and validate config/rss-sources.json.
// See project-design.md §3.2 and §5.1.

import nodeFs from "node:fs/promises";
import type { FeedSource } from "./types.js";

export class ConfigSchemaError extends Error {
  public readonly path: string;
  public readonly issue: string;

  constructor(path: string, issue: string) {
    super(`Invalid config at ${path}: ${issue}`);
    this.name = "ConfigSchemaError";
    this.path = path;
    this.issue = issue;
  }
}

type FsLike = typeof import("node:fs/promises");

/**
 * Loads and validates config/rss-sources.json. Returns the FULL list (both
 * enabled and disabled entries); callers filter on .enabled themselves.
 *
 * Throws ConfigSchemaError on missing/non-JSON/invalid shape.
 */
export async function loadConfig(
  configPath: string,
  fs: FsLike = nodeFs,
): Promise<FeedSource[]> {
  let raw: string;
  try {
    raw = await fs.readFile(configPath, "utf8");
  } catch (err) {
    throw new ConfigSchemaError(
      "rss-sources.json",
      `file missing or unreadable: ${String(err)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ConfigSchemaError(
      "rss-sources.json",
      `invalid JSON: ${String(err)}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new ConfigSchemaError("rss-sources.json", "root must be an array");
  }

  const out: FeedSource[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    if (entry === null || typeof entry !== "object") {
      throw new ConfigSchemaError(
        `rss-sources.json[${i}]`,
        "must be an object",
      );
    }
    const obj = entry as Record<string, unknown>;

    const name = obj["name"];
    if (typeof name !== "string" || name.length === 0) {
      throw new ConfigSchemaError(
        `rss-sources.json[${i}].name`,
        "missing or empty",
      );
    }

    const url = obj["url"];
    if (typeof url !== "string" || url.length === 0) {
      throw new ConfigSchemaError(
        `rss-sources.json[${i}].url`,
        "missing or empty",
      );
    }
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      throw new ConfigSchemaError(
        `rss-sources.json[${i}].url`,
        "must be https URL",
      );
    }

    const enabled = obj["enabled"];
    if (typeof enabled !== "boolean") {
      throw new ConfigSchemaError(
        `rss-sources.json[${i}].enabled`,
        "must be boolean",
      );
    }

    // DECISIONS 2026-05-21: per-feed fetch+parse mode. No fallback per project
    // rule — missing or unknown value is a schema error. Forces feed authors
    // to declare explicitly whether the endpoint is XML or Reddit JSON.
    const type = obj["type"];
    if (type !== "rss" && type !== "reddit-json") {
      throw new ConfigSchemaError(
        `rss-sources.json[${i}].type`,
        'must be "rss" or "reddit-json"',
      );
    }

    // Variant C (DECISIONS 2026-05-19): per-feed auto-promote flag. No
    // fallback — missing or non-boolean is a schema error. Forces every feed
    // author to make the policy call explicitly.
    const autoPromoteEligible = obj["auto_promote_eligible"];
    if (typeof autoPromoteEligible !== "boolean") {
      throw new ConfigSchemaError(
        `rss-sources.json[${i}].auto_promote_eligible`,
        "must be boolean",
      );
    }

    out.push({ name, url, type, enabled, auto_promote_eligible: autoPromoteEligible });
  }

  return out;
}
