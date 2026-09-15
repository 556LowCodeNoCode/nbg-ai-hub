// validators/config.ts — Load and validate config/maintainers.json.
// Used by the skill CI validator to allow team-alias maintainers.
//
// Per global rule: NO fallback default — missing / unparseable / wrong shape
// raises ConfigNotFoundError. CI fails loudly instead of silently accepting
// an unknown maintainer.

import { readFile } from "node:fs/promises";

export interface MaintainersConfig {
  schema_version: number;
  team_aliases: string[];
}

export class ConfigNotFoundError extends Error {
  public readonly path: string;

  constructor(path: string) {
    super(`Maintainers config not found or invalid at ${path}`);
    this.name = "ConfigNotFoundError";
    this.path = path;
  }
}

/**
 * Loads config/maintainers.json. Throws ConfigNotFoundError on:
 *  - file missing / unreadable
 *  - invalid JSON
 *  - missing or wrong-type fields (schema_version: number, team_aliases: string[])
 *
 * No fallback — by design.
 */
export async function loadMaintainers(
  path: string,
): Promise<MaintainersConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new ConfigNotFoundError(path);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigNotFoundError(path);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ConfigNotFoundError(path);
  }

  const obj = parsed as Record<string, unknown>;
  const schemaVersion = obj["schema_version"];
  const teamAliases = obj["team_aliases"];

  if (typeof schemaVersion !== "number") {
    throw new ConfigNotFoundError(path);
  }
  if (
    !Array.isArray(teamAliases) ||
    !teamAliases.every((a): a is string => typeof a === "string")
  ) {
    throw new ConfigNotFoundError(path);
  }

  return {
    schema_version: schemaVersion,
    team_aliases: teamAliases,
  };
}
