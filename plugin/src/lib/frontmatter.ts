import matter from "gray-matter";
import yaml from "js-yaml";
import { readFileSync } from "node:fs";
import { FrontmatterInvalidError } from "./errors.js";

const AUDIENCE_VALUES = new Set(["beginner", "advanced", "both"]);

export type Audience = "beginner" | "advanced" | "both";

export interface BaseFrontmatter {
  type: string;
  title: string;
  audience: Audience;
  topics: string[];
  internal: boolean;
  authored: string;
  last_reviewed: string;
  external_link: string | null;
  deeper_link: string | null;
  ai_summary: string;
}

export interface SkillFrontmatter extends BaseFrontmatter {
  type: "skill";
  install_command: string;
  skill_id: string;
  origin: "internal" | "community" | "external";
  category: "workflow" | "code" | "docs" | "integration" | "productivity" | "testing" | "other";
  status: "active" | "experimental" | "deprecated";
  maintainer: string;
  requires?: string[];
}

export interface ParsedMarkdown {
  data: Record<string, unknown>;
  content: string;
  sourcePath?: string;
}

const YAML_ENGINE = {
  parse: (s: string): object => {
    const loaded = yaml.load(s, { schema: yaml.JSON_SCHEMA });
    if (loaded === null || typeof loaded !== "object") return {};
    return loaded as object;
  },
  stringify: (o: object): string => yaml.dump(o, { schema: yaml.JSON_SCHEMA }),
};

export function parseFrontmatter(markdown: string): ParsedMarkdown {
  const parsed = matter(markdown, {
    engines: { yaml: YAML_ENGINE },
    language: "yaml",
  });
  return {
    data: parsed.data as Record<string, unknown>,
    content: parsed.content,
  };
}

export function parseMarkdownFile(path: string): ParsedMarkdown {
  const raw = readFileSync(path, "utf-8");
  const parsed = parseFrontmatter(raw);
  return { ...parsed, sourcePath: path };
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function isAudience(v: unknown): v is Audience {
  return typeof v === "string" && AUDIENCE_VALUES.has(v);
}

function isIsoDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function checkBase(data: Record<string, unknown>, expectedType: string, problems: string[]): void {
  if (data["type"] !== expectedType) {
    problems.push(`type must be "${expectedType}", got ${JSON.stringify(data["type"])}`);
  }
  if (!isString(data["title"]) || data["title"].length === 0) problems.push("title must be non-empty string");
  if (!isAudience(data["audience"])) problems.push(`audience must be beginner|advanced|both, got ${JSON.stringify(data["audience"])}`);
  if (!isStringArray(data["topics"])) problems.push("topics must be string[]");
  if (!isBoolean(data["internal"])) problems.push("internal must be boolean");
  if (!isIsoDateString(data["authored"])) problems.push(`authored must be YYYY-MM-DD string, got ${JSON.stringify(data["authored"])}`);
  if (!isIsoDateString(data["last_reviewed"])) problems.push("last_reviewed must be YYYY-MM-DD string");
  if (!isStringOrNull(data["external_link"])) problems.push("external_link must be string or null");
  if (!isStringOrNull(data["deeper_link"])) problems.push("deeper_link must be string or null");
  if (!isString(data["ai_summary"])) problems.push("ai_summary must be string");
}

export function isBaseFrontmatter(
  data: Record<string, unknown>,
  type: "tip" | "glossary" | "journey-step",
  sourcePath = "<unknown>",
): true {
  const problems: string[] = [];
  checkBase(data, type, problems);
  if (problems.length > 0) throw new FrontmatterInvalidError(sourcePath, problems);
  return true;
}

const ORIGIN_VALUES = new Set(["internal", "community", "external"]);
const CATEGORY_VALUES = new Set(["workflow", "code", "docs", "integration", "productivity", "testing", "other"]);
const STATUS_VALUES = new Set(["active", "experimental", "deprecated"]);

export function isSkillFrontmatter(
  data: Record<string, unknown>,
  sourcePath = "<unknown>",
): true {
  const problems: string[] = [];
  checkBase(data, "skill", problems);
  const ic = data["install_command"];
  if (
    !isString(ic) ||
    !(ic.startsWith("/plugin marketplace add ") || ic.startsWith("/plugin install "))
  ) {
    problems.push("install_command must start with `/plugin marketplace add ` or `/plugin install `");
  }
  const sid = data["skill_id"];
  if (!isString(sid) || !/^[a-z0-9-]+$/.test(sid)) {
    problems.push("skill_id must match /^[a-z0-9-]+$/");
  }
  if (typeof data["origin"] !== "string" || !ORIGIN_VALUES.has(data["origin"])) {
    problems.push("origin must be internal|community|external");
  }
  if (typeof data["category"] !== "string" || !CATEGORY_VALUES.has(data["category"])) {
    problems.push("category must be one of workflow|code|docs|integration|productivity|testing|other");
  }
  if (typeof data["status"] !== "string" || !STATUS_VALUES.has(data["status"])) {
    problems.push("status must be active|experimental|deprecated");
  }
  if (!isString(data["maintainer"]) || data["maintainer"].length === 0) {
    problems.push("maintainer must be non-empty string");
  }
  if ("requires" in data && data["requires"] !== undefined && !isStringArray(data["requires"])) {
    problems.push("requires must be string[] when present");
  }
  if (problems.length > 0) throw new FrontmatterInvalidError(sourcePath, problems);
  return true;
}
