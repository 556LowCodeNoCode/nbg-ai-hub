import { UrlBuildError } from "./errors.js";

const SECTION_ALIASES: Record<string, string> = {
  "day-1": "start-here/day-1",
  "week-1": "start-here/week-1",
};

const KNOWN_SECTIONS = new Set<string>([
  "skills",
  "tips",
  "glossary",
  "journeys",
  "start-here",
  "start-here/day-1",
  "start-here/week-1",
]);

export interface BuildHubUrlOpts {
  baseUrl: string;
  section?: string;
  subsection?: string;
}

function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function buildHubUrl(opts: BuildHubUrlOpts): string {
  const base = normalizeBase(opts.baseUrl);

  if (!opts.section) return `${base}/`;

  const rawSection = opts.section;
  const resolved = SECTION_ALIASES[rawSection] ?? rawSection;

  if (!KNOWN_SECTIONS.has(resolved)) {
    throw new UrlBuildError(rawSection);
  }

  if (resolved === "glossary" && opts.subsection) {
    return `${base}/glossary#${opts.subsection}`;
  }

  return `${base}/${resolved}/`;
}
