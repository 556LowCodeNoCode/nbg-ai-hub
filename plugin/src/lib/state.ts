import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { homedir } from "node:os";
import { StateInvalidError } from "./errors.js";

export type Audience = "beginner" | "advanced" | "both";

export interface HubState {
  audience: Audience;
  lastJourney: string | null;
}

const DEFAULT_STATE: HubState = {
  audience: "both",
  lastJourney: null,
};

export function resolveStatePath(): string {
  const fromEnv = process.env["CLAUDE_PLUGIN_DATA"];
  if (fromEnv) return resolve(fromEnv, "state.json");
  const xdg = process.env["XDG_DATA_HOME"];
  const base = xdg ?? join(homedir(), ".local", "share");
  return join(base, "claude-code", "plugins", "nbg-ai-hub", "state.json");
}

function isAudience(v: unknown): v is Audience {
  return v === "beginner" || v === "advanced" || v === "both";
}

export function readState(path?: string): HubState {
  const p = path ?? resolveStatePath();
  if (!existsSync(p)) return { ...DEFAULT_STATE };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(p, "utf-8"));
  } catch (err) {
    throw new StateInvalidError(p, "malformed JSON", err instanceof Error ? err.message : String(err));
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new StateInvalidError(p, "root is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (!isAudience(obj["audience"])) {
    throw new StateInvalidError(p, `audience must be 'beginner'|'advanced'|'both', got ${String(obj["audience"])}`);
  }
  const lastJourney = obj["lastJourney"];
  if (lastJourney !== null && typeof lastJourney !== "string") {
    throw new StateInvalidError(p, `lastJourney must be string or null, got ${typeof lastJourney}`);
  }
  return { audience: obj["audience"], lastJourney };
}

export function writeState(state: HubState, path?: string): void {
  const p = path ?? resolveStatePath();
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", "utf-8");
  renameSync(tmp, p);
}

export function updateAudience(audience: Audience, path?: string): HubState {
  const current = readState(path);
  const next: HubState = { ...current, audience };
  writeState(next, path);
  return next;
}

export function updateLastJourney(journey: string | null, path?: string): HubState {
  const current = readState(path);
  const next: HubState = { ...current, lastJourney: journey };
  writeState(next, path);
  return next;
}
