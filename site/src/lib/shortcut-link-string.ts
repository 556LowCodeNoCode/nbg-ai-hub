/**
 * shortcut-link-string.ts — auto-link key combos inside plain frontmatter
 * strings (ai_summary, hero summaries), mirroring linkGlossaryTerms().
 *
 * The remark plugin only fires on markdown bodies; listing pages render
 * frontmatter directly, so combos there would never linkify without this.
 *
 * First occurrence per slug PER CALL — each call is one short string.
 * Build-time only.
 */

import {
  escapeHtml,
  getShortcutRegex,
  slugForMatch,
  shortcutButtonHtml,
} from './shortcut-link';

export function linkShortcuts(input: string): string {
  if (!input) return '';
  const regex = getShortcutRegex();
  const seen = new Set<string>();
  let out = '';
  let cursor = 0;

  for (let m = regex.exec(input); m !== null; m = regex.exec(input)) {
    const matched = m[0];
    const slug = slugForMatch(matched);
    if (slug === null || seen.has(slug)) continue;
    seen.add(slug);
    out += escapeHtml(input.slice(cursor, m.index));
    out += shortcutButtonHtml(slug, matched);
    cursor = m.index + matched.length;
  }
  out += escapeHtml(input.slice(cursor));
  return out;
}
