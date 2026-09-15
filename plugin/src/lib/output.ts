import type { SearchHit } from "./search.js";
import type { Audience } from "./frontmatter.js";
import { badge } from "./audience.js";
import type { SnapshotMeta } from "./snapshot.js";

export const DIVIDER = "─".repeat(60);

export interface ListItemFields {
  title: string;
  audience: Audience;
  topics: string[];
  description: string;
}

export function renderListItem(fields: ListItemFields): string {
  const topics = fields.topics.length > 0 ? fields.topics.join(", ") : "—";
  return `${fields.title} ${badge(fields.audience)} ${topics}\n  ${fields.description}`;
}

export function renderSearchHit(hit: SearchHit): string {
  return `${hit.title} ${badge(hit.audience as Audience)} (${hit.pillar}, score ${hit.score})\n  ${hit.snippet}`;
}

export function renderSnapshotFooter(meta: SnapshotMeta): string {
  const sha7 = meta.sourceCommit.slice(0, 7);
  return `(snapshot: ${meta.generatedAt}, source: ${sha7})`;
}

export function renderSection(title: string, lines: string[]): string {
  if (lines.length === 0) {
    return `${title}\n${DIVIDER}\n(no entries)`;
  }
  return `${title}\n${DIVIDER}\n${lines.join("\n\n")}`;
}

export function renderEmptyPillar(pillar: string): string {
  return `No ${pillar} in this snapshot yet — try /hub-refresh, or contribute via PR.`;
}
