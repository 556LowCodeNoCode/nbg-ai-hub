// frontmatter.ts — Build and serialize the 13-key NewsFrontmatter.
// Pure. See project-design.md §3.10 and §2 for the exact key set.

import YAML from "yaml";
import type { EmittedItem, NewsFrontmatter } from "./types.js";

/**
 * Builds the 13-key frontmatter object from an EmittedItem.
 *  - `type` is always "news"
 *  - `internal` is always false
 *  - `deeper_link` is always null
 *  - `last_reviewed` equals `authored` (the run date)
 *  - `editor_confidence` is propagated from the triage verdict
 */
export function buildFrontmatter(emitted: EmittedItem): NewsFrontmatter {
  return {
    type: "news",
    title: emitted.item.title,
    audience: emitted.triage.audience,
    topics: emitted.triage.topics,
    editor_confidence: emitted.triage.editor_confidence,
    internal: false,
    authored: emitted.runDateUtc,
    last_reviewed: emitted.runDateUtc,
    external_link: emitted.item.link,
    deeper_link: null,
    ai_summary: emitted.triage.summary,
    source: emitted.item.feedName,
    fingerprint: emitted.fingerprint,
  };
}

/**
 * Serializes a NewsFrontmatter object to a YAML block (no leading/trailing
 * "---" fence; callers add the fence in the markdown file).
 *
 * Preserves the canonical 12-key insertion order from buildFrontmatter.
 */
export function serializeFrontmatter(fm: NewsFrontmatter): string {
  return YAML.stringify(fm, { lineWidth: 0 });
}
