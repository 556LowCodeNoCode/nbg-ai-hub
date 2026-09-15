import { listPillarFiles, type Pillar } from "./snapshot.js";
import { parseMarkdownFile, isBaseFrontmatter, isSkillFrontmatter } from "./frontmatter.js";
import type {
  BaseFrontmatter,
  SkillFrontmatter,
  ParsedMarkdown,
} from "./frontmatter.js";

export interface PillarEntry<T extends BaseFrontmatter = BaseFrontmatter> {
  sourcePath: string;
  pillar: Pillar;
  data: T;
  content: string;
  slug: string;
}

function slugFromPath(p: string): string {
  const base = p.split("/").pop() ?? p;
  return base.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function loadBase(snapshotPath: string, pillar: Exclude<Pillar, "skills">): PillarEntry[] {
  const files = listPillarFiles(snapshotPath, pillar);
  const entries: PillarEntry[] = [];
  for (const f of files) {
    const parsed: ParsedMarkdown = parseMarkdownFile(f);
    const type = pillar === "tips" ? "tip" : pillar === "glossary" ? "glossary" : "journey-step";
    isBaseFrontmatter(parsed.data, type, parsed.sourcePath);
    entries.push({
      sourcePath: f,
      pillar,
      data: parsed.data as unknown as BaseFrontmatter,
      content: parsed.content,
      slug: slugFromPath(f),
    });
  }
  return entries;
}

export function loadTips(snapshotPath: string): PillarEntry[] {
  return loadBase(snapshotPath, "tips");
}

export function loadGlossary(snapshotPath: string): PillarEntry[] {
  return loadBase(snapshotPath, "glossary");
}

export function loadJourneys(snapshotPath: string): PillarEntry[] {
  return loadBase(snapshotPath, "journeys");
}

export function loadSkills(snapshotPath: string): PillarEntry<SkillFrontmatter>[] {
  const files = listPillarFiles(snapshotPath, "skills");
  const out: PillarEntry<SkillFrontmatter>[] = [];
  for (const f of files) {
    const parsed = parseMarkdownFile(f);
    isSkillFrontmatter(parsed.data, parsed.sourcePath);
    out.push({
      sourcePath: f,
      pillar: "skills",
      data: parsed.data as unknown as SkillFrontmatter,
      content: parsed.content,
      slug: slugFromPath(f),
    });
  }
  return out;
}

export interface AllContent {
  tips: PillarEntry[];
  glossary: PillarEntry[];
  journeys: PillarEntry[];
  skills: PillarEntry<SkillFrontmatter>[];
}

export function loadAll(snapshotPath: string): AllContent {
  return {
    tips: loadTips(snapshotPath),
    glossary: loadGlossary(snapshotPath),
    journeys: loadJourneys(snapshotPath),
    skills: loadSkills(snapshotPath),
  };
}

export function filterByTopic<T extends BaseFrontmatter>(
  entries: PillarEntry<T>[],
  topic: string | undefined,
): PillarEntry<T>[] {
  if (!topic) return entries;
  const lc = topic.toLowerCase();
  return entries.filter((e) => e.data.topics.some((t) => t.toLowerCase().includes(lc)));
}
