/**
 * remark-shortcut-link.ts — build-time keyboard-shortcut auto-linker.
 *
 * Sibling of remark-glossary-link (§S.14). Walks every markdown body and
 * wraps the FIRST occurrence of each key combo in an inert
 * `<button data-shortcut-slug>` that ShortcutKey.astro hydrates into a
 * popover explaining what the key does.
 *
 * Skips the same subtrees the glossary linker skips — code, inlineCode,
 * headings, links, raw html. Two reasons that matters here specifically:
 *   - `Ctrl+R` inside a fenced block is sample input, not prose.
 *   - Tip bodies write combos as **Ctrl+R** inside table cells, which is
 *     `strong` → `text`; that still linkifies, which is what we want.
 *
 * Ordering note: run this AFTER remark-glossary-link. The glossary linker
 * emits `html` nodes, which this plugin skips, so the two cannot nest or
 * fight over the same text span.
 */

import type { Root, Parent } from 'mdast';
import type { Plugin } from 'unified';
import { SKIP, visit } from 'unist-util-visit';
import { getShortcutRegex, slugForMatch, shortcutButtonHtml } from '../lib/shortcut-link';

const remarkShortcutLink: Plugin<[], Root, Root> = function () {
  return (tree: Root) => {
    // One set per file — first occurrence per slug per document.
    const seen = new Set<string>();

    visit(tree, (node, idx, parent) => {
      if (
        node.type === 'code' ||
        node.type === 'inlineCode' ||
        node.type === 'heading' ||
        node.type === 'link' ||
        node.type === 'linkReference' ||
        node.type === 'definition' ||
        node.type === 'html'
      ) {
        return SKIP;
      }
      if (node.type !== 'text') return;
      if (!parent || idx === undefined || idx === null) return;

      const value = (node as { value: string }).value;
      const regex = getShortcutRegex();
      const replacement: Array<{ type: string; value: string }> = [];
      let cursor = 0;
      let hit = false;

      for (let m = regex.exec(value); m !== null; m = regex.exec(value)) {
        const matched = m[0];
        const slug = slugForMatch(matched);
        if (slug === null || seen.has(slug)) continue;
        seen.add(slug);
        hit = true;

        if (m.index > cursor) {
          replacement.push({ type: 'text', value: value.slice(cursor, m.index) });
        }
        replacement.push({ type: 'html', value: shortcutButtonHtml(slug, matched) });
        cursor = m.index + matched.length;
      }

      if (!hit) return;
      if (cursor < value.length) {
        replacement.push({ type: 'text', value: value.slice(cursor) });
      }

      (parent as Parent).children.splice(idx, 1, ...(replacement as never[]));
      // Resume past what we just inserted so the emitted html nodes are not
      // re-scanned. Same guard the glossary linker uses.
      return [SKIP, idx + replacement.length];
    });
  };
};

export default remarkShortcutLink;
