// validators/skill.ts — Skill frontmatter validator for CI.
//
// Validates a single skills/<slug>.md file against the SkillFrontmatter
// contract. Returns ALL issues (no short-circuit on first failure) so authors
// fix everything in one round.
//
// AC coverage:
//   AC16  valid frontmatter passes
//   AC17  missing install_command flagged
//   AC18  bad category (and other enums) flagged
//   AC19  bad install_command prefix flagged
//   AC20  HTTP 429 on external_link → warn-and-pass (don't fail CI on rate limits)

import matter from "gray-matter";
import path from "node:path";
import type { MaintainersConfig } from "./config.js";

export type ValidationIssue = {
  file: string;
  field: string;
  rule: string;
  message: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; issues: ValidationIssue[] };

export interface SkillFrontmatter {
  type: "skill";
  title: string;
  audience: "beginner" | "advanced" | "both";
  topics: string[];
  internal: boolean;
  authored: string;
  last_reviewed: string;
  external_link: string | null;
  deeper_link: string | null;
  ai_summary: string;
  when_to_use: string;
  install_command: string;
  skill_id: string;
  origin: "internal" | "community" | "external";
  category:
    | "workflow"
    | "code"
    | "docs"
    | "integration"
    | "productivity"
    | "testing"
    | "other";
  status: "active" | "experimental" | "deprecated";
  maintainer: string;
  requires?: string[];
}

const REQUIRED_FIELDS: readonly (keyof SkillFrontmatter)[] = [
  "type",
  "title",
  "audience",
  "topics",
  "internal",
  "authored",
  "last_reviewed",
  "external_link",
  "deeper_link",
  "ai_summary",
  "when_to_use",
  "install_command",
  "skill_id",
  "origin",
  "category",
  "status",
  "maintainer",
];

const AUDIENCE_VALUES = ["beginner", "advanced", "both"] as const;
const ORIGIN_VALUES = ["internal", "community", "external"] as const;
const CATEGORY_VALUES = [
  "workflow",
  "code",
  "docs",
  "integration",
  "productivity",
  "testing",
  "other",
] as const;
const STATUS_VALUES = ["active", "experimental", "deprecated"] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SKILL_ID_RE = /^[a-z0-9-]+$/;
const MAINTAINER_HANDLE_RE = /^@[a-zA-Z0-9-]+$/;

const INSTALL_PREFIXES = [
  "/plugin marketplace add ",
  "/plugin install ",
] as const;

const HEAD_TIMEOUT_MS = 10_000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function tryParseUrl(s: string): boolean {
  try {
    // Throws on malformed URLs.
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * HEAD-check `url` with a 10s timeout.
 * Returns:
 *   - "ok"     for 2xx/3xx
 *   - "rate-limited" for 429 (caller logs a warning and skips the failure — AC20)
 *   - "bad"    for 4xx (≠ 429) or network error → caller emits an issue
 */
async function headCheck(
  url: string,
): Promise<"ok" | "rate-limited" | "bad"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (res.status === 429) return "rate-limited";
    if (res.status >= 200 && res.status < 400) return "ok";
    if (res.status >= 400 && res.status < 500) return "bad";
    // 5xx — treat as transient; do not fail CI on someone else's outage.
    return "ok";
  } catch {
    return "bad";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validates a single skill markdown file.
 *
 * @param filePath  Path the file lives at (used for the path↔skill_id check
 *                  and for issue annotations). Need not exist on disk.
 * @param content   Raw markdown content (frontmatter + body).
 * @param maintainersConfig  Loaded from config/maintainers.json — defines the
 *                  legal `team_aliases` for the `maintainer` field.
 */
export async function validateSkillFile(
  filePath: string,
  content: string,
  maintainersConfig: MaintainersConfig,
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  const push = (
    field: string,
    rule: string,
    message: string,
  ): void => {
    issues.push({ file: filePath, field, rule, message });
  };

  // 1. Parse frontmatter.
  let data: Record<string, unknown> = {};
  try {
    const parsed = matter(content);
    if (!isPlainObject(parsed.data) || Object.keys(parsed.data).length === 0) {
      push(
        "frontmatter",
        "parse",
        "frontmatter is missing or empty",
      );
      return { ok: false, issues };
    }
    data = parsed.data;
  } catch (err) {
    push(
      "frontmatter",
      "parse",
      `gray-matter failed to parse: ${String(err)}`,
    );
    return { ok: false, issues };
  }

  // 2. Required fields.
  for (const f of REQUIRED_FIELDS) {
    if (!(f in data)) {
      push(f, "required", `missing required field '${f}'`);
    }
  }

  // 3. type === "skill"
  if ("type" in data && data["type"] !== "skill") {
    push(
      "type",
      "literal",
      `type must be exactly 'skill', got ${JSON.stringify(data["type"])}`,
    );
  }

  // 4. audience enum
  if (
    "audience" in data &&
    !AUDIENCE_VALUES.includes(data["audience"] as (typeof AUDIENCE_VALUES)[number])
  ) {
    push(
      "audience",
      "enum",
      `audience must be one of ${AUDIENCE_VALUES.join(", ")}`,
    );
  }

  // 5. topics non-empty string[]
  if ("topics" in data) {
    if (!isStringArray(data["topics"]) || (data["topics"] as string[]).length === 0) {
      push(
        "topics",
        "shape",
        "topics must be a non-empty array of strings",
      );
    }
  }

  // 6. internal boolean
  if ("internal" in data && typeof data["internal"] !== "boolean") {
    push("internal", "type", "internal must be boolean");
  }

  // 7. authored / last_reviewed date strings
  for (const dateField of ["authored", "last_reviewed"] as const) {
    if (dateField in data) {
      const v = data[dateField];
      if (typeof v !== "string" || !DATE_RE.test(v)) {
        push(
          dateField,
          "date-format",
          `${dateField} must match YYYY-MM-DD`,
        );
      }
    }
  }

  // 8. external_link — null OR URL parseable; HEAD-check.
  if ("external_link" in data) {
    const v = data["external_link"];
    if (v !== null) {
      if (typeof v !== "string" || !tryParseUrl(v)) {
        push(
          "external_link",
          "url",
          "external_link must be null or a valid URL",
        );
      } else {
        const head = await headCheck(v);
        if (head === "rate-limited") {
          process.stderr.write(
            `[warn] external_link HEAD check rate-limited (429) for ${v} — skipping (AC20)\n`,
          );
        } else if (head === "bad") {
          push(
            "external_link",
            "url-reachable",
            `external_link HEAD check failed for ${v}`,
          );
        }
      }
    }
  }

  // 9. deeper_link — null OR URL parseable (no HEAD)
  if ("deeper_link" in data) {
    const v = data["deeper_link"];
    if (v !== null) {
      if (typeof v !== "string" || !tryParseUrl(v)) {
        push(
          "deeper_link",
          "url",
          "deeper_link must be null or a valid URL",
        );
      }
    }
  }

  // 10. ai_summary non-empty string
  if ("ai_summary" in data) {
    const v = data["ai_summary"];
    if (typeof v !== "string" || v.trim().length === 0) {
      push(
        "ai_summary",
        "non-empty",
        "ai_summary must be a non-empty string",
      );
    }
  }

  // 10b. when_to_use non-empty string, ≤220 chars (matches site schema)
  if ("when_to_use" in data) {
    const v = data["when_to_use"];
    if (typeof v !== "string" || v.trim().length === 0) {
      push(
        "when_to_use",
        "non-empty",
        "when_to_use must be a non-empty string",
      );
    } else if (v.length > 220) {
      push(
        "when_to_use",
        "max-length",
        `when_to_use must be ≤220 characters (got ${v.length})`,
      );
    }
  }

  // 11. install_command — must start with one of the allowed prefixes (AC17/AC19)
  if ("install_command" in data) {
    const v = data["install_command"];
    if (typeof v !== "string") {
      push("install_command", "type", "install_command must be a string");
    } else if (!INSTALL_PREFIXES.some((p) => v.startsWith(p))) {
      push(
        "install_command",
        "prefix",
        `install_command must start with one of: ${INSTALL_PREFIXES.map((p) => `'${p}'`).join(" or ")}`,
      );
    }
  }

  // 12. skill_id pattern
  if ("skill_id" in data) {
    const v = data["skill_id"];
    if (typeof v !== "string" || !SKILL_ID_RE.test(v)) {
      push(
        "skill_id",
        "pattern",
        "skill_id must match /^[a-z0-9-]+$/",
      );
    }
  }

  // 13. category enum (AC18)
  if (
    "category" in data &&
    !CATEGORY_VALUES.includes(data["category"] as (typeof CATEGORY_VALUES)[number])
  ) {
    push(
      "category",
      "enum",
      `category must be one of ${CATEGORY_VALUES.join(", ")}`,
    );
  }

  // 14. origin enum
  if (
    "origin" in data &&
    !ORIGIN_VALUES.includes(data["origin"] as (typeof ORIGIN_VALUES)[number])
  ) {
    push(
      "origin",
      "enum",
      `origin must be one of ${ORIGIN_VALUES.join(", ")}`,
    );
  }

  // 15. status enum
  if (
    "status" in data &&
    !STATUS_VALUES.includes(data["status"] as (typeof STATUS_VALUES)[number])
  ) {
    push(
      "status",
      "enum",
      `status must be one of ${STATUS_VALUES.join(", ")}`,
    );
  }

  // 16. maintainer — handle OR team alias
  if ("maintainer" in data) {
    const v = data["maintainer"];
    if (typeof v !== "string") {
      push("maintainer", "type", "maintainer must be a string");
    } else {
      const isHandle = MAINTAINER_HANDLE_RE.test(v);
      const isAlias = maintainersConfig.team_aliases.includes(v);
      if (!isHandle && !isAlias) {
        push(
          "maintainer",
          "identity",
          `maintainer must be a GitHub handle (e.g. @user) or a team alias from config/maintainers.json`,
        );
      }
    }
  }

  // Optional: requires must be a string array if present.
  if ("requires" in data && data["requires"] !== undefined) {
    if (!isStringArray(data["requires"])) {
      push(
        "requires",
        "shape",
        "requires must be an array of strings when present",
      );
    }
  }

  // 17. Path basename matches skill_id.
  if ("skill_id" in data && typeof data["skill_id"] === "string") {
    const expected = `${data["skill_id"]}.md`;
    const actual = path.basename(filePath);
    if (actual !== expected) {
      push(
        "skill_id",
        "path-match",
        `file basename '${actual}' does not match skill_id '${data["skill_id"]}' (expected '${expected}')`,
      );
    }
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
