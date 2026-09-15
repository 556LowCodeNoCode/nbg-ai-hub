// site/src/lib/glossary-link-string.ts
//
// Server-side helper that wraps glossary terms inside plain frontmatter
// strings (ai_summary, hero summaries, etc.) with the same
// `<button data-glossary-slug>` trigger the remark plugin emits, so the
// existing client-side tooltip registry can hydrate them identically.
//
// Why this exists:
//   The remark-glossary-link plugin only fires on markdown bodies. Listing
//   pages (skills, tips, index, my-pins privacy line, etc.) render
//   frontmatter strings directly in JSX as plain text — so terms like
//   "Claude Code" or "CLAUDE.md" in an `ai_summary` never get linkified.
//   This helper closes that gap without modifying the plugin.
//
// Contract — mirrors the plugin where it matters:
//   - Reads the same glossary index via the plugin's named `getGlossaryIndex`
//     export so a single source of truth governs aliases, slug shape, etc.
//   - Word-boundary aware: matches only when the variant is surrounded by
//     non-letter, non-digit characters (same rule as the plugin).
//   - Longest-first variant scan so "command-line interface" wins over "cli".
//   - First-occurrence per slug per CALL — same per-unit rule the plugin
//     applies per markdown file. Each call here = one frontmatter string =
//     one short bounded text → first-occurrence is appropriate.
//   - Output: identical button HTML
//     `<button type="button" class="nbg-glossary-trigger" data-glossary-slug="…" data-glossary-display="…">…</button>`
//
// Build-time only — do not import from client scripts.

import { getGlossaryIndex, type GlossaryEntry } from '../plugins/remark-glossary-link';

const GLOSSARY_DIR = '../glossary'; // relative to site/ (process.cwd at build)

interface VariantEntry {
  slug: string;
  title: string;
}

let cache: { variants: string[]; map: Map<string, VariantEntry> } | null = null;

/** Build a flat lookup table once per process. */
function loadIndex(): { variants: string[]; map: Map<string, VariantEntry> } {
  if (cache !== null) return cache;
  const raw: Map<string, GlossaryEntry> = getGlossaryIndex(GLOSSARY_DIR);
  const map = new Map<string, VariantEntry>();
  for (const [variant, entry] of raw.entries()) {
    map.set(variant, { slug: entry.slug, title: entry.title });
  }
  // Longest-first so multi-word aliases beat shorter prefixes when both match.
  const variants = Array.from(map.keys()).sort((a, b) => b.length - a.length);
  cache = { variants, map };
  return cache;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns HTML-safe string with the first occurrence of each glossary term
 * wrapped in a tooltip-trigger button. If the input is empty or no terms
 * match, returns the HTML-escaped original string.
 *
 * Safe to use in `set:html` because every untouched segment is HTML-escaped
 * and the inserted button uses escaped attribute values + text.
 */
export function linkGlossaryTerms(text: string | undefined | null): string {
  if (text === null || text === undefined || text.length === 0) return '';
  const { variants, map } = loadIndex();
  if (variants.length === 0) return escapeHtml(text);

  // One alternation regex, longest-first. Boundary uses Unicode letter/digit
  // negative lookarounds — matches the plugin's §S.14.3 contract: NOT \b,
  // because \b doesn't cope with apostrophes / em-dashes correctly.
  const alternation = variants.map(escapeRegex).join('|');
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${alternation})(?![\\p{L}\\p{N}_])`,
    'giu',
  );

  const seen = new Set<string>();
  const parts: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const matched = match[1];
    if (matched === undefined) continue;
    const variant = matched.toLowerCase();
    const entry = map.get(variant);
    if (entry === undefined) continue;
    if (seen.has(entry.slug)) continue; // first-occurrence-per-slug
    seen.add(entry.slug);

    parts.push(escapeHtml(text.slice(cursor, match.index)));
    const display = escapeHtml(matched);
    const slug = escapeHtml(entry.slug);
    parts.push(
      `<button type="button" class="nbg-glossary-trigger" data-glossary-slug="${slug}" data-glossary-display="${display}">${display}</button>`,
    );
    cursor = match.index + matched.length;
  }
  parts.push(escapeHtml(text.slice(cursor)));
  return parts.join('');
}
