import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ConfigInvalidError, ConfigMissingError } from "./errors.js";

export interface SearchWeights {
  title: number;
  topics: number;
  body: number;
}

export interface SearchConfig {
  weights: SearchWeights;
  snippetLength: number;
}

export interface HubConfig {
  productionUrl: string;
  devUrl: string;
  devMode: boolean;
  search: SearchConfig;
  snapshotPath: string;
  refreshCachePath: string;
  repoUrl: string;
}

function defaultConfigPath(): string {
  const fromEnv = process.env["CLAUDE_PLUGIN_ROOT"];
  if (fromEnv) return resolve(fromEnv, "config.json");
  return resolve(process.cwd(), "config.json");
}

function requireString(obj: Record<string, unknown>, key: string): string {
  if (!(key in obj)) throw new ConfigMissingError(key);
  const v = obj[key];
  if (typeof v !== "string") {
    throw new ConfigInvalidError(key, "string", typeof v);
  }
  return v;
}

function requireBoolean(obj: Record<string, unknown>, key: string): boolean {
  if (!(key in obj)) throw new ConfigMissingError(key);
  const v = obj[key];
  if (typeof v !== "boolean") {
    throw new ConfigInvalidError(key, "boolean", typeof v);
  }
  return v;
}

function requireNumber(obj: Record<string, unknown>, key: string): number {
  if (!(key in obj)) throw new ConfigMissingError(key);
  const v = obj[key];
  if (typeof v !== "number") {
    throw new ConfigInvalidError(key, "number", typeof v);
  }
  return v;
}

function requireObject(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  if (!(key in obj)) throw new ConfigMissingError(key);
  const v = obj[key];
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new ConfigInvalidError(key, "object", Array.isArray(v) ? "array" : typeof v);
  }
  return v as Record<string, unknown>;
}

export function loadConfig(configPath?: string): HubConfig {
  const path = configPath ?? defaultConfigPath();
  if (!existsSync(path)) {
    throw new ConfigMissingError(`<file:${path}>`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    throw new ConfigInvalidError(
      `<file:${path}>`,
      "valid JSON",
      err instanceof Error ? err.message : String(err),
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ConfigInvalidError(
      `<root>`,
      "object",
      Array.isArray(parsed) ? "array" : typeof parsed,
    );
  }
  const obj = parsed as Record<string, unknown>;

  const search = requireObject(obj, "search");
  const weights = requireObject(search, "weights");

  return {
    productionUrl: requireString(obj, "productionUrl"),
    devUrl: requireString(obj, "devUrl"),
    devMode: requireBoolean(obj, "devMode"),
    search: {
      weights: {
        title: requireNumber(weights, "title"),
        topics: requireNumber(weights, "topics"),
        body: requireNumber(weights, "body"),
      },
      snippetLength: requireNumber(search, "snippetLength"),
    },
    snapshotPath: requireString(obj, "snapshotPath"),
    refreshCachePath: requireString(obj, "refreshCachePath"),
    repoUrl: requireString(obj, "repoUrl"),
  };
}

export function resolveBaseUrl(cfg: HubConfig): string {
  return cfg.devMode ? cfg.devUrl : cfg.productionUrl;
}
