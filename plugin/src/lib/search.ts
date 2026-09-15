import type { BaseFrontmatter } from "./frontmatter.js";

export interface SearchableItem {
  sourcePath: string;
  pillar: string;
  data: BaseFrontmatter;
  content: string;
}

export interface SearchWeights {
  title: number;
  topics: number;
  body: number;
}

export interface SearchHit {
  sourcePath: string;
  pillar: string;
  title: string;
  score: number;
  snippet: string;
  audience: string;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle || !haystack) return 0;
  const lc = haystack.toLowerCase();
  const nlc = needle.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = lc.indexOf(nlc, pos)) !== -1) {
    count++;
    pos += nlc.length;
  }
  return count;
}

function buildSnippet(content: string, query: string, length: number): string {
  if (!query) return "";
  const lc = content.toLowerCase();
  const idx = lc.indexOf(query.toLowerCase());
  if (idx === -1) {
    return content.slice(0, length).replace(/\s+/g, " ").trim();
  }
  const half = Math.floor(length / 2);
  const start = Math.max(0, idx - half);
  const end = Math.min(content.length, start + length);
  const ellipsisStart = start > 0 ? "… " : "";
  const ellipsisEnd = end < content.length ? " …" : "";
  const body = content.slice(start, end).replace(/\s+/g, " ").trim();
  return `${ellipsisStart}${body}${ellipsisEnd}`;
}

export function search(
  query: string,
  items: SearchableItem[],
  weights: SearchWeights,
  snippetLength: number,
): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const hits: SearchHit[] = [];
  for (const item of items) {
    const titleHits = countOccurrences(item.data.title, trimmed);
    const topicsString = item.data.topics.join(" ");
    const topicsHits = countOccurrences(topicsString, trimmed);
    const bodyHits = countOccurrences(item.content, trimmed);
    const score =
      titleHits * weights.title +
      topicsHits * weights.topics +
      bodyHits * weights.body;
    if (score === 0) continue;
    hits.push({
      sourcePath: item.sourcePath,
      pillar: item.pillar,
      title: item.data.title,
      score,
      snippet: buildSnippet(item.content, trimmed, snippetLength),
      audience: item.data.audience,
    });
  }
  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.sourcePath.localeCompare(b.sourcePath);
  });
  return hits;
}
