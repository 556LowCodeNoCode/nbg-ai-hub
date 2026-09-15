/**
 * shortcut-link.ts — shared matcher for the keyboard-shortcut auto-linker.
 *
 * Mirrors the glossary auto-linker (§S.14) but for key combos. Both the
 * remark plugin (markdown bodies) and the string helper (frontmatter) call
 * into here so one set of rules governs matching everywhere.
 *
 * Emits the same inert-button shape the glossary linker uses, so the
 * client-side wiring in ShortcutKey.astro can hydrate it into a popover:
 *   <button class="nbg-shortcut-trigger" data-shortcut-slug="…">Ctrl+R</button>
 *
 * Matching rules:
 *   - Longest variant first, so "Esc Esc" wins over "Esc" and
 *     "Ctrl+Shift+B" over "Ctrl+B".
 *   - Separator-tolerant: "Ctrl+R", "Ctrl + R" and "Ctrl-R" all match the
 *     same entry, because writers type all three.
 *   - Boundary-aware: a combo must not be glued to a letter or digit, so
 *     "Esc" does not fire inside "Escape" or "Escalate".
 *   - First occurrence per slug per unit (one markdown file, or one
 *     frontmatter string). Linking every mention would be noise.
 *
 * Build-time only — do not import from client scripts.
 */

import { SHORTCUTS, type Shortcut } from '../data/shortcuts';

export interface ShortcutVariant {
  slug: string;
  /** The literal text to search for. */
  variant: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let cache: { variants: ShortcutVariant[]; regex: RegExp } | null = null;

/**
 * Every searchable spelling, longest-first.
 * A combo's own `keys` plus its declared aliases.
 */
export function getShortcutVariants(): ShortcutVariant[] {
  return buildIndex().variants;
}

function buildIndex(): { variants: ShortcutVariant[]; regex: RegExp } {
  if (cache !== null) return cache;

  const variants: ShortcutVariant[] = [];
  for (const s of SHORTCUTS) {
    for (const v of [s.keys, ...s.aliases]) {
      const t = v.trim();
      if (t.length > 0) variants.push({ slug: s.slug, variant: t });
    }
  }
  // Longest-first: "Esc Esc" must beat "Esc"; "Ctrl+Shift+B" must beat "Ctrl+B".
  variants.sort((a, b) => b.variant.length - a.variant.length);

  // One alternation over every variant. `[+\-\s]` makes the separator
  // flexible so "Ctrl + R" and "Ctrl-R" hit the same entry as "Ctrl+R".
  const alternation = variants
    .map((v) => escapeRegex(v.variant).replace(/\\\+|\s+|-/g, '[+\\-\\s]'))
    .join('|');

  // Boundaries are hand-rolled rather than \b: \b is letter/digit-aware and
  // would mis-handle a trailing "+" or "_" in combos like Ctrl+_.
  const regex = new RegExp(`(?<![A-Za-z0-9])(${alternation})(?![A-Za-z0-9])`, 'g');

  cache = { variants, regex };
  return cache;
}

/** Fresh regex each call — `lastIndex` on a shared /g regex is a footgun. */
export function getShortcutRegex(): RegExp {
  const { regex } = buildIndex();
  return new RegExp(regex.source, regex.flags);
}

/** Map a matched spelling back to its slug, separator-insensitively. */
export function slugForMatch(matched: string): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[+\-\s]+/g, '+');
  const target = norm(matched);
  for (const v of buildIndex().variants) {
    if (norm(v.variant) === target) return v.slug;
  }
  return null;
}

/** The inert trigger markup. Hydrated by ShortcutKey.astro. */
export function shortcutButtonHtml(slug: string, display: string): string {
  return (
    `<button type="button" class="nbg-shortcut-trigger"` +
    ` data-shortcut-slug="${escapeHtml(slug)}"` +
    ` data-shortcut-display="${escapeHtml(display)}">` +
    `${escapeHtml(display)}</button>`
  );
}

export type { Shortcut };
